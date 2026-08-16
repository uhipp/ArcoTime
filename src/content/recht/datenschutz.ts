import type { RechtsDokument } from "./typen";

export const datenschutz: RechtsDokument = {
  slug: "datenschutz",
  titel: "Datenschutzerklärung",
  stand: "16. August 2026",
  version: "1.0",
  kurz: "Welche Daten wir bearbeiten, wo sie liegen und welche Rechte Sie haben.",
  markdown: `
Diese Erklärung beschreibt, wie die Arcos Group GmbH Personendaten im
Zusammenhang mit ArcoTime bearbeitet. Sie richtet sich nach dem
schweizerischen Datenschutzgesetz (DSG).

## 1. Verantwortliche Stelle

**Arcos Group GmbH**, Hauptstrasse 1, 4447 Känerkinden, Schweiz
Telefon: +41 79 761 13 85

Für alle Anliegen zum Datenschutz: **[datenschutz@arcocloud.ch](mailto:datenschutz@arcocloud.ch)**

## 2. Zwei Rollen – bitte zuerst lesen

Dieser Punkt entscheidet, an wen Sie sich mit einem Anliegen wenden.

**Als Verantwortliche** bearbeitet die Arcos Group GmbH die Daten, die bei
der Registrierung, der Abrechnung und im Support anfallen: Firmenangaben,
Name und E-Mail der Ansprechperson, Lizenzangaben, Zahlungsstatus,
Korrespondenz. Dafür gilt diese Erklärung unmittelbar.

**Als Auftragsbearbeiterin** bearbeitet sie alle Daten, die eine Kundin oder
ein Kunde in ArcoTime erfasst: Mitarbeitende, deren Arbeitszeiten,
Abwesenheiten, Zeitkonten, Kunden- und Projektdaten, Rapporte und Dokumente.
Über diese Daten bestimmt allein die Organisation, die sie erfasst hat –
nicht Arcos. Grundlage dafür ist der
[Auftragsbearbeitungsvertrag](/avv).

**Was das für Sie heisst:** Sind Sie Mitarbeiterin oder Mitarbeiter eines
Betriebs, der ArcoTime einsetzt, richten Sie Auskunfts-, Berichtigungs- und
Löschbegehren an **Ihren Arbeitgeber**. Arcos darf diese Daten nicht von sich
aus herausgeben oder verändern.

## 3. Welche Daten bearbeitet werden

**Beim Besuch der Website.** Der Betrieb der Server erzeugt technische
Protokolle: gekürzte IP-Adresse, Zeitpunkt, aufgerufene Seite, Browsertyp,
übertragene Datenmenge. Diese Daten dienen dem Betrieb und der Sicherheit und
werden nicht mit Personen zusammengeführt.

**Bei der Registrierung.** Firmenname, Adresse, Name und E-Mail-Adresse der
Ansprechperson, gewünschte Anzahl Lizenzen, Abrechnungszyklus. Die
Zahlungsdaten (Karte, TWINT) geben Sie direkt bei unserem Zahlungsdienstleister
Stripe ein; **Arcos sieht und speichert keine vollständigen Kartendaten**,
sondern nur den Zahlungsstatus und eine Referenz.

**Bei der Nutzung der Anwendung.** Anmeldedaten (E-Mail, verschlüsseltes
Passwort), Angaben zum Benutzerkonto sowie alle Inhalte, die Sie oder Ihre
Organisation erfassen. Änderungen an zentralen Daten werden mit Zeitpunkt und
Benutzerkonto protokolliert – das dient der Nachvollziehbarkeit und ist Teil
des Produkts.

**Bei Kontaktaufnahme.** Ihre Nachricht samt Kontaktangaben, solange sie zur
Bearbeitung nötig ist.

## 4. Wozu die Daten bearbeitet werden

- Bereitstellung, Betrieb und Wartung der Anwendung
- Vertragsabwicklung, Rechnungstellung und Lizenzverwaltung
- Kommunikation mit Kundinnen und Kunden, Support
- Sicherheit des Betriebs, Missbrauchserkennung, Fehlersuche
- Erfüllung gesetzlicher Pflichten, insbesondere der Aufbewahrungspflichten
  des Obligationenrechts

## 5. Cookies und Analysewerkzeuge

ArcoTime setzt **ausschliesslich technisch notwendige Cookies** ein: Sie
halten Ihre Anmeldung aufrecht und sichern Formulare gegen Missbrauch. Ohne
sie funktioniert die Anwendung nicht.

**Es kommen keine Analyse-, Tracking- oder Werbewerkzeuge zum Einsatz.** Es
werden keine Profile gebildet, keine Daten an Werbenetzwerke übermittelt und
keine Besucherstatistiken Dritter erhoben. Deshalb erscheint auch kein
Einwilligungsbanner.

## 6. Wo die Daten liegen

| Zweck | Dienstleister | Ort der Bearbeitung |
|---|---|---|
| Datenbank, Dateiablage, Benutzerkonten | Supabase Inc. | **Zürich, Schweiz** (AWS-Region eu-central-2) |
| Betrieb der Anwendung, Auslieferung der Seiten | Vercel Inc. | **Frankfurt, Deutschland** (Region fra1) |
| Versand von System- und Einladungsmails | Hostpoint AG | **Schweiz** |
| Zahlungsabwicklung | Stripe Payments Europe Ltd. | Irland, teilweise USA |

Die eigentlichen Betriebsdaten – alles, was Sie in ArcoTime erfassen – liegen
in der Schweiz. Die Anwendung selbst läuft in Deutschland; dort werden Daten
nur zur Verarbeitung einer Anfrage kurzzeitig gehalten, nicht dauerhaft
gespeichert.

## 7. Bekanntgabe ins Ausland

Deutschland und Irland verfügen über einen vom Bundesrat anerkannten
angemessenen Datenschutz. Supabase Inc. und Vercel Inc. haben ihren Sitz in
den USA; mit beiden bestehen Auftragsbearbeitungsverträge mit
Standardvertragsklauseln. Eine Bekanntgabe an weitere Dritte erfolgt nur, wenn
Sie eingewilligt haben, ein Gesetz es verlangt oder es zur Durchsetzung von
Ansprüchen erforderlich ist.

Behördliche Auskunftsbegehren werden geprüft; soweit rechtlich zulässig,
informiert Arcos die betroffene Organisation vorgängig.

## 8. Aufbewahrung und Löschung

Betriebsdaten werden gelöscht, sobald der Zweck entfällt:

- **Daten einer Organisation**: bis zum Ende des Vertrags, danach 30 Tage
  abrufbereit für einen Export, anschliessend Löschung.
- **Registrierungs- und Abrechnungsdaten**: zehn Jahre, entsprechend der
  Aufbewahrungspflicht nach Art. 958f OR.
- **Serverprotokolle**: wenige Tage bis Wochen, je nach Dienstleister.
- **Sicherungskopien**: werden im normalen Rhythmus überschrieben, längstens
  nach dreissig Tagen.

## 9. Datensicherheit

Zum Schutz der Daten setzt Arcos unter anderem ein: durchgehende
Transportverschlüsselung (TLS), Verschlüsselung der Datenbank und der
Sicherungskopien im Ruhezustand, Passwörter ausschliesslich als Hashwert,
strikte Trennung der Mandanten auf Datenbankebene, ein fälschungssicheres
Änderungsprotokoll sowie tägliche Sicherungen. Zugriff auf Kundendaten haben
nur namentlich bekannte Personen der Arcos Group, und nur soweit Betrieb,
Fehlersuche oder ein Supportfall es erfordern.

Kein technisches Mittel bietet vollständige Sicherheit. Bitte schützen Sie
Ihre Zugangsdaten und geben Sie sie nicht weiter.

## 10. Ihre Rechte

Sie haben im Rahmen des DSG das Recht auf Auskunft, Berichtigung, Löschung
sowie auf Herausgabe oder Übertragung Ihrer Daten. Sie können der Bearbeitung
widersprechen und eine erteilte Einwilligung jederzeit widerrufen.

Wenden Sie sich dafür an
[datenschutz@arcocloud.ch](mailto:datenschutz@arcocloud.ch). Zum Schutz Ihrer
Daten kann ein Identitätsnachweis verlangt werden. Anfragen werden innert
30 Tagen beantwortet.

**Beachten Sie Ziffer 2:** Betreffen Ihre Daten die Nutzung von ArcoTime in
einem Betrieb, ist dieser Betrieb Ihre Ansprechstelle, nicht Arcos.

Sie können sich zudem an den Eidgenössischen Datenschutz- und
Öffentlichkeitsbeauftragten (EDÖB), Feldeggweg 1, 3003 Bern, wenden.

## 11. Änderungen

Diese Erklärung kann angepasst werden, wenn sich die Bearbeitung oder die
Rechtslage ändert. Massgebend ist die jeweils auf dieser Seite veröffentlichte
Fassung. Wesentliche Änderungen werden den Kundinnen und Kunden vorgängig
mitgeteilt.
`.trim(),
};
