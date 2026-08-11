import type { HilfeArtikel } from "./typen";

export const mitarbeitende: HilfeArtikel[] = [
  {
    slug: "mitarbeitende",
    titel: "Mitarbeitende",
    kategorie: "Verwaltung (Admin)",
    stichworte: ["einladen", "rolle", "admin", "farbe", "dokumente je person", "login anlegen", "lizenz", "lizenzen", "deaktivieren", "reaktivieren", "abo", "abonnement"],
    routen: ["/mitarbeiter"],
    inhalt: `
Nur Admins sehen diese Seite – hier werden Mitarbeitende verwaltet und eingeladen.

![Mitarbeitende-Liste mit Farbfeldern](/hilfe-bilder/mitarbeitende-liste-farben.png)

## Neue Person einladen

Vorname, Nachname und E-Mail-Adresse eingeben und auf **"Einladungslink senden"** klicken. Das legt sofort einen Login an und verschickt eine E-Mail mit einem Link, über den die Person selbst ihr Passwort festlegt – kein separates Konto-Setup nötig.

## Lizenzen

Oben auf der Seite steht, wie viele Lizenzen aktuell genutzt werden, z.B. "7 von 10 Lizenzen genutzt". Jedes eingeladene Konto zählt als eine Lizenz, unabhängig davon, wie aktiv die Person ArcoTime nutzt – auch Admin-Konten zählen mit. Ist das Kontingent erreicht, lässt sich keine weitere Person einladen, bis entweder eine bestehende Person deaktiviert wird oder weitere Lizenzen gebucht werden. Für eine Aufstockung des Lizenzkontingents wende dich an Arcos.

## Mitarbeitende deaktivieren

Über **"Deaktivieren"** in der Zeile einer Person wird deren Konto gesperrt und die Lizenz sofort wieder frei – z.B. wenn jemand die Firma verlässt. Da mit dem Konto verknüpfte Daten (Zeiteinträge, Anfragen, Dokumente) nicht gelöscht werden können, bleibt das Konto selbst bestehen, nur der Zugang wird entzogen. Die eigene Person lässt sich nicht deaktivieren. Eine Deaktivierung lässt sich **nicht selbst zurücknehmen** – dafür ist eine Anfrage an Arcos nötig (bewusst so gelöst, damit Lizenzen nicht durch wiederholtes Deaktivieren/Reaktivieren umgangen werden können).

## Stammdaten bearbeiten

In der Liste lassen sich Vorname, Nachname, Rolle (Mitarbeitende/Admin) und die **Farbe** direkt in der Zeile ändern, mit "Speichern" bestätigen.

## Farbe

Jede Person hat eine Farbe – wird bei der Einladung automatisch aus einer festen Palette vergeben (damit von Anfang an unterscheidbare Farben ohne Zutun vorhanden sind) und lässt sich hier per Farbfeld frei überschreiben. Diese Farbe erscheint im [Kalender](/hilfe/kalender) und macht dort sofort erkennbar, wessen Zeit oder Anfrage das ist.

## Dokumente je Person

Über "Dokumente" bei einer Person gelangst du auf deren Detailseite mit einer eigenen Dokumentenablage (z.B. Vertragsunterlagen).
`,
  },
];
