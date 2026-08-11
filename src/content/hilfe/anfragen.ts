import type { HilfeArtikel } from "./typen";

export const anfragen: HilfeArtikel[] = [
  {
    slug: "anfragen",
    titel: "Anfragen (Kanban-Board)",
    kategorie: "Arbeiten mit ArcoTime",
    stichworte: [
      "kanban",
      "board",
      "wiedervorlage",
      "zuweisen",
      "übernehmen",
      "erledigen",
      "kanal",
      "priorität",
      "schnellerfassung",
      "dublette",
    ],
    routen: ["/anfragen"],
    inhalt: `
Die Anfragenverwaltung bildet den Vertriebs- bzw. Support-Prozess ab: von der eingehenden Kundenanfrage bis zum erledigten Auftrag.

## Das Kanban-Board

Jede Anfrage ist eine Karte in einer von vier Spalten: **Neu**, **In Bearbeitung**, **Wiedervorlage**, **Erledigt**. Eine Karte lässt sich per Drag & Drop in eine andere Spalte ziehen.

Eine Karte mit **rotem Rahmen** hat eine fällige Wiedervorlage (heute oder früher) – unabhängig davon, in welcher Spalte sie gerade liegt.

## Neue Anfrage erfassen

**"+ Neue Anfrage"** klicken. Pflichtfelder sind **Kunde** und **Titel**. Weitere Felder:

- **Projekt** (optional): falls die Anfrage bereits einem bestehenden Projekt zugeordnet werden kann.
- **Kanal**: wie die Anfrage eingegangen ist (Telefon, E-Mail, …) – frei konfigurierbar unter [Einstellungen](/hilfe/einstellungen).
- **Priorität**: ebenfalls frei konfigurierbar.
- **Zugewiesen an**: siehe unten.
- **Wiedervorlage**: siehe unten.

## Durchgängige Schnellerfassung

Fehlt der Kunde oder das passende Projekt noch, lassen sich beide **direkt aus dem Anfrage-Formular heraus** anlegen – über **"+ Neuer Kunde"** bzw. **"+ Neues Projekt"** neben dem jeweiligen Feld, ohne die Seite zu verlassen. Fehlt bei einem neuen Projekt auch noch der Kunde, lässt sich dieser sogar verschachtelt direkt im selben Dialog anlegen. Dasselbe Prinzip gilt auch in den Formularen für Projekte und Zeiterfassung.

## Dubletten-Warnung

Wird beim Schnellanlegen ein Name gefunden, der (unabhängig von Grossbuchstaben) bereits existiert, erscheint eine Warnung mit zwei Optionen: **"Bestehenden verwenden"** (übernimmt den gefundenen Datensatz) oder **"Trotzdem neu anlegen"** (bewusste Dublette, z.B. bei zufällig gleichem Namen). Die Prüfung läuft gegen die Datenbank, nicht nur den eigenen Bildschirm – greift also auch, wenn zwei Mitarbeitende gleichzeitig arbeiten.

## Zuweisen

Über das Feld **"Zugewiesen an"** legst du fest, wer für die Anfrage verantwortlich ist. Ist eine Anfrage noch **nicht zugewiesen**, kann jede Person sie über den Button **"Übernehmen"** direkt auf der Karte für sich selbst übernehmen.

**Benachrichtigung**: Wird eine Anfrage bei der Erfassung direkt zugewiesen oder die Zuweisung nachträglich geändert, bekommt die neu zugewiesene Person automatisch eine **E-Mail** mit Titel der Anfrage, direktem Link und dem Namen der zuweisenden Person. Übernimmt sich jemand eine Anfrage selbst, gibt es bewusst keine Mail.

## Wiedervorlage

Eine Wiedervorlage ist ein Datum, ab dem eine Anfrage aktiv wieder aufgegriffen werden soll. Das Feld erscheint erst nach Klick auf **"+ Datum setzen"** – standardmässig ist keine Wiedervorlage gesetzt.

Sobald das Datum erreicht ist, passiert Folgendes automatisch (täglich um 07:30 Uhr):

- Die Karte wandert in die Spalte **"Wiedervorlage"** (ausser sie liegt bereits dort oder ist erledigt).
- Die zuständige Person bekommt eine **E-Mail-Zusammenfassung** aller ihrer fälligen Wiedervorlagen.
- Ein **roter Zähler** neben "Anfragen" in der Navigation zeigt jederzeit, wie viele fällige Wiedervorlagen man selbst hat.

Mehr dazu unter [Benachrichtigungen](/hilfe/benachrichtigungen).

## Anfrage erledigen

Eine Anfrage abschliessen erzeugt **immer** einen Zeiteintrag – auch wenn nichts verrechnet wird (dann mit Rabatt 100%). So bleibt die tatsächlich aufgewendete Zeit vollständig erfasst. Dafür auf der Anfrage-Detailseite Projekt, Dienstleistung und Dauer angeben und auf "Erledigen" klicken.

Eine erledigte Anfrage lässt sich weiterhin einsehen, aber nicht mehr per Drag & Drop verschieben.
`,
  },
];
