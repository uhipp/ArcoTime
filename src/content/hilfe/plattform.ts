import type { HilfeArtikel } from "./typen";

export const plattform: HilfeArtikel[] = [
  {
    slug: "plattform",
    titel: "Plattform-Administration (Arcos)",
    kategorie: "Verwaltung (Arcos intern)",
    stichworte: [
      "lizenzmodul",
      "organisation anlegen",
      "testphase",
      "zahltermin",
      "sperrgrund",
      "gesperrt",
      "registrierung",
      "stripe",
      "abo",
      "abonnement",
      "als bezahlt markieren",
      "platform admin",
    ],
    routen: ["/plattform"],
    inhalt: `
Diese Seite ist ausschliesslich für **Arcos-Mitarbeitende mit Platform-Admin-Rechten** sichtbar (unabhängig von der jeweiligen Kundenorganisation) – hier werden alle Kundenorganisationen von ArcoTime verwaltet.

## Wie eine Organisation entsteht

Meldet sich ein Kunde selbst über die öffentliche Seite **/registrieren** an und schliesst die Zahlung bei Stripe erfolgreich ab, legt das System die Organisation **automatisch** an (per Stripe-Webhook) – inklusive Einladung des ersten Admin-Kontos. Für Sonderfälle (z.B. eine Organisation ohne Online-Registrierung, oder ein weiterer interner Test-Mandant) lässt sich unter **"Neue Organisation anlegen"** auch manuell eine Organisation samt erstem Admin-Konto erstellen.

### Bestpreis-Garantie bei der Selbstregistrierung

Weil die Staffel (bis 9 Benutzer CHF 15.–, ab 10 CHF 13.–, ab 20 CHF 11.– pro Benutzer und Monat, exkl. MWST) für **alle** Lizenzen den Satz der erreichten Stufe verwendet, wären einzelne Mengen sonst teurer als grössere: 9 Benutzer kosteten 135.–, 10 Benutzer nur 130.–. Die Registrierung rundet deshalb automatisch auf die günstigere Menge auf.

Konkret betrifft das die Bestellmengen **9** (wird zu 10 Lizenzen), **18** und **19** (werden zu 20). Steht bei einer selbst registrierten Organisation also ein höheres Kontingent als erwartet, ist das kein Fehler – die Kundin zahlt dafür weniger, als sie für die kleinere Menge bezahlt hätte, und darf die zusätzlichen Konten auch nutzen.

Beim **manuellen** Anlegen einer Organisation hier im Plattform-Bereich greift diese Regel bewusst nicht – dort gilt, was du in "Lizenzen gebucht" und "Preis" einträgst.

## Die Organisations-Tabelle

Pro Organisation lässt sich direkt in der Zeile bearbeiten und mit **"Speichern"** übernehmen:

- **Status**: \`aktiv\`, \`test\`, \`pausiert\` oder \`gekündigt\`. Nur \`aktiv\` und \`test\` erlauben den Mitarbeitenden dieser Organisation den Zugriff – bei allen anderen Werten landen sie beim nächsten Seitenaufruf automatisch auf der Sperrseite (siehe unten). Wird der Status auf \`aktiv\` gesetzt, wird ein evtl. hinterlegter Sperrgrund automatisch gelöscht.
- **Lizenzen genutzt/gebucht**: Anzahl aktiver Mitarbeitenden-Konten vs. gebuchtes Kontingent. Erscheint rot, wenn mehr Konten aktiv sind als gebucht wurden. Leer/\`∞\` = unbegrenzt (nur für Arcos selbst gedacht).
- **Zyklus & Preis**: Abrechnungszyklus (monatlich/jährlich) und der vereinbarte Preis pro Zyklus.

**Zusatzmodule**: Disposition CHF 49.– je Monat und Organisation (unabhängig von der Anzahl Lizenzen), Zeitkonto CHF 4.– je Lizenz und Monat. Im Jahresabo kosten beide zehn Monatspreise, wie die Basis. Die beiden Bezugsgrössen sind mit Absicht verschieden: Die Disposition bedient das Büro, ihr Nutzen wächst nicht mit der Kopfzahl; das Zeitkonto führt für jede Person ein eigenes Konto.

**Einführungspreis**: 15 % Rabatt im ersten Jahr für alle, die bis zum 31.12.2026 buchen. Der Rabatt läuft über einen Stripe-Gutschein und ist in ArcoTime nicht hinterlegt.
- **Testphase bis / Nächster Zahltermin**: optionale Datumsfelder (erscheinen erst nach Klick auf "+ Datum setzen").
- **Sperrgrund**: Freitext, der bestimmt, welche Nachricht die Organisation auf der Sperrseite sieht (z.B. \`test_abgelaufen\`, \`zahlung_fehlgeschlagen\`, \`manuell_pausiert\`).
- **"Als bezahlt markieren"**: für Zahlungen per klassischer Rechnung/QR-Rechnung, die Stripe nicht automatisch erkennen kann – schaltet die Organisation manuell wieder frei, nachdem der Zahlungseingang geprüft wurde.

## Was ein Kunde selbst sieht, wenn eine Organisation gesperrt ist

Mitarbeitende einer gesperrten Organisation (ausser Platform-Admins) werden automatisch auf **/gesperrt** umgeleitet, mit einer zum Sperrgrund passenden Nachricht und der Kontaktadresse aus der Umgebungsvariable \`SUPPORT_MAIL\` (heute \`uhipp@arcos.ch\`, nach Einrichtung des Postfachs \`support@arcotime.ch\`). Sie können sich weiterhin abmelden, aber keine andere Seite mehr öffnen.

## Deaktivierte Mitarbeitenden-Konten

Kunden können einzelne Mitarbeitende selbst deaktivieren (siehe [Mitarbeitende](/hilfe/mitarbeitende)), aber **nicht selbst reaktivieren** – das ist bewusst so gelöst, damit niemand Lizenzkosten durch wiederholtes Deaktivieren/Reaktivieren umgeht. Reaktivierungen laufen ausschliesslich hier über den Button **"Reaktivieren"** in der Liste "Deaktivierte Mitarbeitenden-Konten" (organisationsübergreifend).

## Auf der Organisations-Detailseite

Klick auf den Namen einer Organisation öffnet deren Detailseite: dort lassen sich Vorname, Nachname, **E-Mail (= Login)** und Rolle jeder Person bearbeiten (auch cross-organisatorisch, z.B. um einen Tippfehler in der E-Mail-Adresse eines Kunden-Admins zu korrigieren), sowie über **"Person einladen"** eine weitere Person direkt in diese bestehende Organisation einladen – inklusive Rolle (auch als zweiter Admin, maximal zwei Admin-Konten je Organisation).

## Einen Mandanten löschen

Ganz unten auf der Detailseite steht **"Mandant löschen"**. Die Löschung entfernt die Organisation mit allen Daten und Benutzerkonten und **lässt sich nicht rückgängig machen** – es gibt keinen Papierkorb. Die Rechnungen der Arcos Group an diese Kundin bleiben bestehen; sie sind Belege und zehn Jahre aufzubewahren.

Der Ablauf hat drei Stufen:

1. **Sicherungskopie herunterladen** – als JSON (verlustfrei) oder Excel. Ein Klick daneben, und die Daten sind weg; die Kopie kostet zehn Sekunden.
2. **Der Umfang wird angezeigt** – jede betroffene Tabelle mit Anzahl und die betroffenen Konten mit E-Mail-Adresse. Gezählt aus derselben Quelle, aus der gelöscht wird.
3. **Der Name muss abgetippt werden.** Gegen den Griff auf die falsche Zeile hilft keine Rückfrage mit "OK", sondern nur etwas, das man nicht aus Versehen tut.

Läuft die Frist der Kundin noch – das Abonnement ist aktiv oder die 30-tägige Nachfrist ist nicht abgelaufen –, erscheint zuerst ein **Fenster**, das den Weg versperrt. Es nennt das Datum, bis zu dem die Kundin nach AGB Ziffer 10 Anspruch auf ihre Daten hat. Löschen ist danach weiterhin möglich (etwa bei einem Testmandanten oder auf ausdrücklichen Wunsch der Kundin), aber nur nach ausdrücklicher Bestätigung.

Wann eine Löschung fällig wird, musst du nicht im Kopf behalten: Eine tägliche Prüfung meldet dir per E-Mail, welche Mandanten die Nachfrist überschritten haben. **Gelöscht wird nie automatisch** – das entscheidet immer ein Mensch.
`,
  },
];
