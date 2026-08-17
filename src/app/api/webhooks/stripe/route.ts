import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendeMail } from "@/lib/email";
import { erstelleUndVersendeRechnung } from "@/lib/rechnung-erstellen";
import { siteOrigin } from "@/lib/site-origin";
import { SUPPORT_MAIL } from "@/lib/kontakt";

function unixZuDatum(unixSekunden: number | null | undefined): string | null {
  return unixSekunden ? new Date(unixSekunden * 1000).toISOString().slice(0, 10) : null;
}

/**
 * Liest die Abo-Kennung aus einer Stripe-Rechnung.
 *
 * Stripe hat das Feld verschoben: Bis zur API-Version "basil" stand die
 * Kennung direkt auf der Rechnung (invoice.subscription), seither liegt sie
 * unter parent.subscription_details.subscription. Unser Konto läuft auf
 * 2026-07-29.dahlia, dort gibt es das alte Feld nicht mehr.
 *
 * Das ist nicht theoretisch: Genau daran ist der erste Durchlauf gescheitert.
 * Aufgefallen wäre es erst bei der ersten Folgezahlung – die Erstbuchung wird
 * zusätzlich über checkout.session.completed freigeschaltet und hat den
 * Fehler verdeckt. Deshalb hier alle bekannten Orte der Reihe nach, statt
 * sich auf einen zu verlassen.
 */
function abonnementAusRechnung(invoice: Stripe.Invoice): string | null {
  const rechnung = invoice as unknown as {
    subscription?: string | { id?: string } | null;
    parent?: { subscription_details?: { subscription?: string | { id?: string } | null } | null } | null;
    lines?: {
      data?: Array<{
        parent?: {
          subscription_item_details?: { subscription?: string | { id?: string } | null } | null;
        } | null;
      }>;
    };
  };

  const alsText = (wert: string | { id?: string } | null | undefined): string | null =>
    typeof wert === "string" ? wert : (wert?.id ?? null);

  return (
    alsText(rechnung.parent?.subscription_details?.subscription) ??
    alsText(rechnung.subscription) ??
    alsText(rechnung.lines?.data?.[0]?.parent?.subscription_item_details?.subscription)
  );
}

// Eine bezahlte Registrierung ohne zustellbare Einladung ist der schlimmste
// Zustand im Lizenzmodul (Kundin zahlt, kommt aber nicht rein) – darum geht
// die Meldung an alle Platform-Admins, die die Einladung unter /plattform
// -> "Nutzer einladen" manuell nachholen können.
async function meldeGescheiterteEinladung({
  admin,
  firmenname,
  adminEmail,
  grund,
}: {
  admin: ReturnType<typeof createAdminClient>;
  firmenname: string;
  adminEmail: string;
  grund: string;
}) {
  try {
    const { data: platformAdmins } = await admin
      .from("profiles")
      .select("email")
      .eq("ist_platform_admin", true);

    for (const person of platformAdmins ?? []) {
      if (!person.email) continue;
      await sendeMail({
        an: person.email,
        systemAntwort: true,
        betreff: `ArcoTime: Einladung für "${firmenname}" konnte nicht zugestellt werden`,
        html: `
          <div style="font-family:sans-serif;color:#111827;">
            <p>Die Registrierung von <strong>${firmenname}</strong> wurde bezahlt und die
            Organisation ist angelegt, aber die Einladung an <strong>${adminEmail}</strong>
            konnte nicht versendet werden.</p>
            <p><strong>Grund:</strong> ${grund}</p>
            <p>Es existiert daher noch kein Admin-Konto für diese Organisation. Bitte die
            Einladung unter <em>/plattform &rarr; Nutzer einladen</em> manuell nachholen.</p>
          </div>`,
      });
    }
  } catch (fehler) {
    // Der Alarm selbst darf den Webhook nicht scheitern lassen – sonst
    // wiederholt Stripe das Event und die Registrierung läuft doppelt.
    console.error("Alarm über gescheiterte Einladung konnte nicht versendet werden:", fehler);
  }
}

