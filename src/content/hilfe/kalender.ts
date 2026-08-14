import type { HilfeArtikel } from "./typen";

export const kalender: HilfeArtikel[] = [
  {
    slug: "kalender",
    titel: "Kalender",
    kategorie: "Arbeiten mit ArcoTime",
    stichworte: ["monatsübersicht", "farbe", "legende", "wiedervorlage im kalender", "planung", "geplant", "schraffiert", "disposition im kalender"],
    routen: ["/kalender"],
    inhalt: `
Die Kalenderübersicht zeigt geplante Einsätze, erfasste Zeit und fällige Anfragen gemeinsam in einer Monatsansicht.

![Kalenderübersicht mit farbigen Tageszellen](/hilfe-bilder/kalender-uebersicht.png)

## Wie die Tageszelle zu lesen ist

Jeder Tag zeigt eine kleine farbige Liste:

- **Eine Zeile pro geplantem Einsatz** aus den [Rapporten](/hilfe/rapporte), mit Uhrzeit. Diese stehen zuoberst – die Frage „wer ist wann eingeteilt" ist meist die wichtigere. Klick öffnet den Rapport.
- **Eine Zeile pro Mitarbeitendem** mit Zeiterfassung an diesem Tag, mit Stundensumme. Klick öffnet die Tagesauswertung.
- **Eine Zeile pro fälliger Anfrage** (nach ihrem Wiedervorlage-Datum, siehe [Anfragen](/hilfe/anfragen)), farbig nach der zugewiesenen Person. Klick öffnet direkt die Anfrage.

**Geplant oder erfasst?** Beides trägt dieselbe Farbe der Person – die Zuordnung soll auf einen Blick stimmen. Unterschieden wird über die Fläche: geplante Zeit ist deckend, bereits erfasste Zeit **schraffiert**. So braucht es keine zweite Farbskala, die man sich zusätzlich merken müsste.

Sind mehr als vier Einträge an einem Tag, erscheint **"+N weitere"** mit einem Link zur vollständigen Tagesübersicht.

Über der Kalendertabelle zeigt eine **Legende**, welche Farbe zu welcher Person gehört (nur Personen, die im aktuell angezeigten Monat tatsächlich vorkommen).

## Woher kommt die Farbe einer Person?

Jede Person hat eine eigene Farbe, die automatisch bei der Einladung vergeben wird. Admins können sie unter [Mitarbeitende](/hilfe/mitarbeitende) pro Person anpassen.

## Filtern

Wie in den Auswertungen lässt sich nach Kunde, Projekt und Dienstleistungsklasse filtern; Admins zusätzlich nach Mitarbeitenden. Ist ein Klasse-Filter aktiv, werden keine Anfragen angezeigt (Anfragen haben keine Dienstleistungsklasse).

## Was sehe ich als normale/r Mitarbeitende/r?

Bei Zeiteinträgen siehst du nur deine eigenen. Anfragen zeigt der Kalender wie im Kanban-Board für **alle** an, unabhängig von Rolle oder Zuweisung – es ist ein gemeinsames Board.
`,
  },
];
