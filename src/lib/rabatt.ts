// Feste Rabattstufen für Zeiteinträge (Zeiterfassung & Anfrage-Erledigung).
// Eine Auswahlliste statt Freitext, damit die Werte einheitlich bleiben und
// sich für Auswertungen (z.B. Soll/Ist-Stunden je Mitarbeitendem) eignen.
// 100% = intern/nicht verrechnet, Zeit wird trotzdem erfasst.
export const RABATT_OPTIONEN = [0, 10, 20, 25, 50, 75, 100] as const;

export function rabattLabel(prozent: number) {
  return prozent === 100 ? "100% (nicht verrechnet)" : `${prozent}%`;
}
