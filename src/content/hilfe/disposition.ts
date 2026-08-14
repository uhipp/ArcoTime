import type { HilfeArtikel } from "./typen";

export const disposition: HilfeArtikel[] = [
  {
    slug: "disposition",
    titel: "Disposition",
    kategorie: "Arbeiten mit ArcoTime",
    stichworte: [
      "einsatzplanung",
      "planen",
      "monteur",
      "dispo",
      "tagesplan",
      "freie zeiten",
      "doppelt belegt",
      "zusatzmodul",
      "einsatz",
    ],
    routen: ["/disposition"],
    inhalt: `
Die Disposition ist ein **kostenpflichtiges Zusatzmodul**. Ist es für eure Organisation nicht freigeschaltet, erscheint der Menüpunkt nicht – für eine Freischaltung wende dich an Arcos.

Gedacht ist sie für den Ablauf, bei dem im Büro Einsätze für Servicemonteure vorbereitet werden: Ein [Rapport](/hilfe/rapporte) wird als Entwurf angelegt, einer Person und einem Zeitfenster zugeteilt, und draussen füllt die Person nur noch die tatsächlichen Positionen aus.

## Einen Einsatz planen

Im Rapport gibt es drei Planfelder: **geplant für** (die Person), **geplant von** und **geplant bis**. Sie beschreiben die Absicht – was tatsächlich gearbeitet wurde, steht später in den Positionen. Beides darf auseinanderlaufen, ohne dass etwas korrigiert werden müsste.

Aus der Übersicht heraus geht es schneller: **"+ Einsatz planen"** an einem Tag legt einen Rapport mit bereits gesetztem Datum an.

## Freie Zeiten

Sobald im Rapport eine Person ausgewählt ist, zeigt der **Tagesplan** neben dem Formular, was an diesem Tag schon belegt ist und was noch frei wäre. Über die Pfeile blätterst du durch die Tage. Ein Klick auf eine freie Zeit übernimmt sie in die Planfelder.

Was als "frei" gilt, ergibt sich aus drei Dingen, alle unter [Einstellungen](/hilfe/einstellungen):

- dem **Arbeitstag** der Organisation (Standard 07:00–18:00),
- den **Schliesstagen** – an Feiertagen und in den Betriebsferien wird nichts vorgeschlagen,
- den **Abwesenheiten** der Person, sofern die Abwesenheitsart die Planung blockiert.

Ist der Tag gesperrt, sagt der Tagesplan auch warum ("Betriebsferien", "Ferien") – statt einfach keine Vorschläge zu machen.

## Tag, Woche, Monat

**Tag** und **Woche** zeigen ein Zeitraster: Stunden senkrecht, und waagrecht in der Wochenansicht die Tage, in der Tagesansicht die **Personen**. Damit beantwortet die Ansicht nicht nur „was ist geplant", sondern vor allem „wo ist noch Platz" – die Frage, die man beim Disponieren den ganzen Tag stellt.

Der sichtbare Ausschnitt ist der **Arbeitstag** aus den [Einstellungen](/hilfe/einstellungen). Einsätze ausserhalb verschwinden nicht, sie werden an den Rand geklemmt. Einsätze **ohne Planzeit** stehen in einer eigenen Zeile über dem Raster – sonst würde man an ihnen vorbeiplanen.

Über jeder Spalte steht **„+ planen"**: In der Woche legt das einen Einsatz an diesem Tag an, in der Tagesansicht gleich für diese Person. In der Tagesansicht gibt es zusätzlich die Spalte **„Nicht zugeteilt"** – dort sammeln sich die Einsätze, die noch niemandem gehören.

Der **Monat** bleibt eine Liste. Über dreissig Tage hinweg wäre ein Raster unleserlich, und dort will man ohnehin nur wissen, an welchen Tagen etwas liegt.

## Überschneidungen

Zwei Einsätze derselben Person zur selben Zeit werden mit **"Doppelt belegt"** markiert. Das ist bewusst nur ein Hinweis und keine Sperre – manchmal ist eine Überschneidung gewollt (Übergabe, kurzer Zwischenhalt), und die Planung soll nicht daran scheitern.

## Was noch kommt

Direkt im Kalender auf eine freie Zeit klicken und dort den nächsten Rapport erfassen, sowie eine farbliche Kennzeichnung von Schliesstagen und Abwesenheiten in der Übersicht.
`,
  },
];
