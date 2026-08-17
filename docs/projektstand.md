# ArcoTime – Projektstand

Lebendes Dokument. Letzte Nachführung: **17.08.2026, abends.**
Es beantwortet drei Fragen: Wo stehen wir, wie arbeiten wir, was ist offen.

---

## 1. Wo wir stehen

**ArcoTime ist seit dem 17.08.2026 live**, mit der Aufschaltung des Schaufensters
auf arcocloud.ch. Es gibt kein „vor dem Livegang" mehr – jede Änderung passiert im
Betrieb.

| | |
|---|---|
| Anwendung | `arcotime.ch` · Vercel (fra1) · Auto-Deploy bei Push auf `main` |
| Datenbank | Supabase, Region Zürich, Pro-Tarif |
| Schaufenster | `arcocloud.ch` · Hostpoint, statisch, wird von Hand hochgeladen |
| Firmenseite | `arcos.ch` · WordPress, verweist unter „Informatik" auf arcocloud.ch |
| Zahlung | Stripe **live**, Stripe Tax aktiv |
| Mandanten | „Arcos Group GmbH" (intern) und „Demo AG" (Demo/Schulung), beide ohne Abo |

Die Quelle des Schaufensters liegt **ausserhalb** des Repos, in OneDrive unter
`ArcoSoftware/arcocloud-schaufenster/` (`index.html`, `arcotime.html`, drei Bilder).

---

## 2. Was am 17.08.2026 entstanden ist

Ein Tag, an dem fast jede Zusage aus den Rechtstexten zum ersten Mal auch technisch
eingelöst wurde – und an dem drei Fehler auffielen, die es sonst bis zum ersten
Kunden geschafft hätten.

**Rechnung und Abo**
- Eigene Rechnungs-PDF im Arcos-Layout (CH mit MWST, Ausland mit Reverse Charge),
  eigener Nummernkreis, Ablage im privaten Bucket, Versand an die Admins mit
  Blindkopie an Arcos. Die Stripe-Rechnung ist abgeschaltet.
