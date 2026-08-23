// Datums- und Zeit-Helfer.
//
// ZEITZONE ist die einzige Stelle, an der die Schweizer Zeit steht.
//
// Warum das nötig ist: Der Server läuft auf UTC, die Betriebe arbeiten in
// UTC+1 (Winter) bzw. UTC+2 (Sommer). Alles, was mit `new Date().getHours()`
// oder `toISOString().slice(0, 10)` eine Uhrzeit oder einen Kalendertag
// bestimmt, liefert deshalb serverseitig UTC – und damit im Sommer zwei
// Stunden zu wenig. Am 23.08.2026 hat das der Timer sichtbar gemacht: Wer um
// 14:30 startete, bekam 12:30 in den Eintrag.
//
// Regel für neuen Code: Eine Uhrzeit oder ein Kalendertag entsteht NIE aus
// den lokalen Gettern eines Date, sondern immer über die Funktionen hier.
// Reine Kalenderarithmetik (Wochentag, Tage im Monat) darf mit `new
// Date(`${datum}T12:00:00`)` arbeiten – der Mittag hält jeden Offset aus.
//
// Deutschland und Österreich haben denselben Offset wie die Schweiz; eine
// Zeitzone je Organisation braucht es erst für Märkte ausserhalb von MEZ.

export const ZEITZONE = "Europe/Zurich";

export type Ansicht = "tag" | "woche" | "monat";

const CH_TEILE = new Intl.DateTimeFormat("de-CH", {
  timeZone: ZEITZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  // h23 und nicht hour12:false – sonst steht für Mitternacht je nach
  // ICU-Fassung "24" statt "00" in der Stunde.
  hourCycle: "h23",
});

function chTeile(instant: Date): Record<string, string> {
  const teile: Record<string, string> = {};
  for (const p of CH_TEILE.formatToParts(instant)) teile[p.type] = p.value;
  return teile;
}

/** Kalendertag in der Schweiz, als "JJJJ-MM-TT". */
export function heuteIso(): string {
  const t = chTeile(new Date());
  return `${t.year}-${t.month}-${t.day}`;
}

/** Aktuelle Uhrzeit in der Schweiz, als "HH:MM". */
export function jetztUhrzeit(): string {
  const t = chTeile(new Date());
  return `${t.hour}:${t.minute}`;
}

/**
 * Uhrzeit eines Zeitstempels in Schweizer Zeit, als "HH:MM".
 *
 * Ersetzt das Muster `new Date(x).getHours()` – das las die Serverzeit – und
 * ebenso `x.slice(11, 16)`, das die Zeichen 12 bis 16 aus der ISO-Zeichenkette
 * schnitt und damit ebenfalls UTC ablas.
 */
export function uhrzeitAus(zeitstempel: string | null | undefined): string | null {
  if (!zeitstempel) return null;
  const d = new Date(zeitstempel);
  if (Number.isNaN(d.getTime())) return null;
  const t = chTeile(d);
  return `${t.hour}:${t.minute}`;
}

/**
 * Minute des Tages eines Zeitstempels in Schweizer Zeit – 08:30 wird 510.
 *
 * Für Überschneidungsprüfungen im Zeitraster. Vorher stand dafür überall
 * `zeitstempel.slice(11, 16)`, was die UTC-Stunde aus der Zeichenkette
 * schnitt: Zwei Einsätze wurden gegen die falsche Tagesgrenze geprüft.
 */
export function minutenAus(zeitstempel: string | null | undefined): number | null {
  const zeit = uhrzeitAus(zeitstempel);
  if (!zeit) return null;
  const [h, m] = zeit.split(":").map(Number);
  return Number.isNaN(h) || Number.isNaN(m) ? null : h * 60 + m;
}

/** Kalendertag eines Zeitstempels in Schweizer Zeit, als "JJJJ-MM-TT". */
export function tagAus(zeitstempel: string | null | undefined): string | null {
  if (!zeitstempel) return null;
  const d = new Date(zeitstempel);
  if (Number.isNaN(d.getTime())) return null;
  const t = chTeile(d);
  return `${t.year}-${t.month}-${t.day}`;
}

