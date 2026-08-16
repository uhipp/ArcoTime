# Launch-Plan

Stand 16.08.2026, abends. Ziel: ArcoTime öffentlich buchbar machen.

## Was heute erledigt wurde

- Preisentscheid umgesetzt (Staffel 15/13/11, Module, Einführungsrabatt)
- Domain `arcotime.ch`: DNS, Zertifikat, www-Umleitung, Supabase-Auth-URLs
- Mailweg auf `noreply@arcotime.ch`, System- und Auth-Mails getestet
- Rechtstexte: Impressum, Datenschutzerklärung, AGB, AVV – öffentlich unter
  arcotime.ch, mit Zustimmung bei der Registrierung
- Stripe live: Produkt, Volumenstaffel, Stripe Tax (8,1 % CH/LI, Reverse
  Charge EU-B2B), Webhook, Schlüssel
- Echte Testbuchung von der Zahlung bis zur Einladung durchgespielt
- Vercel und Supabase auf Pro

## Der Reihe nach: was morgen fehlt

Die Reihenfolge ist nach Abhängigkeit sortiert, nicht nach Aufwand.

### 1. Aufräumen (Urs, 10 Minuten)

- [ ] Migration `0061_mandant_loeschbar.sql` einspielen
- [ ] Danach: `node --env-file=.env.local scripts/mandant-loeschen.mjs "Testbuchung Arcos" --wirklich`
- [ ] Dasselbe für „Hans Meier AG"

### 2. Eigene Rechnung (Claude, ein halber bis ganzer Tag)

**Der wichtigste Punkt.** Die Stripe-Rechnung ist unbrauchbar; ihre
kundenseitigen Mails sind deshalb abgeschaltet. Bis die eigene Rechnung
steht, bekommt ein zahlender Kunde **gar keinen Beleg**.

- Auslöser: `invoice.paid` (der Webhook verarbeitet das Ereignis bereits)
- PDF über `@react-pdf/renderer`, wie Rapport und Zeitkonto, im Arcos-Layout
- Pflichtangaben nach Art. 26 MWSTG: beide Adressen, MWST-Nr., Leistung,
  Zeitraum, Entgelt, Satz und Steuerbetrag
- Eigener Nummernkreis in der Datenbank, analog `rapport_nummernkreis`
- Versand über `noreply@arcotime.ch`, Ablage am Mandanten
- Später: QR-Rechnung

### 3. Abo-Seite mit Kündigung (Claude, ein halber Tag)

Ohne sie ist der Satz in **AGB Ziffer 6** („Die Kündigung erfolgt über die
Anwendung oder in Textform") nur zur Hälfte gedeckt.

- Einstellungen → Abo: Lizenzen, Zyklus, nächster Zahltermin
- Knopf „Abo kündigen" → `cancel_at_period_end` bei Stripe, mit Anzeige,
  bis wann der Zugang läuft und wie lange die Daten danach abrufbar bleiben
- Kein Stripe-Kundenportal: fremde Optik, und es führt zu ebenjener Rechnung

**Wenn dieser Punkt nicht fertig wird, muss der Halbsatz aus den AGB
gestrichen werden, bevor das Schaufenster online geht.**

### 4. Vollexport (Claude, ein halber Tag)

**AGB Ziffer 10** sagt zu: „Der Kunde kann seine Daten während der
Vertragsdauer jederzeit selbst in einem gängigen elektronischen Format
exportieren." Heute gibt es nur den Fakturierungs-Export.

- Eine Excel-Datei, ein Blatt je Bereich, über `exceljs`
- Auslösbar von Admins, Eintrag ins Änderungsprotokoll
- Dokumente aus der Ablage in einem zweiten Schritt

Fällt dieser Punkt aus, gilt dasselbe wie bei 3: Entweder er landet, oder
die Zusage wird auf „auf Anfrage innert fünf Arbeitstagen" geändert.

### 5. Sichtbarkeit (Urs, eine Stunde)

- [ ] Schaufenster auf arcocloud.ch hochladen (Ordner
      `arcocloud-schaufenster/`, drei Dateien)
- [ ] arcos.ch: unter „Produkte" auf arcocloud.ch verlinken
- [ ] `datenschutz@arcocloud.ch` einrichten – die Adresse steht in einem
      veröffentlichten Rechtsdokument
- [ ] Prüfen: Führt der Knopf „Jetzt buchen" auf arcotime.ch/registrieren?

**Das ist der eigentliche Livegang.** Vorher findet niemand die
Buchungsseite; nachher schon.

### 6. Bestehende Gratislizenzen umstellen (gemeinsam)

- Adressen der bestehenden Organisationen nachtragen (Felder sind seit
  0060 da, aber leer)
- Entscheiden: Umstellung auf bezahlte Abos oder befristete Weiterführung

### 7. Parallel, ohne Zeitdruck

- [ ] Rechtstexte zur anwaltlichen Prüfung (`docs/ArcoTime-Rechtstexte.docx`)
- [ ] Testkatalog von den Testpersonen abarbeiten lassen (126 Fälle)
- [ ] DMARC um `rua=` ergänzen, Wildcard `*.arcotime.ch` löschen
- [ ] Preview-Deployments auf Stripe-Sandbox umstellen
- [ ] `arcofakt.ch` klären, freie Produktdomains sichern

## Ehrliche Einschätzung zum Zeitplan

Punkte 2, 3 und 4 sind zusammen mehr als ein Tag – mit Testen eher
anderthalb. Wenn etwas weichen muss, dann Punkt 4: Ein Kunde, der am
ersten Tag exportieren will, ist unwahrscheinlich; ein Kunde, der zahlt und
keinen Beleg bekommt, ist sicher.

Umgekehrt gilt: **Punkt 5 erst, wenn 2 steht.** Sonst kann jemand buchen,
bevor du ihm eine Rechnung stellen kannst.
