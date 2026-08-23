import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganisation } from "@/lib/get-profile";
import { logoAdresseVon } from "@/lib/logo-adresse";
import { standorteAktiv } from "@/lib/standorte";
import { begriff, getBegriffe } from "@/lib/begriffe";
import type { Rapport, ZeiteintragMitDetails } from "@/lib/types";

export type DokumentAdresse = {
  name: string;
  vorname: string | null;
  adresse_zusatz: string | null;
  strasse: string | null;
  hausnummer: string | null;
  postfach: string | null;
  plz: string | null;
  ort: string | null;
};

/**
 * Wo gearbeitet wurde (0077). Getrennt von der Anschrift: Die Rechnung geht
 * an die Verwaltung, gearbeitet wurde in der Liegenschaft. Bis 0076 stand auf
 * dem Rapport nur die Adresse des Kunden – der Monteur fuhr zur Verwaltung.
 */
export type DokumentEinsatzort = {
  bezeichnung: string;
  strasse: string | null;
  hausnummer: string | null;
  plz: string | null;
  ort: string | null;
  zugang: string | null;
};

/**
 * Ein Mensch, den der Ausführende vor Ort brauchen kann – mit Rolle und
 * Nummer. Aus dem Gespräch vom 22.08.2026: „Eigentlich benötigen sie lediglich
 * den Rapport mit allen Informationen." Genau die Menschen fehlten bis dahin,
 * und das sind die, die aufmachen, wenn niemand aufmacht.
 */
export type DokumentKontakt = {
  /** „Eigentümer", „Hauswart", „Ansprechperson" – was diese Person hier ist. */
  rolle: string;
  name: string;
  telefon: string | null;
  email: string | null;
  /** Funktion oder Notiz, wenn eine dasteht. */
  zusatz: string | null;
};

export type RapportDokument = {
  rapport: Rapport;
  positionen: ZeiteintragMitDetails[];
  kunde: DokumentAdresse | null;
  // null, solange die Ortsebene aus ist oder der Ort dieselbe Adresse
  // trägt wie der Kunde – dann wäre die Zeile eine Wiederholung.
  einsatzort: DokumentEinsatzort | null;
  // Wer vor Ort erreichbar ist: die Ansprechperson beim Kunden und die
  // zusätzlichen Adressen des Auftrags, gültig am Tag des Einsatzes.
  kontakte: DokumentKontakt[];
  // Wie dieser Betrieb einen Artikel nennt (0073) – der Spaltentitel auf
  // Papier und im PDF. Steht in den Daten und nicht in der Darstellung,
  // damit Druckansicht und PDF nicht auseinanderlaufen.
  artikelLabel: string;
  absender: {
    name: string | null;
    strasse: string | null;
    plz: string | null;
    ort: string | null;
    telefon: string | null;
    email: string | null;
    webseite: string | null;
    logoAdresse: string | null;
    // Name – Strasse Nr – PLZ Ort, für die Zeile über der Anschrift.
    zeile: string | null;
  };
  summeStunden: number;
};

