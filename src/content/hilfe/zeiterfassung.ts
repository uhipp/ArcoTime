import type { HilfeArtikel } from "./typen";

export const zeiterfassung: HilfeArtikel[] = [
  {
    slug: "zeiterfassung",
    titel: "Zeiterfassung",
    kategorie: "Arbeiten mit ArcoTime",
    stichworte: ["zeit erfassen", "timer", "stunden", "arbeitszeit", "rabatt", "dauer"],
    routen: ["/zeiterfassung"],
    inhalt: `
Auf dieser Seite erfasst du deine Arbeitszeit – entweder nachträglich mit fester Dauer, oder live per Timer.

![Zeiterfassungsformular](/hilfe-bilder/zeiterfassung-formular.png)

**Sortieren**: Ein Klick auf einen Spaltenkopf sortiert die Liste danach, ein zweiter Klick dreht die Richtung um. Filter und Suche bleiben dabei erhalten, und die Sortierung steht in der Adresse – sie überlebt also ein Neuladen.

**Spalten wählen**: Über „Spalten“ oben rechts stellst du ein, welche Angaben die Liste zeigt – zusätzlich stehen Von–bis, Kostenstelle, Beschreibung und Rabatt zur Verfügung. Die Auswahl gilt nur für deine Anmeldung, folgt dir aber auf jedes Gerät. Summen zeigt die Fusszeile nur für die eingeblendeten Spalten.

Ein Zeiteintrag kann **nicht in der Zukunft liegen** – die Arbeit muss zuerst getan sein. Geprüft wird das Datum, nicht die Uhrzeit: Wer um 16:55 den Block bis 17:00 erfasst, wird nicht ausgebremst.

Positionen eines noch offenen [Rapports](/hilfe/rapporte) erscheinen hier bewusst nicht. Sie sind Auftragsinhalt und werden im Rapport bearbeitet; erst mit dem Abschluss werden sie zu erfasster Zeit.


## Wann ein Eintrag nicht mehr änderbar ist

Zwei Ereignisse machen einen Zeiteintrag unveränderlich – für alle, auch für Administratoren:

- **Der Export.** Wurde der Eintrag exportiert, liegt er in der Buchhaltung. Eine Korrektur läuft dort über den Beleg und nicht mehr über die Zeiterfassung.
- **Der Monatsabschluss im [Zeitkonto](/hilfe/mitarbeitende).** Ist der Monat dieser Person abgeschlossen, sind ihre Stunden festgehalten. Eine Korrektur läuft über eine Buchung im Folgemonat – oder ein Admin öffnet den Monat wieder.

Beide Sperren stehen in der Datenbank und nicht nur in der Oberfläche: Sie greifen auf jedem Weg, auch beim Bearbeiten einer Rapportposition.

## Zeit nachträglich erfassen

1. **Projekt** wählen. Fehlt das Projekt noch? Über **"+ Neues Projekt"** direkt neben dem Feld kannst du es sofort anlegen, ohne die Seite zu verlassen (siehe [Durchgängige Schnellerfassung](/hilfe/anfragen)).
2. **Artikel** wählen – bestimmt den Stundenansatz.
3. **Datum** und **Dauer** (in Minuten oder Stunden, je nach Eingabefeld) angeben.
4. Optional eine **Beschreibung** ergänzen und einen **Rabatt** wählen, falls die Leistung vergünstigt oder nicht verrechnet wird. Hat die gewählte Leistung im [Artikelstamm](/hilfe/artikel) eine Beschreibung hinterlegt, steht diese hier bereits als Vorschlag – unter der Namenszeile und jederzeit überschreibbar. Eigener Text wird dabei nie ersetzt.
5. **Speichern**.

## Zeit per Timer erfassen

Statt die Dauer im Nachhinein einzutragen, kannst du einen Timer starten:

1. Projekt und Artikel wählen wie oben.
2. Auf **"Timer starten"** klicken.
3. Der Timer läuft **serverseitig weiter** – du kannst den Browser schliessen oder das Gerät wechseln, die laufende Zeit geht nicht verloren.
4. Wenn du fertig bist, den Eintrag öffnen und auf **"Stoppen"** klicken – die Dauer wird automatisch aus Start- und Stoppzeitpunkt berechnet.

Ein laufender Timer ist in der Liste rot markiert und zeigt "⏱ Timer aktiv" statt einer Stundenzahl.

## Zwei Regeln, die ArcoTime durchsetzt

Seit dem 21.08.2026 prüft nicht mehr nur die Eingabemaske, sondern die Datenbank selbst:

- **Nur ein laufender Timer je Person.** Läuft schon einer, muss er zuerst gestoppt werden – auch dann, wenn er auf einem anderen Gerät gestartet wurde.
- **Keine überlappenden Zeiten derselben Person.** Wer von 08:00 bis 12:00 auf einem Projekt gebucht ist, kann nicht gleichzeitig von 10:00 bis 11:00 auf einem anderen stehen. Einträge mit reiner **Dauer** (ohne Von/Bis) sind davon nicht betroffen – sie sagen nichts über die Lage im Tag.

Beides gilt bewusst in der Datenbank und nicht nur im Formular: So greift die Regel auch für Wege, die später dazukommen, etwa eine Erfassung über das Handy.

## Spesen, Kilometer und Material erfassen

Wählst du einen Artikel, der nicht als Arbeitszeit zählt (Kilometergeld, Spesen, Kleinmaterial), verschwinden Von/Bis und Dauer – stattdessen erscheint ein **Mengenfeld** mit der passenden Einheit, z.B. "Menge in km". Der Timer entfällt dort ebenfalls, ein Kilometer hat keine Laufzeit.

Solche Positionen werden ganz normal verrechnet und exportiert, erscheinen aber in **keiner** Stundenauswertung. Deine Wochenstunden bleiben also sauber, auch wenn du 120 km und drei Packungen Material erfasst hast.

Welche Artikel so behandelt werden, legt ein Admin unter [Artikel](/hilfe/artikel) fest.

## Rabatt wird automatisch vorgeschlagen

Sobald Projekt und Artikel gewählt sind, füllt sich das Rabattfeld selbst – mit dem Klassenrabatt des Kunden, sonst mit dessen Standardrabatt (siehe [Kunden](/hilfe/kunden)). Bei Artikel ohne Rabatterlaubnis stehen nur 0% und 100% zur Auswahl.

Der Vorschlag lässt sich jederzeit überschreiben. Gespeichert wird der Wert am Eintrag – ändert jemand später den Rabatt beim Kunden, bleiben bestehende Einträge unverändert.

## Warum ändert sich der Preis eines alten Eintrags nicht, wenn ich die Artikel anpasse?

Beim Speichern eines Zeiteintrags wird der zu diesem Zeitpunkt gültige Preis des Artikels **festgeschrieben** (ein "Preis-Snapshot"). Änderst du später den Preis im Artikelstamm, bleiben bereits erfasste Einträge unverändert – wichtig für korrekte, nachvollziehbare Abrechnungen.

## Eigene Einträge einsehen und filtern

Unterhalb des Formulars siehst du deine eigenen Einträge im gewählten Zeitraum, mit Datum, Kunde/Projekt, Artikel, Dauer und Betrag. Über die Datumsfelder oben rechts lässt sich der Zeitraum anpassen.

Ein Eintrag lässt sich öffnen und bearbeiten, solange er **noch nicht exportiert** wurde (siehe [Export](/hilfe/export)) – danach ist er aus Buchhaltungsgründen fixiert und wird nur noch als "exportiert" angezeigt.

## Automatischer Namens-Präfix

Wird eine Anfrage erledigt und dabei ein Zeiteintrag erzeugt (siehe [Anfragen](/hilfe/anfragen)), oder wird ein Eintrag für eine andere Person erfasst, setzt ArcoTime automatisch den Namen der zuständigen Person als erste Zeile in die Beschreibung – wichtig für den späteren Export.
`,
  },
];
