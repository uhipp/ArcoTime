import { stripe } from "@/lib/stripe";

// Das Abonnement einer Organisation, wie es die Anwendung anzeigt.
//
// Gelesen wird bei jedem Aufruf direkt bei Stripe und NICHT aus den
// gespiegelten Spalten in organisationen. Der Unterschied ist nicht
// akademisch: Eine Kündigung ist eine Rechtstatsache. Zeigt die Seite eine
// veraltete Kopie, sagt sie einer Kundin womöglich "läuft weiter", obwohl
// gekündigt ist – oder umgekehrt. Die Spalten in der Datenbank sind für die
// Sperrlogik da (sie muss auch dann funktionieren, wenn Stripe nicht
// erreichbar ist); für die Auskunft an die Kundin zählt die Quelle.
//
// Ist Stripe nicht erreichbar, gibt es deshalb bewusst KEINE Ersatzanzeige
// aus der Datenbank, sondern einen sichtbaren Fehler. Eine stille
// Falschauskunft über den Vertragsstand wäre schlimmer als eine Lücke.

export type AboAnsicht = {
  zyklus: "monatlich" | "jaehrlich" | null;
  lizenzen: number;
  status: string;
  /** Läuft die Testphase noch – und bis wann? */
  testEndetAm: Date | null;
  /** Ende der laufenden, bereits bezahlten Periode. */
  periodeEndetAm: Date | null;
  /** Gekündigt, läuft aber noch bis zum Periodenende. */
  gekuendigtAufPeriodenende: boolean;
  /** Endgültig beendet. */
  beendet: boolean;
};

export async function ladeAbo(
  subscriptionId: string
): Promise<{ abo: AboAnsicht; fehler: null } | { abo: null; fehler: string }> {
  try {
    const s = await stripe.subscriptions.retrieve(subscriptionId);
    const posten = s.items.data[0];

    const intervall = posten?.price?.recurring?.interval;
    const alsDatum = (unix: number | null | undefined) =>
      unix ? new Date(unix * 1000) : null;

    return {
      abo: {
        zyklus: intervall === "year" ? "jaehrlich" : intervall === "month" ? "monatlich" : null,
        lizenzen: posten?.quantity ?? 0,
        status: s.status,
        testEndetAm: s.status === "trialing" ? alsDatum(s.trial_end) : null,
        periodeEndetAm: alsDatum(posten?.current_period_end),
        gekuendigtAufPeriodenende: Boolean(s.cancel_at_period_end),
        beendet: s.status === "canceled",
      },
      fehler: null,
    };
  } catch (fehler) {
    return { abo: null, fehler: (fehler as Error).message };
  }
}
