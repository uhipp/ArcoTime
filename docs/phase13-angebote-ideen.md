# Phase 13: Angebote — Ideensammlung (Phase 1 von 3)

Stand: 18.08.2026, abends · **noch nichts umgesetzt**

Grundlage: ein Telefonat mit einem Interessenten — **Malergeschäft**, arbeitet
heute mit **SelectLine** — und die Entscheidungen des Nutzers vom 18.08.2026
(unten jeweils als **entschieden** markiert).

> Dieses Dokument ist **Phase 1**: zusammentragen, ergänzen, Fragen stellen.
> Es entscheidet nichts von sich aus. Phase 2 ist das Plandokument mit
> Datenmodell, Migrationen und Etappen, Phase 3 die Umsetzung.
>
> Was unter **„Offene Fragen"** steht, ist bewusst nicht beantwortet. Angebote
> berühren Preisrecht, MWST und Buchhaltung; geraten wäre schlimmer als
> gefragt.

---

## 1. Der Auftragsbestand an Anforderungen

Aus dem Telefonat:

- Modul, um **Angebote** zu erstellen; das Angebot ist dem Rapport
  **vorgelagert**.
- Bei Auftragserteilung wandert **alles oder ein Teil** in den Rapport.
- Bei der Anfrage eine **dritte Option**: ins Angebot statt in den Rapport.
- Aus Dienstleistungen werden **Dienstleistungen und Produkte**, eventuell
  mit getrennten Masken.
- Mit Produkten kommt eventuell **Lagerführung**.
- Bei den Kunden **Ansprechpersonen** (1 Firma – n Personen), zuweisbar an
  Anfragen und Rapporte.
- Im Angebot **Wiedervorlagen**.
- **Kostenpflichtiges Zusatzmodul** wie die Disposition.

Dazu die Entscheidungen vom 18.08.:

- Eigener Nummernkreis für Angebote; **jeder Rapport nennt das Angebot**, auf
  das er sich bezieht.
- Belegkette **Anfrage → Angebot → Rapport**; mit dem Erstellen des Angebots
  ist die Anfrage erledigt.
- Ein versendetes Angebot wird **als PDF eingefroren**; das Angebot selbst
  bleibt änderbar und erhält beim nächsten Versand die Fassungsnummer
  `2026-00001-01`.
- **Optionale Positionen** (kursiv, nicht im Total).
- **„per"-Positionen**: Einheitspreis ohne Menge, nicht im Total, mit Hinweis
  im Fusstext.
