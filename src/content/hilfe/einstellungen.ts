import type { HilfeArtikel } from "./typen";

export const einstellungen: HilfeArtikel[] = [
  {
    slug: "einstellungen",
    titel: "Einstellungen",
    kategorie: "Verwaltung (Admin)",
    stichworte: ["rabattsätze", "kanäle", "prioritäten", "dokument-kategorien", "konfiguration"],
    routen: ["/einstellungen"],
    inhalt: `
Nur Admins sehen diese Seite – hier lassen sich Auswahllisten zentral konfigurieren, ohne dass eine Programmänderung nötig wäre.

## Rabattsätze

Die zur Auswahl stehenden Rabatt-Prozentsätze in der Zeiterfassung. Sich lässt eine Bezeichnung, ein Prozentwert und ob der Satz aktiv ist festlegen; inaktive Sätze bleiben in alten Einträgen sichtbar, verschwinden aber aus neuen Auswahllisten.

## Anfrage-Kanäle

Über welche Wege Anfragen eingehen können (Telefon, E-Mail, …), inkl. eines kleinen Symbols, das im Kanban-Board angezeigt wird.

## Anfrage-Prioritäten

Die zur Auswahl stehenden Prioritätsstufen samt Farbe (erscheint als kleiner Punkt auf der Anfrage-Karte).

## Dokument-Kategorien

Kategorien zur Einordnung hochgeladener Dokumente (z.B. "Vertrag", "Offerte") – erscheinen als Auswahl beim Hochladen an jeder Stelle, die eine Dokumentenablage hat (Kunden, Projekte, Anfragen, Zeiteinträge, Mitarbeitende).

## Reihenfolge

Bei allen Listen lässt sich eine Sortierreihenfolge angeben – bestimmt, in welcher Reihenfolge die Optionen in den jeweiligen Auswahlfeldern erscheinen.
`,
  },
];
