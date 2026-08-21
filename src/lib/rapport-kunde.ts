import type { KundeAmRapport } from "./types";

/**
 * Setzt den Kunden eines Rapports aus seinem Auftrag.
 *
 * Seit 0071 steht der Kunde am Projekt und nicht mehr am Rapport. Die
 * Abfragen holen ihn deshalb verschachtelt (`projekte(kunden(...))`), und
 * diese Funktion legt ihn für die Anzeige eine Ebene höher.
 *
 * Warum überhaupt: Ohne sie müssten vierzehn Stellen in der Oberfläche
 * `r.projekte?.kunden?.name` schreiben. Ändert sich der Weg noch einmal –
 * etwa wenn die Standorte dazukommen –, ist es hier eine Zeile statt
 * vierzehn. Der Wert ist eine Ableitung für die Anzeige, keine zweite
 * Wahrheit in der Datenbank.
 */
export function mitKunde<
  T extends { projekte?: { kunden?: KundeAmRapport | null } | null },
>(rapport: T): T & { kunde: KundeAmRapport | null } {
  return { ...rapport, kunde: rapport.projekte?.kunden ?? null };
}
