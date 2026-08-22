"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { mitErfolg } from "@/lib/erfolg";
import { datenbankFehlerText } from "@/lib/db-fehler";

// Alle Wege dieser Datei führen zurück auf den Reiter, von dem sie kamen –
// wer einen Standort speichert, will die Standortliste sehen und nicht die
// Adresse des Kunden.
function zurueck(kundeId: string, suffix = "") {
  return `/kunden/${kundeId}?reiter=standorte${suffix}`;
}

function mitFehler(kundeId: string, text: string): never {
  redirect(`${zurueck(kundeId)}&error=${encodeURIComponent(text)}`);
}

const str = (v: FormDataEntryValue | null) =>
  v && String(v).trim() !== "" ? String(v).trim() : null;
const num = (v: FormDataEntryValue | null) =>
  v && String(v).trim() !== "" ? Number(v) : null;

/**
 * Die Standorte eines Kunden – über die Beteiligtenrolle „Kunde", denn eine
 * Spalte kunde_id am Standort gibt es bewusst nicht (0076). Wird gebraucht,
 * um das Häkchen „Standardstandort" bei den übrigen Orten desselben Kunden
 * zurückzunehmen.
 */
async function standortIdsDesKunden(
  supabase: Awaited<ReturnType<typeof createClient>>,
  kundeId: string
) {
  const { data } = await supabase
    .from("beteiligte")
    .select("standort_id, beteiligten_rollen!inner(bezeichnung)")
    .eq("partner_id", kundeId)
    .eq("beteiligten_rollen.bezeichnung", "Kunde")
    .not("standort_id", "is", null);
  return (data ?? []).map((z) => z.standort_id as string);
}

export async function speichereStandort(kundeId: string, formData: FormData) {
  const supabase = await createClient();

  const id = str(formData.get("id"));
  const bezeichnung = str(formData.get("bezeichnung"));
  if (!bezeichnung) {
    mitFehler(kundeId, "Die Bezeichnung ist ein Pflichtfeld.");
  }

  const werte = {
    bezeichnung,
    adresse_zusatz: str(formData.get("adresse_zusatz")),
    strasse: str(formData.get("strasse")),
    hausnummer: str(formData.get("hausnummer")),
    plz: str(formData.get("plz")),
    ort: str(formData.get("ort")),
    land: str(formData.get("land")) ?? "CH",
    // Leer bleibt leer: Eine 0 hier wäre die Aussage „null Kilometer" und
    // würde später einen Vorschlag 0 machen, wo keiner gemeint ist.
    anreise_km: num(formData.get("anreise_km")),
    zugang: str(formData.get("zugang")),
    notizen: str(formData.get("notizen")),
    ist_standard: formData.get("ist_standard") === "on",
    aktiv: formData.get("aktiv") !== "off",
  };

  // Nur ein Standardstandort je Kunde – sonst ist die Vorgabe beim Anlegen
  // eines Auftrags eine Frage statt einer Antwort. Zurücksetzen vor dem
  // Speichern, damit die neue Wahl nicht gleich mitzurückgesetzt wird.
  if (werte.ist_standard) {
    const geschwister = (await standortIdsDesKunden(supabase, kundeId)).filter((s) => s !== id);
    if (geschwister.length > 0) {
      await supabase.from("standorte").update({ ist_standard: false }).in("id", geschwister);
    }
  }

  if (id) {
    const { error } = await supabase.from("standorte").update(werte).eq("id", id);
    if (error) mitFehler(kundeId, datenbankFehlerText(error));
    revalidatePath(`/kunden/${kundeId}`);
    redirect(mitErfolg(zurueck(kundeId, `&standort=${id}`), "Standort gespeichert."));
  }

  const { data: neu, error } = await supabase
    .from("standorte")
    .insert(werte)
    .select("id")
    .single();
  if (error || !neu) mitFehler(kundeId, datenbankFehlerText(error));

  // Der Standort gehört noch niemandem. Die Zugehörigkeit ist eine
  // Beteiligtenzeile – dieselbe Zeile, die der Trigger in 0076 für den
  // Standardstandort schreibt. Fehlt die Rolle, ist der Standort ein
  // Waisenkind: dann lieber laut melden und ihn wieder wegräumen.
  const { data: rolle } = await supabase
    .from("beteiligten_rollen")
    .select("id")
    .eq("bezeichnung", "Kunde")
    .maybeSingle();

  if (!rolle) {
    await supabase.from("standorte").delete().eq("id", neu.id);
    mitFehler(
      kundeId,
      "Die Beteiligtenrolle „Kunde“ fehlt in dieser Organisation – " +
        "bitte in den Einstellungen anlegen."
    );
  }

  const { error: rollenFehler } = await supabase.from("beteiligte").insert({
    standort_id: neu.id,
    partner_id: kundeId,
    rolle_id: rolle.id,
  });
  if (rollenFehler) {
    await supabase.from("standorte").delete().eq("id", neu.id);
    mitFehler(kundeId, datenbankFehlerText(rollenFehler));
  }

  revalidatePath(`/kunden/${kundeId}`);
  redirect(mitErfolg(zurueck(kundeId, "&fokus=neuer_standort"), "Standort erfasst."));
}