- Seite **Einstellungen → Abonnement**: Lizenzen, nächste Verlängerung, alle
  Rechnungen als PDF, Kündigung auf das Periodenende mit Rückzugsmöglichkeit.
  Damit ist AGB Ziffer 6 („Kündigung über die Anwendung") eingelöst.

**Lebenszyklus eines Mandanten (AGB Ziffer 10)**
- **Nachfrist:** 30 Tage nur lesen nach Vertragsende, Trennung über die HTTP-Methode,
  Hinweisleiste über allen Seiten, zwei Erinnerungsmails.
- **Vollexport:** alle Daten als Excel oder JSON, ohne jeden Schreibvorgang.
- **Meldung:** täglicher Auftrag `/api/cron/nachfristen` warnt die Kundin und meldet
  Arcos die fälligen Mandanten. **Gelöscht wird nie automatisch.**
- **Löschung unter /plattform** mit vier Sicherungen: Fenster, solange die Frist läuft ·
  angezeigter Umfang · Abtippen des Namens · Sicherungskopie einen Klick daneben.
  Sie beendet auch das Stripe-Abo – sonst liefe die Belastung weiter.

**Drei Fehler, gefunden durch Produktivtests des Nutzers**
1. `invoice.paid` stieg still aus, weil Stripe das Feld `subscription` verschoben hat.
   Wäre erst bei der ersten Folgezahlung aufgefallen – ohne Freischaltung, ohne Beleg.
2. Eine zweite Einladung derselben Adresse wurde stillschweigend angenommen; die
   Person landete beim Anmelden im falschen Betrieb. Jetzt vorher geprüft, und in der
   Registrierung **vor** der Bezahlung.
3. Die RLS-Ausnahme `or is_platform_admin()` auf `profiles` wirkte in der ganzen
   Anwendung. Kein Kunde sah je fremde Daten – aber Arcos sah fremde Personen in
   jeder Auswahlliste. Entfernt (0070); der Zugriff läuft nur noch unter /plattform.

**Zustellbarkeit**
- Einladungen kommen nicht mehr aus Supabase, sondern aus der Anwendung: mit
  Textteil, eigenem Absender und einem Link auf arcotime.ch. Damit landete die
  Einladung nicht mehr im Spam.
- Alle Systemmails haben neu einen Textteil.
- **Zugangslink erneut senden** in der Mitarbeitendenliste – für abgelaufene
  Einladungen und vergessene Passwörter, ohne das Konto zu löschen.

**Migrationen 0060–0070** sind alle angewendet.

---

## 3. Wie wir arbeiten

- **Deutsch überall** – Variablen, Funktionen, Routen, Spalten, Commit-Texte.
- **Kommentare erklären das Warum**, gern mit dem Vorfall, der zur Entscheidung
  führte. Ein Kommentar, der nur wiederholt was dasteht, ist wertlos.
- **Migrationen führt der Nutzer selbst aus** und meldet zurück; danach wird geprüft.
- **Nach jeder Änderung:** `npx tsc --noEmit`, `npm run lint`, `npm run build`,
  Commit, Push. Release-Eintrag in `src/content/releases.json` und Hilfeartikel in
  `src/content/hilfe/` gehören dazu, ungefragt.
- **Prüfen statt annehmen – mit dem richtigen Werkzeug.** Der Dienstschlüssel umgeht
  RLS und taugt nicht für Sichtbarkeitsfragen; dafür gibt es
  `scripts/mandanten-pruefen.mjs`. Listen über „alle Mandantentabellen" kommen aus
  dem Postgres-Katalog, nie aus einer Aufzählung im Code.
- **Eine Prüfung, die still nichts findet, ist schlimmer als keine.** Werkzeuge
  brechen ab, statt eine unvollständige Vorschau zu zeigen.
- **Bei fachlichen Regeln (Recht, Buchhaltung, HR) nicht raten, sondern fragen.**

### Nützliche Befehle

```bash
node --env-file=.env.local scripts/mandanten-pruefen.mjs          # Mandantentrennung
node --env-file=.env.local scripts/mandant-loeschen.mjs "Name"    # Probelauf
find .next -name "* [0-9].*" -delete                              # OneDrive-Kopien vor tsc
```

---

## 4. Was offen ist

**Als Nächstes (18.08.2026)**
1. **Dokumentdateien** in Vollexport und Löschung. Heute enthält der Export nur die
   Datenbankzeilen zu Dokumenten, nicht die hochgeladenen Dateien; beim Löschen
   bleiben die Dateien im Storage liegen. Das ist die einzige Zusage aus AGB
   Ziffer 10, die aktuell nicht vollständig eingelöst ist.

**Danach**
2. **Bestehenden Mandanten auf ein bezahltes Abo umstellen.** Der Checkout legt heute
   immer eine neue Organisation an – ein Testkunde, der bezahlen will, müsste von
   vorn anfangen.
3. **Import/Wiederherstellung aus dem Vollexport.** Anforderungen aus dem Szenario des
   Nutzers: alles oder nichts in einer Transaktion; fehlende Konten zuerst neu
   anlegen und alle Verweise darauf umschreiben; vorher zeigen, was dabei verloren
   geht (ein Zurücksetzen ist selbst eine Löschung).
4. DMARC um `rua=` ergänzen · anwaltliche Durchsicht der Rechtstexte · DNS-Wildcard
   löschen · Preview-Deployments auf die Stripe-Sandbox umstellen.
5. Optional: Video fürs Schaufenster (Bildschirmaufnahmen macht der Nutzer, Drehbuch
   und Einbau kommen von hier).

**Bekannte Grenzen, kein Fehler**
- Eine E-Mail-Adresse gehört zu genau einem Betrieb. Ein Treuhänder für zwei Kunden
  braucht heute zwei Adressen. Mehrfachzugehörigkeit ist bewusst nicht gebaut.
- Die Nur-Lese-Sperre der Nachfrist wirkt in der **Anwendung**, nicht in der
  Datenbank.
