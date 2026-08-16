# Domains, Mailadressen und der Weg zum zweiten Produkt

Entscheid vom 16.08.2026. Festgehalten, weil die Aufteilung später schwer zu
ändern ist: Eine Adresse, die auf Flyern, in Verträgen und in tausend
versendeten Mails steht, zieht man nicht mehr um.

## Die drei Domains und ihre Rollen

| Domain | Rolle | Wer betreibt sie |
|---|---|---|
| `arcos.ch` | Firmenwebseite der Arcos Group GmbH. Unter "Produkte" eine Beschreibung mit Link auf arcocloud.ch. Mail über Microsoft 365. | Hostpoint (Web), M365 (Mail) |
| `arcocloud.ch` | Schaufenster der Cloudprodukte. Je Produkt eine Seite mit Beschreibung, Preisen und einem Knopf, der in die Registrierung des Produkts führt. | Hostpoint, statische Seite |
| `arcotime.ch` | Das Produkt: öffentliche Produktseite, Registrierung und die Anwendung selbst. Absenderdomain der Systemmails. | Vercel |

Der Kunde kauft gefühlt auf arcocloud.ch, technisch schliesst er den Kauf in
ArcoTime ab. Das ist Absicht: Ein eigener Checkout auf Plattformebene lohnt
sich erst, wenn eine Organisation zwei Produkte in einem Vorgang bucht.
Vorher verdoppelt er nur die Stellen, an denen eine Bestellung hängenbleiben
kann.

**Nicht** auf arcos.ch: Systemmails. Dort läuft die persönliche
Geschäftskorrespondenz über Microsoft 365. Transaktionsmails an fremde
Empfänger auf derselben Domain gefährden im Ernstfall die eigene
Erreichbarkeit.

## Mailadressen

Jedes Produkt sendet von seiner eigenen Domain – der Empfänger erkennt den
Absender, ohne den Plattformnamen zu kennen.

| Adresse | Wofür | Postfach nötig |
|---|---|---|
| `noreply@arcotime.ch` | Versand aller Systemmails (`SMTP_USER`, `SMTP_FROM`) | ja, für SMTP |
| `support@arcotime.ch` | Antwortadresse dieser Mails (`SMTP_ANTWORT_AN`) und Kontakt auf der Sperrseite (`SUPPORT_MAIL`) | ja, und es muss jemand hineinschauen |
| `rechnung@arcocloud.ch` | später, sobald eine Organisation mehrere Produkte hat: Abo und Rechnung betreffen die Geschäftsbeziehung, nicht das einzelne Produkt | noch nicht |

Der Anzeigename steht in `SMTP_ABSENDER_NAME`, der Empfänger sieht also
`ArcoTime <noreply@arcotime.ch>`. Ein weiteres Produkt benutzt dieselbe
Funktion mit anderem Namen und anderer Domain.

Wichtig ist die Trennung zwischen den beiden Antwortwegen:

- Mails **von ArcoTime** (Erinnerungen, Lizenzhinweise) → `systemAntwort: true`
  → Antwort geht an `support@arcotime.ch`.
- Mails **einer Organisation an ihren Kunden** (Arbeitsrapport) → Antwort geht
  an die Absenderadresse dieser Organisation. Hat sie keine hinterlegt, gibt
  es bewusst gar kein Reply-To. Ein Fallback auf den ArcoTime-Support würde
  die Antwort eines fremden Kunden bei Arcos abliefern statt beim
  Dienstleister, der den Rapport geschickt hat.

## Wenn ein zweites Produkt dazukommt

Kein neues Konto, weder bei Vercel noch bei Supabase.

- **Vercel**: gleiches Team, neues Projekt, eigene Domain, eigene
  Umgebungsvariablen. Abgerechnet wird nach Team-Mitgliedern, nicht nach
  Projekten – ein zweites Produkt kostet dort praktisch nichts.
- **Supabase**: gleiches Konto, neues Projekt (= eigene Datenbank). Abgerechnet
  wird **pro Projekt**; die Fixkosten fallen also ein zweites Mal an. Beide
  Produkte in eine Datenbank mit getrennten Schemas zu legen, spart dieses
  Geld, koppelt aber Migrationen, Ausfälle und Sicherheitsfehler aneinander.
- **Code**: eigenes Repository. Was beide brauchen (PDF-Erzeugung, Tabellen,
  Auth-Helfer), wandert dann in ein gemeinsames Paket.

### Offen: eine Identität oder mehrere

Die eigentliche Weichenstellung, **zu entscheiden bevor die erste Zeile des
zweiten Produkts geschrieben wird** – Nachrüsten heisst, Konten produktiver
Kunden zu migrieren.

