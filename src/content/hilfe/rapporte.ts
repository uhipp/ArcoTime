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

## Rapportnummer

Die Nummer im Format **2026-0001** wird erst beim Abschliessen vergeben, nicht beim Anlegen. Ein verworfener Entwurf reisst dadurch keine Lücke in die Nummernfolge. Bis dahin steht in der Übersicht "Entwurf". Die Zählung beginnt in jedem Jahr neu.

## Löschen

Solange ein Rapport im Status "Entwurf" ist, kannst du ihn löschen. Die erfassten **Leistungen bleiben dabei bestehen** und sind weiterhin verrechenbar – nur das Dokument darüber verschwindet. Eine einzelne Position entfernst du über "entfernen" in der Zeile; die wird tatsächlich gelöscht, denn sie wurde ja im Rapport erfasst.

## Was noch kommt

Unterschrift des Kunden auf dem Tablet, PDF-Erzeugung und automatischer Versand an die Kundenadresse sind die nächsten Ausbauschritte. Sobald ein Rapport signiert oder abgeschlossen ist, wird er unveränderlich – Korrekturen laufen dann über Storno und Neuerstellung.
`,
  },
];
