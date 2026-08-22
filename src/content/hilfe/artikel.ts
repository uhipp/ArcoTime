import type { HilfeArtikel } from "./typen";

export const artikel: HilfeArtikel[] = [
  {
    slug: "artikel",
    titel: "Artikel",
    kategorie: "Stammdaten",
    stichworte: [
      // Der alte Name bleibt suchbar: Wer "Dienstleistung" eingibt, soll
      // diese Seite finden und nicht ins Leere greifen (umbenannt in 0078).
      "dienstleistung",
      "dienstleistungen",
      "material",
      "spesen",
      "artikelstamm",
      "preisliste",
      "katalog",
      "mwst",
      "klasse",
      "preis",
      "spesen",
      "kilometer",
      "material",
      "einheit",
      "rabatt",
    ],
    routen: ["/artikel"],
    inhalt: `
Der Artikelstamm ist die Preisliste eurer angebotenen Leistungen – Grundlage für den Preis-Snapshot in der Zeiterfassung (siehe [Zeiterfassung](/hilfe/zeiterfassung)).

## Neuen Artikel anlegen

**"+ Neuer Artikel"** klicken, Bezeichnung und Preis (pro Stunde) angeben. Zusätzlich lässt sich eine **Artikelklasse** zuordnen (z.B. zur Gruppierung in Auswertungen) und ein **MwSt-Code**.

Die **Beschreibung** eines Artikels ist mehr als eine Notiz: Sie erscheint beim Erfassen eines Zeiteintrags automatisch als Vorschlag im Beschreibungsfeld, unter der Namenszeile. Wer immer denselben Satz tippt – „Fahrzeugreinigung aussen und innen, Innenraum gesaugt“ – hinterlegt ihn hier einmal.

## Spesen, Kilometer und Material – "Zählt als Arbeitszeit"

Nicht jede Position ist Arbeitszeit. Kilometergeld, Reisespesen oder Kleinmaterial werden nach **Menge** abgerechnet, nicht nach Dauer – und dürfen die Stundenauswertung der Mitarbeitenden nicht verfälschen.

Dafür gibt es das Kennzeichen **"Zählt als Arbeitszeit"**:

- **Angehakt** (Normalfall): Erfassung über Von/Bis bzw. Dauer. Fliesst in Stundensummen und Auswertungen ein.
- **Nicht angehakt**: In der Zeiterfassung erscheint statt der Zeitfelder ein **Mengenfeld** mit der Einheit dieser Artikel. Die Position wird ganz normal verrechnet und exportiert, taucht aber in **keiner** Stundenauswertung auf.

Die **Einheit** ist frei wählbar – Stunde, Pauschale, Stück, km, was ihr braucht. Sie ist reine Beschriftung; ob nach Zeit oder Menge erfasst wird, entscheidet allein das Kennzeichen oben.

## Anreise zum Kunden

Das Häkchen **„Anreise zum Kunden"** macht aus einer Leistung eine Anfahrtsposition: Beim Erfassen wird dann die bei diesem [Kunden](/hilfe/kunden) hinterlegte Anfahrt in Kilometern als **Menge vorgeschlagen** – überschreibbar und danach am Eintrag eingefroren.

Bewusst ein Häkchen an beliebigen Leistungen statt einer fest eingebauten Position „Reise-km": Die eine Firma nennt es Wegpauschale, die andere Kilometergeld, und manche haben mehrere Sätze für verschiedene Fahrzeuge. Setze das Häkchen bei allen davon.

Wer eine **Anfahrtspauschale** statt Kilometern verrechnet, braucht das Häkchen nicht – das ist eine gewöhnliche Leistung, die mit Menge 1 erfasst wird.

## Rabatt zulässig

Bei manchen Positionen soll kein Rabatt gewährt werden – Reisespesen sind das typische Beispiel. Ist **"Rabatt zulässig"** nicht angehakt, bietet die Zeiterfassung für diese Artikel nur noch **0%** und **100%** an, und ein Kunden- oder Klassenrabatt greift nicht.

100% bleibt bewusst möglich: Das ist die Konvention für "nicht verrechnet" und muss auch bei Spesen erfassbar bleiben. Die Sperre wird auch serverseitig geprüft, ebenso beim Erledigen einer Anfrage.

## Aktiv/Inaktiv

Ein Artikel lässt sich als inaktiv markieren, statt ihn zu löschen – er bleibt dadurch in bereits erfassten, alten Zeiteinträgen sichtbar, taucht aber nicht mehr in neuen Auswahllisten auf.

## Preisänderungen wirken nur auf neue Einträge

Wird der Preis eines Artikels geändert, bleiben bereits erfasste Zeiteinträge unverändert (Preis-Snapshot) – nur neu erfasste Zeit übernimmt den neuen Preis.
`,
  },
];