- **Getrennt**: Jedes Produkt hat seine eigene Benutzerverwaltung. Dieselbe
  Person meldet sich überall mit derselben Mailadresse an, hat aber zwei
  Konten und zwei Passwörter. Kein Umbau nötig, der Kunde spürt es täglich.
- **Gemeinsam**: Ein zentrales Konto- und Organisationsverzeichnis auf
  Plattformebene. Ein Login, eine Organisation, ein Abo-Portal. Das ist das
  Verkaufsargument einer Produktfamilie ("Sie haben schon ein Arcos-Konto"),
  aber es ist echte Architekturarbeit.

Was heute schon in die richtige Richtung zeigt: Organisation und Person haben
stabile Kennungen, und jede Stripe-Zahlung trägt die Organisations-ID als
Metadatum. Solange das so bleibt, ist eine spätere Zusammenführung möglich.

## Einrichtung – Reihenfolge

Die Schritte hängen voneinander ab; in dieser Reihenfolge abarbeiten.

### 1. Hostpoint (Mail)

- [ ] Postfach `noreply@arcotime.ch` anlegen, SMTP-Passwort notieren
- [ ] Postfach `support@arcotime.ch` anlegen (oder Weiterleitung auf ein
      betreutes Postfach)
- [ ] DKIM für `arcotime.ch` aktivieren
- [ ] DMARC-Eintrag für `arcotime.ch` setzen; als TXT auf `_dmarc.arcotime.ch`:
      `v=DMARC1; p=quarantine; rua=mailto:support@arcotime.ch`
- [ ] DKIM für `arcocloud.ch` prüfen – war beim Entscheid unter den üblichen
      Selektoren nicht auffindbar

Prüfen:

```bash
dig +short TXT arcotime.ch; dig +short TXT _dmarc.arcotime.ch
```

### 2. Vercel (Domain)

- [ ] `arcotime.ch` und `www.arcotime.ch` im Projekt hinzufügen
- [ ] Die von Vercel angezeigten DNS-Werte bei Hostpoint eintragen (A-Eintrag
      für die Wurzel, CNAME für www). **Die MX-Einträge dabei nicht anfassen** –
      sonst steht die Mail still.
- [ ] Warten, bis Vercel das Zertifikat ausgestellt hat

Prüfen:

```bash
curl -sSI https://arcotime.ch | head -3
```

### 3. Vercel (Umgebungsvariablen)

- [ ] `APP_URL=https://arcotime.ch`
- [ ] `SMTP_USER`, `SMTP_FROM` auf `noreply@arcotime.ch`, `SMTP_PASSWORD` neu
- [ ] `SMTP_ABSENDER_NAME=ArcoTime`
- [ ] `SMTP_ANTWORT_AN=support@arcotime.ch`
- [ ] `SUPPORT_MAIL=support@arcotime.ch` – erst wenn das Postfach betreut wird
- [ ] Neu deployen, sonst greifen die Werte nicht

### 4. Supabase (Auth)

Der Schritt, den man am ehesten vergisst – und er bricht Einladungen und
Passwort-Zurücksetzen, ohne dass etwas fehlschlägt: Die Links zeigen einfach
weiter auf die alte Adresse.

- [ ] Authentication → URL Configuration → Site URL auf `https://arcotime.ch`
- [ ] Redirect-Allowlist: `https://arcotime.ch/**` ergänzen
- [ ] Die Vercel-Adresse vorerst in der Allowlist stehen lassen, bis alles läuft
- [ ] Auth-SMTP: Absender auf `noreply@arcotime.ch` umstellen
- [ ] Test: eine Person einladen und prüfen, wohin der Link führt

### 5. Stripe

- [ ] Nach dem Umstellen auf Live: Webhook-Endpunkt auf
      `https://arcotime.ch/api/webhooks/stripe`, neues Signing Secret in Vercel
- [ ] Rückkehr-URLs kommen aus `APP_URL`, brauchen also keine eigene Pflege

### 6. Nachziehen

- [ ] arcocloud.ch: Produktseite ArcoTime mit Link auf
      `https://arcotime.ch/registrieren`
- [ ] arcos.ch: unter "Produkte" den Link auf arcocloud.ch
- [ ] Flyer verteilen (zeigt bereits auf arcotime.ch/registrieren)
- [ ] Freie Produktdomains sichern: arcoimmo.ch, arcolohn.ch, arcodesk.ch.
      `arcofakt.ch` ist bereits vergeben – klären, an wen.
