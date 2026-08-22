"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { mitErfolg } from "@/lib/erfolg";
import { loeschHinweis } from "@/lib/loeschen";
import type { FormularErgebnis } from "@/lib/formular-ergebnis";
import { konfliktMeldung, STAND_FELD } from "@/lib/konflikt";

function artikelFromForm(formData: FormData) {
  const str = (v: FormDataEntryValue | null) =>
    v && String(v).trim() !== "" ? String(v).trim() : null;

  return {
    bezeichnung: String(formData.get("bezeichnung") ?? "").trim(),
    beschreibung: str(formData.get("beschreibung")),
    klasse_id: String(formData.get("klasse_id")),
    preis: Number(formData.get("preis") ?? 0),
    einheit: String(formData.get("einheit") ?? "Stunde").trim() || "Stunde",
    // Checkboxen liefern nur bei aktiviertem Zustand einen Wert – "nicht
    // vorhanden" heisst hier also false.
    zaehlt_als_arbeitszeit: formData.get("zaehlt_als_arbeitszeit") === "on",
    rabatt_erlaubt: formData.get("rabatt_erlaubt") === "on",
    menge_aus_anreise: formData.get("menge_aus_anreise") === "on",
    konto: str(formData.get("konto")),
    mwst_code_id: str(formData.get("mwst_code_id")),
    aktiv: formData.get("aktiv") === "on",
  };
}

export async function createArtikel(
  _bisher: FormularErgebnis,
  formData: FormData
): Promise<FormularErgebnis> {
  const supabase = await createClient();
  const values = artikelFromForm(formData);

  const { error } = await supabase.from("artikel").insert(values);
  if (error) {
    return { fehler: error.message };
  }

  revalidatePath("/artikel");
  redirect(mitErfolg("/artikel", "Artikel gespeichert."));
}

export async function updateArtikel(
  id: string,
  _bisher: FormularErgebnis,
  formData: FormData
): Promise<FormularErgebnis> {
  const supabase = await createClient();
  const values = artikelFromForm(formData);

  // Konfliktprüfung – siehe lib/konflikt.
  const stand = String(formData.get(STAND_FELD) ?? "") || null;
  let abfrage = supabase
    .from("artikel")
    .update(values)
    .eq("id", id);
  if (stand) abfrage = abfrage.eq("updated_at", stand);

  const { data: geaendert, error } = await abfrage.select("id");
  if (error) {
    return { fehler: error.message };
  }
  if (!geaendert || geaendert.length === 0) {
    return { fehler: await konfliktMeldung(supabase, "artikel", id, stand) };
  }

  revalidatePath("/artikel");
  redirect(mitErfolg("/artikel", "Artikel gespeichert."));
}

export async function deleteArtikel(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("artikel")
    .delete()
    .eq("id", id)
    .select("id");

  const meldung = loeschHinweis(data, error, "Artikel", "Artikel");
  if (meldung) {
    redirect(`/artikel/${id}?error=${encodeURIComponent(meldung)}`);
  }

  revalidatePath("/artikel");
  redirect(mitErfolg("/artikel", "Artikel gelöscht."));
}