export async function loescheStandort(kundeId: string, id: string) {
  const supabase = await createClient();
  // Hängt ein Auftrag am Standort, lehnt die Datenbank ab (on delete
  // restrict in 0077). Das ist richtig so – ein Auftrag ohne Einsatzort
  // wäre ein Auftrag, den niemand findet.
  const { error } = await supabase.from("standorte").delete().eq("id", id);
  if (error) {
    mitFehler(
      kundeId,
      /violates foreign key/i.test(error.message)
        ? "Der Standort lässt sich nicht löschen: Es hängen Aufträge daran. " +
            "Wer ihn nicht mehr braucht, setzt ihn auf inaktiv."
        : datenbankFehlerText(error)
    );
  }
  revalidatePath(`/kunden/${kundeId}`);
  redirect(mitErfolg(zurueck(kundeId), "Standort entfernt."));
}

/**
 * Ein weiterer Partner am Standort: Eigentümer, Verwaltung, Architekt,
 * Hauswart. Der Partner ist eine Adresse aus derselben Tabelle wie die
 * Kunden – deshalb muss der Architekt genau einmal erfasst werden und zieht
 * bei einem Umzug an allen Standorten mit (0076, Abschnitt 8 des Plans).
 */
export async function speichereBeteiligten(kundeId: string, formData: FormData) {
  const supabase = await createClient();

  const id = str(formData.get("id"));
  const standortId = str(formData.get("standort_id"));
  const partnerId = str(formData.get("partner_id"));
  const rolleId = str(formData.get("rolle_id"));

  if (!standortId) mitFehler(kundeId, "Bitte zuerst einen Standort wählen.");
  if (!partnerId) mitFehler(kundeId, "Bitte eine Adresse wählen.");
  if (!rolleId) mitFehler(kundeId, "Bitte eine Rolle wählen.");

  const werte = {
    standort_id: standortId,
    partner_id: partnerId,
    rolle_id: rolleId,
    // „Rollenwechsel braucht ein Datum": Wer bis gestern Eigentümer war,
    // war es für die Rapporte von damals trotzdem.
    gueltig_von: str(formData.get("gueltig_von")),
    gueltig_bis: str(formData.get("gueltig_bis")),
    notiz: str(formData.get("notiz")),
  };

  const { error } = id
    ? await supabase.from("beteiligte").update(werte).eq("id", id)
    : await supabase.from("beteiligte").insert(werte);

  if (error) mitFehler(kundeId, datenbankFehlerText(error));

  revalidatePath(`/kunden/${kundeId}`);
  redirect(
    mitErfolg(
      zurueck(kundeId, `&standort=${standortId}&fokus=neuer_beteiligter`),
      id ? "Beteiligung gespeichert." : "Beteiligung erfasst."
    )
  );
}

export async function loescheBeteiligten(kundeId: string, id: string, standortId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("beteiligte").delete().eq("id", id);
  if (error) mitFehler(kundeId, datenbankFehlerText(error));
  revalidatePath(`/kunden/${kundeId}`);
  redirect(mitErfolg(zurueck(kundeId, `&standort=${standortId}`), "Beteiligung entfernt."));
}

export type StandortOption = {
  id: string;
  bezeichnung: string;
  ort: string | null;
  ist_standard: boolean;
};

/**
 * Die Standorte eines Kunden für ein Auswahlfeld.
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
    .from("beteiligte")
    .select("standorte!inner(id, bezeichnung, ort, ist_standard, aktiv), beteiligten_rollen!inner(bezeichnung)")
    .eq("partner_id", kundeId)
    .eq("beteiligten_rollen.bezeichnung", "Kunde")
    .not("standort_id", "is", null);

  type Zeile = { standorte: StandortOption & { aktiv: boolean } };
  return ((data ?? []) as unknown as Zeile[])
    .map((z) => z.standorte)
    .filter((s) => s && s.aktiv)
    .map(({ id, bezeichnung, ort, ist_standard }) => ({ id, bezeichnung, ort, ist_standard }))
    .sort(
      (a, b) =>
        Number(b.ist_standard) - Number(a.ist_standard) ||
        a.bezeichnung.localeCompare(b.bezeichnung, "de-CH")
    );
}
