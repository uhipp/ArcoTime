# Phase 12: Zeitkonto und Arbeitszeitauswertung

Stand: 15.08.2026 · Planungsdokument, noch nicht umgesetzt · **zweites
kostenpflichtiges Zusatzmodul**

## Ausgangslage

ArcoTime erfasst alle Stunden der Mitarbeitenden und kennt ihre
Abwesenheiten. Damit liegen die Zutaten für etwas bereit, das heute in
jedem Betrieb in einer Excel-Tabelle geführt wird: **Soll gegen Ist, je
Monat, mit fortlaufendem Saldo** – und dasselbe für das Ferienguthaben.

Das Ziel ist eine Auswertung, die eine Person unterschreiben kann: Was
war im März zu leisten, was wurde geleistet, wie steht der Saldo Ende
März, und wie viele Ferientage sind noch offen.

Bewusst **kein** Ziel ist die Prüfung auf Pausen- und
Höchstarbeitszeitregeln nach Arbeitsgesetz. Die Auswertung ist eine gute
Grundlage dafür, aber das zu versprechen, ohne es genau geklärt zu haben,
wäre fahrlässig.

## Abgrenzung als Modul

Zweites kostenpflichtiges Zusatzmodul neben der Disposition. Andere
Nutzergruppe (Personaladministration statt Einsatzplanung), eigener
Nutzen, eigener Preis.

Die **Abwesenheiten bleiben im Basispaket**: Sie liefern die Daten, sind
aber auch ohne Auswertung nützlich (Disposition, Kalender). Das Modul
wertet aus, es erfasst nicht.

## Datenmodell

### Was die Organisation einstellt

```sql
-- Nicht jeder Betrieb arbeitet 42 Stunden. Beides gehört in die
-- Einstellungen, weil aus beidem das Tages-Soll entsteht.
alter table organisationen
  add column wochenstunden numeric(5,2) not null default 42,
  add column arbeitstage_pro_woche numeric(3,1) not null default 5;

-- Die verbindliche Monatssumme, meist vom Treuhänder geliefert.
create table soll_monate (
  organisation_id uuid not null default current_organisation_id()
    references organisationen(id),
  jahr int not null,
  monat int not null check (monat between 1 and 12),
  sollstunden numeric(6,2) not null,
  primary key (organisation_id, jahr, monat)
);
```

**Warum beides?** Ein Monats-Soll allein kann einen einzelnen Ferientag
nicht bewerten – bei 176 Stunden im März weiss niemand, was drei
Ferientage kosten. Das **Tages-Soll** liefert die Bewertung, die
Monatstabelle die verbindliche Summe. Läuft beides auseinander (die Summe
der Soll-Tage weicht von der Monatstabelle ab), **meldet die Auswertung
das**, statt still eine der beiden Zahlen zu bevorzugen.

### Was an der Person hängt

```sql
alter table profiles
  add column eintritt date,
  add column austritt date;

-- Pensum MIT Gültigkeit, nicht als einzelnes Feld: Wechselt jemand per
-- 1. Juli von 100 auf 80 Prozent, wird sonst jede rückwirkende
-- Auswertung falsch. Dieselbe Überlegung wie beim eingefrorenen Preis
-- am Zeiteintrag.
create table pensen (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null default current_organisation_id()
    references organisationen(id),
  mitarbeiter_id uuid not null references profiles(id) on delete cascade,
  ab_datum date not null,
  pensum_prozent numeric(5,2) not null check (pensum_prozent > 0),
  -- Teilzeit ist nicht gleich Teilzeit: 60 Prozent an drei ganzen Tagen
  -- ergibt ein anderes Tages-Soll als 60 Prozent an fünf kurzen. Leer =
  -- der Wert der Organisation.
  arbeitstage_pro_woche numeric(3,1),
  unique (mitarbeiter_id, ab_datum)
);

create table ferienanspruch (
  organisation_id uuid not null default current_organisation_id()
    references organisationen(id),
  mitarbeiter_id uuid not null references profiles(id) on delete cascade,
  jahr int not null,
  tage numeric(4,1) not null,
  -- Übertrag aus dem Vorjahr, einmal jährlich festgehalten.
  uebertrag_tage numeric(4,1) not null default 0,
  primary key (mitarbeiter_id, jahr)
);
```

### Was eine Abwesenheit bewirkt

Die zentrale fehlende Angabe. Heute weiss eine Abwesenheitsart nur, ob
sie die Planung blockiert.

```sql
alter table abwesenheitsarten
  add column reduziert_soll boolean not null default true,
  add column belastet_ferien boolean not null default false,
  add column belastet_zeitsaldo boolean not null default false;
```

| Art | Soll | Ferien | Saldo |
|---|---|---|---|
| Ferien | reduziert | belastet | – |
| Krankheit, Unfall, Militär | reduziert | – | – |
| Überstundenabbau / Kompensation | **nein** | – | **belastet** |
| Unbezahlter Urlaub | reduziert | – | – |
| Homeoffice, Aussendienst | nein | – | – |

