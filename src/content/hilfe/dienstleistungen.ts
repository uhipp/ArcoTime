import type { HilfeArtikel } from "./typen";

export const dienstleistungen: HilfeArtikel[] = [
  {
    slug: "dienstleistungen",
    titel: "Dienstleistungen",
    kategorie: "Stammdaten",
    stichworte: [
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
    routen: ["/dienstleistungen"],
    inhalt: `
Der Dienstleistungskatalog ist die Preisliste eurer angebotenen Leistungen – Grundlage für den Preis-Snapshot in der Zeiterfassung (siehe [Zeiterfassung](/hilfe/zeiterfassung)).

## Neue Dienstleistung anlegen

**"+ Neue Dienstleistung"** klicken, Bezeichnung und Preis (pro Stunde) angeben. Zusätzlich lässt sich eine **Dienstleistungsklasse** zuordnen (z.B. zur Gruppierung in Auswertungen) und ein **MwSt-Code**.

## Spesen, Kilometer und Material – "Zählt als Arbeitszeit"

Nicht jede Position ist Arbeitszeit. Kilometergeld, Reisespesen oder Kleinmaterial werden nach **Menge** abgerechnet, nicht nach Dauer – und dürfen die Stundenauswertung der Mitarbeitenden nicht verfälschen.

Dafür gibt es das Kennzeichen **"Zählt als Arbeitszeit"**:

- **Angehakt** (Normalfall): Erfassung über Von/Bis bzw. Dauer. Fliesst in Stundensummen und Auswertungen ein.
- **Nicht angehakt**: In der Zeiterfassung erscheint statt der Zeitfelder ein **Mengenfeld** mit der Einheit dieser Dienstleistung. Die Position wird ganz normal verrechnet und exportiert, taucht aber in **keiner** Stundenauswertung auf.

Die **Einheit** ist frei wählbar – Stunde, Pauschale, Stück, km, was ihr braucht. Sie ist reine Beschriftung; ob nach Zeit oder Menge erfasst wird, entscheidet allein das Kennzeichen oben.

## Rabatt zulässig

Bei manchen Positionen soll kein Rabatt gewährt werden – Reisespesen sind das typische Beispiel. Ist **"Rabatt zulässig"** nicht angehakt, bietet die Zeiterfassung für diese Dienstleistung nur noch **0%** und **100%** an, und ein Kunden- oder Klassenrabatt greift nicht.

100% bleibt bewusst möglich: Das ist die Konvention für "nicht verrechnet" und muss auch bei Spesen erfassbar bleiben. Die Sperre wird auch serverseitig geprüft, ebenso beim Erledigen einer Anfrage.

## Aktiv/Inaktiv

Eine Dienstleistung lässt sich als inaktiv markieren, statt sie zu löschen – sie bleibt dadurch in bereits erfassten, alten Zeiteinträgen sichtbar, taucht aber nicht mehr in neuen Auswahllisten auf.

## Preisänderungen wirken nur auf neue Einträge

Wird der Preis einer Dienstleistung geändert, bleiben bereits erfasste Zeiteinträge unverändert (Preis-Snapshot) – nur neu erfasste Zeit übernimmt den neuen Preis.
`,
  },
];
