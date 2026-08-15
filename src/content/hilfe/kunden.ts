import type { HilfeArtikel } from "./typen";

export const kunden: HilfeArtikel[] = [
  {
    slug: "kunden",
    titel: "Kunden",
    kategorie: "Stammdaten",
    stichworte: ["kunde anlegen", "adresse", "strasse", "hausnummer", "plz", "firma", "kontakt"],
    routen: ["/kunden"],
    inhalt: `
Hier verwaltest du deine Kundenstammdaten – Grundlage für Projekte, Zeiterfassung und Anfragen.

**Sortieren**: Ein Klick auf einen Spaltenkopf sortiert die Liste danach, ein zweiter Klick dreht die Richtung um. Filter und Suche bleiben dabei erhalten, und die Sortierung steht in der Adresse – sie überlebt also ein Neuladen.

**Spalten wählen**: Über „Spalten“ oben rechts stellst du ein, welche Angaben die Liste zeigt – etwa Telefon, Strasse, PLZ oder den Standardrabatt. Die Auswahl gilt nur für deine Anmeldung, folgt dir aber auf jedes Gerät. „Zurücksetzen“ stellt die Standardspalten wieder her. Die Namensspalte bleibt immer sichtbar, weil sie den Datensatz öffnet.

## Neuen Kunden anlegen

Auf **"+ Neuer Kunde"** klicken und die Felder ausfüllen. Pflichtfeld ist nur der **Name** (Nach- oder Firmenname); alles andere kann später ergänzt werden.

**Anfahrt km (verrechnet je Einsatz)**: Die Kilometer, die bei einem Einsatz bei diesem Kunden verrechnet werden – in der Regel Hin- und Rückfahrt. Der Wert wird beim Erfassen als **Menge vorgeschlagen**, sobald eine Leistung gewählt wird, die unter [Dienstleistungen](/hilfe/dienstleistungen) als Anreise gekennzeichnet ist. Wie beim Standardrabatt gilt: Es ist ein Vorschlag, überschreibbar, und eine spätere Änderung wirkt nicht auf bereits erfasste Einträge.

Das Feld heisst bewusst „verrechnet je Einsatz" und nicht „Distanz" – sonst trägt die eine Person die einfache Strecke ein und die andere Hin und Zurück, und niemand merkt es, weil beides plausibel aussieht.

**Strasse und Nummer** sind zwei getrennte Felder, ebenso **PLZ** und **Ort**. Das hält die Adresse auswertbar und sortierbar. Im Export erscheint die Strasse wieder als eine Angabe („Bahnhofstrasse 12"), weil das Comatic-Format eine einzige Spalte dafür vorsieht.

**PLZ-Autofill**: Trägst du eine Schweizer Postleitzahl ein, schlägt ArcoTime automatisch den passenden Ort vor – spart Tipparbeit und vermeidet Tippfehler.

Weitere Felder wie Adress-Schlüssel (für den Buchhaltungsexport), Zahlungskonditionen und Währung lassen sich bei Bedarf setzen; sie haben sinnvolle Standardwerte (CHF, 30 Tage).

## Kunden schnell anlegen, ohne die Seite zu verlassen

In den Formularen für **Anfragen**, **Projekte** und **Zeiterfassung** gibt es jeweils ein **"+ Neuer Kunde"**, direkt neben dem Kunden-Feld. Damit lässt sich ein fehlender Kunde mit den wichtigsten Angaben (Vorname, Name, Telefon, E-Mail) sofort anlegen, ohne das aktuelle Formular zu verlieren – Adresse und weitere Details lassen sich danach jederzeit hier unter "Kunden" ergänzen.

Legt jemand versehentlich zweimal denselben Kunden an (z.B. weil zwei Mitarbeitende gleichzeitig arbeiten), erscheint eine **Dubletten-Warnung** mit der Möglichkeit, stattdessen den bereits bestehenden Kunden zu verwenden.

## Kunden-Detailseite

Auf der Detailseite eines Kunden siehst du dessen komplette Historie: alle Anfragen und alle Zeiterfassungen, filterbar nach Zeitraum und Status.

## Preise & Rabatte

Unter den Stammdaten liegt der Block **"Preise & Rabatte"** mit zwei Listen. Beide wirken ausschliesslich auf **neu erfasste** Zeiteinträge – bestehende behalten Preis und Rabatt, die beim Erfassen galten. Eine Änderung rechnet also nie rückwirkend um.

**Abweichende Preise** überschreiben den Katalogpreis einer Dienstleistung für diesen Kunden. Beim Erfassen eines Zeiteintrags wird dieser Preis eingefroren.

**Rabatt je Dienstleistungsklasse** ist der bequemere Weg als Rabatte pro Dienstleistung: Gib dem Kunden z.B. 10% auf die ganze Klasse "Beratung", und jede Dienstleistung dieser Klasse erbt den Rabatt – auch die, die ihr erst später anlegt.

Welcher Rabatt vorgeschlagen wird, entscheidet sich in dieser Reihenfolge:

1. Die Dienstleistung erlaubt keinen Teilrabatt → **0%** (siehe [Dienstleistungen](/hilfe/dienstleistungen))
2. Ein **Klassenrabatt** für diesen Kunden → dieser Wert
3. Sonst der **Standardrabatt** aus den Stammdaten des Kunden

Es ist immer nur ein Vorschlag: Beim Erfassen lässt sich der Rabatt überschreiben.

## Standardrabatt

Im Block "Rechnungswesen" der Stammdaten. Gilt für alle Dienstleistungen, für die kein Klassenrabatt hinterlegt ist.
`,
  },
];
