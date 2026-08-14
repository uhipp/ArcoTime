import type { HilfeArtikel } from "./typen";

export const mitarbeitende: HilfeArtikel[] = [
  {
    slug: "mitarbeitende",
    titel: "Mitarbeitende",
    kategorie: "Verwaltung (Admin)",
    stichworte: ["einladen", "rolle", "admin", "farbe", "dokumente je person", "login anlegen", "lizenz", "lizenzen", "rolle", "rechte", "berechtigung", "was darf wer", "abwesenheit", "ferien", "krankheit", "kalender mitarbeiter", "deaktivieren", "reaktivieren", "abo", "abonnement"],
    routen: ["/mitarbeiter"],
    inhalt: `
Nur Admins sehen diese Seite – hier werden Mitarbeitende verwaltet und eingeladen.

![Mitarbeitende-Liste mit Farbfeldern](/hilfe-bilder/mitarbeitende-liste-farben.png)

## Neue Person einladen

Vorname, Nachname und E-Mail-Adresse eingeben und auf **"Einladungslink senden"** klicken. Die Adresse wird vorher geprüft – fehlt etwa die Endung (`name@firma` statt `name@firma.ch`), sagt ArcoTime das sofort, statt dass die Einladung stillschweigend beim Mailserver hängen bleibt. Das legt sofort einen Login an und verschickt eine E-Mail mit einem Link, über den die Person selbst ihr Passwort festlegt – kein separates Konto-Setup nötig.

## Lizenzen

Oben auf der Seite steht, wie viele Lizenzen aktuell genutzt werden, z.B. "7 von 10 Lizenzen genutzt". Jedes eingeladene Konto zählt als eine Lizenz, unabhängig davon, wie aktiv die Person ArcoTime nutzt – auch Admin-Konten zählen mit. Ist das Kontingent erreicht, lässt sich keine weitere Person einladen, bis entweder eine bestehende Person deaktiviert wird oder weitere Lizenzen gebucht werden. Für eine Aufstockung des Lizenzkontingents wende dich an Arcos.

## Mitarbeitende deaktivieren

Über **"Deaktivieren"** in der Zeile einer Person wird deren Konto gesperrt und die Lizenz sofort wieder frei – z.B. wenn jemand die Firma verlässt. Da mit dem Konto verknüpfte Daten (Zeiteinträge, Anfragen, Dokumente) nicht gelöscht werden können, bleibt das Konto selbst bestehen, nur der Zugang wird entzogen. Die eigene Person lässt sich nicht deaktivieren. Eine Deaktivierung lässt sich **nicht selbst zurücknehmen** – dafür ist eine Anfrage an Arcos nötig (bewusst so gelöst, damit Lizenzen nicht durch wiederholtes Deaktivieren/Reaktivieren umgangen werden können).

## Stammdaten bearbeiten

In der Liste lassen sich Vorname, Nachname, Rolle (Mitarbeitende/Admin) und die **Farbe** direkt in der Zeile ändern, mit "Speichern" bestätigen.

## Was darf wer?

Es gibt zwei Rollen: **Mitarbeitende** und **Admin**.

Mitarbeitende dürfen alles erfassen und bearbeiten, was ihnen die Anwendung zeigt – auch Kunden, Projekte und Dienstleistungen, und zwar direkt aus dem Formular heraus, in dem sie gerade stehen. Nicht löschen dürfen sie: **Kunden, Projekte, Dienstleistungen** und bereits **exportierte Zeiteinträge**. Diese Datensätze hängen an bestehenden Zeiteinträgen und Rapporten, ein Löschen wirkt also rückwärts. Der Löschknopf erscheint bei ihnen gar nicht erst.

Nur Admins sehen zusätzlich: [Einstellungen](/hilfe/einstellungen), Mitarbeitende, [Export](/hilfe/export) und die Abwesenheiten einer Person.

## Farbe

Jede Person hat eine Farbe – wird bei der Einladung automatisch aus einer festen Palette vergeben (damit von Anfang an unterscheidbare Farben ohne Zutun vorhanden sind) und lässt sich hier per Farbfeld frei überschreiben. Diese Farbe erscheint im [Kalender](/hilfe/kalender) und macht dort sofort erkennbar, wessen Zeit oder Anfrage das ist.

## Details je Person: Dokumente und Abwesenheiten

Über **"Details"** in der Zeile einer Person öffnest du deren Detailseite. Dort liegen zwei Dinge:

- **Dokumente** – eine eigene Ablage je Person (z.B. Vertragsunterlagen).
- **Abwesenheiten** – Ferien, Krankheit, Militär, Kurs und alles Weitere, das ihr unter [Einstellungen](/hilfe/einstellungen) als Abwesenheitsart angelegt habt.

## Abwesenheiten erfassen

Eine Abwesenheit hat eine Art, ein Von- und ein Bis-Datum sowie optional eine Notiz. Für einen halben Tag ergänzt du zusätzlich eine Von- und eine Bis-Zeit – ohne Zeitangabe gilt der ganze Tag.

Ist bei der Abwesenheitsart **"blockiert die Planung"** gesetzt, verschwindet der Zeitraum in der [Disposition](/hilfe/disposition) aus den freien Zeiten; die Person lässt sich dann für diese Tage nicht einplanen. Arten ohne dieses Häkchen (z.B. "Homeoffice") sind reine Information.

Erfasst und gelöscht werden Abwesenheiten nur von Admins. Sehen kann sie das ganze Team – die Disposition braucht diese Information.
`,
  },
];
