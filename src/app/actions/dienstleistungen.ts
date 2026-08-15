"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { mitErfolg } from "@/lib/erfolg";
import { loeschHinweis } from "@/lib/loeschen";
import type { FormularErgebnis } from "@/lib/formular-ergebnis";
import { konfliktMeldung, STAND_FELD } from "@/lib/konflikt";

function dienstleistungFromForm(formData: FormData) {
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

export async function createDienstleistung(
  _bisher: FormularErgebnis,
  formData: FormData
): Promise<FormularErgebnis> {
  const supabase = await createClient();
  const values = dienstleistungFromForm(formData);

  const { error } = await supabase.from("dienstleistungen").insert(values);
  if (error) {
    return { fehler: error.message };
  }

  revalidatePath("/dienstleistungen");
  redirect(mitErfolg("/dienstleistungen", "Dienstleistung gespeichert."));
}

export async function updateDienstleistung(
  id: string,
  _bisher: FormularErgebnis,
  formData: FormData
): Promise<FormularErgebnis> {
  const supabase = await createClient();
  const values = dienstleistungFromForm(formData);

  // Konfliktprüfung – siehe lib/konflikt.
  const stand = String(formData.get(STAND_FELD) ?? "") || null;
  let abfrage = supabase
    .from("dienstleistungen")
    .update(values)
    .eq("id", id);
  if (stand) abfrage = abfrage.eq("updated_at", stand);

  const { data: geaendert, error } = await abfrage.select("id");
  if (error) {
    return { fehler: error.message };
  }
  if (!geaendert || geaendert.length === 0) {
    return { fehler: await konfliktMeldung(supabase, "dienstleistungen", id, stand) };
  }

  revalidatePath("/dienstleistungen");
  redirect(mitErfolg("/dienstleistungen", "Dienstleistung gespeichert."));
}

export async function deleteDienstleistung(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("dienstleistungen")
    .delete()
    .eq("id", id)
    .select("id");

  const meldung = loeschHinweis(data, error, "Dienstleistung", "Dienstleistungen");
  if (meldung) {
    redirect(`/dienstleistungen/${id}?error=${encodeURIComponent(meldung)}`);
  }

  revalidatePath("/dienstleistungen");
  redirect(mitErfolg("/dienstleistungen", "Dienstleistung gelöscht."));
}
