// Gestaffelte Lizenzpreise (Volume-Pricing – die erreichte Stufe gilt für
// ALLE Benutzer, nicht nur die zusätzlichen). Muss exakt mit den in Stripe
// hinterlegten Preisstufen übereinstimmen (siehe STRIPE_PRICE_MONATLICH /
// STRIPE_PRICE_JAEHRLICH). Die tatsächliche Abrechnung übernimmt Stripe
// selbst anhand der dort konfigurierten Stufen – hier wird nur dieselbe
// Rechnung nachvollzogen, damit der Kunde den Preis sieht, BEVOR er
// weitergeleitet wird.
const STUFEN = [
  { bisEinschliesslich: 9, monatlich: 9, jaehrlich: 90 },
  { bisEinschliesslich: 19, monatlich: 8, jaehrlich: 80 },
  { bisEinschliesslich: Infinity, monatlich: 7, jaehrlich: 70 },
] as const;

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