// Offset der Schweiz zu UTC in Minuten, für DIESEN Zeitpunkt – im Sommer
// 120, im Winter 60. Aus der Zeitzonendatenbank gelesen und nicht gerechnet,
// damit die Umstellungstermine nicht gepflegt werden müssen.
function offsetMinuten(instant: Date): number {
  const name =
    new Intl.DateTimeFormat("en-US", { timeZone: ZEITZONE, timeZoneName: "longOffset" })
      .formatToParts(instant)
      .find((p) => p.type === "timeZoneName")?.value ?? "GMT+00:00";
  const treffer = /GMT([+-])(\d{2}):(\d{2})/.exec(name);
  if (!treffer) return 0;
  const betrag = Number(treffer[2]) * 60 + Number(treffer[3]);
  return treffer[1] === "-" ? -betrag : betrag;
}

/**
 * Baut aus Schweizer Kalendertag und Uhrzeit einen echten Zeitstempel mit
 * Offset – "2026-08-23" + "08:00" wird zu "2026-08-23T06:00:00.000Z".
 *
 * Vorher wurde `${datum}T${zeit}:00` ohne Offset in eine timestamptz-Spalte
 * geschrieben. Postgres legt eine Angabe ohne Offset in der Zeitzone der
 * Sitzung ab, und die ist UTC: Ein auf 08:00 geplanter Einsatz stand als
 * 08:00 UTC in der Datenbank, also 10:00 Schweizer Zeit. Beim Anzeigen wurde
 * derselbe Fehler rückwärts gemacht, deshalb sah es richtig aus – aber jeder
 * Vergleich mit `now()` und jeder Cron-Lauf rechnete mit zwei Stunden Versatz.
 *
 * Zwei Durchgänge, weil der Offset am gesuchten Zeitpunkt hängt: Der erste
 * schätzt ihn, der zweite bestätigt ihn. Das macht die Nacht der Umstellung
 * Ende März und Ende Oktober richtig.
 */
export function zeitstempelCH(datumIso: string, zeit: string): string {
  const alsUtc = new Date(`${datumIso}T${zeit}:00Z`).getTime();
  if (Number.isNaN(alsUtc)) throw new Error(`Ungültige Zeitangabe: ${datumIso} ${zeit}`);
  const ersterVersuch = alsUtc - offsetMinuten(new Date(alsUtc)) * 60_000;
  const ms = alsUtc - offsetMinuten(new Date(ersterVersuch)) * 60_000;
  return new Date(ms).toISOString();
}

// Nur für die Kalenderarithmetik unten (Wochen, Monate): Die Date-Objekte
// dort werden mit parseISO() aus einem Kalendertag gebaut und lokal gelesen,
// also im selben Bezug geschrieben wie gelesen. Für "jetzt" oder "heute" ist
// das FALSCH – dafür heuteIso() oben.
function toISO(d: Date) {
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

export function formatDatumCH(iso: string) {
  return parseISO(iso).toLocaleDateString("de-CH");
}

/** Wochenraster (6 Wochen à 7 Tage, Montag-Start) rund um den Monat von `bezugsdatumIso`. */
export function monatsRaster(bezugsdatumIso: string): string[][] {
  const bezug = parseISO(bezugsdatumIso);
  const start = montag(ersterImMonat(bezug));
  const end = sonntag(letzterImMonat(bezug));

  const tage: string[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    tage.push(toISO(cur));
    cur.setDate(cur.getDate() + 1);
  }

  const wochen: string[][] = [];
  for (let i = 0; i < tage.length; i += 7) wochen.push(tage.slice(i, i + 7));
  return wochen;
}

export function label(ansicht: Ansicht, von: string, bis: string) {
  if (ansicht === "tag") return formatDatumCH(von);
  if (ansicht === "woche") return `${formatDatumCH(von)} – ${formatDatumCH(bis)}`;
  return parseISO(von).toLocaleDateString("de-CH", { month: "long", year: "numeric" });
}
