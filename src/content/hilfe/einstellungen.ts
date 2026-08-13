import type { HilfeArtikel } from "./typen";

export const einstellungen: HilfeArtikel[] = [
  {
    slug: "einstellungen",
    titel: "Einstellungen",
    kategorie: "Verwaltung (Admin)",
    stichworte: [
      "rabattsätze",
      "kanäle",
      "prioritäten",
      "dokument-kategorien",
      "konfiguration",
      "mwst",
      "mehrwertsteuer",
      "steuersatz",
    ],
    routen: ["/einstellungen"],
    inhalt: `
Nur Admins sehen diese Seite – hier lassen sich Auswahllisten zentral konfigurieren, ohne dass eine Programmänderung nötig wäre.

## MWSt-Codes

Die Steuercodes aus eurem Buchhaltungssystem, bestehend aus **Code** (z.B. \`B81\`), **Bezeichnung** und **Satz in Prozent**. Sie hängen an den [Dienstleistungen](/hilfe/dienstleistungen) und landen über den [Export](/hilfe/export) in der Buchhaltung.

Alle drei Felder lassen sich direkt in der Zeile ändern und mit **"speichern"** übernehmen. Nicht mehr benötigte Codes werden **deaktiviert** statt gelöscht – so bleiben sie in bestehenden Einträgen lesbar, verschwinden aber aus neuen Auswahllisten.

> **Wichtig bei gesetzlichen Satzänderungen:** Lege einen **neuen Code** an und deaktiviere den alten, statt den Satz zu überschreiben. Der Satz wird nicht pro Zeiteintrag gespeichert, sondern über die Dienstleistung referenziert – eine Änderung wirkt deshalb rückwirkend auch auf bereits erfasste Einträge und auf Exporte, die du früher schon erzeugt hast. Zum Korrigieren eines Tippfehlers ist die Bearbeitung dagegen genau der richtige Weg.

## Dienstleistungsklassen

Gruppieren die [Dienstleistungen](/hilfe/dienstleistungen) für die [Auswertungen](/hilfe/auswertungen). Auch hier gilt: deaktivieren statt löschen.

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
