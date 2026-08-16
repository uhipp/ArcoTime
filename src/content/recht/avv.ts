import type { RechtsDokument } from "./typen";

export const avv: RechtsDokument = {
  slug: "avv",
  titel: "Auftragsbearbeitungsvertrag",
  stand: "16. August 2026",
  version: "1.0",
  kurz: "Wie Arcos die Daten bearbeitet, die Sie in ArcoTime erfassen.",
  markdown: `
Dieser Auftragsbearbeitungsvertrag (AVV) ist integrierender Bestandteil der
[Allgemeinen Geschäftsbedingungen](/agb) und gilt mit deren Annahme. Er regelt
die Bearbeitung von Personendaten durch die Arcos Group GmbH im Auftrag des
Kunden nach Art. 9 des schweizerischen Datenschutzgesetzes (DSG).

## 1. Parteien und Rollen

**Verantwortlicher** ist der Kunde: die Organisation, die ArcoTime nutzt und
darin Personendaten erfasst.

**Auftragsbearbeiterin** ist die **Arcos Group GmbH**, Hauptstrasse 1,
4447 Känerkinden.

Der Kunde entscheidet allein über Zweck und Mittel der Bearbeitung der von ihm
erfassten Daten. Arcos bearbeitet sie ausschliesslich zur Erbringung der
vertraglichen Leistung.

## 2. Weisungsgebundenheit

Arcos bearbeitet die Daten nur auf dokumentierte Weisung des Kunden. Als
Weisung gelten der Vertrag samt AGB, die Einstellungen, die der Kunde in der
Anwendung vornimmt, sowie Anweisungen in Textform an
[datenschutz@arcocloud.ch](mailto:datenschutz@arcocloud.ch).

Hält Arcos eine Weisung für rechtswidrig, weist sie den Kunden darauf hin und
darf deren Ausführung aussetzen. Arcos verwendet die Daten weder für eigene
Zwecke noch gibt sie sie an Dritte weiter, ausser dieser Vertrag oder das
Gesetz sehen es vor.

## 3. Gegenstand, Dauer und Art der Bearbeitung

**Gegenstand** ist der Betrieb der Software ArcoTime: Erfassung und Auswertung
von Arbeitszeiten, Kundenanfragen, Arbeitsrapporten, Einsatzplanung,
Abwesenheiten und Zeitkonten.

**Dauer**: für die Dauer des Hauptvertrags, zuzüglich der Fristen nach
Ziffer 9.

**Art der Bearbeitung**: Erheben, Speichern, Ordnen, Auswerten, Anzeigen,
Exportieren, Übermitteln (Versand von Rapporten und Erinnerungen), Sichern und
Löschen – jeweils automatisiert.

### Kategorien betroffener Personen

- Mitarbeitende des Kunden (Benutzerinnen und Benutzer der Anwendung)
- Ansprechpersonen bei Kundinnen und Kunden des Kunden
- weitere Personen, soweit der Kunde sie erfasst

### Kategorien von Personendaten

- Stammdaten: Name, E-Mail-Adresse, Telefonnummer, Funktion, Anstellungsdaten
- Arbeitszeitdaten: erfasste Zeiten, Tätigkeiten, Projekte, Kostenstellen
- Abwesenheiten samt Art (z. B. Ferien, Krankheit, Militärdienst)
- Zeitkonten: Soll- und Ist-Stunden, Saldi, Pensen, Ferienansprüche
- Adress- und Kontaktdaten von Kundinnen und Kunden des Kunden
- Inhalte hochgeladener Dokumente
- Protokolldaten: Zeitpunkt und Urheber von Änderungen

**Hinweis zu besonders schützenswerten Personendaten:** Die Angabe der
Abwesenheitsart kann Rückschlüsse auf die Gesundheit zulassen. Der Kunde
entscheidet, wie fein er Abwesenheitsarten führt, und trägt die Verantwortung
für die Rechtmässigkeit dieser Bearbeitung.

## 4. Ort der Bearbeitung

Die Daten werden in der **Schweiz** gespeichert (Rechenzentrum Zürich). Die
Anwendung, welche die Daten verarbeitet, läuft in **Frankfurt am Main,
Deutschland**; dort werden Daten nur zur Beantwortung einzelner Anfragen
kurzzeitig gehalten und nicht dauerhaft gespeichert.

## 5. Unterauftragsbearbeiter

Der Kunde genehmigt mit Abschluss dieses Vertrags den Beizug folgender
Unterauftragsbearbeiter:

| Unternehmen | Leistung | Ort der Bearbeitung |
|---|---|---|
| Supabase Inc., USA | Datenbank, Dateiablage, Benutzerkonten | Zürich, Schweiz |
| Vercel Inc., USA | Betrieb und Auslieferung der Anwendung | Frankfurt, Deutschland |
| Hostpoint AG, Schweiz | Versand von System- und Einladungsmails | Schweiz |
| Stripe Payments Europe Ltd., Irland | Zahlungsabwicklung | Irland, teilweise USA |

Mit allen Unterauftragsbearbeitern bestehen Verträge, die ihnen mindestens
gleichwertige Pflichten auferlegen. Bei Bekanntgabe in Länder ohne
gleichwertigen Datenschutz kommen Standardvertragsklauseln zur Anwendung.

Arcos informiert den Kunden mindestens **30 Tage** im Voraus über den Wechsel
oder den Beizug weiterer Unterauftragsbearbeiter. Der Kunde kann aus wichtigem
Grund widersprechen; findet sich keine Lösung, kann er auf den Zeitpunkt der
Änderung kündigen.

## 6. Technische und organisatorische Massnahmen

Arcos trifft angemessene Massnahmen zur Datensicherheit, insbesondere:

- **Vertraulichkeit**: Trennung der Mandanten auf Datenbankebene, sodass eine
  Organisation ausschliesslich ihre eigenen Daten sieht; Zugriff nur für
  angemeldete Personen mit passender Berechtigung.
- **Zugangssicherung**: Passwörter werden ausschliesslich als Hashwert
  gespeichert; der Zugang zu den Verwaltungsoberflächen der
  Unterauftragsbearbeiter ist mit Zwei-Faktor-Authentisierung geschützt.
- **Verschlüsselung**: durchgehende Transportverschlüsselung (TLS);
  Verschlüsselung der Datenbank und der Sicherungskopien im Ruhezustand.
- **Verfügbarkeit**: tägliche Sicherungen mit einer Aufbewahrung von mindestens
  sieben Tagen.
- **Nachvollziehbarkeit**: fälschungssicheres, nur schreibend geführtes
  Änderungsprotokoll über Änderungen an zentralen Daten, mit Zeitpunkt und
  auslösendem Konto.
- **Beschränkter Zugriff durch Arcos**: Zugriff auf Kundendaten haben nur
  namentlich bekannte Personen der Arcos Group, und nur soweit Betrieb,
  Fehlersuche oder ein Supportfall es erfordern. Solche Zugriffe erscheinen im
  Änderungsprotokoll.
- **Trennung der Umgebungen**: Entwicklung und Test erfolgen nicht auf
  Produktivdaten.

Arcos darf die Massnahmen weiterentwickeln, solange das Schutzniveau nicht
sinkt.

## 7. Unterstützung des Kunden

Arcos unterstützt den Kunden in angemessenem Umfang bei:

- Auskunfts-, Berichtigungs-, Lösch- und Herausgabebegehren betroffener
  Personen. Wendet sich eine betroffene Person direkt an Arcos, leitet Arcos
  das Begehren an den Kunden weiter und beantwortet es nicht selbst.
- der Erstellung des Verzeichnisses der Bearbeitungstätigkeiten, soweit die
  Bearbeitung in ArcoTime betroffen ist.
- einer allfälligen Datenschutz-Folgenabschätzung.

Der Kunde kann seine Daten jederzeit selbst exportieren.

## 8. Verletzung der Datensicherheit

Arcos meldet dem Kunden eine Verletzung der Datensicherheit, die dessen Daten
betrifft, **unverzüglich nach Kenntnis**, in der Regel innert 48 Stunden. Die
Meldung beschreibt die Art des Vorfalls, die betroffenen Datenkategorien, die
mutmasslichen Folgen und die getroffenen Massnahmen.

Die Meldung an den Eidgenössischen Datenschutz- und
Öffentlichkeitsbeauftragten sowie die Information der betroffenen Personen
obliegen dem Kunden als Verantwortlichem. Arcos liefert die dafür nötigen
Angaben.

## 9. Rückgabe und Löschung

Nach Vertragsende bleiben die Daten **30 Tage** abrufbereit, damit der Kunde
sie exportieren kann. Danach löscht Arcos sämtliche Daten des Kunden.
Sicherungskopien werden im normalen Rhythmus überschrieben, längstens innert
weiterer 30 Tage.

Auf schriftlichen Wunsch löscht Arcos früher oder stellt die Daten einmalig als
Datei zur Verfügung. Eine gesetzliche Aufbewahrungspflicht bleibt vorbehalten;
in diesem Fall werden die betroffenen Daten gesperrt statt gelöscht.

## 10. Nachweis und Kontrolle

Arcos weist die Einhaltung dieses Vertrags auf Anfrage in Textform nach. Der
Kunde kann höchstens einmal jährlich, mit einer Vorlaufzeit von 30 Tagen und
während der Geschäftszeiten, eine Überprüfung verlangen; die Parteien einigen
sich vorgängig über Umfang und Vorgehen. Aufwand, der über eine Auskunft in
Textform hinausgeht, kann Arcos nach Aufwand verrechnen.

## 11. Schlussbestimmungen

Bei Widersprüchen zwischen diesem Vertrag und den AGB geht dieser Vertrag in
Datenschutzfragen vor. Im Übrigen gelten die Bestimmungen der AGB, namentlich
zu anwendbarem Recht und Gerichtsstand.
`.trim(),
};
