# Plan: Der Ablauf mit und ohne Standorte

Stand: 22.08.2026 · **zur Abnahme** · Entwicklungsstop bis zur Freigabe

Dieses Dokument beschreibt nicht das Datenmodell, sondern die **Wege**: welche
Maske ein Mensch in welcher Reihenfolge anfasst, bis Hans Chefmaler am
richtigen Tag am richtigen Ort steht — einmal für einen Betrieb mit Standorten
(**Variante A**) und einmal ohne (**Variante B**).

Vorgänger: `docs/plan-parteien-standorte.md` (Etappen 1–4, umgesetzt) und
`docs/datenmodell-parteien-standorte.md` (die Gespräche). Dieses Dokument
**korrigiert** zwei Entscheidungen daraus; die betroffenen Stellen sind unten
namentlich aufgeführt.

---

## 1. Der Satz, an dem alles gemessen wird

> **Variante A gibt dem Betrieb genau zwei Dinge:** mehrere Adressen je Kunde
> erfassen und wählen, und Auswertungen je Adresse.
> **Alles andere ist in A und B identisch** — bis auf die Anzeige.

Aus dem Gespräch vom 22.08.2026:

> Da Standorte also lediglich die technische Möglichkeit bieten eine
> Aufteilungsstufe mehr zu haben, darf aus meiner Sicht kein weiterer
> Informationsträger ausser Projekt direkt am Standort hangen.

Und:

> Ausser der Postadresse gehört gar nichts in den Standort.

Damit ist der Standort ein **Vervielfältiger der Adresse** und kein Träger von
Betriebswissen. Jede Maske, jeder Ausdruck und jede Migration in diesem
Dokument lässt sich gegen diesen Satz prüfen.

**Die Gegenprobe für jede künftige Erweiterung:** Wenn ein Feld nur in
Variante A einen Sinn hat, ist es am falschen Ort.

---

## 2. Was der Standort trägt — und was nicht

**Der Standort trägt genau die Postadresse:**

| Feld | |
|---|---|
| Bezeichnung | „Liegenschaft Bahnhofstrasse 12" |
| Adresszusatz | „Hintereingang" |
| Strasse · Hausnummer | |
| PLZ · Ort · Land | |

Dazu zwei Angaben, die die Anwendung braucht und die am 22.08. eigens
entschieden wurden:

- **Standardadresse** (Häkchen): welche Adresse beim neuen Projekt
  vorgeschlagen wird. In Variante B nicht sichtbar — dort ist es die stille
  Adresse aus dem Kundenstamm.
- **aktiv**: die Stilllegung. Begründung des Nutzers:

  > Wenn die Adresse an einen anderen Kunden der Organisation verkauft wird,
  > dann zieht sie mit der gesamten Historie um. Wenn die Liegenschaft an einen
  > Kunden ausserhalb der Organisation verkauft wird und nicht mehr durch die
  > Organisation betreut wird, dann ist Stilllegung der richtige Vorgang.

**Nicht am Standort — sondern am Projekt:**

