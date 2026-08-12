import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendeMail } from "@/lib/email";
import { siteOrigin } from "@/lib/site-origin";

function unixZuDatum(unixSekunden: number | null | undefined): string | null {
  return unixSekunden ? new Date(unixSekunden * 1000).toISOString().slice(0, 10) : null;
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
        const subscriptionId = (invoice as unknown as { subscription?: string }).subscription;
        if (!subscriptionId) break;

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        await admin
          .from("organisationen")
          .update({
            status: "aktiv",
            sperrgrund: null,
            naechster_zahltermin: unixZuDatum(subscription.items.data[0]?.current_period_end),
          })
          .eq("stripe_subscription_id", subscriptionId);
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

        const subscriptionId = (invoice as unknown as { subscription?: string }).subscription;
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
              betreff: `Zahlung fehlgeschlagen – ${organisation.name} bei ArcoTime gesperrt`,
              html: `
                <div style="font-family:sans-serif;color:#111827;">
                  <p>Hallo ${person.name},</p>
                  <p>Die letzte Zahlung für <strong>${organisation.name}</strong> konnte nicht
                  verarbeitet werden. Der Zugriff auf ArcoTime wurde deshalb vorübergehend
                  gesperrt.</p>
                  <p>Bitte aktualisiere dein Zahlungsmittel, damit der Zugriff wieder
                  freigeschaltet wird, oder melde dich bei uns: uhipp@arcos.ch</p>
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