// Lädt alles, was ein Rapportdokument braucht – für die Druckansicht wie
// für das PDF.
//
// Bewusst gemeinsam: Beide zeigen dasselbe Dokument, und zwei getrennte
// Abfragen würden über kurz oder lang Verschiedenes zeigen. Genau diese
// Art von doppelt geführter Wahrheit hat in diesem Projekt schon mehrfach
// Fehler erzeugt.
export async function ladeRapportDokument(id: string): Promise<RapportDokument | null> {
  const supabase = await createClient();

  const [organisation, { data: rapportRoh }, { data: positionenRoh }] = await Promise.all([
    getCurrentOrganisation(),
    supabase
      .from("rapporte")
      .select(
        // Der Kunde hängt seit 0071 am Projekt, nicht am Rapport – die
        // Anschrift des Rapport-PDF kommt deshalb verschachtelt.
        "*, projekte(bezeichnung, kostenstelle, kunden(id, name, vorname, adresse_zusatz, strasse, hausnummer, postfach, plz, ort)), profiles!rapporte_mitarbeiter_id_fkey(name)"
      )
      .eq("id", id)
      .single(),
    supabase
      .from("v_zeiteintraege")
      .select("*")
      .eq("rapport_id", id)
      .order("start_zeit", { ascending: true, nullsFirst: false }),
  ]);

  if (!rapportRoh) return null;

  const kunde =
    (rapportRoh as { projekte?: { kunden?: DokumentAdresse | null } | null })
      .projekte?.kunden ?? null;
  const absenderStrasse =
    [organisation?.strasse, organisation?.hausnummer].filter(Boolean).join(" ") || null;

  const zeile =
    [
      organisation?.name,
      absenderStrasse,
      [organisation?.plz, organisation?.ort].filter(Boolean).join(" ") || null,
    ]
      .filter(Boolean)
      .join(" – ") || null;

  const positionen = (positionenRoh as ZeiteintragMitDetails[] | null) ?? [];

  // Der Einsatzort in einer eigenen Abfrage und nur, wenn die Ortsebene
  // eingeschaltet ist. Beides mit Absicht: Die Einbettung im Rapport oben
  // würde vor der Migration die ganze Abfrage leer zurückgeben, und ein
  // Rapport ohne Positionen ist ein schlimmerer Fehler als ein Rapport ohne
  // Ortszeile.
  const projektId = (rapportRoh as { projekt_id?: string | null }).projekt_id ?? null;
  let einsatzort: DokumentEinsatzort | null = null;
  if (projektId && (await standorteAktiv())) {
    // Die Adresse kommt vom Standort, der Zugang vom Auftrag: Der Standort ist
    // seit 0079 eine Postadresse und trägt nichts weiter, und der Zugang kann
    // sich von Vorhaben zu Vorhaben unterscheiden (0080).
    const { data } = await supabase
      .from("projekte")
      .select("zugang, standorte(bezeichnung, strasse, hausnummer, plz, ort)")
      .eq("id", projektId)
      .maybeSingle();
    const auftrag = data as { zugang?: string | null; standorte?: unknown } | null;
    const roh = auftrag?.standorte;
    const adresse = (Array.isArray(roh) ? roh[0] : roh) as
      | Omit<DokumentEinsatzort, "zugang">
      | null
      | undefined;
    const ort: DokumentEinsatzort | null = adresse
      ? { ...adresse, zugang: auftrag?.zugang ?? null }
      : null;
    // Trägt der Ort dieselbe Adresse wie der Kunde – der Normalfall beim
    // Standardstandort –, bleibt die Zeile weg. Sie soll auffallen, wenn sie
    // etwas Neues sagt.
    const gleich =
      ort &&
      (ort.strasse ?? "") === (kunde?.strasse ?? "") &&
      (ort.hausnummer ?? "") === (kunde?.hausnummer ?? "") &&
      (ort.plz ?? "") === (kunde?.plz ?? "") &&
      (ort.ort ?? "") === (kunde?.ort ?? "");
    if (ort && (!gleich || ort.zugang)) einsatzort = ort;
  }

  const kundeId = (kunde as (DokumentAdresse & { id?: string }) | null)?.id ?? null;
  const kontakte = await ladeRapportKontakte(
    supabase,
    projektId,
    kundeId,
    (rapportRoh as { datum?: string | null }).datum ?? null
  );

  return {
    rapport: rapportRoh as Rapport,
    positionen,
    kunde,
    einsatzort,
    kontakte,
    artikelLabel: begriff(await getBegriffe(), "artikel", "einzahl"),
    absender: {
      name: organisation?.name ?? null,
      strasse: absenderStrasse,
      plz: organisation?.plz ?? null,
      ort: organisation?.ort ?? null,
      telefon: organisation?.telefon ?? null,
      email: organisation?.email ?? null,
      webseite: organisation?.webseite ?? null,
      logoAdresse: logoAdresseVon(organisation?.logo_pfad),
      zeile,
    },
    // Nur Arbeitszeit – Mengenartikel wie Kilometer oder Material haben
    // keine Dauer und dürfen die Stundensumme nicht aufblähen.
    summeStunden: positionen.reduce((s, z) => s + Number(z.menge_stunden ?? 0), 0),
  };
}


