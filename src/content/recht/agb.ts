import type { RechtsDokument } from "./typen";

export const agb: RechtsDokument = {
  slug: "agb",
  titel: "Allgemeine Geschäftsbedingungen",
  stand: "16. August 2026",
  version: "1.0",
  kurz: "Was zwischen Ihnen und der Arcos Group GmbH gilt.",
  markdown: `
## 1. Geltungsbereich

Diese Allgemeinen Geschäftsbedingungen (AGB) regeln die Nutzung der Software
**ArcoTime** der **Arcos Group GmbH**, Hauptstrasse 1, 4447 Känerkinden
(nachfolgend «Arcos»).

Kundin oder Kunde (nachfolgend «Kunde») ist die Organisation, die ArcoTime
bezieht. ArcoTime richtet sich ausschliesslich an Unternehmen, Institutionen
und beruflich tätige Personen; ein Bezug durch Konsumentinnen und Konsumenten
ist nicht vorgesehen.

Abweichende Bedingungen des Kunden gelten nur, wenn Arcos ihnen schriftlich
zustimmt.

## 2. Vertragsschluss und Testphase

Der Vertrag kommt zustande, wenn der Kunde die Registrierung abschliesst und
Arcos den Zugang freischaltet. Mit der Registrierung bestätigt der Kunde, dass
er diese AGB und den [Auftragsbearbeitungsvertrag](/avv) akzeptiert und zur
Vertretung seiner Organisation berechtigt ist.

Auf Wunsch beginnt der Vertrag mit einer **kostenlosen Testphase von 30
Tagen**. Ein Zahlungsmittel wird bereits bei der Registrierung hinterlegt,
belastet wird es erst nach Ablauf der Testphase. Wird der Vertrag während der
Testphase gekündigt, entstehen keine Kosten.

## 3. Leistungsumfang

Arcos stellt ArcoTime als internetbasierten Dienst (Software as a Service)
bereit. Der Kunde erhält für die Vertragsdauer das nicht ausschliessliche,
nicht übertragbare Recht, die Anwendung im vereinbarten Umfang zu nutzen.

Der Funktionsumfang ergibt sich aus der jeweils verfügbaren Fassung der
Anwendung und der darin enthaltenen Benutzerhilfe. Arcos entwickelt ArcoTime
laufend weiter. Funktionen können ergänzt, verändert oder ersetzt werden,
solange der vertragliche Zweck erhalten bleibt. Der Wegfall wesentlicher
Funktionen wird mindestens 30 Tage im Voraus angekündigt; der Kunde kann in
diesem Fall auf den Zeitpunkt der Änderung kündigen.

Eine Installation beim Kunden, kundenspezifische Anpassungen, Schnittstellen
oder Schulungen sind nicht Vertragsbestandteil. Sie können gesondert
vereinbart werden.

## 4. Benutzerlizenzen und Zusatzmodule

Abgerechnet wird nach der Anzahl gebuchter Benutzerlizenzen. Eine Lizenz ist
einer Person zugeordnet und darf nicht von mehreren Personen gleichzeitig
genutzt werden. Deaktiviert der Kunde ein Benutzerkonto, wird die Lizenz frei
und kann neu vergeben werden.

Der Kunde kann jederzeit Lizenzen hinzufügen; die Erhöhung wird anteilig für
die laufende Periode verrechnet. Eine Reduktion wirkt auf das Ende der
laufenden Abrechnungsperiode.

Zusatzmodule (Disposition, Zeitkonto) werden gesondert freigeschaltet und
verrechnet.

## 5. Preise und Zahlung

Es gilt die zum Zeitpunkt der Bestellung veröffentlichte Preisliste. **Alle
Preise verstehen sich in Schweizer Franken und exklusive Mehrwertsteuer.**

Der Grundpreis ist nach Anzahl Lizenzen gestaffelt; erreicht der Kunde eine
günstigere Stufe, gilt der tiefere Satz für alle Lizenzen. Die Zahlung erfolgt
im Voraus je Abrechnungsperiode über den Zahlungsdienstleister Stripe (Karte
oder TWINT).

Kommt der Kunde in Zahlungsverzug, mahnt Arcos einmal mit einer Frist von
zehn Tagen. Bleibt die Zahlung aus, kann Arcos den Zugang sperren. Die Daten
bleiben während der Sperre erhalten; Ziffer 10 gilt sinngemäss.

## 6. Laufzeit und Kündigung

Der Vertrag läuft je nach Wahl monatlich oder jährlich und verlängert sich
automatisch um dieselbe Dauer, wenn er nicht gekündigt wird.

Beide Parteien können jederzeit auf das Ende der laufenden Abrechnungsperiode
kündigen. Die Kündigung erfolgt über die Anwendung oder in Textform an
[support@arcotime.ch](mailto:support@arcotime.ch). Bereits bezahlte Beträge
werden nicht zurückerstattet.

Aus wichtigem Grund kann jede Partei fristlos kündigen, insbesondere bei
schwerwiegender Vertragsverletzung oder bei Eröffnung des Konkurses über die
andere Partei.

## 7. Verfügbarkeit, Wartung und Support

Arcos betreibt ArcoTime mit der Sorgfalt eines fachkundigen Anbieters und
**bemüht sich um eine möglichst hohe Verfügbarkeit, schuldet jedoch keine
bestimmte Verfügbarkeitsquote.** Der Betrieb hängt von Vorleistungen Dritter
(Rechenzentrum, Netzbetreiber) ab, auf die Arcos keinen Einfluss hat.

Wartungsarbeiten werden nach Möglichkeit ausserhalb der üblichen
Geschäftszeiten durchgeführt und, wenn ein Unterbruch zu erwarten ist,
vorgängig angekündigt. Kurze Unterbrüche für sicherheitsrelevante
Aktualisierungen sind jederzeit zulässig.

Support leistet Arcos per E-Mail an
[support@arcotime.ch](mailto:support@arcotime.ch) während üblicher
Geschäftszeiten. Eine Reaktionszeit wird nicht zugesichert.

## 8. Pflichten des Kunden

Der Kunde

- hält seine Zugangsdaten geheim und sorgt dafür, dass seine Mitarbeitenden
  dies ebenfalls tun;
- vergibt und entzieht Benutzerkonten selbst und trägt die Verantwortung
  dafür, wer auf welche Daten Zugriff hat;
- erfasst nur Daten, zu deren Bearbeitung er berechtigt ist, und informiert
  seine Mitarbeitenden über die Bearbeitung ihrer Daten in ArcoTime;
- prüft die von der Anwendung erzeugten Auswertungen und Belege vor der
  Weiterverwendung.

**Klarstellung zum Arbeitsrecht:** ArcoTime ist ein Hilfsmittel zur Erfassung
und Auswertung von Arbeitszeiten. Die Anwendung prüft **nicht**, ob
Aufzeichnungen den Anforderungen des Arbeitsgesetzes und seiner Verordnungen
genügen, und überwacht keine Höchstarbeits- oder Ruhezeiten. Die Einhaltung
arbeitsrechtlicher, sozialversicherungsrechtlicher und buchhalterischer
Pflichten bleibt Sache des Kunden.

## 9. Datenschutz

Der Kunde bleibt Verantwortlicher für alle Personendaten, die er in ArcoTime
erfasst. Arcos bearbeitet diese Daten ausschliesslich als
Auftragsbearbeiterin. Es gilt der [Auftragsbearbeitungsvertrag](/avv), der
integrierender Bestandteil dieses Vertrags ist. Für Daten, die Arcos als
Verantwortliche bearbeitet, gilt die [Datenschutzerklärung](/datenschutz).

## 10. Daten des Kunden, Export und Löschung

Alle vom Kunden erfassten Daten bleiben sein Eigentum. Arcos erwirbt daran
keine Rechte und verwendet sie nicht für eigene Zwecke.

Der Kunde kann seine Daten während der Vertragsdauer jederzeit selbst in einem
gängigen elektronischen Format exportieren.

**Datensicherung.** Arcos sichert die Datenbank **täglich** und bewahrt die
Sicherungen **sieben Tage** auf. Muss auf eine Sicherung zurückgegriffen
werden, wird der Stand der letzten Sicherung wiederhergestellt; seither
erfasste Daten – **längstens die eines Tages** – können dabei verloren gehen.
Eine weitergehende Wiederherstellung schuldet Arcos nicht. Dem Kunden wird
empfohlen, für ihn wesentliche Auswertungen zusätzlich selbst zu exportieren
und aufzubewahren.

Nach Vertragsende bleiben die Daten **30 Tage** abrufbereit, damit der Kunde
einen Export vornehmen kann. Danach werden sie gelöscht; die Sicherungskopien
werden innert weiterer **sieben Tage** überschrieben.
Auf schriftlichen Wunsch löscht Arcos die Daten früher oder stellt sie einmalig
als Datei zur Verfügung.

## 11. Haftung

Arcos haftet für Schäden, die sie oder ihre Hilfspersonen absichtlich oder
grobfahrlässig verursacht haben, sowie für Personenschäden ohne Beschränkung.

Im Übrigen ist die Haftung – soweit gesetzlich zulässig – beschränkt auf den
Betrag, den der Kunde in den zwölf Monaten vor dem schädigenden Ereignis für
ArcoTime bezahlt hat. **Ausgeschlossen ist die Haftung für indirekte Schäden
und Folgeschäden**, namentlich entgangenen Gewinn, Betriebsunterbruch,
Ansprüche Dritter sowie Schäden aus Datenverlust, soweit der Kunde die Daten
zumutbarerweise selbst hätte sichern können.

Arcos haftet nicht für Schäden, die auf unsachgemässe Nutzung, auf fehlerhafte
Eingaben des Kunden oder auf den Ausfall von Vorleistungen Dritter
zurückzuführen sind.

## 12. Änderungen dieser AGB und der Preise

Arcos kann diese AGB und die Preise ändern. Änderungen werden dem Kunden
mindestens **60 Tage** im Voraus in Textform mitgeteilt. Widerspricht der Kunde
nicht bis zum Wirksamwerden, gelten sie als angenommen; darauf wird in der
Mitteilung ausdrücklich hingewiesen. Widerspricht er, kann jede Partei auf den
Zeitpunkt des Wirksamwerdens kündigen.

Preiserhöhungen während einer laufenden, bereits bezahlten Periode sind
ausgeschlossen.

## 13. Schlussbestimmungen

Der Kunde kann diesen Vertrag nur mit schriftlicher Zustimmung von Arcos auf
Dritte übertragen. Arcos darf den Vertrag im Rahmen einer Übertragung des
Geschäftsbereichs übertragen; der Kunde kann in diesem Fall innert 30 Tagen
kündigen.

Sollte eine Bestimmung unwirksam sein, bleibt der Vertrag im Übrigen gültig.
Die unwirksame Bestimmung wird durch eine ersetzt, die dem wirtschaftlichen
Zweck am nächsten kommt.

Es gilt **schweizerisches Recht** unter Ausschluss des Übereinkommens der
Vereinten Nationen über Verträge über den internationalen Warenkauf.
Ausschliesslicher **Gerichtsstand ist der Sitz der Arcos Group GmbH in
Känerkinden**, Kanton Basel-Landschaft.
`.trim(),
};
