# Phase 11: Anfahrt und Reisezeit

Stand: 15.08.2026 · Planungsdokument, noch nicht umgesetzt

## Ausgangslage

Die Anfahrt zum Kunden wird heute wie jede andere Leistung von Hand
erfasst: Leistung wählen, Menge tippen. Die Distanz zu einem Kunden ist
aber eine Eigenschaft **dieses Kunden** und ändert sich nie – sie jedes
Mal aus dem Kopf einzutippen ist die Sorte Arbeit, die eine Anwendung
abnehmen soll, und jedes Mal eine Gelegenheit für einen Zahlendreher.

Drei Abrechnungsmodelle kommen in der Praxis vor:

1. **Nur Kilometer.** Ein Satz pro Kilometer, fertig.
2. **Kilometer plus Fahrzeit.** Die Kilometer zu einem günstigen Satz
   (nur Fahrzeugkosten), die Fahrzeit als eigene Stundenposition. Das
   ist der Regelfall bei Einsätzen mit Rapport.
3. **Anfahrtspauschale.** Ein fixer Betrag je Einsatz, unabhängig von
   der Distanz.

Der Ablauf aus der Praxis, der den Massstab für Modell 2 bildet:

> Der Monteur sitzt im Fahrzeug und öffnet den Rapport des Kunden, den
> er besuchen will. Der Rapport enthält bereits die beiden Positionen
> Kilometer und Fahrzeit. Er startet den Timer auf der Fahrzeit und
> fährt los. Bei der Ankunft stoppt er ihn, die effektive Fahrzeit steht
> im Rapport, und bei Bedarf passt er die Kilometer noch an.

## Entschiedene Punkte

**Keine Systemposition.** Naheliegend wäre eine fest verdrahtete
Dienstleistung „Reise-km“, die es in jeder Organisation geben muss.
Dagegen spricht das Prinzip, auf dem ArcoTime aufgebaut ist – nichts an
den Auswahllisten ist fix im Code – und drei reale Fälle: Die eine
Organisation nennt es „Wegpauschale“, die andere „Kilometergeld“;
manche haben **mehrere** Sätze (Servicewagen, Lieferwagen); und wer
keine Kilometer verrechnet, hätte eine Position, die er nicht löschen
darf.

**Stattdessen ein Häkchen an der Dienstleistung.** Beliebig viele
Leistungen dürfen es tragen, jede heisst, wie die Organisation will, und
wer es nicht braucht, setzt es nicht. Neue Mandanten legen ihren
Leistungskatalog ohnehin selbst an – dort ist es ein Häkchen mehr beim
Erfassen und keine Vorgabe, die jemand wieder wegräumen muss.

**Modell 3 fällt damit gratis an.** Eine Anfahrtspauschale ist eine
Leistung mit fester Menge 1, ohne dass ArcoTime davon wissen muss.

**Der Vorschlag ist ein Vorschlag.** Übernommen wird der Wert beim
Erfassen und dort eingefroren – wie Preis, Rabatt und MWSt-Satz. Eine
spätere Änderung am Kunden wirkt nicht rückwirkend.

**Kilometer gehören zum Auftrag, Fahrzeit zur Person.** Fahren drei
Leute im selben Auto, fällt einmal km an, aber dreimal Fahrzeit. Das
Modell trifft das bereits (Mengenartikel ohne Person, Stundenpositionen
je Person) – die naheliegende Umsetzung „jeder trägt seine Anreise ein“
verdreifacht dagegen die Kilometer.

## Datenmodell

```sql
-- Was je Einsatz verrechnet wird, nicht die Luftlinie. Der Name muss das
-- sagen, sonst trägt der eine die einfache Strecke ein und der andere
-- Hin und Zurück – beides sieht plausibel aus.
alter table kunden
  add column anreise_km numeric(10,2);

-- Beliebig viele Leistungen dürfen den Vorschlag tragen.
alter table dienstleistungen
  add column menge_aus_anreise boolean not null default false;
```

**Suchreihenfolge Projekt → Kunde**, von Anfang an. Das Feld am Projekt
gibt es vorerst nicht; ein Kunde mit drei Standorten ist aber der
Normalfall, sobald ArcoTime an grössere Betriebe verkauft wird, und ein
Projekt ist in der Praxis fast immer *ein* Standort. Wer die Abfrage
gleich so schreibt, ergänzt später ein Feld statt einer Umbaustelle.

```sql
-- Standardpositionen: was ein neuer Rapport mitbringt.
create table rapport_standardpositionen (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null default current_organisation_id()
    references organisationen(id),
  dienstleistung_id uuid not null references dienstleistungen(id),
  -- Leer = keine Vorgabe (z.B. Fahrzeit, die der Timer füllt).
  menge numeric(10,2),
  sortierung int not null default 0,
  aktiv boolean not null default true
);
```

Der Timer braucht **kein** neues Feld: Eine Rapportposition ist ein
gewöhnlicher Zeiteintrag, und `zeiteintraege.timer_gestartet_um` gibt es
längst.

## Auswirkungen auf Bestehendes

**Zeiterfassung und Rapport-Positionsformular.** Beide schlagen die
Menge vor, sobald eine Leistung mit Häkchen gewählt wird – dieselbe
Stelle, an der heute schon die Beschreibung der Dienstleistung
vorgeschlagen wird. Selbst getippte Werte werden nie überschrieben.

