"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { mitErfolg } from "@/lib/erfolg";
import { datenbankFehlerText } from "@/lib/db-fehler";

// Die Adressen eines Kunden (0079).
//
// Ein Standort ist eine Postadresse und trägt seinen Kunden als Spalte. Bis
// 0079 lief die Zugehörigkeit über eine Beteiligtenzeile mit der Rolle
// „Kunde" – nötig, solange dieselbe Liegenschaft der Verwaltung und dem
// Eigentümer gehören konnte. Seit die zusätzlichen Adressen am Auftrag
// hängen, hat ein Standort zu jedem Zeitpunkt genau einen Kunden, und aus
// dem Umweg wird eine Spalte.

function zurueck(kundeId: string, suffix = "") {
  return `/kunden/${kundeId}?reiter=standorte${suffix}`;
}

function mitFehler(kundeId: string, text: string): never {
  redirect(`${zurueck(kundeId)}&error=${encodeURIComponent(text)}`);
}

const str = (v: FormDataEntryValue | null) =>
  v && String(v).trim() !== "" ? String(v).trim() : null;

export async function speichereStandort(kundeId: string, formData: FormData) {
  const supabase = await createClient();

  const id = str(formData.get("id"));
  const bezeichnung = str(formData.get("bezeichnung"));
  if (!bezeichnung) {
    mitFehler(kundeId, "Die Bezeichnung ist ein Pflichtfeld.");
  }

  const werte = {
    kunde_id: kundeId,
    bezeichnung,
    adresse_zusatz: str(formData.get("adresse_zusatz")),
    strasse: str(formData.get("strasse")),
    hausnummer: str(formData.get("hausnummer")),
    plz: str(formData.get("plz")),
    ort: str(formData.get("ort")),
    land: str(formData.get("land")) ?? "CH",
    ist_standard: formData.get("ist_standard") === "on",
    aktiv: formData.get("aktiv") !== "off",
  };

  // Nur eine vorgeschlagene Adresse je Kunde – sonst ist die Vorgabe beim
  // Anlegen eines Auftrags eine Frage statt einer Antwort. Zurücksetzen vor
  // dem Speichern, damit die neue Wahl nicht gleich mitzurückgesetzt wird.
  if (werte.ist_standard) {
    let abfrage = supabase
      .from("standorte")
      .update({ ist_standard: false })
      .eq("kunde_id", kundeId);
    if (id) abfrage = abfrage.neq("id", id);
    await abfrage;
  }

  const { error } = id
    ? await supabase.from("standorte").update(werte).eq("id", id)
    : await supabase.from("standorte").insert(werte);

  if (error) mitFehler(kundeId, datenbankFehlerText(error));

  revalidatePath(`/kunden/${kundeId}`);
  redirect(
    mitErfolg(
      zurueck(kundeId, id ? `&standort=${id}` : "&fokus=neuer_standort"),
      id ? "Adresse gespeichert." : "Adresse erfasst."
    )
  );
}

export async function loescheStandort(kundeId: string, id: string) {
  const supabase = await createClient();
  // Hängt ein Auftrag an der Adresse, lehnt die Datenbank ab. Das ist
  // richtig: Ein Auftrag ohne Einsatzort wäre ein Auftrag, den niemand
  // findet.
  const { error } = await supabase.from("standorte").delete().eq("id", id);
  if (error) {
    mitFehler(
      kundeId,
      /violates foreign key/i.test(error.message)
        ? "Die Adresse lässt sich nicht löschen: Es hängen Aufträge daran. " +
            "Wer sie nicht mehr braucht, nimmt ihr das Häkchen „aktiv“."
        : datenbankFehlerText(error)
    );
  }
  revalidatePath(`/kunden/${kundeId}`);
  redirect(mitErfolg(zurueck(kundeId), "Adresse gelöscht."));
}

export type StandortOption = {
  id: string;
  bezeichnung: string;
  ort: string | null;
  ist_standard: boolean;
};

/**
 * Die Adressen eines Kunden für ein Auswahlfeld.
 *
 * Wird vom Auftragsformular gerufen, wenn dort der Kunde wechselt. Bewusst
 * nachgeladen statt mitgeliefert: Eine Verwaltung mit vierzig Liegenschaften
 * mal fünfhundert Adressen wäre ein Formular mit zwanzigtausend Zeilen, von
 * denen man eine braucht.
 */
export async function ladeStandorteDesKunden(kundeId: string): Promise<StandortOption[]> {
  if (!kundeId) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("standorte")
    .select("id, bezeichnung, ort, ist_standard")
    .eq("kunde_id", kundeId)
    .eq("aktiv", true)
    .order("ist_standard", { ascending: false })
    .order("bezeichnung");
  return (data ?? []) as StandortOption[];
}