Die drei Angaben sind unabhängig voneinander – deshalb drei Häkchen und
keine Aufzählung mit festen Fällen.

### Manuelle Buchungen

```sql
-- Überstunden werden ausbezahlt, gekürzt oder verfallen zum
-- Jahreswechsel. Das ist keine Abwesenheit und gehört nicht in dieses
-- Feld.
create table zeitkonto_buchungen (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null default current_organisation_id()
    references organisationen(id),
  mitarbeiter_id uuid not null references profiles(id) on delete cascade,
  datum date not null,
  -- Positiv = Gutschrift, negativ = Belastung.
  stunden numeric(6,2) not null,
  -- Pflicht: Eine Buchung ohne Begründung ist in einem Jahr niemandem
  -- mehr erklärbar.
  grund text not null,
  erfasst_von uuid references profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
```

### Der Monatsabschluss

```sql
-- Ohne Einfrieren ist der Saldo wertlos: Korrigiert jemand im November
-- einen Eintrag vom März, verschiebt sich rückwirkend jede Zahl, die
-- seither an die Lohnbuchhaltung ging.
create table monatsabschluesse (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null default current_organisation_id()
    references organisationen(id),
  mitarbeiter_id uuid not null references profiles(id) on delete cascade,
  jahr int not null,
  monat int not null check (monat between 1 and 12),
  soll_stunden numeric(7,2) not null,
  ist_stunden numeric(7,2) not null,
  saldo_vortrag numeric(7,2) not null,
  saldo_ende numeric(7,2) not null,
  ferien_bezogen_tage numeric(5,1) not null,
  ferien_rest_tage numeric(5,1) not null,
  abgeschlossen_am timestamptz not null default now(),
  abgeschlossen_von uuid references profiles(id) on delete set null default auth.uid(),
  unique (mitarbeiter_id, jahr, monat)
);
```

Nach dem Abschluss laufen Korrekturen **nicht** rückwirkend, sondern über
eine Buchung im Folgemonat – dieselbe Regel wie beim Storno eines
abgeschlossenen Rapports.

## Rechenregeln

**Tages-Soll einer Person an einem Tag**

```
Wochenstunden (Organisation)
  ÷ Arbeitstage pro Woche (Person, sonst Organisation)
  × Pensum (gültig an diesem Tag)
```

**Soll eines Monats**

```
Sollstunden des Monats (Tabelle) × Pensum
  − Abwesenheitstage mit "reduziert Soll" × Tages-Soll
  anteilig gekürzt bei Ein- oder Austritt im Monat
```

Halbe Tage zählen halb – die Abwesenheit kennt bereits Uhrzeiten.

**Betriebsferien belasten das Ferienguthaben.** Der Arbeitgeber darf den
Zeitpunkt der Ferien bestimmen (Art. 329c Abs. 2 OR); die Tage gehen
deshalb ganz normal vom Jahresanspruch ab. Damit brauchen die
Schliesstage eine Unterscheidung, die sie bisher nicht hatten: Ein
Feiertag kostet keine Ferientage, Betriebsferien kosten welche – beides
stand in derselben Tabelle und sah gleich aus. Umgesetzt in 0056 als
Häkchen am Schliesstag.

Wie viele Tage eine Betriebsferienwoche kostet, ergibt sich aus den
Arbeitstagen der Person: Wer zu 60 Prozent an drei Tagen arbeitet,
verliert für eine geschlossene Woche drei Tage und nicht fünf.

**Feiertage nicht doppelt.** Die Schliesstage gibt es schon. Sind sie in
der Monatstabelle bereits berücksichtigt – und das sind sie in einer
Treuhänder-Tabelle immer –, dürfen sie kein zweites Mal abgezogen werden.
Das ist die häufigste Fehlerquelle in solchen Auswertungen und gehört
sichtbar in die Einstellungen: **„Feiertage sind im Monats-Soll bereits
enthalten"** als Häkchen.

**Ist eines Monats**

Alle Zeiteinträge der Person im Monat, deren Leistung als Arbeitszeit
zählt. Mengenartikel (Kilometer, Material) zählen nicht.

**Positionen offener Rapporte zählen NICHT mit** – die bestehende Regel
gilt unverändert, und zwar aus einem Grund, der beim Planen dieser Phase
zuerst übersehen wurde.

Ein offener Rapport ist ein **Entwurf**: Die Disposition bereitet den
Auftrag vor, oft mit geschätzten Positionen, die bei der Ausführung
korrigiert werden. Zählte man sie mit, stünden **Schätzungen als
geleistete Arbeitszeit** im Zeitkonto – schlimmer als die Lücke, die man
damit schliessen wollte.

