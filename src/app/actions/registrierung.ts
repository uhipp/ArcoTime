"use server";

import { redirect } from "next/navigation";
import { stripe, STRIPE_PREIS_ID } from "@/lib/stripe";
import { abgerechneteMenge } from "@/lib/lizenzpreise";

// Öffentliche Aktion (kein Login nötig – das IST die Selbstregistrierung).
// Erzeugt eine Stripe-Checkout-Session und leitet direkt dorthin weiter.
// Die eigentliche Organisation + das erste Admin-Konto werden erst vom
// Webhook (checkout.session.completed) angelegt, NICHT hier – erst wenn die
// Zahlung wirklich bestätigt ist (bzw. bei Testphase: sobald die
// Zahlungsmethode hinterlegt ist).
export async function starteRegistrierung(formData: FormData) {
  const anzahlBenutzer = Number(formData.get("anzahl_benutzer") ?? 0);
  const zyklus = String(formData.get("zyklus") ?? "monatlich") as "monatlich" | "jaehrlich";
  const testphase = formData.get("testphase") === "on";
  const firmenname = String(formData.get("firmenname") ?? "").trim();
  const adminVorname = String(formData.get("admin_vorname") ?? "").trim();
  const adminNachname = String(formData.get("admin_nachname") ?? "").trim();
  const adminEmail = String(formData.get("admin_email") ?? "").trim();

  if (!anzahlBenutzer || anzahlBenutzer < 1) {
    redirect(`/registrieren?error=${encodeURIComponent("Bitte eine gültige Anzahl Benutzer angeben.")}`);
  }
  if (!firmenname || !adminVorname || !adminNachname || !adminEmail) {
    redirect(`/registrieren?error=${encodeURIComponent("Bitte alle Firmen- und Kontaktangaben ausfüllen.")}`);
  }

  // Bestpreis-Garantie: An den Stufengrenzen ist eine grössere Menge
  // günstiger (9 Benutzer = 81.–, 10 Benutzer = 80.–). Dann wird die
  // günstigere Menge gebucht – die Kundin zahlt weniger UND bekommt die
  // zusätzliche Lizenz. Bewusst hier und nicht erst im Webhook, damit schon
  // der Stripe-Checkout den korrekten Betrag zeigt.
  const abgerechnet = abgerechneteMenge(anzahlBenutzer, zyklus);

  const appUrl = process.env.APP_URL ?? "https://arco-time.vercel.app";

  // Gemeinsame Metadaten – landen auf der Session UND auf dem Abo selbst
  // (subscription_data.metadata), da spätere Webhook-Events (Verlängerung,
  // Zahlungsfehler, Kündigung) sich auf das Abo/den Kunden beziehen, nicht
  // mehr auf die ursprüngliche Checkout-Session.
  const metadata = {
    firmenname,
    admin_vorname: adminVorname,
    admin_nachname: adminNachname,
    admin_email: adminEmail,
    // Die gebuchte (ggf. aufgerundete) Menge – sie bestimmt später
    // lizenzen_gebucht, muss also mit dem übereinstimmen, was Stripe
    // verrechnet, sonst dürfte die Organisation weniger Konten anlegen als
    // bezahlt.
    anzahl_benutzer: String(abgerechnet),
    zyklus,
  };

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: STRIPE_PREIS_ID[zyklus], quantity: abgerechnet }],
    customer_email: adminEmail,
    subscription_data: {
      ...(testphase ? { trial_period_days: 30 } : {}),
      metadata,
    },
    metadata,
    success_url: `${appUrl}/registrieren/erfolg?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/registrieren?abgebrochen=1`,
    locale: "de",
  });

  if (!session.url) {
    redirect(`/registrieren?error=${encodeURIComponent("Stripe-Checkout konnte nicht erstellt werden.")}`);
  }

  redirect(session.url);
}
