"use server";

import { redirect } from "next/navigation";
import { stripe, STRIPE_PREIS_ID } from "@/lib/stripe";
import { abgerechneteMenge } from "@/lib/lizenzpreise";
import { APP_URL } from "@/lib/app-url";
import { VERTRAGSFASSUNG } from "@/content/recht";

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
  const strasse = String(formData.get("strasse") ?? "").trim();
  const plz = String(formData.get("plz") ?? "").trim();
  const ort = String(formData.get("ort") ?? "").trim();
  const land = String(formData.get("land") ?? "CH").trim().toUpperCase();
  const agbAkzeptiert = formData.get("agb_akzeptiert") === "on";

  if (!anzahlBenutzer || anzahlBenutzer < 1) {
    redirect(`/registrieren?error=${encodeURIComponent("Bitte eine gültige Anzahl Benutzer angeben.")}`);
  }
  if (!firmenname || !adminVorname || !adminNachname || !adminEmail) {
    redirect(`/registrieren?error=${encodeURIComponent("Bitte alle Firmen- und Kontaktangaben ausfüllen.")}`);
  }
  if (!strasse || !plz || !ort || !land) {
    redirect(`/registrieren?error=${encodeURIComponent("Bitte die vollständige Rechnungsadresse angeben.")}`);
  }
  // Serverseitig prüfen, nicht nur im Formular: Ohne Zustimmung ist unklar,
  // was vereinbart wurde – und ein Häkchen im Browser lässt sich umgehen.
  if (!agbAkzeptiert) {
    redirect(
      `/registrieren?error=${encodeURIComponent(
        "Bitte AGB und Auftragsbearbeitungsvertrag akzeptieren."
      )}`
    );
  }

  // Bestpreis-Garantie: An den Stufengrenzen ist eine grössere Menge
  // günstiger (9 Benutzer = 81.–, 10 Benutzer = 80.–). Dann wird die
  // günstigere Menge gebucht – die Kundin zahlt weniger UND bekommt die
  // zusätzliche Lizenz. Bewusst hier und nicht erst im Webhook, damit schon
  // der Stripe-Checkout den korrekten Betrag zeigt.
  const abgerechnet = abgerechneteMenge(anzahlBenutzer, zyklus);

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
    // Welcher Fassung zugestimmt wurde. Bleibt bei Stripe am Abo hängen und
    // ist damit auch dann noch nachweisbar, wenn die Texte später ändern.
    vertragsfassung: VERTRAGSFASSUNG,
    strasse,
    plz,
    ort,
    land,
    zyklus,
  };

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: STRIPE_PREIS_ID[zyklus], quantity: abgerechnet }],
    customer_email: adminEmail,
    // MWST: Stripe Tax entscheidet anhand des Sitzlands. Kunden in der
    // Schweiz und in Liechtenstein zahlen 8,1 %; bei Unternehmen in der EU
    // liegt der Leistungsort am Sitz des Empfängers – dann Nettorechnung mit
    // Übergang der Steuerschuld. Voraussetzung dafür ist eine gültige
    // USt-IdNr., die Stripe im Checkout erhebt und prüft.
    automatic_tax: { enabled: true },
    tax_id_collection: { enabled: true },
    // Ohne Adresse kann Stripe die Steuer nicht bestimmen. customer_update
    // wäre hier falsch: Das ist nur erlaubt, wenn ein bestehender Kunde
    // übergeben wird – bei customer_email legt Stripe ihn selbst an und
    // übernimmt die im Checkout erfasste Adresse von sich aus.
    billing_address_collection: "required",
    subscription_data: {
      ...(testphase ? { trial_period_days: 30 } : {}),
      metadata,
    },
    metadata,
    success_url: `${APP_URL}/registrieren/erfolg?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${APP_URL}/registrieren?abgebrochen=1`,
    locale: "de",
  });

  if (!session.url) {
    redirect(`/registrieren?error=${encodeURIComponent("Stripe-Checkout konnte nicht erstellt werden.")}`);
  }

  redirect(session.url);
}