/**
 * Wer bei einem Einsatz erreichbar ist. Zwei Quellen, eine Liste:
 *
 *   die Ansprechperson beim Kunden  – wer dort zuständig ist
 *   die zusätzlichen Adressen       – Eigentümer, Hauswart, Architekt …
 *
 * Bewusst eine eigene Funktion: Das Dokument und die Bildschirmmaske brauchen
 * dieselbe Liste, und zwei Umsetzungen derselben Regel wären über kurz oder
 * lang zwei Wahrheiten. Genau diese Art doppelt geführter Wahrheit hat in
 * diesem Projekt schon mehrfach Fehler erzeugt.
 *
 * Die zusätzlichen Adressen werden auf den Tag des Einsatzes gefiltert. Genau
 * dafür tragen sie „ab" und „bis": Wer bis gestern Eigentümer war, war es für
 * den Rapport von damals trotzdem – und steht deshalb auf dem Rapport von
 * damals, aber nicht auf dem von heute.
 */
export async function ladeRapportKontakte(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projektId: string | null,
  kundeId: string | null,
  datum: string | null
): Promise<DokumentKontakt[]> {
  const [{ data: adressenRoh }, { data: personenRoh }] = await Promise.all([
    projektId
      ? supabase
          .from("projekt_adressen")
          .select(
            "gueltig_von, gueltig_bis, notiz, kunden(name, vorname, telefon, email), adress_rollen(bezeichnung, sortierung)"
          )
          .eq("projekt_id", projektId)
      : Promise.resolve({ data: [] }),
    kundeId
      ? supabase
          .from("ansprechpersonen")
          .select("vorname, name, funktion, kontakte(wert, kontakt_arten(bezeichnung, art))")
          .eq("kunde_id", kundeId)
          .eq("aktiv", true)
          .eq("ist_standard", true)
      : Promise.resolve({ data: [] }),
  ]);

  const einzeln = <T,>(wert: unknown): T | undefined =>
    (Array.isArray(wert) ? wert[0] : wert) as T | undefined;

  const gilt = (von: string | null, bis: string | null) =>
    !datum || ((!von || von <= datum) && (!bis || bis >= datum));

  type AdressZeile = {
    gueltig_von: string | null;
    gueltig_bis: string | null;
    notiz: string | null;
    kunden?: unknown;
    adress_rollen?: unknown;
  };

  const ausAdressen = ((adressenRoh ?? []) as unknown as AdressZeile[])
    .filter((z) => gilt(z.gueltig_von, z.gueltig_bis))
    .map((z) => {
      const partner = einzeln<{
        name: string;
        vorname: string | null;
        telefon: string | null;
        email: string | null;
      }>(z.kunden);
      const rolle = einzeln<{ bezeichnung: string; sortierung: number }>(z.adress_rollen);
      return {
        rolle: rolle?.bezeichnung ?? "Beteiligt",
        name: partner ? [partner.vorname, partner.name].filter(Boolean).join(" ") : "",
        telefon: partner?.telefon ?? null,
        email: partner?.email ?? null,
        zusatz: z.notiz,
        sortierung: rolle?.sortierung ?? 99,
      };
    })
    .filter((k) => k.name !== "")
    .sort((a, b) => a.sortierung - b.sortierung);

  type PersonZeile = {
    vorname: string | null;
    name: string;
    funktion: string | null;
    kontakte?: { wert: string; kontakt_arten?: unknown }[];
  };

  const ausPersonen: DokumentKontakt[] = ((personenRoh ?? []) as unknown as PersonZeile[]).map(
    (person) => {
      // Die erste Nummer und die erste Mailadresse genügen: Auf einem Blatt
      // Papier ist eine erreichbare Angabe mehr wert als vier zur Auswahl.
      let telefon: string | null = null;
      let email: string | null = null;
      for (const k of person.kontakte ?? []) {
        const art = einzeln<{ art: string }>(k.kontakt_arten)?.art;
        if (art === "telefon" && !telefon) telefon = k.wert;
        if (art === "email" && !email) email = k.wert;
      }
      return {
        rolle: "Ansprechperson",
        name: [person.vorname, person.name].filter(Boolean).join(" "),
        telefon,
        email,
        zusatz: person.funktion,
      };
    }
  );

  return [
    ...ausPersonen,
    ...ausAdressen.map(({ rolle, name, telefon, email, zusatz }) => ({
      rolle,
      name,
      telefon,
      email,
      zusatz,
    })),
  ];
}
