// Wandelt eine schnell getippte Uhrzeit in das Format HH:MM.
//
// Das native <input type="time"> wird bewusst NICHT mehr verwendet: Safari
// zeigt in einem leeren Feld die aktuelle Uhrzeit als Vorschau an (kein
// echter Wert, aber nicht davon zu unterscheiden und über kein Attribut
// abschaltbar), und während der Eingabe liefert es "" statt eines
// Zwischenstands – was jede Bindung an React-State zerstört. Dieselbe
// Eigenart ist beim Datumsfeld schon dokumentiert.
//
// Stattdessen ein Textfeld, das grosszügig interpretiert:
//
//   "930"    -> 09:30      "1030"  -> 10:30
//   "10"     -> 10:00      "10:30" -> 10:30
//   "10.30"  -> 10:30      "10 30" -> 10:30
//
// Rückgabe null, wenn nichts Verwertbares drinsteht – dann bleibt das Feld
// leer, statt eine erfundene Zeit zu speichern.
export function normalisiereZeit(eingabe: string | null | undefined): string | null {
  const ziffern = String(eingabe ?? "").replace(/\D/g, "");
  if (ziffern === "") return null;

  let stunde: number;
  let minute: number;

  if (ziffern.length <= 2) {
    // Nur Stunde getippt – volle Stunde annehmen.
    stunde = Number(ziffern);
    minute = 0;
  } else if (ziffern.length === 3) {
    // "930" ist 09:30, nicht 93:0.
    stunde = Number(ziffern.slice(0, 1));
    minute = Number(ziffern.slice(1));
  } else {
    stunde = Number(ziffern.slice(0, 2));
    minute = Number(ziffern.slice(2, 4));
  }

  if (!Number.isFinite(stunde) || !Number.isFinite(minute)) return null;
  if (stunde > 23 || minute > 59) return null;

  return `${String(stunde).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

// Minuten zwischen zwei bereits normalisierten Zeiten. null, wenn eine der
// beiden fehlt oder das Ende nicht nach dem Beginn liegt – Letzteres ist
// entweder ein Vertipper oder ein Einsatz über Mitternacht, und beides darf
// nicht stillschweigend zu 0 Minuten werden.
export function minutenZwischen(von: string | null, bis: string | null): number | null {
  if (!von || !bis) return null;

  const [vh, vm] = von.split(":").map(Number);
  const [bh, bm] = bis.split(":").map(Number);
  if ([vh, vm, bh, bm].some((n) => Number.isNaN(n))) return null;

  const differenz = bh * 60 + bm - (vh * 60 + vm);
  return differenz > 0 ? differenz : null;
}
