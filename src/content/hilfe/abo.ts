import type { HilfeArtikel } from "./typen";

export const abo: HilfeArtikel[] = [
  {
    slug: "abonnement",
    titel: "Abonnement, Rechnungen und Kündigung",
    kategorie: "Verwaltung (Admin)",
    stichworte: [
      "abo",
      "kündigen",
      "kündigung",
      "rechnung",
      "beleg",
      "lizenzen",
      "bezahlen",
      "vertrag",
      "mwst",
      "testphase",
    ],
    routen: ["/einstellungen/abo"],
    inhalt: `
Unter **Einstellungen → Abonnement** steht alles zum Vertrag mit der Arcos Group: was gebucht ist, was verrechnet wurde und wie ihr kündigt. Die Seite ist nur für Administratorinnen und Administratoren sichtbar.

## Euer Abonnement

Angezeigt werden Abrechnungsart (monatlich oder jährlich), die Anzahl gebuchter Benutzerlizenzen und wie viele davon belegt sind, sowie das Datum der nächsten Verlängerung. Läuft noch die 30-tägige Testphase, steht auch deren Ende dort.

Diese Angaben werden bei jedem Aufruf direkt beim Zahlungsdienstleister abgefragt – ihr seht also immer den tatsächlichen Stand und keine Kopie. Ist der Dienst gerade nicht erreichbar, erscheint ein Hinweis statt veralteter Zahlen.

## Rechnungen

Jede Rechnung erscheint hier als PDF und lässt sich jederzeit erneut öffnen. Zusätzlich geht sie nach jeder Belastung automatisch per E-Mail an alle Administratorinnen und Administratoren.

Die Rechnung weist die MWST gesondert aus und trägt die MWST-Nummern beider Seiten – sie ist damit für die Buchhaltung verwendbar. Kunden ausserhalb der Schweiz und Liechtensteins erhalten eine Nettorechnung mit dem Vermerk zur Steuerschuldnerschaft des Leistungsempfängers (Reverse Charge).

## Kündigen

Ihr könnt jederzeit auf das Ende der laufenden Abrechnungsperiode kündigen:

1. Auf **"Abonnement kündigen"** klicken.
2. Es erscheint eine Zusammenfassung: bis wann ArcoTime nutzbar bleibt und was mit den Daten geschieht.
3. Mit **"Ja, kündigen"** bestätigen.

Bis zum angezeigten Datum bleibt ArcoTime vollständig nutzbar, danach wird nichts mehr belastet. Bereits bezahlte Beträge werden nicht zurückerstattet.

Eine Kündigung lässt sich bis zum Ablauf jederzeit mit **"Kündigung zurückziehen"** widerrufen – das Abonnement läuft dann unverändert weiter.

> **Vor dem Ablauf an den Export denken.** Die Daten werden 30 Tage nach Vertragsende gelöscht. Über [Export](/hilfe/export) holt ihr euch vorher, was ihr behalten wollt.

Die Kündigung ist auch in Textform an support@arcotime.ch möglich; über die Anwendung geht es schneller und ihr habt das Enddatum sofort schwarz auf weiss.

## Rechnungsadresse

Firmenname, Strasse, PLZ und Ort ändert ihr unter **Einstellungen → Organisation**; sie erscheinen so auf der nächsten Rechnung.

**Land und MWST-Nummer** ändert ihr nicht selbst. Beide bestimmen, wie die Rechnung besteuert wird, und müssen mit den Angaben beim Zahlungsdienstleister übereinstimmen – eine Abweichung führt zu einer falsch besteuerten Rechnung. Eine kurze Meldung an support@arcotime.ch genügt.
`,
  },
];
