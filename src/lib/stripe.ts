import Stripe from "stripe";

// Ein einziger Client für die ganze Anwendung (nicht pro Request neu
// erzeugen – Stripe empfiehlt Wiederverwendung). Nur serverseitig
// importieren (Server Actions, Route Handler) – der Secret Key darf nie
// ins Browser-Bundle gelangen.
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export const STRIPE_PREIS_ID: Record<"monatlich" | "jaehrlich", string> = {
  monatlich: process.env.STRIPE_PRICE_MONATLICH!,
  jaehrlich: process.env.STRIPE_PRICE_JAEHRLICH!,
};
