import type { PostgrestError } from "@supabase/supabase-js";

// Verständliche Meldungen für die Bedingungen, die die Datenbank durchsetzt.
//
// Eine Bedingung im Schema ist die verlässlichere Prüfung – sie gilt auch für
// Wege, die es noch nicht gibt (Handy-App, Import, Datenpflege). Der Preis
// dafür ist ihre Sprache: "conflicting key value violates exclusion constraint
// zeiteintraege_keine_ueberlappung" ist für eine Monteurin auf der Baustelle
// keine Hilfe.
//
// Deshalb hier die Übersetzung, an einer Stelle. Was nicht aufgeführt ist,
// kommt weiterhin im Originalton durch – ein unbekannter Fehler, der als
// freundlicher Satz getarnt wird, ist schlimmer als einer, den man googeln
// kann.
const MELDUNGEN: Record<string, string> = {
  // 0072
  zeiteintraege_keine_ueberlappung:
    "Für diese Person besteht in diesem Zeitraum schon ein Eintrag. " +
    "Eine Person kann nicht an zwei Orten gleichzeitig arbeiten – bitte die " +
    "Zeiten prüfen.",
  uq_zeiteintraege_ein_laufender_timer:
    "Für diese Person läuft schon ein Timer. Bitte zuerst den laufenden " +
    "Timer stoppen.",
  uq_zeiteintraege_idempotenz:
    "Dieser Eintrag wurde bereits übermittelt und ist gespeichert – er wird " +
    "nicht doppelt angelegt.",
  zeiteintraege_quelle_check:
    "Unbekannte Herkunft des Eintrags. Erlaubt sind web, app, import und system.",
};

/**
 * Übersetzt einen Datenbankfehler, wenn wir für seine Bedingung einen Satz
 * haben – sonst gibt sie die Originalmeldung zurück.
 *
 * Geprüft wird gegen den Namen der Bedingung, nicht gegen den Text: Der Text
 * hängt an der Postgres-Fassung und an der Sprache des Servers, der Name
 * steht in unserer Migration.
 */
export function datenbankFehlerText(
  fehler: Pick<PostgrestError, "message"> | null | undefined
): string {
  const text = fehler?.message ?? "Unbekannter Fehler.";
  for (const [bedingung, meldung] of Object.entries(MELDUNGEN)) {
    if (text.includes(bedingung)) return meldung;
  }
  return text;
}
