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

## Zeit nachträglich erfassen

1. **Projekt** wählen. Fehlt das Projekt noch? Über **"+ Neues Projekt"** direkt neben dem Feld kannst du es sofort anlegen, ohne die Seite zu verlassen (siehe [Durchgängige Schnellerfassung](/hilfe/anfragen)).
2. **Dienstleistung** wählen – bestimmt den Stundenansatz.
3. **Datum** und **Dauer** (in Minuten oder Stunden, je nach Eingabefeld) angeben.
4. Optional eine **Beschreibung** ergänzen und einen **Rabatt** wählen, falls die Leistung vergünstigt oder nicht verrechnet wird.
5. **Speichern**.

## Zeit per Timer erfassen

Statt die Dauer im Nachhinein einzutragen, kannst du einen Timer starten:

1. Projekt und Dienstleistung wählen wie oben.
2. Auf **"Timer starten"** klicken.
3. Der Timer läuft **serverseitig weiter** – du kannst den Browser schliessen oder das Gerät wechseln, die laufende Zeit geht nicht verloren.
4. Wenn du fertig bist, den Eintrag öffnen und auf **"Stoppen"** klicken – die Dauer wird automatisch aus Start- und Stoppzeitpunkt berechnet.

Ein laufender Timer ist in der Liste rot markiert und zeigt "⏱ Timer aktiv" statt einer Stundenzahl.

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
