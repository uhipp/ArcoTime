import type { HilfeArtikel } from "./typen";

export const exportArtikel: HilfeArtikel[] = [
  {
    slug: "export",
    titel: "Export für die Buchhaltung",
    kategorie: "Verwaltung (Admin)",
    stichworte: ["comatic", "excel", "belegnummer", "buchhaltung", "rechnung"],
    routen: ["/export"],
    inhalt: `
Über den Export (nur für Admins sichtbar) werden erfasste, noch nicht exportierte Zeiteinträge als Excel-Datei im für das Buchhaltungssystem **Comatic** passenden Format bereitgestellt.

## Vorgehen

1. Offene (nicht exportierte) Zeiteinträge werden in einer Vorschau angezeigt.
2. Die gewünschten Einträge auswählen (oder alle).
3. Auf **"Exportieren"** klicken – die Excel-Datei wird zum Download angeboten.

## Belegnummern

Jedes Projekt hat eine eigene, automatisch fortlaufende **Belegnummer** (siehe [Projekte](/hilfe/projekte)). Beim Export wird die aktuelle Nummer je Projekt vergeben und danach automatisch um 1 erhöht – so entstehen nie doppelte Belegnummern innerhalb eines Projekts.

## Was passiert mit exportierten Einträgen?

Exportierte Zeiteinträge sind danach **fixiert**: sie lassen sich nicht mehr bearbeiten oder löschen, aus Nachvollziehbarkeitsgründen für die Buchhaltung. In der Zeiterfassungs-Liste erscheinen sie mit dem Hinweis "exportiert".
`,
  },
];
