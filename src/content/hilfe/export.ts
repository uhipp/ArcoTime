import type { HilfeArtikel } from "./typen";

export const exportArtikel: HilfeArtikel[] = [
  {
    slug: "export",
    titel: "Export für die Buchhaltung",
    kategorie: "Verwaltung (Admin)",
    stichworte: ["comatic", "excel", "belegnummer", "buchhaltung", "rechnung"],
    routen: ["/export"],
    inhalt: `
Auf der Seite Export (nur für Admins sichtbar) stehen **zwei verschiedene Dinge**, die man nicht verwechseln sollte:

## Alle Daten herunterladen

Der vollständige Bestand eurer Organisation – Zeiteinträge, Rapporte, Kunden, Projekte, Stammdaten und das Änderungsprotokoll. Zur Auswahl stehen eine **Excel-Datei** (eine Tabelle je Bereich, zum Anschauen und Weiterarbeiten) und eine **JSON-Datei** (dieselben Daten verlustfrei; nur aus ihr lässt sich ein Stand später wieder einspielen).

Dieser Download verändert nichts und lässt sich beliebig oft wiederholen. Er funktioniert auch nach dem Ende eines Abonnements, solange die 30-tägige Frist läuft – dann ist er sogar der einzige Weg, an die Daten zu kommen.

Noch nicht enthalten sind die hochgeladenen **Dateien** aus dem Bereich Dokumente; der Export listet sie mit Name und Zuordnung auf, die Dateien selbst ladet ihr einzeln herunter.

## Export für die Buchhaltung (Comatic)

Der untere Teil der Seite ist etwas anderes: Hier werden erfasste, noch nicht exportierte Zeiteinträge als Excel-Datei im für das Buchhaltungssystem **Comatic** passenden Format bereitgestellt – und dabei als exportiert **markiert**.

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
