export type RechtsDokument = {
  /** Teil der URL: /impressum, /datenschutz, /agb, /avv */
  slug: string;
  titel: string;
  /** Datum der letzten inhaltlichen Änderung, im Dokument sichtbar. */
  stand: string;
  /** Wird hochgezählt, sobald sich der Inhalt materiell ändert. */
  version: string;
  /** Kurzbeschrieb für die Übersicht im Fussbereich. */
  kurz: string;
  markdown: string;
};

/**
 * Die Firmenangaben stehen an einer Stelle, weil sie in allen vier
 * Dokumenten vorkommen. Ändert die Adresse, ändert sie überall.
 */
export const FIRMA = {
  name: "Arcos Group GmbH",
  strasse: "Hauptstrasse 1",
  plzOrt: "4447 Känerkinden",
  land: "Schweiz",
  uid: "CHE-116.097.916",
  // Mit dem Zusatz MWST – so gehört sie auf eine Rechnung (Art. 26 MWSTG).
  mwstNummer: "CHE-116.097.916 MWST",
  vertretung: "Urs Hipp, Geschäftsführer",
  email: "info@arcos.ch",
  telefon: "+41 79 761 13 85",
  web: "www.arcos.ch",
  datenschutzEmail: "datenschutz@arcocloud.ch",
  supportEmail: "support@arcotime.ch",
  // Blindkopie jeder Ausgangsrechnung. Eigener Eintrag, weil das eine
  // Buchhaltungsadresse ist und nicht dieselbe Aufgabe hat wie der Support –
  // sie lässt sich hier wechseln, ohne den Support mitzuverschieben.
  rechnungsKopieEmail: "support@arcotime.ch",
} as const;
