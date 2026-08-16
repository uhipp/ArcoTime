// Gestaffelte Lizenzpreise (Volume-Pricing – die erreichte Stufe gilt für
// ALLE Benutzer, nicht nur die zusätzlichen). Muss exakt mit den in Stripe
// hinterlegten Preisstufen übereinstimmen (siehe STRIPE_PRICE_MONATLICH /
// STRIPE_PRICE_JAEHRLICH). Die tatsächliche Abrechnung übernimmt Stripe
// selbst anhand der dort konfigurierten Stufen – hier wird nur dieselbe
// Rechnung nachvollzogen, damit der Kunde den Preis sieht, BEVOR er
// weitergeleitet wird.
const STUFEN = [
  { bisEinschliesslich: 9, monatlich: 15, jaehrlich: 150 },
  { bisEinschliesslich: 19, monatlich: 13, jaehrlich: 130 },
  { bisEinschliesslich: Infinity, monatlich: 11, jaehrlich: 110 },
] as const;

// Die Zusatzmodule, festgelegt am 16.08.2026.
//
// Zwei verschiedene Bezugsgrössen, und zwar mit Absicht:
//
// Die DISPOSITION bedient das Büro – ein oder zwei Personen planen für
// alle. Ihr Nutzen wächst nicht mit der Kopfzahl, ein Zuschlag je Lizenz
// wäre deshalb bei einem 20-Mann-Betrieb schwer zu begründen und der
// häufigste Grund, ein Modul abzulehnen. Also eine Pauschale.
//
// Das ZEITKONTO führt für JEDE Person ein Konto mit Soll, Ist, Saldo und
// Ferien. Hier wächst der Nutzen mit der Kopfzahl, und ein Zuschlag je
// Lizenz ist die ehrlichere Rechnung.
export const MODULPREISE = {
  disposition: { monatlich: 49, jaehrlich: 490, jeLizenz: false },
  zeitkonto: { monatlich: 4, jaehrlich: 40, jeLizenz: true },
} as const;

export type Modul = keyof typeof MODULPREISE;

// Jahrespreis = zehn Monatspreise: Zwei Monate sind geschenkt. Das gilt
// für die Basis wie für beide Module – eine Ausnahme wäre in der
// Rechnung nicht zu erklären.
export function modulpreis(
  modul: Modul,
  anzahlLizenzen: number,
  zyklus: "monatlich" | "jaehrlich"
): number {
  const preis = MODULPREISE[modul];
  const satz = zyklus === "monatlich" ? preis.monatlich : preis.jaehrlich;
  return preis.jeLizenz ? satz * anzahlLizenzen : satz;
}

export function preisProBenutzer(anzahlBenutzer: number, zyklus: "monatlich" | "jaehrlich"): number {
  const stufe = STUFEN.find((s) => anzahlBenutzer <= s.bisEinschliesslich) ?? STUFEN[STUFEN.length - 1];
  return zyklus === "monatlich" ? stufe.monatlich : stufe.jaehrlich;
}

// Preis für exakt diese Menge, ohne Bestpreis-Korrektur.
function rohpreis(anzahlBenutzer: number, zyklus: "monatlich" | "jaehrlich"): number {
  return anzahlBenutzer * preisProBenutzer(anzahlBenutzer, zyklus);
}

// Bestpreis-Garantie.
//
// Bei Volume-Pricing entstehen an den Stufengrenzen Sprünge, bei denen eine
// KLEINERE Menge mehr kostet als eine grössere: 9 Benutzer kosten 9 × 9.– =
// 81.–, 10 Benutzer aber nur 10 × 8.– = 80.–. Dasselbe bei 18 und 19
// gegenüber 20. Das ist keine Fehlkonfiguration, sondern eine unvermeidliche
// Eigenschaft der Staffel 9/8/7 – sprungfrei wäre sie nur mit Sätzen ab
// 8.10 bzw. 7.70 darstellbar, was die Rabatte praktisch auflöst.
//
// Statt die Preise zu verwässern wird deshalb auf die günstigere Menge
// aufgerundet: Wer 9 Benutzer bestellt, bekommt 10 Lizenzen für 80.– und
// zahlt damit weniger als für 9. Niemand zahlt je mehr als für eine grössere
// Menge, und die kommunizierte Staffel bleibt unverändert.
export function abgerechneteMenge(
  anzahlBenutzer: number,
  zyklus: "monatlich" | "jaehrlich"
): number {
  // Günstiger kann es nur an einer Stufengrenze werden – dazwischen steigt
  // der Preis streng mit der Menge.
  const grenzen = STUFEN.map((s) => s.bisEinschliesslich + 1).filter(
    (n) => Number.isFinite(n) && n > anzahlBenutzer
  );

  let beste = anzahlBenutzer;
  let bestpreis = rohpreis(anzahlBenutzer, zyklus);

  for (const menge of grenzen) {
    // Nur bei echtem Vorteil wechseln – bei Gleichstand die kleinere Menge
    // behalten, sonst würden Lizenzen ohne Ersparnis aufgedrängt.
    if (rohpreis(menge, zyklus) < bestpreis) {
      beste = menge;
      bestpreis = rohpreis(menge, zyklus);
    }
  }

  return beste;
}

// Tatsächlich zu zahlender Betrag – inklusive Bestpreis-Korrektur.
export function gesamtpreis(anzahlBenutzer: number, zyklus: "monatlich" | "jaehrlich"): number {
  return rohpreis(abgerechneteMenge(anzahlBenutzer, zyklus), zyklus);
}

// Gesamtpreis inklusive der gebuchten Module.
//
// Die Bestpreis-Menge gilt nur für die Basislizenzen; das Zeitkonto
// rechnet mit derselben abgerechneten Menge, damit auf der Rechnung
// nicht zwei verschiedene Lizenzzahlen stehen.
export function gesamtpreisMitModulen(
  anzahlBenutzer: number,
  zyklus: "monatlich" | "jaehrlich",
  module: { disposition?: boolean; zeitkonto?: boolean } = {}
): number {
  const menge = abgerechneteMenge(anzahlBenutzer, zyklus);
  let total = gesamtpreis(anzahlBenutzer, zyklus);
  if (module.disposition) total += modulpreis("disposition", menge, zyklus);
  if (module.zeitkonto) total += modulpreis("zeitkonto", menge, zyklus);
  return total;
}

// Einführungsrabatt: 15 Prozent im ersten Jahr für alle, die bis zum
// Stichtag buchen.
//
// Bewusst zeitlich begrenzt und nicht auf die ersten X Organisationen:
// Eine Frist ist überprüfbar und endet von selbst, während ein
// öffentlicher Zähler ("noch 3 von 20") niemandem glaubwürdig ist.
//
// Abgerechnet wird der Rabatt von Stripe über einen Gutschein mit zwölf
// Monaten Laufzeit – hier steht er nur für die Anzeige.
export const EINFUEHRUNG = {
  prozent: 15,
  bis: "2026-12-31",
} as const;

export function mitEinfuehrungsrabatt(betrag: number): number {
  return Math.round(betrag * (1 - EINFUEHRUNG.prozent / 100) * 100) / 100;
}

export function einfuehrungLaeuft(heute = new Date()): boolean {
  return heute.toISOString().slice(0, 10) <= EINFUEHRUNG.bis;
}
