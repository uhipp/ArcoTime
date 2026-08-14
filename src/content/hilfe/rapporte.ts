import type { HilfeArtikel } from "./typen";

export const rapporte: HilfeArtikel[] = [
  {
    slug: "rapporte",
    titel: "Arbeitsrapporte",
    kategorie: "Arbeiten mit ArcoTime",
    stichworte: [
      "rapport",
      "arbeitsrapport",
      "einsatz",
      "vor ort",
      "unterschrift",
      "positionen",
      "anfahrt",
      "material",
    ],
    routen: ["/rapporte"],
    inhalt: `
Ein Arbeitsrapport fasst alles zusammen, was bei einem Kundeneinsatz angefallen ist: Anfahrt, Arbeitszeit und verbrauchtes Material. Er ist die Klammer um mehrere Positionen, die sonst als einzelne Zeiteinträge nebeneinanderstünden.

## Wann brauchst du einen Rapport – und wann nicht?

Ein Rapport ist **optional**. Fernwartung, Büroarbeit, interne Zeit oder eine telefonisch erledigte Anfrage erfasst du weiterhin direkt in der [Zeiterfassung](/hilfe/zeiterfassung). Der Rapport lohnt sich dort, wo ein Einsatz aus mehreren Positionen besteht und der Kunde einen Nachweis erhalten soll.

## Einen Rapport erstellen

Zwei Wege führen zu einem Rapport. Der direkte: **"+ Neuer Rapport"** auf der Übersicht. Im Kopf legst du fest:

- **Kunde** und **Projekt** – zur Auswahl stehen nur Projekte dieses Kunden
- **Einsatzdatum** und **ausgeführt von** – beides gilt für alle Positionen, du musst es nicht je Zeile wiederholen
- **Bemerkung** – erscheint später auf dem Rapport

Nach dem Anlegen landest du direkt auf der Detailseite, wo du die Positionen erfasst.

Datum und ausführende Person gelten für den **ganzen Rapport** – sie stehen deshalb nur im Kopf und nicht bei den Positionen. Änderst du sie oben, ziehen die bereits erfassten Positionen automatisch nach.

## Rapport abschliessen

Solange ein Rapport offen ist, zählen seine Positionen nirgends. Der Abschluss ist damit kein Formalismus, sondern der Moment, in dem die Arbeit gültig wird – er steht unten auf der Rapportseite.

Beim Abschliessen erhält der Rapport seine **Nummer** und wird **unveränderlich**. Korrekturen laufen danach über Storno und Neuerstellung.

Der gemeinte Weg ist **„Signieren und abschliessen"**: Name der unterzeichnenden Person eintragen, den Kunden im Feld darunter unterschreiben lassen – mit Finger oder Stift auf dem Tablet, mit der Maus am Rechner – und abschliessen. Die Unterschrift bleibt am Rapport sichtbar.

Ist niemand Unterschriftsberechtigtes mehr vor Ort, gibt es darunter **„Ohne Unterschrift abschliessen"**. Dieser Weg verlangt einen kurzen **Vermerk**, warum keine Unterschrift vorliegt – etwa „Kunde nicht mehr vor Ort". Er liegt bewusst eine Ebene tiefer, damit er nicht zur Gewohnheit wird.

Zwei Fälle lassen keinen Abschluss zu: ein Rapport **ohne Positionen** und einer mit **Datum in der Zukunft**. Beim zweiten ist der Einsatz schlicht noch nicht geleistet.

## Wann eine Position zählt

Ein Rapport wird meist **vorbereitet**: Die Disposition legt die Aufträge der kommenden Woche an, oft schon mit bekannten Positionen – Reisespesen, angenommene Stunden – und mit einer Beschreibung dessen, was zu tun ist. Der Monteur passt vor Ort die Werte an und schliesst ab.

Bis zum Abschluss ist eine Position eine **Absicht, kein Nachweis**. Sie erscheint deshalb weder in den [Auswertungen](/hilfe/auswertungen) noch im [Export](/hilfe/export) und auch nicht in der [Zeiterfassungsliste](/hilfe/zeiterfassung) – dort stünden sonst Zeiten, die noch gar nicht geleistet sein können. Im [Kalender](/hilfe/kalender) erscheint der Einsatz als **geplant**.

Mit dem Abschliessen oder Signieren zählt alles auf einmal: Es wird nichts kopiert und nichts verschoben, der Rapport wechselt lediglich seinen Status. Ein **stornierter** Rapport zählt nie.

Daraus folgt: **Ein Rapport mit Datum in der Zukunft lässt sich nicht abschliessen.** Vorbereiten ja, abschliessen erst, wenn der Tag da ist.

Nicht betroffen ist die Prüfung der Tagesarbeitszeit – sie zählt auch vorläufige Positionen mit. Sie fragt, ob ein Tag überhaupt plausibel ist, und das gilt für die Planung genauso: Wenn die Disposition jemandem vierzehn Stunden auf einen Tag legt, soll das auffallen.

## Positionen erfassen

Jede Position ist ein ganz normaler Zeiteintrag – sie wird verrechnet, exportiert und erscheint in den Auswertungen wie jeder andere Eintrag auch. Der Rapport ist nur die Klammer darum.

Je nach gewählter Leistung erscheint das passende Feld:

- **Arbeitszeit**: Von/Bis oder direkt eine Dauer in Minuten
- **Mengenartikel** wie Kilometer oder Material: ein Mengenfeld mit der Einheit der Leistung

Welche Leistungen als Arbeitszeit zählen, legt ein Admin unter [Dienstleistungen](/hilfe/dienstleistungen) fest. Preis, MWSt-Satz und Rabatt werden beim Hinzufügen eingefroren – eine spätere Änderung an den Stammdaten verändert einen bestehenden Rapport nicht.

Einen Timer gibt es hier bewusst nicht: Wer einen Rapport schreibt, ist mit der Arbeit fertig.

Der zweite Weg führt über eine [Anfrage](/hilfe/anfragen): Dort schliesst **"Erledigen mit Rapport"** die Anfrage ab und legt gleichzeitig den passenden Rapport-Entwurf an – Kunde, Projekt und zuständige Person sind bereits gesetzt, Titel und Beschreibung stehen als Bemerkung drin. Der übliche Ablauf, wenn aus einer Kundenanfrage ein Einsatz vor Ort wird.

## Dokumente am Rapport

Zu jedem Rapport lassen sich Dokumente ablegen – Anweisungen, Pläne, Fotos, alles was die Person braucht, die rausfährt. Kommt der Rapport aus einer [Anfrage](/hilfe/anfragen), können deren Dokumente beim Abschliessen direkt mit übernommen werden.

## Wenn eine Position abgelehnt wird

Überschreitet eine Position die zulässige Tagesarbeitszeit, erscheint der Hinweis schon **während** du sie erfasst – nicht erst beim Speichern. Und falls der Server sie doch ablehnt, bleibt alles Eingetippte stehen: Die Meldung erscheint im Formular, die Beschreibung ist nicht verloren.

## Übersicht sortieren

Ein Klick auf einen Spaltenkopf sortiert die Liste nach dieser Spalte, ein zweiter Klick dreht die Richtung um. Der kleine Pfeil zeigt, wonach gerade sortiert ist. Ein gesetzter Statusfilter bleibt dabei erhalten.

Die Sortierung steht in der Adresse – die Ansicht überlebt also ein Neuladen und lässt sich als Lesezeichen ablegen oder weitergeben.

## Rapportnummer

Die Nummer im Format **2026-0001** wird erst beim Abschliessen vergeben, nicht beim Anlegen. Ein verworfener Entwurf reisst dadurch keine Lücke in die Nummernfolge. Bis dahin steht in der Übersicht "Entwurf". Die Zählung beginnt in jedem Jahr neu.

## Löschen

Solange ein Rapport im Status "Entwurf" ist, kannst du ihn löschen. **Die erfassten Positionen werden dabei mitgelöscht.** Wer einen Rapport verwirft, tut das, weil der Einsatz nicht stattfindet oder etwas schiefgelaufen ist – dann wurde die Leistung auch nicht erbracht und darf nicht als verrechenbarer Zeiteintrag zurückbleiben. Stammt der Rapport aus einer [Anfrage](/hilfe/anfragen), wird diese dabei wieder geöffnet.

Eine Ausnahme: Ist eine Position bereits **exportiert**, lässt sich der Rapport nicht mehr löschen – diese Leistung liegt schon in der Buchhaltung. Für solche Fälle ist die Stornierung vorgesehen. Eine einzelne Position entfernst du über "entfernen" in der Zeile.

## Was noch kommt

Unterschrift des Kunden auf dem Tablet, PDF-Erzeugung und automatischer Versand an die Kundenadresse sind die nächsten Ausbauschritte. Sobald ein Rapport signiert oder abgeschlossen ist, wird er unveränderlich – Korrekturen laufen dann über Storno und Neuerstellung.
`,
  },
];
