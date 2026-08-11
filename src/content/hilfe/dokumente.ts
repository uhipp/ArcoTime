import type { HilfeArtikel } from "./typen";

export const dokumente: HilfeArtikel[] = [
  {
    slug: "dokumentenablage",
    titel: "Dokumentenablage",
    kategorie: "Arbeiten mit ArcoTime",
    stichworte: ["datei hochladen", "anhang", "kategorie", "download"],
    routen: [],
    inhalt: `
An mehreren Stellen in ArcoTime lassen sich Dateien hochladen: bei **Kunden**, **Projekten**, **Anfragen**, **Zeiteinträgen** und **Mitarbeitenden**. Es handelt sich überall um dieselbe Funktion, eingebettet in die jeweilige Detailseite.

## Datei hochladen

Auf der Detailseite den Bereich "Dokumente" öffnen, Datei auswählen, optional eine **Kategorie** zuweisen (siehe [Einstellungen](/hilfe/einstellungen)) und hochladen.

## Herunterladen und Löschen

Jedes Dokument lässt sich einzeln herunterladen. Löschen ist je nach Bereich Admins oder der hochladenden Person vorbehalten.

## Wo finde ich ein Dokument wieder?

Dokumente sind immer an genau eine Stelle gebunden (z.B. an einen bestimmten Kunden) – es gibt keine zentrale, alles umfassende Dokumentenliste. Am Kunden hinterlegte Dokumente findest du also auf dessen Detailseite, nicht z.B. bei einem zugehörigen Projekt.
`,
  },
];