Der Abschluss liegt in der Verantwortung der ausführenden Person und ist
überhaupt erst die Voraussetzung dafür, dass die Organisation
fakturieren kann. Ob dann alles verrechnet wird, entscheidet meist nicht
der Monteur – aber **für geleistete Arbeit gibt es keinen Grund, den
Rapport nicht abzuschliessen.** Ein Saldo, der ins Minus läuft, ist
folglich kein Modellfehler, sondern ein liegengebliebener Rapport, und
dafür gibt es bereits die tägliche Erinnerung und den Zähler in der
Navigation.

Damit hat diese Erinnerung eine zweite Aufgabe: Sie schützt das
Zeitkonto.

**Saldo**

```
Saldo Ende = Saldo Vortrag + Ist − Soll − Abwesenheiten mit "belastet Zeitsaldo"
             + manuelle Buchungen des Monats
```

**Ferien** werden in **Tagen geführt und in Stunden bewertet**: Der
Anspruch steht in Tagen (20, 25, fünf Wochen für Lernende), der Bezug
ebenfalls; für die Wirkung auf das Soll wird mit dem Tages-Soll
gerechnet. Bei unregelmässiger Teilzeit trägt das die Angabe
„Arbeitstage pro Woche" an der Person.

## Die Auswertung

**Einzelblatt je Person, A4 quer.** Zwölf Monatszeilen, Spalten: Soll,
Ist, Differenz, Ferien bezogen, Ferien Rest, Saldo Ende Monat. Kopf mit
Name, Pensum, Eintritt und Jahresanspruch. Als PDF – wie der Rapport,
für die Personalakte und die Unterschrift bei der Jahresbesprechung.

**Übersicht über alle Mitarbeitenden**, ebenfalls A4 quer: eine Zeile je
Person, Spalten je Monat mit dem Saldo. Das ist die Ansicht für die
Betriebsleitung; das Einzelblatt bekommt die mitarbeitende Person.

**Monatsabschluss mit Export für die Buchhaltung**, im ersten Schritt als
**PDF**.

Weil offene Rapporte nicht zählen, hat der Abschluss eine Pflicht: Er
**nennt die noch offenen Rapporte des Monats, bevor er einfriert**, und
verlangt eine ausdrückliche Bestätigung, wenn welche vorhanden sind. Der
typische Fall ist der Einsatz vom 31. März, der am 2. April abgeschlossen
wird – wird der März blind eingefroren, fehlen diese Stunden dauerhaft.
Wer trotzdem abschliesst, korrigiert im Folgemonat über eine Buchung. Andere Dateiformate erst, wenn ein Kunde sie verlangt – welches
Format das wäre, hängt vom Lohnsystem des Kunden ab, und ein auf Verdacht
gebautes Format trifft es nie.

**Zugriff:** Jede Person sieht ihr eigenes Konto, Admins alle. Das ist
genau die Aufteilung, die das spätere Berechtigungssystem sauber ziehen
muss – bis dahin gilt die Rolle.

## Etappen

**A — Grundlagen.** Wochenstunden und Arbeitstage in den Einstellungen,
Monats-Soll je Jahr, Pensen mit Gültigkeit, Eintritt und Austritt,
Ferienanspruch. Noch keine Auswertung – aber alles, was sie braucht.

**B — Wirkung der Abwesenheiten.** Die drei Häkchen an der
Abwesenheitsart, Übernahme der bestehenden Arten mit sinnvollen
Vorgaben (Ferien belastet Ferien, Krankheit nur Soll, eine neue Art
„Überstundenabbau" belastet den Saldo).

**C — Das Zeitkonto.** Berechnung von Soll, Ist und Saldo, Anzeige auf
der Personenseite, manuelle Buchungen.

**D — Monatsabschluss und Auswertung.** Einfrieren je Person und Monat –
mit der Warnung über offene Rapporte des Monats –, Einzelblatt und
Übersicht als PDF.

## Offene Fragen

- **Was passiert mit dem Saldo beim Jahreswechsel?** Übertrag ohne
  Begrenzung, Kappung auf eine Höchstzahl, oder Auszahlung? Das ist eine
  betriebliche Regel und gehört wahrscheinlich in die Einstellungen –
  aber erst, wenn klar ist, welche Varianten wirklich vorkommen.
- **Ferienübertrag ins neue Jahr** – dieselbe Frage, dieselbe Antwort.
- **Wer darf manuelle Buchungen erfassen?** Vorschlag: Admin. Eine
  Gutschrift, die sich jede Person selbst buchen kann, ist keine.
- **Interne Zeit.** Büroarbeit, Weiterbildung und Werkstattzeit zählen
  fürs Zeitkonto, sind aber nicht verrechenbar. Jeder Betrieb braucht
  dafür ein internes Projekt – das ist eine Einrichtungsfrage und gehört
  in die Anleitung, nicht in den Code.

## Reihenfolge gegenüber den übrigen offenen Punkten

Unabhängig von Phase 10 (zurückgestellt) und vom Berechtigungssystem.
Etappe A ist für sich nützlich: Eintritt, Pensum und Ferienanspruch sind
Angaben, die ein Betrieb ohnehin führen will.
