import { renderToBuffer } from "@react-pdf/renderer";
import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendeMail } from "@/lib/email";
import { APP_URL } from "@/lib/app-url";
import { FIRMA } from "@/content/recht";
import { RechnungPdf } from "@/lib/rechnung-pdf";
import {
  betraegeAusStripe,
  bezeichnungAusStripe,
  landName,
  rechnungsNummer,
  zeitraumAusStripe,
  type RechnungsDaten,
} from "@/lib/rechnung-daten";

// Rechnung zu einer bezahlten Stripe-Rechnung: Nummer ziehen, PDF
// erzeugen, ablegen, versenden.
//
// Aufgerufen aus dem Stripe-Webhook bei invoice.paid. Stripe stellt ein
// Ereignis mehrfach zu, wenn die Antwort ausbleibt – deshalb ist jeder
// Schritt darauf ausgelegt, ein zweites Mal aufgerufen zu werden, ohne
// eine zweite Rechnungsnummer zu verbrauchen. Eine Nummernlücke wäre in
// der Buchhaltung erklärungsbedürftig.

type Ergebnis =
  | { status: "erstellt"; nummer: string }
  | { status: "uebersprungen"; grund: string }
  | { status: "fehler"; fehler: string };

export async function erstelleUndVersendeRechnung(invoice: Stripe.Invoice): Promise<Ergebnis> {
  const admin = createAdminClient();

  if (!invoice.id) return { status: "fehler", fehler: "Stripe-Rechnung ohne id." };

  // Schritt 1: Gibt es die Rechnung schon? Dann höchstens noch versenden.
  const { data: vorhanden, error: leseFehler } = await admin
    .from("rechnungen")
    .select("id, jahr, nummer, versendet_am")
    .eq("stripe_invoice_id", invoice.id)
    .maybeSingle();

  if (leseFehler) {
    return { status: "fehler", fehler: `Rechnungen liessen sich nicht lesen: ${leseFehler.message}` };
  }
  if (vorhanden?.versendet_am) {
    return {
      status: "uebersprungen",
      grund: `Rechnung ${rechnungsNummer(vorhanden.jahr, vorhanden.nummer)} ist bereits versendet.`,
    };
  }

  // Schritt 2: Zur Rechnung gehörende Organisation finden.
  const kundenId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  if (!kundenId) return { status: "fehler", fehler: "Stripe-Rechnung ohne Kunde." };

  const { data: organisation, error: orgFehler } = await admin
    .from("organisationen")
    .select("id, name, strasse, plz, ort, land, steuernummer")
    .eq("stripe_customer_id", kundenId)
    .maybeSingle();

  if (orgFehler) {
    return { status: "fehler", fehler: `Organisation nicht lesbar: ${orgFehler.message}` };
  }
  if (!organisation) {
    // Kein Fehler: Es gibt Zahlungen ohne Mandant in ArcoTime (z.B. ein
    // von Hand in Stripe angelegtes Abo). Dafür stellt ArcoTime keine
    // Rechnung – das wäre eine Rechnung ins Blaue.
    return { status: "uebersprungen", grund: `Keine Organisation zu Stripe-Kunde ${kundenId}.` };
  }

  const betraege = betraegeAusStripe(invoice);
  const zeitraum = zeitraumAusStripe(invoice);
  const bezeichnung = bezeichnungAusStripe(invoice);
  const position = invoice.lines?.data?.[0];
  const menge = position?.quantity ?? 1;
  const einzelpreis = menge > 0 ? Math.round((betraege.netto / menge) * 100) / 100 : betraege.netto;

  const land = (organisation.land ?? "CH").toUpperCase();
  const reverseCharge = betraege.mwstBetrag === 0 && land !== "CH" && land !== "LI";

  const steuernummer =
    invoice.customer_tax_ids?.[0]?.value ?? organisation.steuernummer ?? null;

  const bezahltAm = invoice.status_transitions?.paid_at
    ? new Date(invoice.status_transitions.paid_at * 1000).toISOString()
    : null;

  // Schritt 3: Nummer ziehen und Zeile anlegen – nur, wenn es sie noch
  // nicht gibt. Die Nummer wird genau einmal vergeben.
  const jahr = vorhanden?.jahr ?? new Date().getFullYear();
  let nummer = vorhanden?.nummer ?? 0;
  let rechnungId = vorhanden?.id ?? null;

  if (!vorhanden) {
    const { data: gezogen, error: nummerFehler } = await admin.rpc("naechste_rechnungsnummer", {
      p_jahr: jahr,
    });
    if (nummerFehler || typeof gezogen !== "number") {
      return {
        status: "fehler",
        fehler: `Rechnungsnummer nicht erhalten: ${nummerFehler?.message ?? "unerwartete Antwort"}`,
      };
    }
    nummer = gezogen;

    const { data: neu, error: schreibFehler } = await admin
      .from("rechnungen")
      .insert({
        jahr,
        nummer,
        organisation_id: organisation.id,
        empfaenger_name: organisation.name,
        empfaenger_strasse: organisation.strasse,
        empfaenger_plz: organisation.plz,
        empfaenger_ort: organisation.ort,
        empfaenger_land: land,
        empfaenger_steuernummer: steuernummer,
        empfaenger_email: invoice.customer_email,
        stripe_invoice_id: invoice.id,
        stripe_customer_id: kundenId,
        bezeichnung,
        menge,
        einzelpreis,
        periode_von: zeitraum.von,
        periode_bis: zeitraum.bis,
        netto: betraege.netto,
        mwst_satz: reverseCharge ? 0 : betraege.mwstSatz,
        mwst_betrag: betraege.mwstBetrag,
        brutto: betraege.brutto,
        waehrung: betraege.waehrung,
        reverse_charge: reverseCharge,
        bezahlt_am: bezahltAm,
      })
      .select("id")
      .single();

    if (schreibFehler || !neu) {
      return {
        status: "fehler",
        fehler: `Rechnung nicht gespeichert: ${schreibFehler?.message ?? "keine Zeile"}`,
      };
    }
    rechnungId = neu.id;
  }

  const nummerText = rechnungsNummer(jahr, nummer);

  // Schritt 4: PDF erzeugen.
  const daten: RechnungsDaten = {
    nummer: nummerText,
    ausgestelltAm: new Date().toISOString(),
    bezahltAm,
    empfaenger: {
      name: organisation.name,
      strasse: organisation.strasse,
      plz: organisation.plz,
      ort: organisation.ort,
      land,
      landName: landName(land),
      steuernummer,
    },
    position: {
      bezeichnung,
      zeitraum: zeitraum.text,
      menge,
      einzelpreis,
    },
    summen: {
      netto: betraege.netto,
      mwstSatz: reverseCharge ? 0 : betraege.mwstSatz,
      mwstBetrag: betraege.mwstBetrag,
      brutto: betraege.brutto,
      waehrung: betraege.waehrung,
    },
    reverseCharge,
    // Das Logo liegt im öffentlichen Ordner der Anwendung; react-pdf lädt
    // es über die Adresse. Ein lokaler Dateipfad wäre auf Vercel nicht
    // verlässlich lesbar.
    logoAdresse: `${APP_URL}/arcos-group-logo.png`,
  };

  let pdf: Buffer;
  try {
    pdf = await renderToBuffer(RechnungPdf({ daten }));
  } catch (fehler) {
    return { status: "fehler", fehler: `PDF nicht erzeugt: ${(fehler as Error).message}` };
  }

  // Schritt 5: Ablegen. Der Pfad ist die Nummer – eine Rechnung, eine Datei.
  const pfad = `${jahr}/${nummerText}.pdf`;
  const { error: ablageFehler } = await admin.storage
    .from("rechnungen")
    .upload(pfad, pdf, { contentType: "application/pdf", upsert: true });

  if (ablageFehler) {
    return { status: "fehler", fehler: `PDF nicht abgelegt: ${ablageFehler.message}` };
  }

  // Schritt 6: Versenden – an die Admins der Organisation, ersatzweise an
  // die bei Stripe hinterlegte Adresse.
  const { data: admins } = await admin
    .from("profiles")
    .select("email")
    .eq("organisation_id", organisation.id)
    .eq("role", "admin");

  const empfaengerListe = (admins ?? [])
    .map((a) => a.email)
    .filter((e): e is string => Boolean(e));
  if (empfaengerListe.length === 0 && invoice.customer_email) {
    empfaengerListe.push(invoice.customer_email);
  }
  if (empfaengerListe.length === 0) {
    await admin.from("rechnungen").update({ pdf_pfad: pfad }).eq("id", rechnungId!);
    return { status: "uebersprungen", grund: `Rechnung ${nummerText} erstellt, aber kein Empfänger.` };
  }

  const html = `
    <div style="font-family:sans-serif;color:#111827;">
      <p>Guten Tag</p>
      <p>
        Vielen Dank für Ihr Vertrauen in ArcoTime. Im Anhang finden Sie die Rechnung
        <strong>${nummerText}</strong> über
        ${betraege.waehrung} ${betraege.brutto.toFixed(2)}${
          zeitraum.text ? ` für den ${zeitraum.text.replace("Leistungszeitraum ", "Zeitraum ")}` : ""
        }.
      </p>
      <p>Der Betrag wurde bereits über Ihr hinterlegtes Zahlungsmittel belastet – Sie müssen nichts weiter veranlassen.</p>
      <p>Freundliche Grüsse<br>${FIRMA.name}</p>
    </div>`;

  try {
    await sendeMail({
      an: empfaengerListe.join(", "),
      systemAntwort: true,
      betreff: `Rechnung ${nummerText} – ArcoTime`,
      html,
      anhaenge: [
        { dateiname: `ArcoTime-Rechnung-${nummerText}.pdf`, inhalt: pdf, typ: "application/pdf" },
      ],
    });
  } catch (fehler) {
    await admin.from("rechnungen").update({ pdf_pfad: pfad }).eq("id", rechnungId!);
    return { status: "fehler", fehler: `Rechnung ${nummerText} erstellt, Versand fehlgeschlagen: ${(fehler as Error).message}` };
  }

  await admin
    .from("rechnungen")
    .update({
      pdf_pfad: pfad,
      versendet_an: empfaengerListe.join(", "),
      versendet_am: new Date().toISOString(),
    })
    .eq("id", rechnungId!);

  return { status: "erstellt", nummer: nummerText };
}
