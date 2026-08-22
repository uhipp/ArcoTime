"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { mitErfolg } from "@/lib/erfolg";
import { datenbankFehlerText } from "@/lib/db-fehler";
import { getCurrentOrganisation } from "@/lib/get-profile";

// Die zusätzlichen Adressen an einem Auftrag (0079): Eigentümer, Verwaltung,
// Mieter, Hauswart, Architekt, Bauleitung, Subunternehmer, Behörde.
//
// Warum am Auftrag und nicht am Standort: Ein Betrieb, der die Ortsebene nicht
// führt, käme sonst nie an sie heran – und der Rapport müsste zwei Listen
// zusammenführen. Beides war der Grund, die Ebene aus 0076 zurückzunehmen.
//
// Warum eine Verknüpfung und keine Kopie: Die Adresse steht einmal im
// Adressbuch. Zieht das Architekturbüro um, stimmt es in allen Aufträgen –
// die Anforderung vom 20.08.2026.

function zurueck(projektId: string, suffix = "") {
  return `/projekte/${projektId}?reiter=adressen${suffix}`;
}

function mitFehler(projektId: string, text: string): never {
  redirect(`${zurueck(projektId)}&error=${encodeURIComponent(text)}`);
}

const str = (v: FormDataEntryValue | null) =>
  v && String(v).trim() !== "" ? String(v).trim() : null;

export async function speichereProjektAdresse(projektId: string, formData: FormData) {
  const supabase = await createClient();

  const id = str(formData.get("id"));
  const partnerId = str(formData.get("partner_id"));
  const rolleId = str(formData.get("rolle_id"));

  if (!partnerId) mitFehler(projektId, "Bitte eine Adresse wählen.");
  if (!rolleId) mitFehler(projektId, "Bitte eine Rolle wählen.");

  const werte = {
    projekt_id: projektId,
    partner_id: partnerId,
    rolle_id: rolleId,
    ansprechperson_id: str(formData.get("ansprechperson_id")),
    // „Rollenwechsel braucht ein Datum": Wer bis gestern Eigentümer war, war
    // es für die Rapporte von damals trotzdem.
    gueltig_von: str(formData.get("gueltig_von")),
    gueltig_bis: str(formData.get("gueltig_bis")),
    notiz: str(formData.get("notiz")),
  };

  const { error } = id
    ? await supabase.from("projekt_adressen").update(werte).eq("id", id)
    : await supabase.from("projekt_adressen").insert(werte);

  if (error) mitFehler(projektId, datenbankFehlerText(error));

  revalidatePath(`/projekte/${projektId}`);
  redirect(
    mitErfolg(
      zurueck(projektId, "&fokus=neue_projekt_adresse"),
      id ? "Adresse gespeichert." : "Adresse erfasst."
    )
  );
}

export async function loescheProjektAdresse(projektId: string, id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("projekt_adressen").delete().eq("id", id);
  if (error) mitFehler(projektId, datenbankFehlerText(error));
  revalidatePath(`/projekte/${projektId}`);
  redirect(mitErfolg(zurueck(projektId), "Adresse entfernt."));
}

export type VorgetrageneWerte = {
  anreise_km: number | null;
  zugang: string | null;
  projektleiter_id: string | null;
  kostenstelle: string | null;
  notizen: string | null;
  /** Bezeichnung des Auftrags, aus dem die Werte kommen – für den Hinweis. */
  quelle: string | null;
};

/**
 * Was ein neuer Auftrag am selben Standort vom letzten übernimmt.
 *
 * Zwei Regeln, beide mit Grund:
 *
 * 1. Vorgetragen wird vom letzten Auftrag am SELBEN Standort, nicht vom
 *    letzten Auftrag desselben Kunden. Die Anfahrt ist eine Eigenschaft des
 *    Wegs zu dieser Adresse.
 * 2. Gibt es dort noch keinen, bleibt alles leer. Eine vorgetragene Distanz
 *    von einer anderen Liegenschaft wäre plausibel und falsch – und stille
 *    falsche Zahlen sind schlimmer als leere Felder (dieselbe Begründung wie
 *    bei den Datumsfeldern).
 *
 * Was übernommen wird, stellt der Betrieb ein (organisationen.vortrag_*).
 */
export async function ladeVortrag(standortId: string): Promise<VorgetrageneWerte | null> {
  if (!standortId) return null;
  const supabase = await createClient();

  // Die Organisation ausdrücklich benennen und nicht limit(1) nehmen: Ein
  // Plattform-Admin sieht mehrere Zeilen, und dann wäre es Zufall, welche
  // Einstellung greift.
  const organisation = await getCurrentOrganisation();
  if (!organisation) return null;

  const { data: schalter } = await supabase
    .from("organisationen")
    .select(
      "vortrag_anreise_km, vortrag_zugang, vortrag_projektleitung, vortrag_kostenstelle, vortrag_notizen"
    )
    .eq("id", organisation.id)
    .maybeSingle();

  // Ohne die Spalten (Migration noch nicht ausgeführt) wird nichts
  // vorgetragen. Ein leeres Feld ist die harmlose Voreinstellung.
  if (!schalter) return null;

  const { data: letzter } = await supabase
    .from("projekte")
    .select("bezeichnung, anreise_km, zugang, projektleiter_id, kostenstelle, notizen")
    .eq("standort_id", standortId)
    .order("startdatum", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!letzter) return null;

  return {
    anreise_km: schalter.vortrag_anreise_km ? (letzter.anreise_km ?? null) : null,
    zugang: schalter.vortrag_zugang ? (letzter.zugang ?? null) : null,
    projektleiter_id: schalter.vortrag_projektleitung
      ? (letzter.projektleiter_id ?? null)
      : null,
    kostenstelle: schalter.vortrag_kostenstelle ? (letzter.kostenstelle ?? null) : null,
    notizen: schalter.vortrag_notizen ? (letzter.notizen ?? null) : null,
    quelle: letzter.bezeichnung ?? null,
  };
}
