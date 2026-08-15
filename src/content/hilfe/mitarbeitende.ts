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

**Sortieren**: Ein Klick auf einen Spaltenkopf sortiert die Liste danach, ein zweiter Klick dreht die Richtung um. Filter und Suche bleiben dabei erhalten, und die Sortierung steht in der Adresse – sie überlebt also ein Neuladen.

**Spalten wählen**: Über „Spalten“ oben rechts blendest du nicht benötigte Angaben aus. Die Auswahl gilt nur für deine Anmeldung. Vorname und die beiden Spalten ganz rechts bleiben sichtbar – dort hängen das Bearbeitungsformular und die Knöpfe.


## Anstellung, Pensum und Ferienanspruch (Zusatzmodul Zeitkonto)

Auf der Detailseite einer Person, nur mit gebuchtem **Zeitkonto**. Der Admin pflegt die Werte, die Person sieht ihre eigenen.

**Eintritt und Austritt** bestimmen, ab wann und bis wann Sollstunden und Ferienanspruch anteilig gerechnet werden.

**Pensum**: Ein neues Pensum **ersetzt das alte nicht**, es beginnt an einem Datum. Wechselt jemand per 1. Juli von 100 auf 80 Prozent, trägst du einen zweiten Eintrag „ab 01.07., 80 %" ein – der erste bleibt stehen. Nur so rechnet eine Auswertung des ersten Halbjahres weiterhin mit 100 Prozent. Ohne jeden Eintrag gilt 100 Prozent.

Das Feld **Tage/Woche** braucht nur, wer die Teilzeit auf wenige ganze Tage verteilt: 60 Prozent an drei ganzen Tagen ergibt ein anderes Tages-Soll als 60 Prozent an fünf kurzen – und damit einen anders bewerteten Ferientag. Leer heisst „wie die Organisation".

**Ferienanspruch** je Jahr in Tagen, dazu der **Übertrag** aus dem Vorjahr.

## Das Zeitkonto (Zusatzmodul)

Über **„Zeitkonto öffnen"** auf der Detailseite. Jede Person sieht ihr eigenes, Administratoren alle.

Zwölf Monatszeilen mit **Soll**, **Ist**, **Differenz** und fortlaufendem **Saldo**, dazu das Ferienguthaben. So wird gerechnet:

- **Soll** = Sollstunden des Monats, auf die Arbeitstage verteilt und mit dem Pensum gerechnet, abzüglich bezahlter Absenzen. Gerechnet wird tageweise – deshalb stimmen auch ein Eintritt am 15. und ein Pensumswechsel mitten im Monat.
- **Ist** = erfasste Arbeitszeit. Positionen offener Rapporte zählen **erst mit deren Abschluss**: Solange ein Rapport offen ist, stehen dort Schätzungen und keine geleistete Zeit.
- **Abbau** = Stunden aus Abwesenheiten, die den Saldo belasten (Überstundenabbau).
- **Betriebsferien** reduzieren das Soll und kosten Ferientage. Wer während der Betriebsferien krank ist, verbraucht dagegen keine Ferientage – die erfasste Abwesenheit hat Vorrang.

**Als PDF** (A4 quer) über den Knopf oben rechts – für die Personalakte und die Unterschrift bei der Jahresbesprechung. Ein Haken beim Monat bedeutet: abgeschlossen, die Zahlen sind festgehalten.

**Manuelle Buchungen** sind für alles, was weder erfasste Zeit noch Abwesenheit ist: den **Startsaldo** bei der Einführung, die Auszahlung von Überstunden, eine Kürzung zum Jahreswechsel. Eine Buchung mit einem Datum **vor dem 1. Januar** des angezeigten Jahres wirkt als Startsaldo und wandert von Jahr zu Jahr mit. Jede Buchung verlangt einen Grund – in einem Jahr ist sie sonst niemandem mehr erklärbar. Erfassen darf nur ein Admin.

## Ein Mensch, ein Konto

Jede Person arbeitet mit dem **eigenen Login** – auch die Chefin, auch das Büro. Ein gemeinsames Verwaltungskonto („Admin"), mit dem mehrere Leute konfigurieren, wirkt praktisch und kostet zwei Dinge:

- **Nachvollziehbarkeit.** Im [Änderungsprotokoll](/hilfe/einstellungen) stünde dann „Admin" statt der Person, die es tatsächlich war.
- **Richtigkeit.** Zeiterfassung, Kalenderfarbe, verantwortliche Person am Rapport und Abwesenheiten hängen alle an einer Person. Ein Sammelkonto hat keine.

**„Admin" ist deshalb eine Eigenschaft einer Person und kein eigener Zugang.** Wer mitarbeitet und zusätzlich einrichten soll, bekommt an seinem persönlichen Konto die Rolle „Admin". Ein reines Verwaltungskonto ohne Mitarbeit ist nicht vorgesehen – es würde ausserdem eine Lizenz belegen, ohne dass jemand damit arbeitet.

## Neue Person einladen

Vorname, Nachname und E-Mail-Adresse eingeben und auf **"Einladungslink senden"** klicken. Die Adresse wird vorher geprüft – fehlt etwa die Endung (name@firma statt name@firma.ch), sagt ArcoTime das sofort, statt dass die Einladung stillschweigend beim Mailserver hängen bleibt. Das legt sofort einen Login an und verschickt eine E-Mail mit einem Link, über den die Person selbst ihr Passwort festlegt – kein separates Konto-Setup nötig.

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