// Läuft ohne Nutzer-Session (Stripe ruft das direkt auf) – Absicherung über
// die kryptografische Signatur (STRIPE_WEBHOOK_SECRET), nicht über Login.
export async function POST(request: NextRequest) {
  const signatur = request.headers.get("stripe-signature");
  const rohtext = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rohtext, signatur ?? "", process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (fehler) {
    console.error("Stripe-Webhook: ungültige Signatur", fehler);
    return NextResponse.json({ error: "Ungültige Signatur." }, { status: 400 });
  }

  const admin = createAdminClient();

  try {
    switch (event.type) {
      // -----------------------------------------------------------------
      // Neue Registrierung erfolgreich bezahlt (bzw. Zahlungsmittel für
      // die Testphase hinterlegt) – Organisation + erstes Admin-Konto
      // anlegen.
      // -----------------------------------------------------------------
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const meta = session.metadata ?? {};
        if (!meta.firmenname || !meta.admin_email) break; // nicht unsere Registrierung

        const subscription = await stripe.subscriptions.retrieve(session.subscription as string);

        // Stripe stellt dasselbe Event erneut zu, wenn wir hier je einen
        // Fehler zurückgeben oder zu langsam antworten. Ohne diese Prüfung
        // entstünde dabei eine zweite Organisation zum selben Abo.
        const { data: bereitsVorhanden } = await admin
          .from("organisationen")
          .select("id")
          .eq("stripe_subscription_id", subscription.id)
          .maybeSingle();

        if (bereitsVorhanden) break;

        const { data: neueOrg, error } = await admin
          .from("organisationen")
          .insert({
            name: meta.firmenname,
            status: "aktiv",
            // Rechnungsadresse aus der Registrierung. Sie steht auch bei
            // Stripe, wird hier aber mitgeführt, damit ArcoTime seine
            // Kundinnen ohne Umweg über das Stripe-Dashboard kennt.
            strasse: meta.strasse ?? null,
            plz: meta.plz ?? null,
            ort: meta.ort ?? null,
            land: meta.land ?? "CH",
            lizenzen_gebucht: Number(meta.anzahl_benutzer) || 1,
            abrechnungszyklus: meta.zyklus === "jaehrlich" ? "jaehrlich" : "monatlich",
            stripe_customer_id: String(session.customer),
            stripe_subscription_id: subscription.id,
            test_endet_am:
              subscription.status === "trialing" ? unixZuDatum(subscription.trial_end) : null,
            naechster_zahltermin: unixZuDatum(subscription.items.data[0]?.current_period_end),
          })
          .select("id")
          .single();

        if (error || !neueOrg) {
          console.error("Webhook checkout.session.completed: Organisation konnte nicht angelegt werden", error);
          break;
        }

        const origin = await siteOrigin();
        const { error: einladungsFehler } = await admin.auth.admin.inviteUserByEmail(
          meta.admin_email,
          {
            redirectTo: `${origin}/auth/confirm`,
            data: {
              vorname: meta.admin_vorname,
              nachname: meta.admin_nachname,
              organisation_id: neueOrg.id,
              rolle_bei_einladung: "admin",
            },
          }
        );

        // Scheitert der Mailversand (SMTP-Problem, Rate-Limit, Empfänger vom
        // Zielserver abgelehnt), legt Supabase den Auth-Nutzer gar nicht erst
        // an: Die Organisation existiert dann und wird bereits belastet, aber
        // niemand kann sich jemals anmelden – und die Kundin sieht nur die
        // Erfolgsseite mit "Du erhältst in Kürze eine E-Mail". Das darf nicht
        // stillschweigend passieren, deshalb Log + Alarm an die Platform-
        // Admins über den eigenen SMTP-Weg (unabhängig vom Supabase-Mailer).
        // Bewusst KEIN Fehler-Status an Stripe: das Abo ist gültig zustande
        // gekommen, ein Retry würde nur dieselbe Einladung erneut versenden.
        if (einladungsFehler) {
          console.error(
            `Webhook checkout.session.completed: Einladung an ${meta.admin_email} fehlgeschlagen:`,
            einladungsFehler.message
          );
          await meldeGescheiterteEinladung({
            admin,
            firmenname: meta.firmenname,
            adminEmail: meta.admin_email,
            grund: einladungsFehler.message,
          });
        }
        break;
      }

      // -----------------------------------------------------------------
      // Erfolgreiche (Erst- oder Verlängerungs-)Zahlung: Zahltermin
      // nachführen und eine evtl. vorherige Sperre wegen Zahlungsproblemen
      // aufheben (verspätet erfolgreiche Zahlung).
      // -----------------------------------------------------------------
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = abonnementAusRechnung(invoice);

        // Freischaltung nur, wenn ein Abo dahintersteht. Fehlt es, wird
        // trotzdem eine Rechnung gestellt: Bezahlt ist bezahlt, und ein
        // Beleg darf nicht daran scheitern, dass wir das Abo nicht zuordnen
        // können.
        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const { data: freigeschaltet } = await admin
            .from("organisationen")
            .update({
              status: "aktiv",
              sperrgrund: null,
              naechster_zahltermin: unixZuDatum(subscription.items.data[0]?.current_period_end),
            })
            .eq("stripe_subscription_id", subscriptionId)
            .select("id");

          if (!freigeschaltet?.length) {
            console.warn("invoice.paid: keine Organisation zu Abo", subscriptionId);
          }
        } else {
          console.warn("invoice.paid: kein Abo an der Rechnung", invoice.id);
        }

        // Eigene Rechnung erzeugen und versenden. Bewusst NACH der
        // Freischaltung: Der Zugang darf nicht davon abhängen, ob eine
        // PDF erzeugt werden konnte. Ein Fehler wird protokolliert, aber
        // nicht an Stripe zurückgemeldet – sonst stellt Stripe dasselbe
        // Ereignis wieder und wieder zu, während die Organisation längst
        // aktiv ist. Die Rechnung lässt sich nachträglich erzeugen.
        try {
          const ergebnis = await erstelleUndVersendeRechnung(invoice);
          if (ergebnis.status === "fehler") {
            console.error("Rechnung nicht erstellt", { invoice: invoice.id, fehler: ergebnis.fehler });
          } else if (ergebnis.status === "uebersprungen") {
            console.log("Rechnung übersprungen", { invoice: invoice.id, grund: ergebnis.grund });
          } else {
            console.log("Rechnung erstellt", { invoice: invoice.id, nummer: ergebnis.nummer });
          }
        } catch (fehler) {
          console.error("Rechnung: unerwarteter Fehler", { invoice: invoice.id, fehler });
        }
        break;
      }

      // -----------------------------------------------------------------
      // Zahlung endgültig fehlgeschlagen (Stripe hat bereits automatisch
      // mehrfach wiederholt, next_payment_attempt ist dann leer) –
      // Organisation sperren + Admin(s) informieren. Läuft ein weiterer
      // Wiederholungsversuch noch, wird NICHT gesperrt.
      // -----------------------------------------------------------------
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const naechsterVersuch = (invoice as unknown as { next_payment_attempt?: number | null }).next_payment_attempt;
        if (naechsterVersuch) break; // Stripe versucht es noch automatisch erneut

        const subscriptionId = abonnementAusRechnung(invoice);
        if (!subscriptionId) break;

        const { data: organisation } = await admin
          .from("organisationen")
          .update({ status: "pausiert", sperrgrund: "zahlung_fehlgeschlagen" })
          .eq("stripe_subscription_id", subscriptionId)
          .select("id, name")
          .single();

        if (organisation) {
          const { data: admins } = await admin
            .from("profiles")
            .select("name, email")
            .eq("organisation_id", organisation.id)
            .eq("role", "admin");

          for (const person of admins ?? []) {
            if (!person.email) continue;
            await sendeMail({
              an: person.email,
              systemAntwort: true,
              betreff: `Zahlung fehlgeschlagen – ${organisation.name} bei ArcoTime gesperrt`,
              html: `
                <div style="font-family:sans-serif;color:#111827;">
                  <p>Hallo ${person.name},</p>
                  <p>Die letzte Zahlung für <strong>${organisation.name}</strong> konnte nicht
                  verarbeitet werden. Der Zugriff auf ArcoTime wurde deshalb vorübergehend
                  gesperrt.</p>
                  <p>Bitte aktualisiere dein Zahlungsmittel, damit der Zugriff wieder
                  freigeschaltet wird, oder melde dich bei uns: ${SUPPORT_MAIL}</p>
                </div>`,
            });
          }
        }
        break;
      }

      // -----------------------------------------------------------------
      // Abo tatsächlich beendet (nach Kündigung, wirksam zum Ende der
      // bezahlten Periode).
      // -----------------------------------------------------------------
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await admin
          .from("organisationen")
          .update({ status: "gekuendigt", sperrgrund: null })
          .eq("stripe_subscription_id", subscription.id);
        break;
      }

      default:
        break;
    }
  } catch (fehler) {
    console.error(`Stripe-Webhook (${event.type}) fehlgeschlagen:`, fehler);
    return NextResponse.json({ error: "Interner Fehler." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
