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
      "erledigen", "rapport aus anfrage", "abschliessen", "löschen",
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

![Anfragen-Kanban-Board mit vier Spalten](/hilfe-bilder/anfragen-kanban-board.png)

## Neue Anfrage erfassen

**"+ Neue Anfrage"** klicken. Pflichtfelder sind **Kunde** und **Titel**. Weitere Felder:

- **Projekt** (optional): falls die Anfrage bereits einem bestehenden Projekt zugeordnet werden kann. Zur Auswahl stehen nur Projekte des gewählten Kunden – solange kein Kunde gewählt ist, bleibt das Feld leer. Wechselst du den Kunden nachträglich, wird eine nicht mehr passende Projektauswahl automatisch verworfen.
- **Kanal**: wie die Anfrage eingegangen ist (Telefon, E-Mail, …) – frei konfigurierbar unter [Einstellungen](/hilfe/einstellungen).
- **Priorität**: ebenfalls frei konfigurierbar.
- **Zugewiesen an**: siehe unten.
- **Wiedervorlage**: siehe unten.

![Formular "Neue Anfrage" mit gesetzter Wiedervorlage](/hilfe-bilder/anfrage-neu-wiedervorlage.png)

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

Auf der Detailseite stehen drei Wege zur Auswahl. Bei allen dreien werden Änderungen an Titel, Beschreibung und Zuweisung mitgespeichert – du musst vorher nicht separat auf "Speichern" klicken.

**Erledigen mit Zeiteintrag** ist der übliche Weg: Projekt, Dienstleistung und Dauer angeben, fertig. Auch nicht verrechnete Arbeit gehört hier hinein (dann mit Rabatt 100%), damit die tatsächlich aufgewendete Zeit vollständig erfasst bleibt.

**Erledigen mit Rapport** legt einen [Rapport](/hilfe/rapporte)-Entwurf für diesen Kunden an und übernimmt Titel und Beschreibung der Anfrage als Bemerkung. Die einzelnen Positionen erfasst du danach direkt im Rapport – ArcoTime führt dich dorthin. Der richtige Weg, wenn aus der Anfrage ein Einsatz vor Ort mit mehreren Leistungen wird.

**Nur als erledigt markieren** schliesst die Anfrage ohne Zeiteintrag und ohne Rapport. Gedacht für alles, was keine Leistung nach sich zieht: eine Rückfrage, ein Irrläufer, etwas, das sich von selbst erledigt hat. Steht allen offen, nicht nur Admins.

Beim Zeiteintrag passiert zusätzlich automatisch:

- **Der Name der ausführenden Person kommt als erste Zeile in den Zeiteintrag.** Das ist die gleiche Konvention wie in der [Zeiterfassung](/hilfe/zeiterfassung) und für den Export nötig. Du musst den Namen also nicht selbst in die Beschreibung tippen.
- **War die Anfrage niemandem zugewiesen**, übernimmt die ausführende Person automatisch die Zuständigkeit. Wer eine Anfrage erledigt, ist damit auch dafür verantwortlich – sonst stünde nur am Zeiteintrag, wer gearbeitet hat.

Im Feld **"Mitarbeitende"** lässt sich eine andere Person als die zugewiesene wählen, wenn jemand anderes die Arbeit übernommen hat. Der Zeiteintrag läuft dann auf die ausführende Person, die Anfrage bleibt bei der zuständigen.

Eine erledigte Anfrage lässt sich weiterhin einsehen, aber nicht mehr per Drag & Drop verschieben. Wurde sie ohne Zeiteintrag geschlossen, kann sie später trotzdem noch verrechnet werden – der Block heisst dann "Nachträglich verrechnen".

**Löschen** darf eine Anfrage weiterhin nur ein Admin. Erledigen und Löschen sind zwei verschiedene Dinge: Erledigtes bleibt nachvollziehbar, Gelöschtes ist weg.
`,
  },
];