**Neuer Rapport.** Legt die Standardpositionen an, in ihrer Reihenfolge.
Bisher entstand ein Rapport leer. Wer keine Standardpositionen pflegt,
merkt keinen Unterschied.

**Timer am Rapport.** Revidiert eine ausdrücklich begründete
Entscheidung – bisher galt: „Einen Timer gibt es hier bewusst nicht: Wer
einen Rapport schreibt, ist mit der Arbeit fertig.“ Die Annahme war
falsch. Der Rapport wird auch **während** des Einsatzes benutzt, aus dem
Fahrzeug heraus. Die Begründung in Hilfe und Dokumentation muss mit
geändert werden, nicht nur der Code.

**Kundenformular und Kundenliste.** Ein Feld mehr; in der Liste als
abwählbare Spalte (Spaltenkatalog, 0048).

**Export und Auswertungen.** Unberührt – es entstehen gewöhnliche
Positionen.

## Etappen

**A — Der einfache Fall.** Feld am Kunden, Häkchen an der
Dienstleistung, Vorschlag in Zeiterfassung und Rapport. Für sich allein
nutzbar und deckt Modell 1 und 3 vollständig ab.

**B — Standardpositionen.** Pflege unter Einstellungen, Anlage beim
neuen Rapport.

**C — Timer auf Rapportpositionen.** Zwei Bedingungen, sonst wird es
gefährlich statt praktisch:

- **Ein Knopf, daumengross, sonst nichts.** Zwei Berührungen insgesamt:
  losfahren, ankommen. Wer im Auto ein Formular ausfüllen muss, tut es
  während der Fahrt.
- **Ein laufender Timer muss unübersehbar sein** – am Rapport, in der
  Liste und als Zähler in der Navigation. Der vergessene Timer vom
  Freitagabend ist sonst der erste Supportfall.

**D — Navigation zum Kunden.** Ein Link am Rapport, der die
Kundenadresse an die Karten-App übergibt. Gehört hierher, weil es
derselbe Moment ist: einsteigen, Rapport öffnen, Timer starten,
losfahren.

Technisch ein Link und sonst nichts – keine Programmschnittstelle, kein
Schlüssel, keine laufenden Kosten:

```
https://www.google.com/maps/dir/?api=1&destination=<Adresse, urlencodiert>
https://maps.apple.com/?daddr=<Adresse, urlencodiert>
```

Auf dem Telefon öffnet der erste Link die Google-Maps-App, sofern
installiert, sonst den Browser; der zweite führt zu Apple Karten. Wird
die Navigation dort gestartet, läuft sie auf **CarPlay** weiter – von
ArcoTime aus braucht das nichts.

Angeboten wird **ein grosser Knopf „Navigation"** und daneben klein
„Apple Karten". Im Auto zählt jede Berührung, und eine Auswahl zwischen
zwei gleich grossen Knöpfen ist eine zu viel. Ohne hinterlegte Adresse
erscheint kein Knopf – ein Link, der auf „Musterfirma" navigiert, führt
irgendwohin. Daneben gehört ein `tel:`-Link auf die Telefonnummer des
Kunden („bin in zehn Minuten da").

Datenschutz: Die Adresse geht **erst beim Antippen** zur Karten-App –
kein Aufruf im Hintergrund, kein fremder Programmcode auf der Seite,
kein zusätzliches Tracking. Das ist der Unterschied zum Kartendienst für
die Distanzberechnung weiter unten, bei dem der *Server* für *jeden*
Kunden abfragen würde.

## Offene Fragen für später

- **Feld am Projekt** für Kunden mit mehreren Standorten. Erst bauen,
  wenn der Fall auftritt – die Suchreihenfolge steht dann schon.
- **Vergessene Timer.** Sichtbarkeit ist gesetzt; ob es zusätzlich eine
  automatische Beendigung nach X Stunden braucht, sollte die Praxis
  zeigen. Ein Timer, der sich selbst beendet, erfindet eine Zeit, die
  niemand geleistet hat – das ist nicht offensichtlich besser als einer,
  der sichtbar weiterläuft.
- **Fahrzeit als Vorschlag aus den Kilometern** (Faktor km → Minuten).
  Billig zu bauen, aber der Verkehr macht daraus eine Zahl, der niemand
  traut. Nur erwägen, wenn Betriebe ohne Timer danach fragen.

## Nicht vorgesehen

**Distanz automatisch aus der Adresse über einen Kartendienst.** Das
bringt einen externen Dienst, laufende Kosten und Kundenadressen ausser
Haus, und es braucht die Startadresse jedes Mandanten – für einen Wert,
den man einmal pro Kunde einträgt und der sich nie ändert.

## Reihenfolge gegenüber den übrigen offenen Punkten

Etappe A ist klein und unabhängig; sie kann jederzeit dazwischen. Etappe
B und C berühren den Rapport und sollten **nach** Phase 10 (mehrtägige
Einsätze) kommen: Wenn ein Rapport mehrere Einsatztage hat, ist die
Frage, an welchem Tag eine Standardposition hängt, bereits beantwortet.
Umgekehrt müsste man sie zweimal beantworten.
