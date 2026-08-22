import type { HilfeArtikel } from "./typen";

export const auswertungen: HilfeArtikel[] = [
  {
    slug: "auswertungen",
    titel: "Auswertungen",
    kategorie: "Arbeiten mit ArcoTime",
    stichworte: ["tag", "woche", "monat", "filter", "fremde einträge bearbeiten"],
    routen: ["/auswertungen"],
    inhalt: `
Auswertung erfasster Zeit nach **Tag**, **Woche** oder **Monat**, mit Navigation vor/zurück und einem Sprung zu "Heute".

## Filtern

Nach Kunde, Projekt, Artikelklasse und (nur für Admins) nach Mitarbeitenden filterbar. Ohne Filter werden alle passenden Einträge im gewählten Zeitraum angezeigt.

## Admin: fremde Einträge bearbeiten

Als Admin kannst du hier auch Zeiteinträge anderer Mitarbeitender öffnen, korrigieren oder löschen – z.B. bei Erfassungsfehlern. Reguläre Mitarbeitende sehen und bearbeiten nur ihre eigenen Einträge.

## Was in den Stunden steckt – und was nicht

Die Stundensummen enthalten **ausschliesslich Arbeitszeit**. Positionen, die nach Menge abgerechnet werden – Kilometergeld, Spesen, Kleinmaterial – erscheinen in der Liste und im Betrag, zählen aber nicht als Stunden (siehe [Artikel](/hilfe/artikel)).

In der Mengenspalte steht deshalb je nach Position "3.5 h" oder "120 km". Die Summenzeile addiert nur die Stunden; der Betrag umfasst alles.

## Zusammenhang mit dem Kalender

Die Kalenderübersicht ([Kalender](/hilfe/kalender)) verlinkt von jedem Tag direkt auf die entsprechende Tagesauswertung hier.
`,
  },
];