| | |
|---|---|
| zusätzliche Adressen (Architekt, Hauswart, Elektriker, Behörde) | Verknüpfung |
| Anfahrt km | Wert, wird vorgetragen |
| Zugang (Schlüsselkasten, Code, „klingeln beim Hauswart") | Wert, wird vorgetragen · **mehrzeilig** |
| Notizen | Wert, wird **nicht** vorgetragen |

### Verknüpfung oder Kopie — der Unterschied ist nicht kosmetisch

Bei den **zusätzlichen Adressen** ist es eine echte Verknüpfung: Die Adresse
steht einmal im Adressbuch, das Projekt zeigt mit einer Rollenzeile darauf.
Zieht das Architekturbüro um, ändert man eine Adresse und es stimmt in allen
Projekten. Das ist die Antwort auf die Frage vom 20.08. („dann muss der
Architekt redundant vielleicht 10 x als komplette Adresse erfasst werden").

Bei **Anfahrt und Zugang** ist es zwingend eine **Kopie**: Es gibt keine Zeile
mehr, auf die man zeigen könnte. Der Vortrag schreibt einen Wert, danach sind
es zwei unabhängige Werte.

**Regel für den Vortrag:**

1. Vorgetragen wird vom **letzten Projekt am selben Standort** — nicht vom
   letzten Projekt desselben Kunden. Die Anfahrt ist eine Eigenschaft des Wegs
   zu *dieser* Adresse.
2. Beim **ersten** Projekt an einer Adresse bleibt das Feld **leer**. Eine
   vorgetragene Distanz von einer anderen Liegenschaft wäre plausibel und
   falsch; stille falsche Zahlen sind schlimmer als leere Felder (dieselbe
   Begründung wie bei den Datumsfeldern).
3. Das Formular sagt, woher der Wert kommt: „aus Projekt ‚Sanierung 2025'
   übernommen". Wer es nicht lesen will, überschreibt es einfach.
4. **Was vorgetragen wird, stellt der Betrieb ein** (Abschnitt 8a). Entschieden
   am 22.08.2026:

   > Ich bin immer dafür möglichst flexibel zu bleiben und so viel wie möglich
   > in den Einstellungen parametrisieren zu lassen.

**Der bewusst getragene Preis — und warum er kleiner ist als gedacht:** Ändert
der Hauswart den Code am Schlüsselkasten, ist er in jedem **laufenden** Projekt
an diesem Ort nachzutragen. Bei abgeschlossenen Projekten ist der alte Code
richtig — der Rapport von damals soll zeigen, was damals galt, wie beim
eingefrorenen Preis an der Position. Tragbar, weil es je Standort in der Regel
wenige und meist nur ein laufendes Projekt gibt.

Für die **zusätzlichen Adressen** verschwindet der Preis sogar ganz: Sie sind
Verknüpfungen, und eine Verknüpfung vorzutragen kostet nichts und bleibt
richtig. Zieht das Architekturbüro um, stimmt es in allen Projekten — auch in
denen, die den Eintrag geerbt haben. Damit ist der Einwand vom 22.08. („der
Eigentümer muss bei jedem neuen Auftrag neu verknüpft werden") erledigt: Er
wird mitgetragen, wenn der Betrieb es so einstellt.

---

## 3. Die Kette — und die Stelle, an der sie kein Baum ist

```
Adressen (bisher „Kunden")
   │  eine Zeile je Firma oder Person; „ist Kunde" nur bei denen,
   │  an die ein Auftrag geht
   │
   ├─ Standort (Postadresse)  ── 1 Kunde, n Standorte
   │     │                       in Variante B: genau einer, unsichtbar
   │     │
   │     └─ Projekt  ── 1 Standort, n Projekte
   │           │        „Umbau/Sanierung", „laufender Unterhalt", „Spezial"
   │           │
   │           │  hier hängt ALLES Betriebswissen:
   │           │    Anfahrt · Zugang · Notizen · Projektleitung ·
   │           │    Mitarbeitende (Team) · zusätzliche Adressen mit Rolle ·
   │           │    Kostenstelle · Belegnummer · Dokumente
   │           │
   │           └─ Rapport  ── 1 Projekt, n Rapporte
   │                 ein Einsatz an einem Tag: Arbeit, Material, Spesen
   │                 wird in der Disposition geplant
   │
   └─ als zusätzliche Adresse an einem Projekt verknüpft
        (Architekt, Eigentümer, Hauswart, Elektriker, Behörde)
```

**Das Projekt hat zwei Eltern.** Es hängt am Standort (*wo* gearbeitet wird)
**und** am Kunden (*wer bestellt und schuldet*). Aus dem Gespräch vom 21.08.
auf die Frage, ob ein Auftrag immer dem Eigentümer der Liegenschaft gehört:

> Das ist unterschiedlich und beides ist möglich

Dieselbe Liegenschaft kann einen Auftrag mit der Verwaltung und einen mit dem
Eigentümer tragen. Für die gewünschte **Auswertung je Standort** ist das der
entscheidende Punkt: Die Standortauswertung zählt über den Standort, die
Kundenauswertung über den Kunden, und beide Summen können auseinanderfallen,
ohne dass eine falsch ist. Die Masken müssen das sagen, sonst wird es als
Fehler gemeldet.

---

## 4. Der Weg in Variante A (mit Standorten)

| Schritt | Maske | Was passiert |
|---|---|---|
| 1 | **Adressen** → + Neue Adresse | Firma erfassen, Häkchen „ist Kunde". Ein Architekt bekommt das Häkchen nicht. |
| 2 | Adresse → Reiter **Standorte** | Die Adresse hat schon eine Standardadresse (aus dem Kundenstamm). Weitere Liegenschaften kommen hier dazu — sieben Felder, sonst nichts. |
| 3 | Adresse → Reiter **Projekte** → + Neues Projekt | **Standort wählen** (vorgeschlagen: die Standardadresse). Anfahrt und Zugang werden vom letzten Projekt an diesem Standort vorgetragen, sonst leer. |
| 4 | Projektmaske | Projektleitung, Team, **zusätzliche Adressen mit Rolle**, Kostenstelle, Notizen. Einmal je Projekt. |
| 5 | **Disposition** | Rapporte planen: Tag, Zeitfenster, Mitarbeitende. Grundlage ist das Projekt, geplant wird der Rapport. |
| 6 | **Rapport** (Handy oder Bildschirm) | Der Ausführende sieht alles, was er braucht, stempelt Zeiten, erfasst Material und Spesen, schliesst ab. |
| 7 | **Ausdruck / PDF** | Derselbe Inhalt auf Papier, zum Unterschreiben. |
| 8 | **Auswertungen** | zusätzlich: je Standort. |

## 5. Der Weg in Variante B (ohne Standorte)

Identisch — mit **einem** Unterschied: **Schritt 2 und die Standortwahl in
Schritt 3 fallen weg.** Die Anwendung setzt die stille Adresse aus dem
Kundenstamm ein.

| Was | Variante A | Variante B |
|---|---|---|
| Reiter „Standorte" beim Kunden | sichtbar | **weg** |
| Feld „Einsatzort" im Projekt | Auswahl | **weg**, wird gesetzt |
| Adresse auf dem Rapport | die des Standorts | die des Kunden (= dieselbe Zeile) |
| Anfahrt, Zugang, zusätzliche Adressen | am Projekt | **am Projekt, gleich** |
| Auswertung je Standort | ja | entfällt (es gibt nur eine je Kunde) |
| Datenbank | Standort vorhanden | **Standort vorhanden, identisch** |

Umschalten ist deshalb gefahrlos und in beide Richtungen möglich. Wer
ausschaltet, verliert die Sicht auf zusätzliche Adressen, nicht die Daten.

---

## 6. Der Rapport ist der Prüfstein

> Eigentlich benötigen Sie lediglich den Rapport mit allen Informationen sowohl
> in der Handy-Ansicht oder auf Papier gedruckt.

Damit ist der Rapport das Abnahmekriterium für die ganze Etappe. Er muss
tragen:

| Angabe | heute | fehlt |
|---|---|---|
| Absender, Logo | ✔ | |
| Anschrift des Kunden (Rechnungsziel) | ✔ | |
| **Einsatzadresse** | ✔ (seit 22.08.) | |
| **Zugang** | ✔ (seit 22.08.) | zieht mit ans Projekt |
| Projekt, ausführende Person | ✔ | |
| Positionen, Total, Unterschrift | ✔ | |
| **Ansprechperson beim Kunden mit Nummer** | | ✗ |
| **zusätzliche Adressen mit Rolle und Nummer** | | ✗ |
| Bemerkung | ✔ | |

Die Menschen fehlen — und die braucht Hans Chefmaler, wenn niemand aufmacht.

### Die Handy-Ansicht des Rapports

Ausdrücklich gewünscht am 22.08.: Auf dem Handy muss der Rapport **fertig
gemacht** werden können. Das heisst:

- **Alles sehen**, was oben steht — inklusive der Nummern und der Adresse.
- **Zeiten stempeln** (Timer starten und stoppen), Material und Spesen erfassen.
- **Anrufen** mit einem Tipp auf die Nummer (`tel:`) — gibt es schon.
- **Navigation** starten (Google Maps / Apple Karten) — gibt es schon, zeigt
  aber noch auf die Kundenadresse statt auf den Einsatzort.
- **Abschliessen und unterschreiben lassen.**

Aus der Masken-Leitlinie, Abschnitt 6: Auf dem Handy wird aus dem
Nebeneinander ein **Nacheinander**, Berührungsflächen mindestens 44 px, und die
wichtigste Aktion (Timer, anrufen, navigieren) gehört nach unten in
Daumenreichweite. Dort ist Scrollen richtig.

---

## 7. Bezeichnungen

**Entschieden am 22.08.2026:**

| bisher | neu | warum |
|---|---|---|
| Register „Kunden" | **„Adressen"** | Die Liste hält auch Architekten und Ämter. Über die Bezeichnungen (0073) kann jeder Betrieb sein eigenes Wort setzen. |
| Feld „Kunde" am Projekt | **bleibt „Kunde"** | Dort ist es der Vertragspartner, und die Auswahl zeigt nur `ist_kunde`. |
| — | Filter in der Liste: **Alle · nur Kunden · nur Adressen** | |
| Route `/kunden` | **bleibt** | URLs zu ändern kostet nur kaputte Lesezeichen. Steht schon so in der Hilfe zu den Bezeichnungen. |

### Aus Dienstleistungen werden Artikel

**Entschieden am 22.08.2026:**

> Dann nennen wir statt Dienstleistungen Artikel und statt
> Dienstleistungsklassen Artikelklassen, so wie das im ERP-Bereich üblich ist.
> Ein Artikel kann sowohl eine Dienstleistung wie auch ein Material sein.

Der Anlass: Die Klasse gruppiert **alles**, was in einer Rapportposition stehen
kann — Arbeit, Material, Spesen, Anfahrt. „Dienstleistungsklasse" war für eine
Dose Farbe schon immer der falsche Titel.

| bisher | neu |
|---|---|
| Dienstleistungen | **Artikel** |
| Dienstleistungsklassen | **Artikelklassen** |
| Dienstleistungskatalog | **Artikelstamm** |

Bemerkenswert daran: Diese Lösung **folgt der bestehenden Regel**, während mein
Vorschlag („Klassen") sie umgehen wollte. Aus der Masken-Leitlinie, Abschnitt 7:
Zusammengesetzte Wörter bleiben fest, weil sich das Fugen-s nicht ableiten
lässt. „Artikelklassen" ist genau so ein festes zusammengesetztes Wort — es
bleibt stehen, auch wenn ein Betrieb den Artikel „Leistung" nennt.

**Umfang, gemessen:** 87 Dateien und 505 Zeilen erwähnen „dienstleistung". Die
sichtbaren Beschriftungen kommen aber schon aus den Bezeichnungen (0073), das
Wort steht also meist nur im Code. Im Comatic-Export kommt es **nicht** vor —
es gibt keine externe Zusage, die bricht.

**Empfehlung zum Umfang:** Beschriftungen und Vorgaben umstellen, **Tabellen-
und Spaltennamen behalten**. `dienstleistungen` ist ein veralteter, aber kein
irreführender Name — anders als `beteiligte`/`rapport_beteiligte`, wo zwei fast
gleiche Namen Verschiedenes bedeuten. Umbenennen kostet 505 Zeilen Risiko für
null Nutzen an der Oberfläche. Im Typ und in der Hilfe steht dafür ein Satz,
der die Zuordnung festhält.

Konkret in der Migration: die **Vorgabe** des Begriffs `dienstleistung` wird
„Artikel/Artikel" (Einzahl und Mehrzahl sind gleich, Genus m), die drei
Branchenvorlagen ziehen mit, und die bestehenden Zeilen unserer beiden
Mandanten werden mitgeändert. Ein Kundenmandant, der bewusst ein eigenes Wort
gesetzt hat, behält es — dafür gibt es die Bezeichnungen.

**Zwei Tabellen mit fast gleichem Namen für Verschiedenes** — umzubenennen,
solange fast keine Daten darin stehen:

| heute | neu | Inhalt |
|---|---|---|
| `rapport_beteiligte` | **`rapport_mitarbeiter`** | die *Mitarbeitenden* an einem Teamrapport — passt zum bestehenden `projekt_mitarbeiter` |
| `beteiligte` | **`projekt_adressen`** | die *zusätzlichen Adressen* mit Rolle am Projekt |
| `beteiligten_rollen` | **`adress_rollen`** | Eigentümer, Verwaltung, Architekt, Behörde … |

---

## 8a. Was der Betrieb einstellen kann — und was er einstellen MUSS

### Der Vortrag ist eine Einstellung

Nicht jeder Betrieb will dasselbe übernehmen. Unter **Einstellungen → Projekt**
steht deshalb, was beim Anlegen eines neuen Projekts am selben Standort
mitkommt:

| Angabe | Vorschlag | |
|---|---|---|
| Anfahrt km | **ein** | Wert (Kopie) |
| Zugang | **ein** | Wert (Kopie) |
| zusätzliche Adressen mit Rolle | **ein** | Verknüpfung — kostet nichts |
| Projektleitung | aus | |
| Projektteam | aus | |
| Kostenstelle | aus | oft je Vorhaben verschieden |
| Notizen | aus | die Notiz von damals gilt selten heute |

Die Vorschläge sind Vorgaben für einen neuen Mandanten, keine Vorschriften.

### „Fehlt eine Einstellung, wird nicht erfasst"

Ebenfalls am 22.08. entschieden, als allgemeine Regel:

> Eine Prüfregel, die sicherstellt, dass ein Datensatz nicht erfasst werden
> kann, wenn in den Einstellungen etwas nicht festgelegt wurde. Natürlich mit
> einer sprechenden Fehlermeldung.

So wird sie angewendet:

1. **Sie greift dort, wo die fehlende Einstellung den Datensatz falsch oder
   unvollständig machen würde** — eine fehlende Rolle, eine fehlende
   Kontaktart, ein fehlender MWSt-Code, eine fehlende Einheit.
2. **Sie greift nicht, wo es eine vernünftige Vorgabe gibt.** Sonst kann ein
   neuer Mandant am ersten Tag nichts erfassen. Wo eine Vorgabe einspringt,
   steht sie in der Hilfe — still darf sie nicht bleiben.
3. **Die Meldung nennt die Einstellung und den Weg dorthin**: „Es ist keine
   Rolle ‚Eigentümer' angelegt — Einstellungen → Rollen." Nicht „violates
   foreign key constraint".
4. **Geprüft wird dort, wo die Regel lebt:** in der Datenbank, wenn sie für
   jeden Erfassungsweg gelten muss (so macht es der Trigger aus 0076, der laut
   scheitert, wenn die Rolle „Kunde" fehlt); in der Server Action, wenn es eine
   Frage des Formulars ist. Die Übersetzung von Bedingungsnamen in deutsche
   Sätze macht `src/lib/db-fehler.ts` — das Gerüst steht.
5. **Empfehlung dazu:** eine Liste **„Was noch fehlt"** in den Einstellungen.
   Eine Regel, die erst beim Speichern zuschlägt, ist richtig, aber unfreundlich
   — besser, man sieht es vorher. Diese Liste ist die einzige Ergänzung, die
   ich hier von mir aus vorschlage.

## 8. Was die Entscheidung am Schema vereinfacht

### Der Standort bekommt seinen Kunden zurück

In 0076 hat `standorte` **bewusst kein** `kunde_id` bekommen. Die Begründung
war: Dieselbe Liegenschaft kann der Verwaltung X und dem Eigentümer Y gehören,
also ist die Zugehörigkeit eine Beteiligtenzeile mit der Rolle „Kunde".

**Diese Begründung ist mit der Entscheidung vom 22.08. weggefallen.** Wenn die
zusätzlichen Adressen am Projekt hängen, hat ein Standort zu jedem Zeitpunkt
**genau einen** Kunden — den, der ihn betreuen lässt. Also:

- `standorte.kunde_id` **not null**, `on delete restrict`.
- Der **Verkauf an einen anderen Kunden der Organisation** ist ein Wechsel
  dieser einen Spalte. Die Historie zieht mit, weil Projekte und Rapporte am
  Standort hängen.
- **Wer, wann und von wem auf wen** hält das Änderungsprotokoll fest — das
  gibt es seit 0053 und es deckt `standorte` seit 0076 ab. Kein eigenes
  Datumsfeld nötig.
- Damit fällt die Rolle „Kunde" aus den Rollen, die ganze Abfrage über die
  Beteiligtenzeile fällt weg, und `projekt_adressen` ist eine reine
  Projekttabelle. Es bleiben **acht Rollen**: Eigentümer, Verwaltung, Mieter,
  Hauswart, Architekt, Bauleitung, Subunternehmer, Behörde. Elektriker und
  Sanitär brauchen keine eigene Rolle — entschieden am 22.08.: „Subunternehmer
  genügt."

Das ist die zweite Korrektur an `plan-parteien-standorte.md`, und sie macht das
Modell einfacher als es heute ist.

**Eine Frage dazu, die ich nicht selbst entscheiden will:** Nach dem Verkauf
sieht der neue Kunde über den Standort auch die Projekte, die dem *alten*
Eigentümer verrechnet wurden — die Historie zieht ja mit. Die Rechnungen selbst
bleiben beim alten Kunden (`projekte.kunde_id` wird **nicht** umgeschrieben,
sonst wäre die Vergangenheit gefälscht). Ich halte das für richtig und
nützlich: Der Maler will wissen, was 2019 an diesem Haus gemacht wurde und mit
welcher Farbe, unabhängig davon, wer damals zahlte. **Bitte bestätigen.**

### Was wegfällt

| | |
|---|---|
| `standorte.zugang` | wandert ans Projekt |
| `standorte.anreise_km` | wandert ans Projekt |
| `standorte.notiz` | ersatzlos (`projekte.notizen` gibt es schon) |
| `ansprechpersonen.standort_id` | ersatzlos — der Hauswart ist eine zusätzliche Adresse am Projekt |
| `kunden.anreise_km` | wandert ans Projekt |
| Block „Beteiligte an diesem Standort" | wandert in die Projektmaske |
| Dokumentbereich `standort` | bleibt: der Grundriss gehört zur Adresse, nicht zum Vorhaben |

Nebenbei erledigt sich damit der Fehler vom 22.08.: Die Spalte heisst `notiz`,
der Code schreibt und liest `notizen` — daher scheiterte das Speichern und
daher stand „0 Standorte" (dieselbe Abfrage, dieselbe falsche Spalte). **Ein**
Tippfehler, zwei Symptome.

---

## 9. Migrationen

Eine Reihenfolge, kein Zwischenzustand: Zugang an zwei Orten wäre die
schlechteste aller Varianten.

| Nr | Inhalt |
|---|---|
| **0078** | `standorte.kunde_id` (aus der Beteiligtenzeile befüllt, dann not null) · Rolle „Kunde" entfernen · `standorte.zugang`, `anreise_km`, `notiz` löschen · `ansprechpersonen.standort_id` löschen |
| **0079** | `projekte.anreise_km`, `projekte.zugang` · Werte aus `kunden.anreise_km` je Projekt nachziehen · `kunden.anreise_km` löschen · `rapporte.kunde_id` löschen (steht seit 0071 aus) |
| **0080** | Umbenennungen: `beteiligte` → `projekt_adressen` (nur noch `projekt_id`), `beteiligten_rollen` → `adress_rollen`, `rapport_beteiligte` → `rapport_mitarbeiter` · Bezug der Rollenzeilen von Standort auf Projekt umstellen |
| **0081** | Begriffe: `adresse` neu, Vorgabe für `dienstleistung` auf „Artikel" · Branchenvorlagen und die Zeilen unserer Mandanten mitziehen · Einstellungsfelder für den Vortrag an `organisationen` |

Für jede berührte Tabelle gilt die Zehn-Punkte-Prüfliste aus
`plan-parteien-standorte.md`, Abschnitt 11 (organisation_id, RLS,
Änderungsprotokoll, Export, Löschung, Indizes, `on delete`-Verhalten).

**Nach jeder Migration:** `node --env-file=.env.local scripts/standorte-pruefen.mjs`
— das Skript prüft, was kein Fremdschlüssel erzwingen kann, und ist gegen
einen Stand mit echten Fehlern geprüft.

---

## 10. Etappen

| | Inhalt | Ergebnis |
|---|---|---|
| **1** | 0078/0079, Standortmaske auf die sieben Adressfelder zurückbauen | Der Standort ist eine Adresse, nichts weiter |
| **2** | Projektmaske neu nach `masken-leitlinie.md`: Einsatzort, Anfahrt, Zugang, zusätzliche Adressen mit Rolle, Team · dazu die Vortrags-Einstellungen und die Regel „fehlt eine Einstellung, wird nicht erfasst" (Abschnitt 8a) | Alles Betriebswissen an einer Stelle, in A und B gleich |
| **3** | Rapport-Dokument: Ansprechperson und zusätzliche Adressen mit Nummer, Navigation auf den Einsatzort | Hans Chefmaler braucht nur den Rapport |
| **4** | Handy-Ansicht des Rapports (Nacheinander, 44 px, Timer/Anruf/Navigation unten) | Der Rapport lässt sich unterwegs fertig machen |
| **5** | 0080/0081: Umbenennungen, „Adressen" mit Filter | Die Wörter stimmen |
| **6** | Auswertungen: Gruppierung je Artikelklasse, je Projekt, je Standort — mit Menge und CHF | Der Nutzen von Variante A ist sichtbar |

Etappe 1 und 2 gehören zusammen und sollten nicht getrennt ausgeliefert
werden: Zwischen ihnen gibt es den Zugang nirgends.

---

## 11. Entschieden und offen

**Entschieden am 22.08.2026**

Aus Dienstleistungen werden **Artikel**, aus Dienstleistungsklassen
**Artikelklassen** (Tabellennamen bleiben) · Standort trägt nur die Postadresse · Häkchen Standardadresse · Stilllegung über
`aktiv` (Verkauf innerhalb der Organisation ist ein Umzug mit Historie, Verkauf
nach draussen eine Stilllegung) · alles Betriebswissen am Projekt · Vortrag vom
letzten Projekt am selben Standort, **einstellbar je Betrieb** · beim ersten
Projekt bleibt das Feld leer · Zugang mehrzeilig · Register heisst „Adressen",
Feld am Projekt bleibt „Kunde" · acht Rollen, „Subunternehmer genügt" ·
Disposition plant Rapporte (bleibt so) · Rapport ist der Prüfstein, auch auf dem
Handy · Notizen: keine feste Regel, sondern eine Einstellung · „Fehlt eine
Einstellung, wird nicht erfasst" als allgemeine Regel · zwei sprechende
Tabellennamen · Historie nach dem Verkauf bleibt am Standort, `projekte.kunde_id`
wird nicht umgeschrieben · erst Plan, dann eine Migrationsfolge ohne
Zwischenzustand.

**Offen — eine Frage, und zwar aus dem Malergewerbe selbst:**

**Ist eine Artikelklasse immer einheitenrein?** Die Aussage vom 22.08. lautet:

> Innerhalb einer Klasse gibt es nicht unterschiedliche Einheiten. Klasse
> Dienstleistungen sind immer in Std.

Für Arbeit stimmt das ohne Zweifel. Bei **Material** ist der eigene Fall der
Gegenbeweis: Farbe in Liter, Pinsel in Stück, Abdeckvlies in m² — alle drei
sind Material. Summiert die Auswertung dann „60" über eine Klasse, ist die Zahl
bedeutungslos, und niemand sieht es der Zeile an.

Die Datenbank hilft heute nicht: `einheit` steht am Artikel (seit 0022 als
freier Wert gegen die Einheitenliste geprüft), die Klasse hat keine Einheit.
Nichts verhindert also die gemischte Klasse.

Zwei Wege, beide sauber:

- **Klasse ist einheitenrein — und die Anwendung erzwingt es.** Die
  Artikelklasse bekommt ihre Einheit, ein Artikel mit abweichender Einheit wird
  abgelehnt („Die Klasse ‚Material' führt Stück; dieser Artikel hat Liter").
  Dann brauchst du Material-Stück, Material-Liter, Material-m² als eigene
  Klassen — mehr Klassen, aber jede Menge ist summierbar. Das ist die
  Anwendung der Regel aus Abschnitt 8a auf diesen Fall.
- **Klasse darf mischen — die Auswertung gruppiert Klasse × Einheit.** Eine
  Zeile „Material · Liter · 18 · CHF 340", darunter „Material · Stück · 42 ·
  CHF 1'260". Weniger Klassen, mehr Zeilen, und die Rabattregel je Klasse
  bleibt so grob wie heute.

Ich empfehle den **zweiten** Weg: Er passt zur Praxis (Material ist
naturgemäss gemischt), er braucht keine Umstellung des Artikelstamms, und die
Auswertung bleibt in jedem Fall rechenbar. Der erste Weg wäre strenger, aber er
verlangt vom Anwender eine Klassenstruktur nach Einheiten statt nach Sachlogik
— und die Klasse trägt auch die Rabattregel, wo die Sachlogik zählt.

Wenn in deinen Betrieben eine Klasse tatsächlich immer nur eine Einheit hat,
kostet der zweite Weg nichts: Dann steht je Klasse genau eine Zeile, und die
Spalte „Einheit" bestätigt es nur.

**Was die Auswertungen heute schon können** — damit die Etappe 6 nicht grösser
aussieht als sie ist:

| | heute | fehlt |
|---|---|---|
| Filter Zeitraum, Kunde, Projekt, Klasse, Mitarbeitende | ✔ | |
| Gruppierung je **Projekt** mit Stunden, Betrag, Anzahl | ✔ | |
| Summenzeile Stunden und CHF | ✔ | |
| Gruppierung je **Artikelklasse** | | ✗ |
| **Menge** statt nur Stunden (km, Stück, Pauschalen gehen heute unter) | | ✗ |
| Gruppierung je **Standort** | | ✗ |

Die dritte Zeile von unten ist der eigentliche Mangel: Mengenartikel haben
keine Stunden, also zählt die Auswertung ihren Betrag, aber ihre Menge
verschwindet. Genau das, was du mit „jeweils Menge und CHF ausweisen" verlangst.
