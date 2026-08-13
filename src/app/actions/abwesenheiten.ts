"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { mitErfolg } from "@/lib/erfolg";
import { normalisiereZeit } from "@/lib/zeit";

// Abwesenheiten erfasst das Büro, nicht die betroffene Person – deshalb
// hängen sie an der Mitarbeitenden-Detailseite und sind per RLS auf Admins
// beschränkt (siehe 0030).

export async function erfasseAbwesenheit(mitarbeiterId: string, formData: FormData) {
  const supabase = await createClient();

  const von = String(formData.get("von") ?? "").trim();
  // Leeres Enddatum heisst "nur dieser Tag" – der häufigste Fall ist der
  // einzelne Krankheitstag, und ihn zweimal einzutippen wäre unnötig.
  const bis = String(formData.get("bis") ?? "").trim() || von;
  const art = String(formData.get("art") ?? "").trim();
  const bemerkung = String(formData.get("bemerkung") ?? "").trim() || null;

  const zeit = (feld: string) => normalisiereZeit(String(formData.get(feld) ?? ""));

  if (!von || !art) {
    redirect(
      `/mitarbeiter/${mitarbeiterId}?error=${encodeURIComponent("Bitte Datum und Art angeben.")}`
    );
  }
  if (bis < von) {
    redirect(
      `/mitarbeiter/${mitarbeiterId}?error=${encodeURIComponent(
        "Das Enddatum liegt vor dem Startdatum."
      )}`
    );
  }

  const { error } = await supabase.from("abwesenheiten").insert({
    mitarbeiter_id: mitarbeiterId,
    von,
    bis,
    von_zeit: zeit("von_zeit"),
    bis_zeit: zeit("bis_zeit"),
    art,
    bemerkung,
  });

  if (error) {
    redirect(`/mitarbeiter/${mitarbeiterId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/mitarbeiter/${mitarbeiterId}`);
  revalidatePath("/disposition");
  redirect(
    mitErfolg(`/mitarbeiter/${mitarbeiterId}?fokus=neue_abwesenheit`, "Abwesenheit erfasst.")
  );
}

export async function loescheAbwesenheit(mitarbeiterId: string, id: string) {
  const supabase = await createClient();
  await supabase.from("abwesenheiten").delete().eq("id", id);
  revalidatePath(`/mitarbeiter/${mitarbeiterId}`);
  revalidatePath("/disposition");
  redirect(mitErfolg(`/mitarbeiter/${mitarbeiterId}`, "Abwesenheit entfernt."));
}
