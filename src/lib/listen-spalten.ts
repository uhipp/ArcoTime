import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
import { vergleiche } from "@/lib/sortierung";

// Eine Spalte einer Liste – Kopf, Zelle und Sortierwert an einem Ort.
//
// Bisher standen die drei Teile an drei Stellen der Seite: der Titel im
// <thead>, der Inhalt im <tbody>, der Sortierwert in einer Tabelle
// darüber. Wer eine Spalte hinzufügte, musste alle drei treffen – und
// die Zellen um eine verrutschen zu lassen war eine Frage der Zeit.
export type Spalte<T> = {
  // Schlüssel für Sortierung und gespeicherte Auswahl. Bleibt stabil,
  // auch wenn sich der Titel ändert.
  key: string;
  titel: string;
  // Immer sichtbar und nicht abwählbar. Gilt für die Spalte, über die
  // der Datensatz geöffnet wird – ohne sie wäre die Liste eine Sackgasse.
  fest?: boolean;
  // Standardmässig ausgeblendet. So kann der Katalog mehr anbieten, als
  // die Liste ungefragt zeigt.
  aus?: boolean;
  // Fehlt der Wert, ist die Spalte nicht sortierbar.
  wert?: (z: T) => unknown;
  klasse?: string;
  zelle: (z: T) => ReactNode;
  // Wert für die Fusszeile, z.B. eine Summe. Die Berechnung gehört zur
  // Spalte: Wird sie ausgeblendet, verschwindet auch ihre Summe – und
  // niemand muss ein colSpan nachzählen.
  fuss?: (zeilen: T[]) => ReactNode;
};

export function standardSchluessel<T>(alle: Spalte<T>[]): string[] {
  return alle.filter((s) => s.fest || !s.aus).map((s) => s.key);
}

// Liest die gespeicherte Auswahl der angemeldeten Person und gibt die
// sichtbaren Spalten zurück.
//
// Die Reihenfolge ist immer die des Katalogs, nicht die der gespeicherten
// Liste: Spalten umzuordnen ist eine eigene Sache und wäre hier nur ein
// zufälliges Nebenergebnis davon, in welcher Reihenfolge jemand die
// Häkchen gesetzt hat.
export async function sichtbareSpalten<T>(
  liste: string,
  alle: Spalte<T>[]
): Promise<{ sichtbar: Spalte<T>[]; gewaehlt: string[] }> {
  const supabase = await createClient();

  // Die Regel aus 0048 lässt ohnehin nur die eigene Zeile zu, deshalb
  // genügt der Listenschlüssel als Bedingung.
  const { data } = await supabase
    .from("spaltenwahl")
    .select("spalten")
    .eq("liste", liste)
    .maybeSingle();

  const gespeichert = (data?.spalten as string[] | undefined) ?? null;
  const sichtbar = gespeichert
    ? alle.filter((s) => s.fest || gespeichert.includes(s.key))
    : alle.filter((s) => s.fest || !s.aus);

  return { sichtbar, gewaehlt: sichtbar.map((s) => s.key) };
}

// Sortiert die Zeilen nach dem Wunsch aus der Adresse.
//
// Steht hier und nicht auf jeder Seite, weil der Sortierwert ohnehin
// schon in der Spalte steht – die Seite müsste ihn sonst ein zweites Mal
// nachschlagen. Ohne Sortierwunsch bleibt die Reihenfolge der Abfrage.
export function sortiere<T>(
  zeilen: T[],
  spalten: Spalte<T>[],
  sort: string | undefined,
  richtung: string | undefined
): T[] {
  const spalte = sort ? spalten.find((s) => s.key === sort) : undefined;
  const wert = spalte?.wert;
  if (!wert) return zeilen;
  const faktor = richtung === "ab" ? -1 : 1;
  return [...zeilen].sort((a, b) => faktor * vergleiche(wert(a), wert(b)));
}
