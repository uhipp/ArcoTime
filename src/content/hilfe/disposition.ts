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

Ist der ganze Tag gesperrt, sagt der Tagesplan auch warum („Betriebsferien", „Ferien") – statt einfach keine Vorschläge zu machen. Eine **halbtägige** Abwesenheit sperrt den Tag nicht: Sie erscheint wie ein belegter Block, die übrige Zeit bleibt planbar. Wer einen Einsatz trotzdem in dieses Fenster schiebt, wird gefragt.

## Tag, Woche, Monat

**Tag** und **Woche** zeigen ein Zeitraster: Stunden senkrecht, und waagrecht in der Wochenansicht die Tage, in der Tagesansicht die **Personen**. Damit beantwortet die Ansicht nicht nur „was ist geplant", sondern vor allem „wo ist noch Platz" – die Frage, die man beim Disponieren den ganzen Tag stellt.

Überschneiden sich zwei Einsätze in derselben Spalte, stehen sie **nebeneinander** und teilen sich die Breite – wie in einem Kalenderprogramm. Wird einer davon umgeplant, nimmt der andere wieder die ganze Spalte ein.

Der sichtbare Ausschnitt ist der **Arbeitstag** aus den [Einstellungen](/hilfe/einstellungen). Einsätze ausserhalb verschwinden nicht, sie werden an den Rand geklemmt. Einsätze **ohne Planzeit** stehen in einer eigenen Zeile über dem Raster – sonst würde man an ihnen vorbeiplanen.

Über jeder Spalte steht **„+ planen"**: In der Woche legt das einen Einsatz an diesem Tag an, in der Tagesansicht gleich für diese Person. In der Tagesansicht gibt es zusätzlich die Spalte **„Nicht zugeteilt"** – dort sammeln sich die Einsätze, die noch niemandem gehören.

Bei vielen Mitarbeitenden behalten die Spalten ihre Breite und das Raster wird seitlich gescrollt – zusammengequetschte Spalten, in denen kein Kundenname mehr steht, wären keine Übersicht. Die Uhrzeiten links bleiben dabei stehen.

Wird es trotzdem zu breit, hilft der Filter **Gruppe**: Er zeigt in der Tagesansicht nur noch die Spalten einer [Gruppe](/hilfe/einstellungen) – „Sanitär“, „Team Ost“. Die **Einsätze** schränkt er nicht ein: Ein Auftrag, an dem jemand aus der Gruppe beteiligt ist, bleibt sichtbar, auch wenn die übrigen Beteiligten anderswo hingehören. Sonst verschwände genau die Zusammenarbeit über Teamgrenzen hinweg, die man sehen will.

Der **Monat** bleibt eine Liste. Über dreissig Tage hinweg wäre ein Raster unleserlich, und dort will man ohnehin nur wissen, an welchen Tagen etwas liegt.

## Einsätze verschieben

Im Zeitraster lassen sich geplante Einsätze mit der Maus ziehen – nach oben oder unten für eine andere Uhrzeit, in der Wochenansicht seitlich auf einen anderen Tag, in der Tagesansicht auf eine andere Person. Gerastet wird in Viertelstunden; die Dauer bleibt dabei erhalten.

Auf Tablet und Smartphone dasselbe mit dem Finger: kurz halten, dann ziehen. Das kurze Halten ist nötig, damit sich die Ansicht weiterhin normal scrollen lässt.

Bei einem Einsatz mit mehreren [Beteiligten](/hilfe/rapporte) erscheint derselbe Balken in jeder ihrer Spalten – verschoben wird er trotzdem als Ganzes. Ziehst du ihn in die Spalte einer weiteren Person, kommt sie zum Einsatz dazu.

**Nicht verschiebbar sind abgeschlossene Rapporte.** Sie halten fest, was geleistet wurde – daran zieht niemand mehr. Für Korrekturen ist die Stornierung vorgesehen.

Fällt das Ziel auf einen **Schliesstag** oder in eine **Abwesenheit**, die die Planung blockiert, erscheint eine Rückfrage mit dem Namen der betroffenen Person – du kannst trotzdem verschieben. Blockiert wird nicht: Bei einem Team würde eine einzige Abwesenheit sonst den ganzen Einsatz festsetzen, und die Person wird ohnehin ersetzt. Eine **Doppelbelegung** wird dagegen zugelassen und nur rot markiert – siehe unten.

## Terminkonflikte

Ein Einsatz, bei dem etwas nicht aufgeht, trägt im Raster einen roten Balken mit **„⚠ Achtung Terminkonflikt"** und dem Grund. In der Monatsliste steht dieselbe Angabe als roter Vermerk. Drei Fälle führen dazu:

- **doppelt belegt** – dieselbe Person ist im selben Zeitfenster zweimal eingeplant
- **abwesend** – eine beteiligte Person hat an diesem Tag Ferien, ist krank oder sonst abwesend. Halbtägige Abwesenheiten zählen nur, wenn sie sich mit der Planzeit überschneiden; Arten ohne Häkchen „blockiert die Planung" (Homeoffice, Aussendienst) gelten nicht als Konflikt.
- **betriebsfrei** – der Tag ist ein [Schliesstag](/hilfe/einstellungen) der Organisation

Das ist bewusst ein Hinweis und **keine Sperre**: Manchmal ist eine Überschneidung gewollt, und wer eine abwesende Person trotzdem einplant, hat meist einen Grund. Beim Verschieben wird gefragt – aber eine Rückfrage ist schnell vergessen, wenn zwei Telefone dazwischenkommen. Deshalb bleibt die Markierung am Einsatz stehen, solange der Konflikt besteht, und verschwindet von selbst, sobald er gelöst ist.

## Was noch kommt

Eine farbliche Kennzeichnung von Schliesstagen und Abwesenheiten direkt im Raster, damit man gesperrte Zeiten sieht, bevor man dorthin zieht.
`,
  },
];
