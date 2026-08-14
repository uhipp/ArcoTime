import type { HilfeArtikel } from "./typen";

export const ersteSchritte: HilfeArtikel[] = [
  {
    slug: "erste-schritte",
    titel: "Erste Schritte",
    kategorie: "Erste Schritte",
    stichworte: ["anmelden", "login", "übersicht", "dashboard", "rollen", "admin", "navigation"],
    routen: ["/"],
    inhalt: `
Willkommen bei ArcoTime. Diese Seite gibt einen kurzen Überblick, wie die Anwendung aufgebaut ist.

## Wenn zwei gleichzeitig am selben Datensatz arbeiten

Bearbeiten zwei Personen denselben Kunden, dasselbe Projekt oder denselben Rapport, gewinnt **nicht** einfach der Letzte. ArcoTime merkt sich beim Öffnen den Stand des Datensatzes und prüft ihn beim Speichern.

Hat jemand anders in der Zwischenzeit gespeichert, wird **nicht überschrieben**. Stattdessen erscheint eine Meldung, wer den Datensatz geändert hat und wann. Deine Eingaben bleiben dabei im Formular stehen: Lade die Seite in einem zweiten Fenster, sieh dir die Änderung an und übertrage deine Anpassung.

Das ist bewusst keine Sperre. Eine Sperre liesse sich im Browser nicht zuverlässig wieder aufheben – wer den Laptop zuklappt, würde alle anderen aussperren.

## Anmelden

Du meldest dich mit deiner E-Mail-Adresse und deinem Passwort an. Falls du das Passwort vergessen hast, klicke auf **"Passwort vergessen?"** auf der Anmeldeseite – du bekommst dann einen Link per E-Mail, über den du ein neues Passwort setzen kannst.

Neue Mitarbeitende werden von einem Admin eingeladen (siehe [Mitarbeitende](/hilfe/mitarbeitende)). Der Einladungslink führt direkt zur Passwortvergabe – ein separates Konto anlegen ist nicht nötig.

## Die Navigation

Oben in der Kopfzeile findest du:

- **Links**: Name deiner Organisation, dein eigener Name (Klick öffnet dein Mitarbeitenden-Profil) und "Abmelden".
- **Mitte/rechts**: die Hauptnavigation zu allen Modulen (Zeiterfassung, Anfragen, Auswertungen, Kalender, Kunden, Projekte, Dienstleistungen). Admins sehen zusätzlich Mitarbeitende, Export und Einstellungen.
- **"❓ Hilfe"** ganz rechts in der Navigation öffnet immer den zur aktuellen Seite passenden Hilfe-Artikel – auf der Zeiterfassung landest du direkt bei der Zeiterfassungs-Hilfe, auf den Anfragen bei der Anfragen-Hilfe, und so weiter.

## Die Übersichtsseite

Nach dem Anmelden landest du auf der Übersicht. Dort siehst du:

- **Meine Wiedervorlagen**: fällige Anfragen, die dir zugewiesen sind (siehe [Anfragen](/hilfe/anfragen)).
- Kurze Kacheln zu allen Modulen als Schnellzugriff.

## Admin vs. Mitarbeitende

Es gibt zwei Rollen:

- **Mitarbeitende** sehen und erfassen ihre eigene Zeit, sehen alle Kunden/Projekte/Anfragen (gemeinsames Arbeiten), aber keine Verwaltungsbereiche.
- **Admin** sieht zusätzlich alle Zeiteinträge aller Mitarbeitenden, kann Mitarbeitende verwalten/einladen, den Export für die Buchhaltung durchführen und die Einstellungen (Rabattsätze, Kanäle, Kategorien) anpassen.

Wer welche Rolle hat, legt ein Admin auf der Seite [Mitarbeitende](/hilfe/mitarbeitende) fest.
`,
  },
];
