# Phase 13: Comatic-Analyse (Demo-DB vom 18.08.2026)

Quelle: `DEMOAG_202608181745.cmt` (Jet-4-Datenbank, 2.4 MB, 92 Tabellen),
gelesen mit `access-parser` (nur lesend). Analysiert am 18.08.2026 abends.

**Was die Demo hergibt und was nicht:** Der Bestand ist klein — 20 Belege
(nur Rechnungen und Barzahlungen), 6 Artikel, 2 Adressen. **Keine einzige
Offerte**, keine Ansprechpersonen, leere Staffel- und Gruppenrabatte, leere
Pendenzen. Die *Strukturen* sind trotzdem vollständig lesbar, und aus ihnen
lässt sich das Modell ableiten. Wo die Bedeutung eines Codes nur aus dem
Programm hervorgeht (nicht aus der DB), steht unten eine Frage an den Nutzer —
er kennt Comatic seit über zehn Jahren.

---

## 1. Die Belegkette: ein Tabellenpaar für alles

Comatic führt **alle** Verkaufsbelege in einem einzigen Tabellenpaar:

```
Buchungen        (77 Spalten)  – der Belegkopf, Buchungstyp unterscheidet
BuchungenZeilen  (58 Spalten)  – die Positionen, Buchungstyp nochmals daran
Pendenzen        (identische Spalten wie Buchungen)
PendenzenZeilen  (identische Spalten wie BuchungenZeilen)
```

`Pendenzen` spiegelt `Buchungen` Spalte für Spalte — das ist der Ort für
**unverbuchte** Belege (Offerte, Auftrag), die erst beim Fakturieren in die
Buchungen (und damit in die FIBU) wandern. Die Globals bestätigen die
Typenwelt: Es gibt je Belegart eigene Druckschalter (`DescrOF`, `DescrBE`,
`DescrLS`, `DescrFA`, `DescrEK`) und Kopienzahlen (`AnzOF`, `AnzBS`, `AnzLS`,
`AnzFA`) — OF=Offerte, LS=Lieferschein, FA=Faktura, EK=Einkauf.

**Was wir übernehmen:** den Gedanken der *Kette* — ein Beleg wird
weitergeführt, nicht neu erfunden; die Positionen tragen die Spur der
Weiterführung (siehe 2). Und die Trennung „unverbucht/verbucht": Bei uns ist
das Angebot der unverbuchte Teil, der Rapport der Nachweis, der Comatic-Export
die Verbuchung.

**Was wir anders machen:** eigene, schmale Tabellen je Dokumentart statt
eines 77-Spalten-Kopfs, in dem Lohn-, eBill-, Abo- und Mahnfelder nebeneinander
liegen. Und ausgeschriebene Status (`entwurf`, `versendet`, `angenommen` …)
statt Zahlencodes — die Demo zeigt Status 7, 8, 9, und was sie bedeuten, weiss
nur das Programm.

## 2. Die Positionen: drei Bestätigungen und eine Lücke

`BuchungenZeilen` bestätigt drei Entscheidungen aus dem Ideendokument
wörtlich:

1. **`Optionalcode`** existiert als Spalte an jeder Position — optionale
   Positionen sind also auch bei Comatic ein Zeilenmerkmal, keine
   Sonderkonstruktion. Unsere Positionsart `optional` liegt richtig.
2. **`Gruppe` und `Gruppentitel`** — Titel und Gruppierung sind Zeilen in
   derselben Tabelle, keine zweite Struktur. Unsere Positionsart `titel`
   liegt richtig.
3. **Schnappschuss-Prinzip:** `Bezeichnung`, `Beschreibung`, `ME`,
   `MWSt_Code`, `Konto` stehen **an der Zeile**, nicht nur am Artikel. Comatic
   friert beim Erfassen ein, was der Artikel gerade sagt — exakt das, was
   ArcoTime seit 0003/0021 tut.

Dazu die Spur der Weiterführung: **`Liefern`, `Geliefert`, `Verrechnet`** als
Mengenzähler *je Position*. So bildet Comatic Teillieferung und
Teilverrechnung ab — nicht mit Kopien des Belegs, sondern mit drei Zahlen an
der Zeile. Für unsere Teilübernahme (Angebot → Rapporte) ist das das Vorbild:
eine Spalte `uebernommen numeric` an der Angebotsposition sagt präziser als
ein Boolean, wie viel schon in Rapporten steckt — und erlaubt, dass 60 von
100 m² in den ersten Einsatz gehen und der Rest in den zweiten.

