import type { HilfeArtikel } from "./typen";

export const mitarbeitende: HilfeArtikel[] = [
  {
    slug: "mitarbeitende",
    titel: "Mitarbeitende",
    kategorie: "Verwaltung (Admin)",
    stichworte: ["einladen", "rolle", "admin", "farbe", "dokumente je person", "login anlegen"],
    routen: ["/mitarbeiter"],
    inhalt: `
Nur Admins sehen diese Seite – hier werden Mitarbeitende verwaltet und eingeladen.

## Neue Person einladen

Vorname, Nachname und E-Mail-Adresse eingeben und auf **"Einladungslink senden"** klicken. Das legt sofort einen Login an und verschickt eine E-Mail mit einem Link, über den die Person selbst ihr Passwort festlegt – kein separates Konto-Setup nötig.

## Stammdaten bearbeiten

In der Liste lassen sich Vorname, Nachname, Rolle (Mitarbeitende/Admin) und die **Farbe** direkt in der Zeile ändern, mit "Speichern" bestätigen.

## Farbe

Jede Person hat eine Farbe – wird bei der Einladung automatisch aus einer festen Palette vergeben (damit von Anfang an unterscheidbare Farben ohne Zutun vorhanden sind) und lässt sich hier per Farbfeld frei überschreiben. Diese Farbe erscheint im [Kalender](/hilfe/kalender) und macht dort sofort erkennbar, wessen Zeit oder Anfrage das ist.

## Dokumente je Person

Über "Dokumente" bei einer Person gelangst du auf deren Detailseite mit einer eigenen Dokumentenablage (z.B. Vertragsunterlagen).
`,
  },
];
