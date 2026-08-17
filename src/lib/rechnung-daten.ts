import type Stripe from "stripe";

// Daten für die Rechnungs-PDF, aufbereitet aus der Stripe-Rechnung und den
// Angaben der Organisation.
//
// Die Beträge kommen bewusst aus Stripe und werden nicht neu gerechnet:
// Belastet wurde, was Stripe berechnet hat – die Rechnung muss denselben
// Betrag ausweisen, sonst stimmt der Beleg nicht mit der Kartenabrechnung
// überein. Stripe führt Beträge in der kleinsten Einheit (Rappen).

export type RechnungsDaten = {
  nummer: string;
  ausgestelltAm: string;
  bezahltAm: string | null;
  empfaenger: {
    name: string;
    strasse: string | null;
    plz: string | null;
    ort: string | null;
    land: string | null;
    landName: string | null;
    steuernummer: string | null;
  };
  position: {
    bezeichnung: string;
    zeitraum: string | null;
    menge: number;
    einzelpreis: number;
  };
  summen: {
    netto: number;
    mwstSatz: number;
    mwstBetrag: number;
    brutto: number;
    waehrung: string;
  };
  reverseCharge: boolean;
  logoAdresse: string | null;
};

const LAENDER: Record<string, string> = {
  CH: "Schweiz",
  LI: "Liechtenstein",
  DE: "Deutschland",
  AT: "Österreich",
};

export function landName(code: string | null | undefined): string | null {
  if (!code) return null;
  return LAENDER[code.toUpperCase()] ?? code.toUpperCase();
}

/** Rappen → Franken. */
function ausRappen(betrag: number | null | undefined): number {
  return Math.round((betrag ?? 0)) / 100;
}

export function rechnungsNummer(jahr: number, nummer: number): string {
  return `${jahr}-${String(nummer).padStart(4, "0")}`;
}

/**
 * Liest die Zahlen aus der Stripe-Rechnung.
 *
 * Stripe hat die Steuerfelder über die API-Versionen mehrfach umgebaut
 * (invoice.tax, dann total_tax, dann total_taxes[]). Deshalb wird der
 * Steuerbetrag hier nicht aus einem einzelnen Feld gelesen, sondern als
 * Differenz zwischen Total und Zwischensumme bestimmt – die beiden Felder
 * gab es immer und sie sind das, was der Kundin belastet wurde.
 */
export function betraegeAusStripe(invoice: Stripe.Invoice) {
  const netto = ausRappen(invoice.subtotal);
  const brutto = ausRappen(invoice.total);
  const mwstBetrag = Math.round((brutto - netto) * 100) / 100;
  const mwstSatz = netto > 0 ? Math.round((mwstBetrag / netto) * 1000) / 10 : 0;

  return {
    netto,
    brutto,
    mwstBetrag,
    mwstSatz,
    waehrung: (invoice.currency ?? "chf").toUpperCase(),
  };
}

/** Zeitraum der Leistung, wie ihn Stripe an der Position führt. */
export function zeitraumAusStripe(invoice: Stripe.Invoice): {
  von: string | null;
  bis: string | null;
  text: string | null;
} {
  const periode = invoice.lines?.data?.[0]?.period;
  if (!periode?.start || !periode?.end) return { von: null, bis: null, text: null };

  const von = new Date(periode.start * 1000).toISOString().slice(0, 10);
  const bis = new Date(periode.end * 1000).toISOString().slice(0, 10);
  const alsCH = (iso: string) => iso.split("-").reverse().join(".");
  return { von, bis, text: `Leistungszeitraum ${alsCH(von)} bis ${alsCH(bis)}` };
}
