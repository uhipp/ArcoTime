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

Ein Zeiteintrag kann **nicht in der Zukunft liegen** – die Arbeit muss zuerst getan sein. Geprüft wird das Datum, nicht die Uhrzeit: Wer um 16:55 den Block bis 17:00 erfasst, wird nicht ausgebremst.

Positionen eines noch offenen [Rapports](/hilfe/rapporte) erscheinen hier bewusst nicht. Sie sind Auftragsinhalt und werden im Rapport bearbeitet; erst mit dem Abschluss werden sie zu erfasster Zeit.

## Zeit nachträglich erfassen

1. **Projekt** wählen. Fehlt das Projekt noch? Über **"+ Neues Projekt"** direkt neben dem Feld kannst du es sofort anlegen, ohne die Seite zu verlassen (siehe [Durchgängige Schnellerfassung](/hilfe/anfragen)).
2. **Dienstleistung** wählen – bestimmt den Stundenansatz.
3. **Datum** und **Dauer** (in Minuten oder Stunden, je nach Eingabefeld) angeben.
4. Optional eine **Beschreibung** ergänzen und einen **Rabatt** wählen, falls die Leistung vergünstigt oder nicht verrechnet wird. Hat die gewählte Leistung im [Dienstleistungskatalog](/hilfe/dienstleistungen) eine Beschreibung hinterlegt, steht diese hier bereits als Vorschlag – unter der Namenszeile und jederzeit überschreibbar. Eigener Text wird dabei nie ersetzt.
5. **Speichern**.

## Zeit per Timer erfassen

Statt die Dauer im Nachhinein einzutragen, kannst du einen Timer starten:

1. Projekt und Dienstleistung wählen wie oben.
2. Auf **"Timer starten"** klicken.
3. Der Timer läuft **serverseitig weiter** – du kannst den Browser schliessen oder das Gerät wechseln, die laufende Zeit geht nicht verloren.
4. Wenn du fertig bist, den Eintrag öffnen und auf **"Stoppen"** klicken – die Dauer wird automatisch aus Start- und Stoppzeitpunkt berechnet.

Ein laufender Timer ist in der Liste rot markiert und zeigt "⏱ Timer aktiv" statt einer Stundenzahl.

## Spesen, Kilometer und Material erfassen

Wählst du eine Dienstleistung, die nicht als Arbeitszeit zählt (Kilometergeld, Spesen, Kleinmaterial), verschwinden Von/Bis und Dauer – stattdessen erscheint ein **Mengenfeld** mit der passenden Einheit, z.B. "Menge in km". Der Timer entfällt dort ebenfalls, ein Kilometer hat keine Laufzeit.

Solche Positionen werden ganz normal verrechnet und exportiert, erscheinen aber in **keiner** Stundenauswertung. Deine Wochenstunden bleiben also sauber, auch wenn du 120 km und drei Packungen Material erfasst hast.

Welche Dienstleistungen so behandelt werden, legt ein Admin unter [Dienstleistungen](/hilfe/dienstleistungen) fest.

## Rabatt wird automatisch vorgeschlagen

Sobald Projekt und Dienstleistung gewählt sind, füllt sich das Rabattfeld selbst – mit dem Klassenrabatt des Kunden, sonst mit dessen Standardrabatt (siehe [Kunden](/hilfe/kunden)). Bei Dienstleistungen ohne Rabatterlaubnis stehen nur 0% und 100% zur Auswahl.

Der Vorschlag lässt sich jederzeit überschreiben. Gespeichert wird der Wert am Eintrag – ändert jemand später den Rabatt beim Kunden, bleiben bestehende Einträge unverändert.

## Warum ändert sich der Preis eines alten Eintrags nicht, wenn ich die Dienstleistung anpasse?

Beim Speichern eines Zeiteintrags wird der zu diesem Zeitpunkt gültige Preis der Dienstleistung **festgeschrieben** (ein "Preis-Snapshot"). Änderst du später den Preis im Dienstleistungskatalog, bleiben bereits erfasste Einträge unverändert – wichtig für korrekte, nachvollziehbare Abrechnungen.

## Eigene Einträge einsehen und filtern

Unterhalb des Formulars siehst du deine eigenen Einträge im gewählten Zeitraum, mit Datum, Kunde/Projekt, Dienstleistung, Dauer und Betrag. Über die Datumsfelder oben rechts lässt sich der Zeitraum anpassen.

Ein Eintrag lässt sich öffnen und bearbeiten, solange er **noch nicht exportiert** wurde (siehe [Export](/hilfe/export)) – danach ist er aus Buchhaltungsgründen fixiert und wird nur noch als "exportiert" angezeigt.

## Automatischer Namens-Präfix

Wird eine Anfrage erledigt und dabei ein Zeiteintrag erzeugt (siehe [Anfragen](/hilfe/anfragen)), oder wird ein Eintrag für eine andere Person erfasst, setzt ArcoTime automatisch den Namen der zuständigen Person als erste Zeile in die Beschreibung – wichtig für den späteren Export.
`,
  },
];
