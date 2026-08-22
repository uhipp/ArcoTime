import type { ZeiteintragMitDetails } from "./types";

// Beschriftet eine Zeile mit ihrer eigenen Mengengrösse: Stunden bei
// Arbeitszeit, sonst die Menge mit der Einheit der Artikel
// (7.00 km, 3 Stück, …).
//
// Ohne das stünde bei Mengenartikeln "null h", weil menge_stunden für sie
// bewusst leer bleibt – Kilometer dürfen nicht als Stunden gezählt werden.
export function mengeLabel(
  z: Pick<ZeiteintragMitDetails, "menge_stunden" | "menge" | "einheit">
): string {
  if (z.menge_stunden != null) return `${Number(z.menge_stunden)} h`;
  if (z.menge != null) return `${Number(z.menge)} ${z.einheit}`;
  return "–";
}
