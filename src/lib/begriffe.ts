import { cache } from "react";
import { createClient } from "./supabase/server";

// Wie ein Betrieb die Dinge nennt (Migration 0073).
//
// Die Struktur von ArcoTime ist für alle dieselbe – das Beispiel Migros
// Region Basel mit ihren Filialen ist dasselbe Modell wie eine
// Liegenschaftsverwaltung mit ihren Liegenschaften. Verschieden sind nur die
// Wörter. Deshalb gibt es kein zweites Datenmodell je Branche, sondern eine
// Tabelle mit Beschriftungen.

export type BegriffSchluessel =
  | "kunde"
  | "standort"
  | "projekt"
  | "anfrage"
  | "rapport"
  | "artikel";

export type Genus = "m" | "f" | "n";
export type Begriff = { einzahl: string; mehrzahl: string; genus: Genus };

// Die Vorgabe steht hier und nicht nur in der Datenbank.
//
// Zwei Gründe: Eine fehlende Zeile darf keine leere Beschriftung ergeben
// ("Neue  anlegen"), und die Anwendung muss auch dann etwas anzeigen können,
// wenn sie die Begriffe gar nicht erst geladen hat – etwa auf einer Seite
// ohne Anmeldung. Die Werte sind identisch mit der neutralen Vorgabe der
// Migration: Wer nichts einstellt, sieht genau das, was vorher dastand.
export const VORGABEN: Record<BegriffSchluessel, Begriff> = {
  kunde: { einzahl: "Kunde", mehrzahl: "Kunden", genus: "m" },
  standort: { einzahl: "Standort", mehrzahl: "Standorte", genus: "m" },
  projekt: { einzahl: "Projekt", mehrzahl: "Projekte", genus: "n" },
  anfrage: { einzahl: "Anfrage", mehrzahl: "Anfragen", genus: "f" },
  rapport: { einzahl: "Rapport", mehrzahl: "Rapporte", genus: "m" },
  // Einzahl und Mehrzahl sind gleich, das Genus wechselte mit dem Wort:
  // die Dienstleistung war weiblich, der Artikel ist männlich.
  artikel: { einzahl: "Artikel", mehrzahl: "Artikel", genus: "m" },
};

export type Begriffe = Record<BegriffSchluessel, Begriff>;

/**
 * Die Begriffe der eigenen Organisation, einmal je Request.
 *
 * react-cache aus demselben Grund wie bei getCurrentOrganisation: Layout und
 * Seite brauchen sie beide, und zwei Abfragen für dieselbe Antwort wären
 * Verschwendung auf jeder einzelnen Seite.
 *
 * Die Abfrage läuft über den RLS-geprüften Client; ohne Anmeldung kommt
 * nichts zurück und es gelten die Vorgaben.
 */
export const getBegriffe = cache(async (): Promise<Begriffe> => {
  const ergebnis: Begriffe = { ...VORGABEN };
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("begriffe")
      .select("schluessel, einzahl, mehrzahl, genus");
    for (const zeile of data ?? []) {
      const schluessel = zeile.schluessel as BegriffSchluessel;
      if (schluessel in ergebnis && zeile.einzahl && zeile.mehrzahl) {
        ergebnis[schluessel] = {
          einzahl: zeile.einzahl,
          mehrzahl: zeile.mehrzahl,
          genus: (zeile.genus as Genus) ?? VORGABEN[schluessel].genus,
        };
      }
    }
  } catch {
    // Eine fehlende Beschriftung ist kein Grund, eine Seite nicht
    // anzuzeigen. Dann eben mit den Vorgaben.
  }
  return ergebnis;
});

/** Kurzform für die Anzeige: begriff(b, "projekt") -> "Auftrag". */
export function begriff(
  begriffe: Begriffe,
  schluessel: BegriffSchluessel,
  form: "einzahl" | "mehrzahl" = "einzahl"
): string {
  return begriffe[schluessel]?.[form] ?? VORGABEN[schluessel][form];
}

const UNBESTIMMT: Record<Genus, string> = { m: "Neuer", f: "Neue", n: "Neues" };
const BESTIMMT: Record<Genus, string> = { m: "Der", f: "Die", n: "Das" };

/**
 * „Neuer Auftrag", „Neue Liegenschaft", „Neues Ticket".
 *
 * Ohne diese Funktion stünde auf dem Knopf „Neues Auftrag", sobald ein
 * Betrieb das Projekt umbenennt – der Artikel lässt sich im Deutschen nicht
 * aus dem Wort ableiten.
 */
export function neuLabel(begriffe: Begriffe, schluessel: BegriffSchluessel): string {
  const b = begriffe[schluessel] ?? VORGABEN[schluessel];
  return `${UNBESTIMMT[b.genus]} ${b.einzahl}`;
}

/** „Der Auftrag", „Die Liegenschaft" – für Sätze in Meldungen. */
export function derLabel(begriffe: Begriffe, schluessel: BegriffSchluessel): string {
  const b = begriffe[schluessel] ?? VORGABEN[schluessel];
  return `${BESTIMMT[b.genus]} ${b.einzahl}`;
}
