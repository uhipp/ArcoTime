import type { HilfeArtikel } from "./typen";

export const auswertungen: HilfeArtikel[] = [
  {
    slug: "auswertungen",
    titel: "Auswertungen",
    kategorie: "Arbeiten mit ArcoTime",
    stichworte: ["tag", "woche", "monat", "filter", "fremde einträge bearbeiten"],
    routen: ["/auswertungen"],
    inhalt: `
## Gruppieren

Über der Tabelle stehen die Sichten: **Alle Positionen** einzeln, oder gruppiert nach **Auftrag**, nach **Artikelklasse** und – wenn der Betrieb Standorte führt – nach **Einsatzort**.

**Nach Auftrag und nach Einsatzort** zeigt die Tabelle die **Dauer** in Stunden und den Betrag. Beides ist über alle Zeilen dieselbe Einheit, also summierbar.

**Nach Artikelklasse** zeigt sie die **Menge** mit ihrer Einheit – aber nur, wenn die Klasse das verträgt. Eine Klasse kann Farbe in Liter und Pinsel in Stück enthalten; „60" darüber wäre bedeutungslos, und man sieht es der Zahl nicht an. Deshalb trägt jede Artikelklasse den Schalter **„Menge summieren"** (siehe [Einstellungen](/hilfe/einstellungen)). Steht er aus, erscheint in der Mengenspalte ein Strich und nur der Betrag zählt; die einzelnen Mengen stehen weiterhin in den Positionen, wo sie ihre Einheit bei sich haben.

Über **alle** Klassen wird die Menge gar nicht summiert – das wäre genau die sinnlose Zahl, die der Schalter verhindert.

Tauchen in einer Gruppe trotzdem verschiedene Einheiten auf, wird die Menge stumm. Lieber ein Strich als eine falsche Zahl.

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
