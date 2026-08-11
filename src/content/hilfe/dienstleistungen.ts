import type { HilfeArtikel } from "./typen";

export const dienstleistungen: HilfeArtikel[] = [
  {
    slug: "dienstleistungen",
    titel: "Dienstleistungen",
    kategorie: "Stammdaten",
    stichworte: ["preisliste", "katalog", "mwst", "klasse", "preis"],
    routen: ["/dienstleistungen"],
    inhalt: `
Der Dienstleistungskatalog ist die Preisliste eurer angebotenen Leistungen – Grundlage für den Preis-Snapshot in der Zeiterfassung (siehe [Zeiterfassung](/hilfe/zeiterfassung)).

## Neue Dienstleistung anlegen

**"+ Neue Dienstleistung"** klicken, Bezeichnung und Preis (pro Stunde) angeben. Zusätzlich lässt sich eine **Dienstleistungsklasse** zuordnen (z.B. zur Gruppierung in Auswertungen) und ein **MwSt-Code**.

## Aktiv/Inaktiv

Eine Dienstleistung lässt sich als inaktiv markieren, statt sie zu löschen – sie bleibt dadurch in bereits erfassten, alten Zeiteinträgen sichtbar, taucht aber nicht mehr in neuen Auswahllisten auf.

## Preisänderungen wirken nur auf neue Einträge

Wird der Preis einer Dienstleistung geändert, bleiben bereits erfasste Zeiteinträge unverändert (Preis-Snapshot) – nur neu erfasste Zeit übernimmt den neuen Preis.
`,
  },
];