- **Pauschalrabatt** als Schlussposition nach dem Total.
- **Handwerkerkonditionen** („5 + 2") als zweistufiger Rabatt nach dem
  Pauschalrabatt, definiert in einer eigenen Tabelle.
- **MWST immer exklusiv mit Ausweis**, ganz am Schluss gerechnet.
- **Auftragsbestätigung** als eigenes Dokument.
- **Lager** im Datenmodell mitdenken, Umsetzung später als eigenes
  kostenpflichtiges Modul.

---

## 2. Was ArcoTime heute schon hat — die Bausteine, die tragen

| Vorhanden | Wo | Bedeutung fürs Angebot |
|---|---|---|
| Kunden mit Adresse, Währung, Zahlungskondition | `kunden` (0001) | Empfänger |
| Kundenpreise, gestaffelt ab Menge | `kundenpreise` (0022) | Preisfindung |
| Kundenrabatte je Leistungsklasse | `kundenrabatte` (0022) | Rabattvorschlag |
| Leistungen mit Preis, Einheit, MWST-Code, Konto | `dienstleistungen` (0001, 0022) | Positionen |
| Mengenartikel (`zaehlt_als_arbeitszeit = false`) | 0022 | **Produkte gibt es im Ansatz schon** |
| Freie Einheiten (Stück, m², kg, km …) | `einheiten` (0023) | Mengen |
| Preis- und MWST-Schnappschuss an der Position | 0003, 0021 | Vorbild für den Angebots-Schnappschuss |
| Rapport mit Nummernkreis je Jahr, Status, Unterschrift, Storno | `rapporte` (0026, 0043) | Vorbild für den Lebenszyklus |
| Rapportpositionen **sind Zeiteinträge** | 0026 | entscheidend für die Übernahme, siehe 6 |
| Vorläufige Positionen: vorbereitete Rapporte zählen nicht | 0036 | der Zustand, in dem ein übernommenes Angebot landet |
| Standardpositionen für neue Rapporte | 0051 | Vorbild für Angebotsvorlagen |
| Anfragen mit Kanal, Status, Priorität, Wiedervorlage, Zuweisung | `anfragen` (0013) | Startpunkt |
| Anfrage → Rapport / → Zeiteintrag, Dokumentübernahme | 0034 | Muster für Anfrage → Angebot |
| Anfrage wieder öffnen | 0035 | Rückweg, falls doch nichts daraus wird |
| Täglicher Auftrag für Wiedervorlagen | `/api/cron/wiedervorlagen` | Erinnerung an Angebote |
| PDF im eigenen Layout mit Logo und Absender | `rapport-pdf.tsx`, `rechnung-pdf.tsx` | Angebots-PDF |
| PDF einfrieren und im privaten Speicher ablegen | `rechnung-erstellen.ts` (0062) | genau das, was der Versand braucht |
| Mailversand mit Textteil, eigenem Absender, Anhang | `src/lib/email.ts` | Angebot versenden |
| Dokumentenablage, polymorph je Bereich | `dokumente` (0015, 0034) | Pläne, Fotos — **und die eingefrorenen PDF**, siehe 4.6 |
| Änderungsprotokoll je Tabelle | 0053 | Nachvollziehbarkeit der Änderungen |
| Vollexport, Umfangszählung, Löschung **aus dem Katalog** | 0063, 0064, 0067 | neue Tabellen sind automatisch dabei |
| Dokumentarchiv als ZIP | 18.08.2026 | die eingefrorenen PDF kommen mit |
| Zwei kostenpflichtige Module, Freischaltung je Organisation | `modul_disposition`, `modul_zeitkonto` | Muster fürs dritte |

**Wirklich neu:** das Angebot mit eigenen Positionen und eigener Preisrechnung,
die Konditionen, die Auftragsbestätigung, die Ansprechpersonen, die
Produktfelder — und später das Lager.

---

## 3. Lebenszyklus, Nummer und Fassungen

### 3.1 Status

```
Entwurf ──► versendet ──┬─► angenommen ──► Auftragsbestätigung ──► Rapport(e)
                        ├─► teilweise angenommen ──► …
                        ├─► abgelehnt
                        ├─► verfallen  (Gültigkeit abgelaufen)
                        └─► zurückgezogen
```

**Verfallen** setzt der tägliche Auftrag, nicht ein Mensch — hier ist die
Automatik ungefährlich, weil sie nichts löscht und nichts verrechnet.

### 3.2 Nummernkreis — **entschieden**

Eigener Kreis, getrennt vom Rapport, fünfstellig:

```
2026-00001          erste Fassung
2026-00001-01       erste Änderung nach dem Versand
2026-00001-02       zweite Änderung
```

Datenmodell: `jahr int`, `nummer int`, `fassung int not null default 0`,
`unique (organisation_id, jahr, nummer)`. Die Anzeigeform entsteht aus den
drei Feldern (wie `rapportNummer()` in `types.ts`), Fassung 0 ohne Suffix.

Die Nummer wird **erst beim ersten Versand** vergeben — ein verworfener
Entwurf reisst dann keine Lücke, genau wie beim Rapport.

### 3.3 Ändern statt versionieren — **entschieden**

Das Angebot bleibt **eine Zeile** und ist änderbar; die Geschichte steckt in
den eingefrorenen PDF. Beim nächsten Versand zählt die Fassung hoch und es
entsteht ein zweites PDF.

Das ist die einfachste Lösung, und sie funktioniert — aber sie verlagert die
Beweislast. Deshalb zwei Dinge, die dann zwingend dazugehören:

1. **Das PDF-Archiv ist der Nachweis.** Es muss vollständig sein und darf
   nicht einzeln löschbar sein. Als `dokumente`-Zeile am Angebot abgelegt
   (siehe 4.6), erbt es Zugriffsschutz, Export und Löschung.
2. **Das Änderungsprotokoll (0053) muss `angebote` und `angebot_positionen`
   erfassen**, sonst lässt sich nicht mehr sagen, wer nach dem Versand was
   geändert hat. Eintragen in die Tabellenliste der Migration.

Zwei Zähler, damit die Oberfläche die Wahrheit sagen kann: `fassung` (was
gerade bearbeitet wird) und `versendete_fassung` (was beim Kunden liegt). Sind
sie verschieden, steht in der Liste „geändert, noch nicht versendet" — sonst
glaubt jemand, der Kunde habe den neuen Preis schon.

### 3.4 Inhalt neben den Positionen

Anschrift (Kunde + Ansprechperson) · Betreff/Objekt · Angebotsdatum ·
**gültig bis** (Vorgabe in Tagen je Organisation) · Einleitungs- und
Schlusstext aus Textbausteinen, frei überschreibbar · voraussichtliche
Ausführungsfrist · Zahlungskondition (aus dem Kunden, überschreibbar) ·
Sachbearbeiter · **interne Notiz, die nie auf dem PDF erscheint**.

---

## 4. Positionen

### 4.1 Eigene Tabelle, nicht Zeiteinträge

Rapportpositionen sind Zeiteinträge (0026). Fürs Angebot geht das nicht: Es ist
noch **nichts geleistet**, und ein Zeiteintrag behauptet immer, dass jemand
gearbeitet hat. Also `angebot_positionen` als eigene Tabelle.

Damit fällt eine Entscheidung anders aus als in 0036 (dort bewusst *keine*
Zwischentabelle). Der Unterschied: Dort ging es um dieselbe Sache in zwei
Zuständen, hier um zwei verschiedene Sachen — **Absicht gegen Nachweis**.

### 4.2 Positionsarten — **entschieden, erweitert**

| Art | Auf dem PDF | Im Total |
|---|---|---|
| `normal` | Menge × Preis, Zeilensumme | **ja** |
| `optional` | **kursiv**, mit Preis | nein |
| `per` | „pro m² CHF 28.50", ohne Menge und ohne Zeilensumme | nein |
| `titel` | Überschrift, fett, mit Zwischensumme | Zwischensumme |
| `text` | reiner Text ohne Preis | nein |

`text` ist mein Zusatz: Es gibt in jedem Angebot einen Satz, der zwischen zwei
Positionen gehört („Untergrund wird vorausgesetzt trocken und tragfähig") und
der keine Zeile mit Preis sein darf.

**Fusstexte werden automatisch gesetzt**, wenn eine solche Position vorkommt —
nicht als Vorgabetext, den jemand vergisst:

- bei optionalen Positionen: „Kursiv gesetzte Positionen sind Optionen und im
  Total nicht enthalten."
- bei „per"-Positionen: „Positionen mit Einheitspreis werden nach
  tatsächlichem Aufwand verrechnet und sind im Total nicht enthalten."

Der Wortlaut gehört in die Textbausteine, damit ihn der Betrieb anpassen kann.
**Offene Frage 1.**

### 4.3 Was eine Position trägt

Verweis auf Leistung/Produkt **plus Schnappschuss** von Bezeichnung, Einheit,
Einzelpreis, MWST-Satz und Rabatt — ein Angebot muss in drei Monaten noch
zeigen, was zugesagt war, auch wenn die Preisliste sich geändert hat. Dazu
Menge, Zeilenrabatt, Zeilensumme, Sortierung, Freitext ohne Leistungsbezug.

### 4.4 „per"-Positionen in der Übernahme

Der Grund, warum die Art fachlich mehr ist als eine Darstellungsfrage: Bei der
Übernahme in den Rapport wird aus der „per"-Position eine Position **mit
offener Menge** — der Maler trägt vor Ort die tatsächlichen Quadratmeter ein,
der Preis steht aus dem Angebot fest. Das ist die Regie-Arbeit, wie sie im
Handwerk wirklich abläuft.

---

## 5. Die Preisrechnung — **entschieden**

Die Reihenfolge ist der Kern. Beispiel mit den Zahlen aus dem Auftrag:

```
Positionen (nur "normal", inkl. Zeilenrabatte)      24'345.60
Pauschalrabatt (Differenz zum Pauschalpreis)          -345.60
                                                   ──────────
Zwischentotal                                       24'000.00
Kondition Stufe 1  5 %                              -1'200.00
                                                   ──────────
                                                    22'800.00
Kondition Stufe 2  2 % (vom Rest)                     -456.00
                                                   ──────────
Nettototal                                          22'344.00
MWST 8.1 %                                           1'809.86
                                                   ══════════
Endtotal                                            24'153.86
```

**Der Pauschalpreis ist die Eingabe, der Rabatt das Ergebnis.** Der Anwender
tippt 24'000.–, das System rechnet die Differenz und stellt sie als Zeile
nach dem Total dar.

### 5.1 Konditionen als eigene Tabelle

```
konditionen (organisation_id, bezeichnung "5 + 2", aktiv)
  └─ konditionen_stufen (stufe, prozent, bezeichnung, sortierung)
```

Kaskadierend: Stufe 2 rechnet vom Rest nach Stufe 1, nicht vom Zwischentotal.
Beliebig viele Stufen, weil „3 + 2 + 2" genauso vorkommt.

Am Angebot steht der Verweis auf die Kondition **und ein Schnappschuss der
Stufen mit ihren Beträgen** — aus demselben Grund wie beim Preis: Ändert der
Betrieb später „5 + 2" auf „4 + 2", darf ein versendetes Angebot nicht
rückwirkend andere Zahlen zeigen.

### 5.2 Ein MWST-Satz je Angebot — geprüft, nicht angenommen

Die Kaskade funktioniert nur mit **einem** Satz für das ganze Angebot; sonst
müssten Pauschalrabatt und Konditionen anteilig auf mehrere Steuerbemessungs-
grundlagen verteilt werden.

Vorschlag: **beim Versand prüfen und mit Nennung der abweichenden Positionen
abbrechen** — nicht stillschweigend den Satz der ersten Position nehmen. Für
ein Malergeschäft ist ein Satz der Normalfall (8.1 % auf praktisch alles), und
die Prüfung kostet nichts.

Damit die Tür für später offen bleibt: Die Beträge der Rabattstufen werden am
Angebot **als Betrag** gespeichert, nicht nur als Prozentsatz. Eine anteilige
Verteilung auf zwei Sätze liesse sich dann ergänzen, ohne die
Dokumentbedeutung zu ändern.

### 5.3 Rundung

Vorschlag: intern auf Rappen genau rechnen, **nur den MWST-Betrag und das
Endtotal auf 5 Rappen runden**. Zwischenrundungen erzeugen sonst Differenzen,
die niemand nachrechnen kann. Wie Comatic das macht, sehen wir in der Demo-DB
(siehe 12) — dort sollte es sich anlehnen, weil die Rechnung später dort
entsteht. **Offene Frage 2.**

### 5.4 Skonto oder Rabatt? — eine fachliche Rückfrage

„5 + 2" heisst im Handwerk manchmal *5 % Rabatt und 2 % Skonto bei Zahlung
innert 10 Tagen*. Das ist etwas anderes als ein zweistufiger Rabatt:

- Ein **Rabatt** mindert den Preis sofort und damit die MWST-Bemessung.
- Ein **Skonto** ist an die Zahlung gebunden. Er wird auf dem Beleg
  ausgewiesen, aber nicht abgezogen; erst bei Inanspruchnahme mindert er
  Entgelt und MWST.

Umgesetzt wird, was oben steht (beide Stufen als Rabatt, vor der MWST) — so
war die Vorgabe. Aber wenn der Maler mit „2" den Skonto meint, wäre der
Angebotsbetrag zu tief und die MWST falsch ausgewiesen. **Offene Frage 3** —
eine Frage an ihn, nicht an uns.

Beides zugleich ist möglich: Stufen mit `art` (`rabatt` | `skonto`), wobei
Skonto-Stufen nur im Text erscheinen. Das kostet in der Tabelle eine Spalte.

---

## 6. Vom Angebot in den Rapport

### 6.1 Jeder Rapport nennt sein Angebot — **entschieden**

`rapporte.angebot_id`, und auf dem Rapport steht „Bezug: Angebot
2026-00001-01".

Dazu ein Vorschlag aus der Erfahrung dieses Projekts: Die Nummer wird beim
Anlegen **als Text am Rapport mitgespeichert**. Ein signierter Rapport ist
unveränderlich — würde das Angebot später gelöscht, verschwände sonst die
Bezugsnummer aus einem unterschriebenen Dokument. Dieselbe Überlegung wie beim
Preis-Schnappschuss (0003) und beim MWST-Schnappschuss (0021).

Ein Angebot kann **mehrere Rapporte** nach sich ziehen (drei Tage Malerarbeit
= drei Einsätze). Der Verweis steht deshalb beim Rapport, nicht am Angebot —
eine Quelle der Wahrheit, Rückrichtung per Abfrage, wie in 0034 entschieden.

### 6.2 Was die Übernahme tut

Ausgewählte Positionen werden **vorläufige Positionen** eines Rapports (0036):
sichtbar und planbar, aber noch nicht verrechenbar. Der Maler korrigiert vor
Ort, schliesst ab, erst dann zählen sie.

- **Optionale Positionen** kommen nur mit, wenn sie bestellt wurden.
- **„per"-Positionen** kommen mit offener Menge mit (siehe 4.4).
- **Produktpositionen** sind keine Arbeitszeit und lösen die
  Tagesarbeitszeit-Prüfung nicht aus — funktioniert heute schon so.
- **Der Pauschalrabatt und die Konditionen wandern nicht mit.** Sie gehören
  zum Angebot als Ganzem, nicht zu einer Position. Was das für den
  Comatic-Export bedeutet, ist **offene Frage 4** — bei einem Pauschalauftrag
  darf die Summe der Rapportpositionen nicht ungekürzt in die Rechnung.

### 6.3 Teilübernahme

`angebot_positionen.bestellt boolean` plus eine Spur, in welchen Rapport eine
Position gewandert ist — damit dieselbe Position nicht zweimal übernommen
wird. Nicht bestellte Positionen bleiben am Angebot als *nicht bestellt*
vermerkt; gelöscht wird nichts, sonst ist die Nachverfolgung weg.

### 6.4 Soll gegen Ist

Sobald Angebot und Rapporte verknüpft sind: **kalkuliert gegen geleistet**, je
Auftrag, in Stunden und in Franken, mit Warnung bei Überschreitung. Bei einem
Pauschalauftrag ist das die Zahl, an der man sieht, ob Geld verloren geht —
und der Grund, warum ein Handwerksbetrieb ein solches Modul kauft. Sie kostet
fast nichts, weil beide Seiten schon in der Datenbank stehen.

---

## 7. Die Belegkette — **entschieden**

```
Anfrage ──► Angebot ──► Auftragsbestätigung ──► Rapport(e) ──► Comatic
```

### 7.1 Anfrage wird mit dem Angebot erledigt

`anfragen.angebot_id` (wie `rapport_id` in 0034, `on delete set null`), Status
`erledigt`, Nachweis ist das Angebot — die dritte Art neben Zeiteintrag und
Rapport.

Eine Folge, die dazugehört: Wird das Angebot **abgelehnt oder verfällt es**,
bleibt die Anfrage erledigt. Die Nachverfolgung passiert dann in der
Angebotsliste, nicht in der Anfragenliste. Das ist bewusst so entschieden;
wer den Weg zurück braucht, hat „Anfrage wieder öffnen" (0035).

Die Dokumentübernahme aus der Anfrage (Fotos vom Objekt, Pläne) funktioniert
wie bei 0034 — das Angebot braucht dafür nur den neuen Dokumentbereich
`angebot`.

### 7.2 Auftragsbestätigung — **entschieden: eigenes Dokument**

Sie enthält, was bestellt wurde: die bestellten Positionen mitsamt der
gewählten Optionen, Ausführungstermin, Ansprechperson, dieselbe Preisrechnung.
Auch sie wird beim Versand als PDF eingefroren.

**Vorschlag: kein eigener Nummernkreis.** „Auftragsbestätigung zu Angebot
2026-00001-01" — weil die Rapporte ohnehin die Angebotsnummer nennen und eine
zweite Nummer damit konkurrieren würde. Ob der Maler eine eigene
Auftragsnummer erwartet, ist **offene Frage 5**.

---

## 8. Wiedervorlagen und Nachverfolgung

- `wiedervorlage_am` am Angebot, wie bei der Anfrage
- der bestehende tägliche Auftrag `/api/cron/wiedervorlagen` nimmt die
  Angebote dazu: „Angebot 2026-00001 an Muster AG, versendet vor 10 Tagen,
  gültig bis 15.09."
- Nachfrage an den Kunden per Textbaustein — **nur auf Knopfdruck**, nie
  automatisch
- Liste mit Filter nach Status, Fälligkeit, Sachbearbeiter
- **Trefferquote**: angebotenes und angenommenes Volumen je Monat und
  Sachbearbeiter. Fällt an, sobald die Status gepflegt sind.

---

## 9. Ansprechpersonen beim Kunden

```
kunden 1 ─── n kunden_ansprechpersonen
   (anrede, vorname, name, funktion, email, telefon, mobil,
    notiz, ist_standard, aktiv)
```

Wirkt an mehr Stellen als es scheint: Anschrift und Mailempfänger des
Angebots · „von wem kam die Anfrage" · wer den Rapport unterschreibt
(`rapporte.unterzeichner_name` ist heute Freitext — künftig wählbar, weiterhin
überschreibbar, weil vor Ort auch jemand anderes unterschreibt).

**Vorschlag: ins Basispaket, nicht ins Modul.** Ansprechpersonen sind nützlich,
auch wenn nie ein Angebot geschrieben wird, und ein Kundenstamm, der je nach
Lizenz anders aussieht, ist schwer zu erklären.

Migration: `kunden.email`/`telefon` bleiben die Firmenadresse; keine
automatische Umwandlung in eine Ansprechperson — **offene Frage 6**.

---

## 10. Dienstleistungen und Produkte

### 10.1 Der Ausgangspunkt ist besser als gedacht

Ein „Produkt" gibt es faktisch schon: eine Leistung mit
`zaehlt_als_arbeitszeit = false` und freier Einheit. Sie wird verrechnet,
zählt nicht als Arbeitszeit, kennt MWST-Code, Konto, Kundenpreise und
Rabattsperre. Es fehlen **Felder** und eine **getrennte Maske** — kein zweites
Datenmodell.

### 10.2 Eine Tabelle, zwei Masken

`dienstleistungen` bekommt `art` (`leistung` | `produkt`) und die
Produktfelder; die Oberfläche zeigt je Art nur, was passt.

Begründung: Zeiteinträge, Rapportpositionen, Kundenpreise, Kundenrabatte,
Standardpositionen, der Comatic-Export und alle Auswertungen verweisen auf
`dienstleistungen`. Eine zweite Tabelle heisst, dass **jede** dieser Stellen
künftig zwei Fremdschlüssel führt („entweder Leistung oder Produkt") — das ist
die Sorte Änderung, die man an einer Stelle vergisst. Der Preis dafür sind
Spalten, die bei Leistungen leer bleiben; das ist die billigere Unschönheit.

Der Tabellenname bleibt; in der Oberfläche heisst der Bereich künftig
**„Leistungen und Produkte"**.

### 10.3 Produktfelder

Fürs Angebot nötig: Artikelnummer, Beschreibung (länger als die Bezeichnung),
Einkaufspreis, Lieferant, **Beschaffungszeit in Tagen**, Vermerk „ab Lager /
auf Bestellung", Verpackungseinheit, EAN, Bild.

Mit Einkaufspreis lässt sich je Position und je Angebot der
**Deckungsbeitrag** zeigen — nur intern, nie auf dem PDF. Das ist der Punkt,
an dem ein Angebotsmodul aufhört, ein Formulargenerator zu sein.

---

## 11. Lager — Datenmodell jetzt, Umsetzung später — **entschieden**

Umgesetzt wird es als eigenes kostenpflichtiges Modul (Phase 14). Mitgedacht
wird es jetzt, damit die Produktfelder und die Belegkette dann passen. Vier
Festlegungen, die den späteren Umbau ersparen:

1. **Kein `bestand`-Feld am Produkt.** Der Bestand ist die Summe eines
   **Bewegungsjournals** (`lager_bewegungen`), der aktuelle Stand eine
   Ansicht darüber. Ein Zählerfeld läuft auseinander, sobald zwei Vorgänge
   gleichzeitig buchen, und lässt sich nicht nachrechnen — ein Journal kann
   man rekonstruieren, und Inventur und Bewertung brauchen es ohnehin.
2. **Bewegungen zeigen polymorph auf ihren Beleg** (`beleg_art`, `beleg_id`),
   wie die Dokumentenablage. Dann tragen Lieferschein, Rapport, Inventur und
   Korrektur dieselbe Struktur.
3. **Ein Angebot reserviert nichts.** Reserviert wird erst mit der
   Auftragsbestätigung — sonst blockiert ein Angebot, das nie angenommen
   wird, das Lager.
4. **Verfügbarkeit im Angebot ist vorerst eine Aussage, keine Zahl:**
   „Lieferzeit ca. 5 Arbeitstage" aus Beschaffungszeit und Lagervermerk. Das
   deckt den grössten Teil des Bedarfs, ohne eine Lagerbuchhaltung zu
   eröffnen.

Was zu Phase 14 gehört und **fachliche Fragen** aufwirft, die nicht geraten
werden: Inventur mit Zähllisten und Differenzen, **Bewertung** (Durchschnitt
oder FIFO, Art. 960 OR), Rückstandsmanagement mit Lieferantenbestellungen,
Lieferscheine mit Teillieferungen und eigenem Nummernkreis. **Offene Fragen
9–11.**

---

## 12. Comatic als Vorbild — was ich mit der Demo-DB tun kann

Das Angebot ist angenommen: Eine **Access-Demo-DB von Comatic** ist die
sinnvollste Grundlage, die wir haben können — der Nutzer kennt dort praktisch
jede Tabelle, und ArcoTime exportiert ohnehin nach Comatic.

**Technisch geprüft, nicht angenommen:** `access-parser` (Python, nur lesend)
ist installiert und lädt. Damit lassen sich Tabellen, Spalten und Inhalte
lesen — ohne Access, ohne Treiber, ohne Schreibzugriff.

Wo die Datei liegen soll: OneDrive unter `ArcoSoftware/` (`.mdb` oder
`.accdb`). Bitte eine **Demo-DB ohne echte Personendaten**.

Was ich daraus beantworten will:

1. Wie modelliert Comatic **Positionsarten** — Titel, Optionen,
   Einheitspreis-Positionen, Textzeilen?
2. Wie **Rabattstufen und Konditionen**, und in welcher Reihenfolge gegen die
   MWST?
3. Wie die **Rundung** (das entscheidet 5.3, weil die Rechnung später dort
   entsteht)?
4. Wie die **Belegkette** Angebot → Auftrag → Lieferschein → Rechnung, und
   welche Felder die Belege verbinden?
5. Wie **Artikel und Lager** (Bewegungen, Bewertung, Reservierung)?
6. Welche Felder am **Artikel** wirklich gepflegt werden — im Zweifel ist die
   gelebte Praxis besser als jede Feldliste.

Die Grundregel dabei: Wir übernehmen **Begriffe und Abläufe, nicht
Tabellenlayouts**. ArcoTime ist mandantenfähig mit RLS, deutsch benannt, mit
Schnappschüssen statt Verweisen auf veränderliche Stammdaten — und das bleibt
so. Wo Comatic es einfacher löst, übernehmen wir die Idee; wo es aus einer
Access-Vergangenheit stammt, lassen wir sie dort.

Grenzen, die ich vorher nenne: `access-parser` liest Daten und Spalten
zuverlässig, aber Beziehungen und Indizes gibt Access nur teilweise her, und
verschlüsselte `.accdb` kann es nicht öffnen. Falls es klemmt, ist der
Ausweg ein Schema- oder CSV-Export aus dem SQL Server.

---

## 13. Lizenzierung und Abrechnung

### 13.1 Bezugsgrösse

Die bestehenden Module folgen einer Logik (`src/lib/lizenzpreise.ts`): Nutzen
fürs Büro → **Pauschale** (Disposition, CHF 49/490); Nutzen je Person → **je
Lizenz** (Zeitkonto, CHF 4/40). Angebote schreibt das Büro. Also eine
Pauschale; Vorschlag **CHF 39/390**. **Offene Frage 12** ist die Höhe, nicht
die Art.

### 13.2 Zwei Baustellen, die vor dem dritten Modul drängen

1. **Module werden nicht über Stripe abgerechnet.** `MODULPREISE` dient der
   Anzeige, die Freischaltung macht Arcos von Hand unter `/plattform`
   („die Selbstbuchung über Stripe folgt als eigenes Paket"). Bei drei Modulen
   ist das kein Provisorium mehr, sondern eine Rechnung, die jemand von Hand
   stellt.
2. **`gesamtpreisMitModulen()` zählt die Module namentlich auf**
   (`{ disposition?, zeitkonto? }`). Ein drittes bedeutet, diese Signatur an
   jeder Aufrufstelle nachzuziehen — dieselbe Handliste, die 0063/0064 aus
   guten Gründen abgeschafft haben. Vorschlag: über die Schlüssel von
   `MODULPREISE` iterieren.

### 13.3 Testphase fürs Modul

Ein Modul, das man 30 Tage ausprobieren kann, verkauft sich anders als eines,
das man buchen muss. Heute gibt es nur die Testphase der ganzen Anwendung.
**Offene Frage 13.**

---

## 14. Was gratis mitkommt — und was nachzuziehen ist

**Kommt von selbst**, weil aus dem Postgres-Katalog gelesen wird: Vollexport
(0067), Umfangszählung (0064) und Löschung (0063) erfassen jede neue Tabelle,
sobald sie einen Fremdschlüssel auf `organisationen` trägt.

**Muss von Hand nachgezogen werden** — die Handlisten im Code:

- `0053`: Tabellenliste des Änderungsprotokolls (`angebote`,
  `angebot_positionen`, `konditionen`, `konditionen_stufen`,
  `kunden_ansprechpersonen`) — bei änderbaren versendeten Angeboten
  **zwingend**, siehe 3.3
- `dokumente_bereich_check`: neuer Bereich `angebot`
- `BEREICH_ORDNER` in `src/lib/dokumente-archiv.ts` (Ordner „Angebote" im ZIP)
- `TABELLE_ZU_BEREICH` in `scripts/dokumente-pruefen.mjs` (bricht sonst
  bewusst ab)
- `gesamtpreisMitModulen()` und die Modulschalter unter `/plattform`
- `src/lib/berechtigungen.ts` und `docs/berechtigungen.md`
- Navigation und Startseite hinter dem Modulschalter
- Hilfeartikel, Release-Einträge, Word-Dokumentation

---

## 15. Vorschlag für die Etappen (Grundlage für Phase 2)

Jede Etappe muss für sich einen Nutzen haben, den man einem Kunden zeigen kann.

**Etappe 0 — Ansprechpersonen** *(Basispaket)*
Tabelle, Maske am Kunden, Auswahl in Anfrage und Rapport.

**Etappe A — Angebot schreiben und versenden**
Angebot mit Positionen aller fünf Arten, Preisrechnung mit Pauschalrabatt und
Konditionen, ein MWST-Satz mit Prüfung, Nummernkreis mit Fassungen, PDF
einfrieren, Mailversand, Dokumente, Wiedervorlage, Modulschalter. **Hier ist
das Modul verkaufbar.**

**Etappe B — Vom Angebot zum Auftrag**
Auftragsbestätigung, dritte Option an der Anfrage, Teilübernahme in einen oder
mehrere Rapporte, Bezugsnummer am Rapport, Nachverfolgung, Trefferquote,
Soll gegen Ist.

**Etappe C — Produkte**
`art` an den Leistungen, getrennte Maske, Produktfelder, Beschaffungszeit und
Lieferbarkeitsvermerk, Einkaufspreis und Marge im Angebot.

**Etappe D — Feinschliff**
Textbausteine und Angebotsvorlagen, Erinnerung an den Kunden, Auswertungen.

**Phase 14, eigener Plan:** Lager. **Später:** Annahme durch den Kunden über
einen signierten Link (erster Baustein eines Kundenportals, eigene
Sicherheitsbetrachtung).

---

## 16. Offene Fragen

Neu nummeriert; die beantworteten sind eingearbeitet.

**Angebot und Preisrechnung**

1. Wortlaut der automatischen Fusstexte für optionale und „per"-Positionen —
   und dürfen sie überschrieben werden?
2. Rundung: nur MWST-Betrag und Endtotal auf 5 Rappen, oder jede Stufe? (Ein
   Blick in Comatic sollte das entscheiden.)
3. **Ist die zweite Stufe von „5 + 2" ein Rabatt oder ein Skonto?** Siehe 5.4
   — bei Skonto wäre die ausgewiesene MWST sonst falsch.
4. Pauschalauftrag und Comatic-Export: Was passiert mit der Summe der
   Rapportpositionen, wenn pauschal verrechnet wird?
5. Erwartet der Maler eine eigene **Auftragsnummer**, oder genügt
   „Auftragsbestätigung zu Angebot 2026-00001-01"?
6. Darf ein Pauschalpreis **über** dem Positionstotal liegen (Zuschlag statt
   Rabatt)?
7. Gültigkeitsdauer als Vorgabe — 30 Tage?
8. Soll der Kunde im Angebot Optionen **auswählen** können (Rückmeldung per
   Mail genügt), oder reicht der interne Vermerk „bestellt"?

**Ansprechpersonen**

9. Sollen bestehende `kunden.email`/`telefon` zu einer ersten Ansprechperson
   werden, oder bleiben sie strikt Firmenadresse?

**Lager (Phase 14)**

10. Bewertungsmethode (Durchschnitt, FIFO) — und was erwartet der Treuhänder?
11. Lieferscheine: eigener Nummernkreis, und wie verhält sich ein
    Lieferschein zum Rapport (beides Nachweise über dieselbe Lieferung)?

**Lizenz**

12. Höhe der Modulpauschale (Vorschlag CHF 39/390)?
13. Eigene Testphase je Modul — wenn ja, wie lange?
14. Soll das Modul auf arcocloud.ch als „in Vorbereitung" erscheinen, damit
    der Interessent darauf warten kann?

**Zum Interessenten**

15. Wie viele Personen, wie viele Angebote im Monat? Ein Maler mit fünf
    Angeboten braucht anderes als einer mit fünfzig.
16. **Ein echtes Angebot aus SelectLine als PDF** — ein reales Muster ist für
    das Datenmodell mehr wert als jede Aufzählung hier. Dazu, wenn möglich,
    eine Auftragsbestätigung und eine Rechnung derselben Sache.
17. Arbeitet er mit **Leistungsverzeichnissen oder Aufmass** (Malerarbeiten
    werden oft nach m² mit Zuschlägen gerechnet)? Das entscheidet, ob „per"
    genügt oder ob es eine Mengenermittlung braucht.

---

## 17. Was nicht dazugehört

- **Rechnungsstellung an Endkunden.** ArcoTime exportiert nach Comatic; die
  Rechnung schreibt die Buchhaltung.
- **Mahnwesen, Debitoren, Zahlungseingänge.**
- **Einkauf und Bestellwesen** beim Lieferanten (gehört zu Phase 14).
- **Kalkulationswerkzeuge** (Aufmass, GAEB, Leistungsverzeichnisse) — eigene
  Welt, siehe offene Frage 17.
- **Kundenportal.** Reizvoll, aber eigenes Vorhaben.
