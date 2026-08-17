"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { stripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendeMail } from "@/lib/email";
import { getCurrentOrganisation, getCurrentProfile } from "@/lib/get-profile";
import { darf } from "@/lib/berechtigungen";
import { mitErfolg } from "@/lib/erfolg";
import { formatDatumCH } from "@/lib/date-utils";
import { FIRMA } from "@/content/recht";

const PFAD = "/einstellungen/abo";

// Kündigung und Widerruf.
//
// AGB Ziffer 6 sagt zu: "Beide Parteien können jederzeit auf das Ende der
// laufenden Abrechnungsperiode kündigen. Die Kündigung erfolgt über die
// Anwendung oder in Textform." Der erste Teil dieses Satzes ist genau das
// hier – bis diese Seite stand, war die Zusage nicht einlösbar.
//
// Gekündigt wird auf das Periodenende (cancel_at_period_end), nie sofort:
// Bereits bezahlt ist bezahlt, und der Zugang gehört der Kundin bis zum
// letzten Tag der Periode. Ein sofortiges Beenden würde ihr eine bezahlte
// Leistung entziehen.

async function nurAdminMitAbo() {
  const profile = await getCurrentProfile();
  if (!darf(profile, "abo.verwalten")) {
    redirect(`${PFAD}?error=${encodeURIComponent("Dafür braucht es Administratorrechte.")}`);
  }

  const eigene = await getCurrentOrganisation();
  const supabase = await createClient();
  const { data: organisation } = await supabase
    .from("organisationen")
    .select("id, name, stripe_subscription_id")
    .eq("id", eigene?.id ?? "")
    .single();

  if (!organisation?.stripe_subscription_id) {
    redirect(
      `${PFAD}?error=${encodeURIComponent(
        "Für diese Organisation ist kein Abonnement hinterlegt."
      )}`
    );
  }

  return { profile: profile!, organisation };
}

// Arcos erfährt von jeder Kündigung – nicht über den Umweg Stripe, sondern
// direkt. Eine Kündigung ist der Moment, in dem ein Anruf noch etwas ändern
// kann; sie erst auf der Monatsabrechnung zu bemerken, ist zu spät.
async function meldeAnArcos(betreff: string, text: string) {
  try {
    await sendeMail({
      an: FIRMA.supportEmail,
      systemAntwort: true,
      betreff,
      html: `<div style="font-family:sans-serif;color:#111827;"><p>${text}</p></div>`,
    });
  } catch (fehler) {
    // Die Meldung darf die Kündigung nicht verhindern – die Kundin hat
    // ihren Willen erklärt, unser Postfach ist ihr Problem nicht.
    console.error("Kündigungsmeldung nicht versendet:", fehler);
  }
}

export async function kuendigeAbo() {
  const { profile, organisation } = await nurAdminMitAbo();

  let endeAm: string | null = null;
  try {
    const abo = await stripe.subscriptions.update(organisation.stripe_subscription_id!, {
      cancel_at_period_end: true,
    });
    const ende = abo.items.data[0]?.current_period_end;
    endeAm = ende ? new Date(ende * 1000).toISOString().slice(0, 10) : null;
  } catch (fehler) {
    redirect(
      `${PFAD}?error=${encodeURIComponent(
        `Die Kündigung konnte nicht verarbeitet werden: ${(fehler as Error).message}. ` +
          `Bitte melde dich bei ${FIRMA.supportEmail} – eine Kündigung in Textform gilt ebenso.`
      )}`
    );
  }

  // Vermerk in der eigenen Datenbank, damit die Kündigung auch dann
  // nachweisbar ist, wenn später jemand fragt, wer sie wann ausgelöst hat.
  const admin = createAdminClient();
  const { error: vermerkFehler } = await admin
    .from("organisationen")
    .update({ gekuendigt_am: new Date().toISOString(), gekuendigt_von: profile.id })
    .eq("id", organisation.id);
  // Der Vermerk ist Beiwerk – bei Stripe ist bereits gekündigt, und das ist
  // die massgebliche Tatsache. Stillschweigend verschwinden darf ein
  // Fehlschlag trotzdem nicht.
  if (vermerkFehler) console.error("Kündigungsvermerk nicht gespeichert:", vermerkFehler.message);

  await meldeAnArcos(
    `Kündigung: ${organisation.name}`,
    `${profile.name} (${profile.email}) hat das Abonnement von <strong>${organisation.name}</strong> ` +
      `gekündigt. Der Zugang läuft bis ${endeAm ? formatDatumCH(endeAm) : "zum Ende der laufenden Periode"}.`
  );

  revalidatePath(PFAD);
  redirect(
    mitErfolg(
      PFAD,
      endeAm
        ? `Gekündigt. Der Zugang bleibt bis ${formatDatumCH(endeAm)} bestehen.`
        : "Gekündigt. Der Zugang bleibt bis zum Ende der laufenden Periode bestehen."
    )
  );
}

export async function widerrufeKuendigung() {
  const { profile, organisation } = await nurAdminMitAbo();

  try {
    await stripe.subscriptions.update(organisation.stripe_subscription_id!, {
      cancel_at_period_end: false,
    });
  } catch (fehler) {
    redirect(
      `${PFAD}?error=${encodeURIComponent(
        `Der Widerruf konnte nicht verarbeitet werden: ${(fehler as Error).message}`
      )}`
    );
  }

  const admin = createAdminClient();
  const { error: vermerkFehler } = await admin
    .from("organisationen")
    .update({ gekuendigt_am: null, gekuendigt_von: null })
    .eq("id", organisation.id);
  if (vermerkFehler) console.error("Kündigungsvermerk nicht gelöscht:", vermerkFehler.message);

  await meldeAnArcos(
    `Kündigung zurückgezogen: ${organisation.name}`,
    `${profile.name} (${profile.email}) hat die Kündigung von <strong>${organisation.name}</strong> zurückgezogen. Das Abonnement läuft weiter.`
  );

  revalidatePath(PFAD);
  redirect(mitErfolg(PFAD, "Die Kündigung ist zurückgezogen, das Abonnement läuft weiter."));
}
