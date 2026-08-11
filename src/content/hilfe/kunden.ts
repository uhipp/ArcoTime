import type { HilfeArtikel } from "./typen";

export const kunden: HilfeArtikel[] = [
  {
    slug: "kunden",
    titel: "Kunden",
    kategorie: "Stammdaten",
    stichworte: ["kunde anlegen", "adresse", "plz", "firma", "kontakt"],
    routen: ["/kunden"],
    inhalt: `
Hier verwaltest du deine Kundenstammdaten – Grundlage für Projekte, Zeiterfassung und Anfragen.

## Neuen Kunden anlegen

Auf **"+ Neuer Kunde"** klicken und die Felder ausfüllen. Pflichtfeld ist nur der **Name** (Nach- oder Firmenname); alles andere kann später ergänzt werden.

**PLZ-Autofill**: Trägst du eine Schweizer Postleitzahl ein, schlägt ArcoTime automatisch den passenden Ort vor – spart Tipparbeit und vermeidet Tippfehler.

Weitere Felder wie Adress-Schlüssel (für den Buchhaltungsexport), Zahlungskonditionen und Währung lassen sich bei Bedarf setzen; sie haben sinnvolle Standardwerte (CHF, 30 Tage).

## Kunden schnell anlegen, ohne die Seite zu verlassen

In den Formularen für **Anfragen**, **Projekte** und **Zeiterfassung** gibt es jeweils ein **"+ Neuer Kunde"**, direkt neben dem Kunden-Feld. Damit lässt sich ein fehlender Kunde mit den wichtigsten Angaben (Vorname, Name, Telefon, E-Mail) sofort anlegen, ohne das aktuelle Formular zu verlieren – Adresse und weitere Details lassen sich danach jederzeit hier unter "Kunden" ergänzen.

Legt jemand versehentlich zweimal denselben Kunden an (z.B. weil zwei Mitarbeitende gleichzeitig arbeiten), erscheint eine **Dubletten-Warnung** mit der Möglichkeit, stattdessen den bereits bestehenden Kunden zu verwenden.

## Kunden-Detailseite

Auf der Detailseite eines Kunden siehst du dessen komplette Historie: alle Anfragen und alle Zeiterfassungen, filterbar nach Zeitraum und Status.
`,
  },
];
