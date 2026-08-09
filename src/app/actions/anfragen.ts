"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { mitErfolg } from "@/lib/erfolg";
import { heuteIso } from "@/lib/date-utils";
import type { AnfrageStatus } from "@/lib/types";

function anfrageFromForm(formData: FormData) {
  const str = (v: FormDataEntryValue | null) =>
    v && String(v).trim() !== "" ? String(v).trim() : null;

  return {
    kunde_id: String(formData.get("kunde_id")),
    projekt_id: str(formData.get("projekt_id")),
    titel: String(formData.get("titel") ?? "").trim(),
    beschreibung: str(formData.get("beschreibung")),
    kanal: String(formData.get("kanal") ?? "sonstiges"),
    prioritaet: String(formData.get("prioritaet") ?? "normal"),
    zugewiesen_an: str(formData.get("zugewiesen_an")),
    wiedervorlage_am: str(formData.get("wiedervorlage_am")),
  };
}

export async function createAnfrage(formData: FormData) {
  const supabase = await createClient();
  const values = anfrageFromForm(formData);

  const { error } = await supabase.from("anfragen").insert(values);
  if (error) {
    redirect(`/anfragen/neu?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/anfragen");
  redirect(mitErfolg("/anfragen", "Anfrage erstellt."));
}

export async function updateAnfrage(id: string, formData: FormData) {
  const supabase = await createClient();
  const values = anfrageFromForm(formData);

  const { error } = await supabase.from("anfragen").update(values).eq("id", id);
  if (error) {
    redirect(`/anfragen/${id}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/anfragen");
  redirect(mitErfolg("/anfragen", "Anfrage gespeichert."));
}

export async function deleteAnfrage(id: string) {
  const supabase = await createClient();
  await supabase.from("anfragen").delete().eq("id", id);
  revalidatePath("/anfragen");
  redirect(mitErfolg("/anfragen", "Anfrage gelöscht."));
}

// Wird vom Kanban-Board direkt (ohne Formular/Redirect) aufgerufen, wenn
// eine Karte per Drag & Drop in eine andere Spalte verschoben wird.
export async function setzeStatus(id: string, status: AnfrageStatus) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("anfragen")
    .update({
      status,
      erledigt_am: status === "erledigt" ? new Date().toISOString() : null,
    })
    .eq("id", id);

  revalidatePath("/anfragen");
  if (error) throw new Error(error.message);
}

// Schliesst eine Anfrage ab – optional inkl. automatisch erzeugtem
// Zeiteintrag (Dienstleistung + Dauer), damit nichts vergessen wird.
export async function erledigeAnfrage(id: string, formData: FormData) {
  const supabase = await createClient();
  const nichtVerrechnen = formData.get("nicht_verrechnen") === "on";

  if (nichtVerrechnen) {
    const { error } = await supabase
      .from("anfragen")
      .update({ status: "erledigt", erledigt_am: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      redirect(`/anfragen/${id}?error=${encodeURIComponent(error.message)}`);
    }

    revalidatePath("/anfragen");
    redirect(mitErfolg(`/anfragen/${id}`, "Anfrage erledigt."));
  }

  const projekt_id = String(formData.get("projekt_id") ?? "").trim();
  const dienstleistung_id = String(formData.get("dienstleistung_id") ?? "").trim();
  const dauer_minuten = Number(formData.get("dauer_minuten") ?? 0);
  const beschreibung = String(formData.get("beschreibung") ?? "").trim() || null;
  const mitarbeiter_id = String(formData.get("mitarbeiter_id") ?? "").trim();

  if (!projekt_id || !dienstleistung_id || dauer_minuten <= 0) {
    redirect(
      `/anfragen/${id}?error=${encodeURIComponent(
        "Für die Verrechnung bitte Projekt, Dienstleistung und eine gültige Dauer angeben (oder 'nicht verrechnen' anhaken)."
      )}`
    );
  }

  const { data: userData } = await supabase.auth.getUser();

  const { data: neuerEintrag, error: zeitError } = await supabase
    .from("zeiteintraege")
    .insert({
      projekt_id,
      dienstleistung_id,
      mitarbeiter_id: mitarbeiter_id || userData.user?.id,
      user_id: userData.user?.id,
      datum: heuteIso(),
      beschreibung,
      dauer_minuten,
    })
    .select("id")
    .single();

  if (zeitError || !neuerEintrag) {
    redirect(
      `/anfragen/${id}?error=${encodeURIComponent(zeitError?.message ?? "Unbekannter Fehler")}`
    );
  }

  const { error } = await supabase
    .from("anfragen")
    .update({
      status: "erledigt",
      erledigt_am: new Date().toISOString(),
      zeiteintrag_id: neuerEintrag.id,
    })
    .eq("id", id);

  if (error) {
    redirect(`/anfragen/${id}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/anfragen");
  revalidatePath("/zeiterfassung");
  redirect(mitErfolg(`/anfragen/${id}`, "Anfrage erledigt und Zeiteintrag erstellt."));
}

// Übernimmt eine noch nicht zugewiesene Anfrage für sich selbst.
export async function uebernehmeAnfrage(id: string) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("anfragen")
    .update({ zugewiesen_an: userData.user?.id, status: "in_bearbeitung" })
    .eq("id", id);

  revalidatePath("/anfragen");
  if (error) throw new Error(error.message);
}