**Die Lücke:** Eine „per"-Position (Einheitspreis ohne Menge, nicht im Total)
gibt es bei Comatic **nicht** als eigene Art. Das ist eine echte
ArcoTime-Ergänzung — gut so, aber wir können sie nirgends abschauen; der
Fusstext und das Übernahmeverhalten (offene Menge) müssen wir selbst sauber
definieren.

Rabatt an der Zeile: `Abzug` (Prozent) plus `AbzugFix` — Prozent- und
Fixbetrag getrennt. Übernehmen wir sinngemäss (ArcoTime hat heute nur
Prozent an der Position).

## 3. Konditionen: bei Comatic heisst das Zahlungskondition — und stützt die Skonto-Frage

Die Tabelle `Konditionen` ist **nicht** der Ort für „5 + 2"-Rabattstufen.
Sie enthält Zahlungskonditionen:

```
Code 12: "10 Tage 2% Skonto, 30 Tage netto"
         (Skontofrist=10, Skonto=2.0, Zlg_Frist=30)
```

dazu Mahnzuschläge und Zahlart. Der Beleg und die Adresse verweisen per Code
darauf (`Adressen.VK_Konditionen = '30'`).

**Zwei Folgerungen:**

1. Ein kaskadierender Dokumentrabatt („5 + 2" als zwei Abzüge vor der MWST)
   existiert in Comatics Datenmodell nicht — unsere `konditionen`-Tabelle mit
   Stufen ist eine echte Neuentwicklung, kein Nachbau.
2. Die Demo enthält wörtlich den Beleg dafür, dass die „2" im Handwerk
   üblicherweise ein **Skonto** ist — an die Zahlung gebunden, nicht an den
   Preis. Das schärft offene Frage 3 aus dem Ideendokument: Wenn der Maler
   mit „5 + 2" *5 % Rabatt und 2 % Skonto* meint, gehört die 2 in die
   Zahlungskondition (wie bei Comatic) und **nicht** in die Preisrechnung —
   sonst weist das Angebot zu wenig MWST aus. Die Frage an ihn ist damit
   wichtiger geworden, nicht unwichtiger.

Namenskollision, vor Phase 2 zu entscheiden: Wenn wir unsere Rabattstufen
„Konditionen" nennen und später Comatic-Anwender migrieren, meinen zwei
Systeme mit demselben Wort Verschiedenes. Vorschlag: unsere Tabelle heisst
`rabattkonditionen` (oder die Stufen heissen schlicht „Nachlässe"), und
„Zahlungskonditionen" bleibt für Frist/Skonto reserviert — das Feld
`kunden.zahlungskondition_tage` zeigt, dass ArcoTime den Begriff schon so
verwendet.

## 4. MWST: das Code-System ist reicher, als wir brauchen — mit einer Ausnahme

`MWSt_Code` führt je Code: Steuersatz, **Inklusiv-Flag** (`B77` = inkl. 7.7 %,
`N77` = exkl. 7.7 %), Abrechnungssatz (Saldosteuersatz-Unterstützung),
Steuerkonto und die **Abrechnungsziffer** der MWST-Abrechnung (`Ziff2010`:
302, 312, 342, 382, 220 …).

Für das Angebot bleibt es bei der Entscheidung „immer exklusiv mit Ausweis".
Aber die **Ziffer** ist eine stille Anregung: ArcoTimes `mwst_codes` kennt
heute keine Abrechnungsziffer. Wer später aus ArcoTime heraus eine
MWST-Abrechnung vorbereiten will, braucht sie. Kein Phase-13-Thema — als Idee
notiert.

## 5. Rundung: die Demo verrät es nicht

`Globals.Rundung = 0` und `MaxDiff = 5.0` — ein Modus-Code und eine
Toleranz, deren Bedeutung im Programm steckt, nicht in den Daten. Die Demo
hat nur glatte Beträge (150.00, 200.00), es gibt nichts nachzurechnen.
**Frage an den Nutzer** (er kennt die Comatic-Praxis): Rundet Comatic je
Zeile oder nur das Total, und was bedeutet Rundung=0? Bis dahin bleibt der
Vorschlag aus dem Ideendokument: intern rappengenau, nur MWST-Betrag und
Endtotal auf 5 Rappen.

## 6. Artikel: eine gewachsene Kalkulation — wir nehmen drei Dinge

Der Comatic-Artikel trägt eine komplette EK→VK-Kalkulation (`EK_Schema`,
`EK_Faktor`, `EK_Marge`, `EK_Spesen`, `EK_Zuschlag1/2`), **vier Preisstufen**
(`VK_Preis1–4`, die Adresse wählt per `Preisliste`), Staffelrabatte per
`Staffelcode` → `Staffelrabatte (Menge, Rabattsatz)`, Serienummern,
**Varianten** (`ArtikelLager` je Variante; `Globals.Vartext = 'Grösse'`),
Barcode, Bild, `Lieferfrist` — und `Remote_ID`, dasselbe Konzept, das
ArcoTime als `adress_schluessel` für den Export schon nutzt.

**Übernehmen (Etappe C):** `Lieferfrist` (unser `beschaffungszeit_tage` —
Comatic bestätigt: das gehört an den Artikel, nicht ans Lager), Einkaufspreis
mit Lieferant (`ArtikelLieferanten` als eigene Tabelle: ein Artikel, mehrere
Lieferanten mit je eigenem EK — fürs Erste reicht bei uns *ein* Lieferant am
Produkt), Bild und Barcode als optionale Felder.

**Nicht übernehmen:** die vier Preisstufen und die EK→VK-Schemata. ArcoTime
hat mit `kundenpreise` (Staffel ab Menge, je Kunde) und `kundenrabatte` (je
Klasse) das feinere Modell — vier starre Listen wären ein Rückschritt.
**Varianten** (Grösse 128/156/164 in der Demo) braucht ein Malergeschäft
nicht; das ist Handel. Serienummern ebenso wenig.

Eine Anregung daraus: eine **organisationsweite Mengenstaffel** am Artikel
(Comatics `Staffelrabatte` ohne Kundenbezug) fehlt ArcoTime — heute geht
Staffel nur je Kunde. Als Idee für Etappe C notiert, kein Muss.

## 7. Lager: Zähler *und* Journal — ein Detail übernehmen wir

Comatic führt beides: `ArtikelLager.Lagerstand` als Zähler (je Lagerort und
Variante, mit `Bestellpunkt`/`Bestellmenge`) **und** das `Lagerjournal`, in
dem jede Bewegung Menge, Text, Visum und — wichtig — **`BLagerstand`**, den
Bestand *nach* der Buchung, festhält:

```
Menge=-1  BText='Kassenbon 100009 Kasse Hauptlager'  BLagerstand=2
```

Unser Plan (nur Journal, Bestand als Sicht darüber — Ideendokument Abschnitt
11) bleibt richtig für Postgres. Aber das `BLagerstand`-Detail übernehmen
wir: **jede Bewegung speichert den resultierenden Bestand mit.** Damit lässt
sich das Journal jederzeit gegen sich selbst prüfen (läuft die Summe
auseinander, ist die Lücke auf die Zeile genau benennbar) — dieselbe Denkweise
wie beim Änderungsprotokoll. Ebenso übernehmen wir `Bestellpunkt` und
`Bestellmenge` je Lagerort und den Klartext samt Belegverweis an der Bewegung.

`Globals.Inventarbewertung = 100` und `Lagerbewertung = 0` sind wieder
Programm-Codes — die Bewertungsfrage (Phase 14) bleibt beim Treuhänder.

## 8. Adressen: Comatic kennt Hierarchie in einer Tabelle — wir bleiben bei zweien

`Adressen.Parent_ID` zeigt: Ansprechpersonen sind bei Comatic
**Kind-Adressen** derselben Tabelle (mit `Adressart`/`Kontakttyp`). Die Demo
enthält keine, aber das Modell ist klar.

Wir bleiben bei der eigenen Tabelle `kunden_ansprechpersonen` (entschieden):
Eine Person ist bei uns kein Kunde mit allen 60 Kundenfeldern, und RLS-Regeln
über eine selbstbezügliche Hierarchie sind genau die Sorte Rekursion, die uns
in 0007/0032 schon Mühe gemacht hat.

Was die Comatic-Adresse sonst noch trägt und **für später** notiert ist (nicht
Phase 13): `Kreditlimite` und `Mahnstufe` (Debitoren — bewusst ausgegrenzt),
getrennte **Liefer-/Rechnungs-/Zustelladresse** (für einen Maler mit
Baustellen relevant — heute hat ArcoTime eine Adresse je Kunde; die
*Baustelle* steht bei uns am Projekt, das deckt den Fall), `TeilLS` je Kunde
(Teillieferungen erlaubt ja/nein — Phase 14).

## 9. Nummernkreise: je Jahr eine Globals-Zeile — wir haben die robustere Form

Comatic hält je Geschäftsjahr eine `Globals`-Zeile (ID 2021, 2025) mit
Zählern darin (`Rechnungs_Nr = 100014`, `Bestell_Nr`, `Pendenz_Nr`). Das
bestätigt: **Nummernkreis je Jahr** ist die richtige Körnung (unsere
Entscheidung `2026-00001`). Die Umsetzung mit `unique (organisation_id, jahr,
nummer)` und Vergabe beim Versand ist der Zähler-Spalte überlegen — ein
Zähler in einer Konfigurationszeile kann bei zwei gleichzeitigen Vorgängen
dieselbe Nummer zweimal vergeben; das Unique-Constraint kann es nicht.

## 10. Texte: RTF-Blobs — wir machen das bewusst anders

Kopf- und Fusstexte liegen als **RTF** in `Texte` (16 Zeilen, alle Texttyp 30),
`BuchungenTexte` verknüpft sie mit dem Beleg. RTF in der Datenbank ist eine
Access-Erbschaft: schwer zu durchsuchen, schwer zu rendern, an eine
Schriftart gebunden. Unsere Textbausteine werden schlichter Text (mit
Zeilenumbrüchen), gerendert vom PDF-Layout — dieselbe Entscheidung wie bei
den Hilfetexten.

## 11. Terminologie-Falle: „Rapporte" heisst bei Comatic etwas anderes

Comatics `Rapporte`/`RapporteZeilen` sind **FIBU-Buchungsrapporte**
(Sammelbuchungen mit Soll/Haben je Zeile) — nicht Arbeitsrapporte. Wenn der
Maler von SelectLine kommt und wir mit Comatic-Vokabular erklären, ist das
eine Verwechslungsquelle in Gesprächen und Hilfetexten. In der Hilfe des
Angebotsmoduls einmal explizit klären: *ArcoTime-Rapport = Arbeitsrapport.*

---

## 12. Kondensat: übernehmen / anders machen / Fragen

**Übernehmen (bestätigt oder abgeschaut):**
- Optionale Position als Zeilenmerkmal · Titel als Positionsart ·
  Schnappschuss an der Zeile — alles bestätigt.
- **Mengenzähler statt Boolean für die Übernahme** (`uebernommen numeric`,
  nach dem Vorbild Liefern/Geliefert/Verrechnet) — Teilmengen über mehrere
  Rapporte.
- Zeilenrabatt als Prozent **oder** Fixbetrag.
- `Lieferfrist` am Artikel; Einkaufspreis + Lieferant; Bestellpunkt und
  Bestellmenge je Lagerort (Phase 14); **Bestand-nachher an jeder
  Lagerbewegung**.
- Nummernkreis je Jahr (bestätigt; unsere Constraint-Form ist robuster).

**Anders machen (begründet):**
- Schmale Tabellen je Dokumentart statt 77-Spalten-Universalbeleg.
- Ausgeschriebene Status statt Zahlencodes.
- Ansprechpersonen als eigene Tabelle statt Adress-Hierarchie.
- Kein RTF in der Datenbank.
- Keine vier Preislisten, keine Varianten, keine Serienummern.
- „Konditionen" nicht doppelt besetzen: Rabattstufen umbenennen
  (z. B. `rabattkonditionen`), Zahlungskonditionen bleiben Frist/Skonto.

**Ideen notiert, kein Phase-13-Umfang:**
- Abrechnungsziffer an `mwst_codes` (MWST-Abrechnung vorbereiten).
- Organisationsweite Mengenstaffel am Artikel.
- Getrennte Liefer-/Rechnungsadresse je Kunde (bei uns deckt das Projekt
  die Baustelle ab — prüfen, ob das dem Maler genügt).

**Fragen an den Nutzer (Comatic-Wissen, nicht aus der DB ablesbar):**
1. `Buchungstyp`-Codes: Welche Zahl ist Offerte, Auftrag, Lieferschein?
   (Demo: 1 = Rechnung, 0 = Zahlung.) Und die Status 7/8/9?
2. `Globals.Rundung = 0` / `MaxDiff = 5.0`: Wie rundet Comatic — je Zeile
   oder am Total, und auf was?
3. Leben Offerten und Aufträge in `Pendenzen`, bis sie fakturiert werden —
   stimmt das Bild „Pendenzen = unverbucht, Buchungen = verbucht"?
4. Die Demo hat keine Offerte: Gibt es eine gefülltere Demo (oder einen
   anonymisierten Auszug nur der Tabellen `Pendenzen`/`PendenzenZeilen` mit
   ein paar Offerten samt Titeln und optionalen Positionen)? Das wäre die
   letzte Bestätigung fürs Positionsmodell.

---

*Werkzeugnotiz: Gelesen mit `access-parser` — Tabellenstrukturen und Inhalte
vollständig, Beziehungen/Indizes prinzipbedingt nicht (Jet legt sie im
Programmteil ab). Für diese Analyse ohne Belang; die Verknüpfungen ergeben
sich aus den ID-Spalten eindeutig.*
