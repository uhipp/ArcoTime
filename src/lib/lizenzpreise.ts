// Gestaffelte Lizenzpreise (Volume-Pricing – die erreichte Stufe gilt für
// ALLE Benutzer, nicht nur die zusätzlichen). Muss exakt mit den in Stripe
// hinterlegten Preisstufen übereinstimmen (siehe STRIPE_PRICE_MONATLICH /
// STRIPE_PRICE_JAEHRLICH) – dient hier nur der Anzeige auf der
// Registrierungsseite, damit der Kunde den Preis sieht, BEVOR er zu Stripe
// weitergeleitet wird. Die tatsächliche Abrechnung übernimmt Stripe selbst
// anhand der dort konfigurierten Stufen.
const STUFEN = [
  { bisEinschliesslich: 9, monatlich: 9, jaehrlich: 90 },
  { bisEinschliesslich: 19, monatlich: 8, jaehrlich: 80 },
  { bisEinschliesslich: Infinity, monatlich: 7, jaehrlich: 70 },
] as const;

export function preisProBenutzer(anzahlBenutzer: number, zyklus: "monatlich" | "jaehrlich"): number {
  const stufe = STUFEN.find((s) => anzahlBenutzer <= s.bisEinschliesslich) ?? STUFEN[STUFEN.length - 1];
  return zyklus === "monatlich" ? stufe.monatlich : stufe.jaehrlich;
}

export function gesamtpreis(anzahlBenutzer: number, zyklus: "monatlich" | "jaehrlich"): number {
  return anzahlBenutzer * preisProBenutzer(anzahlBenutzer, zyklus);
}
