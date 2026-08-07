// Kleine Datums-Helfer für die Auswertungen (Tag/Woche/Monat).
// Arbeitet bewusst mit lokalen Kalendertagen (kein UTC-Shift).

export type Ansicht = "tag" | "woche" | "monat";

function toISO(d: Date) {
  // Bewusst ohne toISOString(): die würde nach UTC konvertieren und könnte
  // bei Zeitzonen östlich von UTC (z.B. Schweiz) auf den Vortag zurückfallen.
  const jahr = d.getFullYear();
  const monat = String(d.getMonth() + 1).padStart(2, "0");
  const tag = String(d.getDate()).padStart(2, "0");
  return `${jahr}-${monat}-${tag}`;
}

function parseISO(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function montag(d: Date) {
  const kopie = new Date(d);
  const tag = kopie.getDay(); // 0 = Sonntag
  const diff = tag === 0 ? -6 : 1 - tag;
  kopie.setDate(kopie.getDate() + diff);
  return kopie;
}

export function sonntag(d: Date) {
  const m = montag(d);
  m.setDate(m.getDate() + 6);
  return m;
}

export function ersterImMonat(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function letzterImMonat(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

/** Liefert [von, bis] als ISO-Strings für die gewählte Ansicht rund um `bezugsdatum`. */
export function zeitraumFuer(ansicht: Ansicht, bezugsdatumIso: string): [string, string] {
  const bezug = parseISO(bezugsdatumIso);
  if (ansicht === "tag") return [toISO(bezug), toISO(bezug)];
  if (ansicht === "woche") return [toISO(montag(bezug)), toISO(sonntag(bezug))];
  return [toISO(ersterImMonat(bezug)), toISO(letzterImMonat(bezug))];
}

/** Verschiebt das Bezugsdatum um +/- eine Einheit der gewählten Ansicht. */
export function verschieben(ansicht: Ansicht, bezugsdatumIso: string, richtung: 1 | -1): string {
  const bezug = parseISO(bezugsdatumIso);
  if (ansicht === "tag") bezug.setDate(bezug.getDate() + richtung);
  else if (ansicht === "woche") bezug.setDate(bezug.getDate() + 7 * richtung);
  else bezug.setMonth(bezug.getMonth() + richtung);
  return toISO(bezug);
}

export function heuteIso() {
  return toISO(new Date());
}

export function formatDatumCH(iso: string) {
  return parseISO(iso).toLocaleDateString("de-CH");
}

export function label(ansicht: Ansicht, von: string, bis: string) {
  if (ansicht === "tag") return formatDatumCH(von);
  if (ansicht === "woche") return `${formatDatumCH(von)} – ${formatDatumCH(bis)}`;
  return parseISO(von).toLocaleDateString("de-CH", { month: "long", year: "numeric" });
}
