# Plan: Parteien, Standorte und Beschriftungen

Stand: 21.08.2026 · **abgenommen** · Etappe 1 geschrieben, Migrationen warten
auf die Ausführung

Grundlage: [datenmodell-parteien-standorte.md](datenmodell-parteien-standorte.md)
(Herleitung, Gespräche, verworfene Varianten) und zwei Gespräche mit
Handwerksbetrieben am 21.08.2026, deren Antworten **in der Aussage identisch**
waren.

Das Diagramm dazu: `ArcoTime-Datenmodell-A3.pdf` in OneDrive unter
`ArcoSoftware/`, erzeugt mit `node scripts/datenmodell-diagramm.mjs`. Wer eine
Spalte ändert, ändert eine Zeile im Skript und lässt es neu laufen — ein
Diagramm, das man nicht nachführen kann, hängt nach der dritten Migration
falsch an der Wand.

---

## 1. Was entschieden ist

1. **Zwischen Kunde und Auftrag kommt eine Ebene: der Standort.** Sie heisst
   je Betrieb anders (Liegenschaft · Filiale · Objekt · Anlage · Standort) und
   ist keine Branchenfrage: Migros Region Basel als Vertragspartner mit
   Leistung in den Filialen ist dieselbe Struktur wie eine
   Liegenschaftsverwaltung mit ihren Liegenschaften.
2. **Der Standort gehört dem Mandanten, nicht dem Kunden.**
   `standorte.organisation_id` ist Pflicht, ein `kunde_id` gibt es nicht.
   Verwaltung und Eigentümer hängen als **Beteiligte mit
   Gültigkeitszeitraum** daran — nur so überlebt die Historie einen Wechsel
   der Verwaltung („Das wäre eine super Option").
3. **Der Vertragspartner hängt am Auftrag, nicht am Standort.**
   `projekte.kunde_id` bleibt Pflicht, `projekte.standort_id` kommt dazu.
   Beides ist Pflicht und beides sagt Verschiedenes: *wer bestellt und
   schuldet* und *wo gearbeitet wird* („Das ist unterschiedlich und beides ist
   möglich").
4. **Beteiligte sind die zweite Achse.** Eigentümer, Verwaltung, Hauswart am
   Standort; Architekt, Bauleitung, Subunternehmer am Auftrag. Sie sind
   **belegfähig** (volle Adresse), weil der Eigentümer für die Steuererklärung
   eine Rechnung an sich verlangt.
5. **Ein Adressbuch je Mandant, Verknüpfung statt Kopie.** Derselbe Architekt
   steht einmal da und hängt an zehn Aufträgen („die gleichen wiederum in
   anderen Projekten auch").
6. **Jedes Dokument bekommt einen Adressaten.** Die Rechnung an den Eigentümer
   ist **dieselbe Rechnung an eine andere Adresse** — eine Zweitausfertigung,
   keine zweite Fakturierung. MWST-seitig damit unproblematisch.
7. **Beschriftungen sind konfigurierbar, die Struktur nicht.** Eine Tabelle
   `begriffe` je Organisation trägt Einzahl und Mehrzahl. Wer keine Standorte
   kennt, sieht die Ebene nie.
8. **Keine Ebene unter dem Standort.** Wohnung und Stockwerk sind eine Notiz
   auf dem Rapport („Notiz auf dem Rapport genügt").

Und was **nicht** dazugehört: Debitoren, Mahnwesen, Rechnungsstellung an
Endkunden, Lager, Angebote (Phase 13, zurückgestellt).

---

## 2. Das Datenmodell

### 2.1 Neue Tabellen

```sql
-- Der Ort, an dem gearbeitet wird. Gehört dem Mandanten, nicht dem Kunden:
-- Wechselt die Verwaltung, bleibt die Liegenschaft mit ihrer Geschichte.
create table standorte (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null default current_organisation_id()
    references organisationen(id),
  bezeichnung text not null,
  strasse text, hausnummer text, adresse_zusatz text,
  plz text, ort text, land text not null default 'CH',
  -- Zieht von kunden hierher: Die Distanz gehört zum Ort, nicht zum
  -- Vertragspartner. Die Begründung in 0050 gilt nur für Betriebe mit
  -- einem Ort je Kunde.
  anreise_km numeric(10,2),
  zugang text,          -- Schlüssel, Code, "Klingel Hauswart"
  notiz text,
  -- Der automatisch erzeugte Standort eines Kunden. Die Oberfläche blendet
  -- die Ebene aus, solange es nur diesen gibt.
  ist_standard boolean not null default false,
  aktiv boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  geaendert_von uuid references profiles(id)
);

-- Personen. Entweder bei einem Geschäftspartner (Sachbearbeiterin der
-- Verwaltung) oder an einem Standort (Hauswart, Mieter) – genau eines von
-- beiden, erzwungen durch den Check.
create table ansprechpersonen (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null default current_organisation_id()
    references organisationen(id),
  kunde_id uuid references kunden(id) on delete cascade,
  standort_id uuid references standorte(id) on delete cascade,
  anrede text, vorname text, name text not null,
  funktion text, notiz text,
  ist_standard boolean not null default false,
  aktiv boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  geaendert_von uuid references profiles(id),
  constraint ansprechpersonen_genau_ein_bezug
    check (num_nonnulls(kunde_id, standort_id) = 1)
);

-- Rolle einer Partei an einem Ort, einem Auftrag oder einem Beleg.
-- Bewusst echte Fremdschlüssel je Bezugsart statt polymorph wie dokumente:
-- dessen fehlender Fremdschlüssel hat am 18.08.2026 fünf verwaiste Zeilen
-- gekostet. So räumt die Datenbank auf.
create table beteiligte (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null default current_organisation_id()
    references organisationen(id),
  rolle_id uuid not null references beteiligten_rollen(id),
  partner_id uuid not null references kunden(id) on delete restrict,
  ansprechperson_id uuid references ansprechpersonen(id) on delete set null,
  standort_id uuid references standorte(id) on delete cascade,
  projekt_id uuid references projekte(id) on delete cascade,
  rapport_id uuid references rapporte(id) on delete cascade,
  -- Der Wechsel von Verwaltung oder Eigentümer soll die Historie überleben.
  gueltig_von date, gueltig_bis date,
  notiz text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint beteiligte_genau_ein_bezug
    check (num_nonnulls(standort_id, projekt_id, rapport_id) = 1)
);

-- Auswahllisten je Betrieb, Muster 0014. Kein Gewerbe hat dieselben Rollen.
create table beteiligten_rollen (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null default current_organisation_id()
    references organisationen(id),
  bezeichnung text not null,
  sortierung int not null default 0,
  aktiv boolean not null default true,
  unique (organisation_id, bezeichnung)
);

-- Kontaktkanäle. Heute hat kunden genau email und telefon; gebraucht werden
-- Direktwahl, Mobil, WhatsApp, beim Dienstleister Teams.
create table kontakt_arten (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null default current_organisation_id()
    references organisationen(id),
  bezeichnung text not null,
  sortierung int not null default 0,
  aktiv boolean not null default true,
  unique (organisation_id, bezeichnung)
);

create table kontakte (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null default current_organisation_id()
    references organisationen(id),
  kunde_id uuid references kunden(id) on delete cascade,
  standort_id uuid references standorte(id) on delete cascade,
  ansprechperson_id uuid references ansprechpersonen(id) on delete cascade,
  art_id uuid not null references kontakt_arten(id),
  wert text not null,
  bemerkung text,
  ist_standard boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint kontakte_genau_ein_bezug
    check (num_nonnulls(kunde_id, standort_id, ansprechperson_id) = 1)
);

-- Beschriftungen. Einzahl UND Mehrzahl, weil sich die Mehrzahl im Deutschen
-- nicht ableiten lässt: Objekt/Objekte, aber Auftrag/Aufträge.
create table begriffe (
  organisation_id uuid not null default current_organisation_id()
    references organisationen(id),
  schluessel text not null,   -- standort, projekt, anfrage, rapport, kunde, …
  einzahl text not null,
  mehrzahl text not null,
  primary key (organisation_id, schluessel)
);
```

### 2.2 Änderungen an Bestehendem

| Tabelle | Änderung | Warum |
|---|---|---|
| `kunden` | `+ ist_kunde boolean not null default true` | Ein Eigentümer ist Geschäftspartner, aber nicht Kunde — er darf nicht in der Kundenliste und nicht in der Auftrags-Auswahl erscheinen |
| `kunden` | `− anreise_km` (nach `standorte`) | Antwort 6 |
| `projekte` | `+ standort_id not null` | Einsatzort |
| `projekte` | `+ verantwortlich_id → ansprechpersonen` (optional) | „pro Auftrag eine verantwortliche Person … als Vorschlag" |
| `rapporte` | `projekt_id` von NULL-fähig auf **not null** | der Rapport hängt am Auftrag |
| `rapporte` | `− kunde_id` | zweite Wahrheit; der Auftrag kennt den Kunden |
| `rapporte` | `+ adressat_partner_id`, `+ adressat_person_id` (optional) | „pro Dokument sagen können, an welche Adresse es geht" |
| `zeiteintraege` | `+ quelle`, `+ idempotenz_schluessel` | Leitplanken für die spätere App |
| `organisationen` | `+ standorte_aktiv boolean not null default false` | die Ebene ein- und ausschalten |
| `dokumente` | Bereich `standort` erlaubt | Fotos und Pläne am Objekt |

### 2.3 Der Standardstandort

Beim Anlegen eines Kunden entsteht **automatisch ein Standort** mit dessen
Name und Adresse, plus ein `beteiligte`-Eintrag mit der Rolle „Kunde". Als
**Trigger**, nicht in der Server Action: Er muss auch beim Import und bei
jedem anderen Schreibweg greifen, und `projekte.standort_id` ist Pflicht — ein
Kunde ohne Standort wäre ein Kunde, für den man keinen Auftrag anlegen kann.

Solange `standorte_aktiv = false` ist, zeigt die Oberfläche das Feld nicht und
setzt den Standardstandort still. Wer die Ebene einschaltet, kann ihn
umbenennen und weitere anlegen — **ohne Datenmigration**, weil die Daten schon
richtig liegen.

### 2.4 Löschverhalten, bewusst gewählt

- `beteiligte.partner_id` → **restrict**: Ein Partner, der irgendwo beteiligt
  ist, lässt sich nicht wegräumen, ohne die Beteiligung zu lösen. Genau das
  verhindert die verwaisten Verweise, die `dokumente` heute hat.
- `beteiligte.standort_id / projekt_id / rapport_id` → **cascade**: Verschwindet
  der Bezug, ist die Rolle sinnlos.
- `ansprechpersonen` → **cascade** vom Besitzer; `beteiligte.ansprechperson_id`
  → **set null**, damit das Löschen einer Person keine Beteiligung sprengt.
- `standorte` werden **nicht** mit dem Kunden gelöscht — sie gehören dem
  Mandanten. Unbenutzte Standorte räumt die Datenpflege (0052) auf.

---

## 3. Beschriftungen: Branchenunabhängigkeit ohne zweites Datenmodell

Ein Helfer `begriff('standort', 'mehrzahl')`, geladen wie die Organisation
einmal je Anfrage. Vorgaben in der Datenbank, überschreibbar je Betrieb.

**Vorlagen bei der Einrichtung** — das ist die Umsetzung des Gedankens „der
Anwender wird beim ersten Einrichten gefragt", nur ohne Strukturvariante:

| Schlüssel | Neutral | Handwerk | IT-Dienstleistung |
|---|---|---|---|
| `standort` | Standort/Standorte | Liegenschaft/Liegenschaften | Standort/Standorte |
| `projekt` | Projekt/Projekte | Auftrag/Aufträge | Projekt/Projekte |
| `kunde` | Kunde/Kunden | Kunde/Kunden | Kunde/Kunden |
| `anfrage` | Anfrage/Anfragen | Anfrage/Anfragen | Ticket/Tickets |
| `rapport` | Rapport/Rapporte | Rapport/Rapporte | Serviceschein/Servicescheine |

**Ehrlich zum Aufwand:** Jede Beschriftung in der Oberfläche muss durch den
Helfer laufen. Das sind viele kleine Änderungen. Vorschlag: Der Helfer kommt
mit den **neuen** Bereichen und wird dort verwendet, wo es auffällt —
Navigation, Seitentitel, Formularbeschriftungen der betroffenen Objekte, PDF.
Kein Rundumschlag durch alle Texte; der Rest folgt, wo er stört.

---

## 4. Migrationen

Die Reihenfolge ist nicht beliebig. **0071 muss vor 0075 kommen**, sonst
vererbt sich die Redundanz des Rapports auf die neue Ebene: `standort` +
`projekt.kunde_id` + `rapport.kunde_id` wären drei Wege zum selben Kunden.

| Nr. | Inhalt | Danach zu prüfen |
|---|---|---|
| **0071** | Rapport an den Auftrag binden: `projekt_id` auf `not null`, `kunde_id` wird NULL-fähig und bleibt bis 0078 stehen; die zwei leeren Rapporte werden gelöscht (freigegeben am 21.08.) | Löschbedingung ist eng gefasst: nur ohne Projekt, ohne Positionen, Status offen. Ein Rapport mit Inhalt lässt 0071 laut scheitern |
| **0072** | Leitplanken: partieller Unique-Index auf laufende Timer, Ausschlussbedingung gegen überlappende Zeiteinträge je Person und Tag, `quelle`, `idempotenz_schluessel`, zusammengesetzte Indizes `(organisation_id, datum)` | heute 0 Überlappungen und 0 laufende Timer — später ist beides eine Datenbereinigung |
| **0073** | `begriffe` + Vorgaben + Vorlagen | Helfer greift, Vorgaben stehen für beide Bestandsmandanten |
| **0074** | `ansprechpersonen`, `kontakt_arten`, `kontakte`, `kunden.ist_kunde` | `email`/`telefon` der 13 Kunden als Kontakte übernehmen, Altspalten **noch** stehen lassen |
| **0075** | `standorte`, Trigger für den Standardstandort, Backfill für 13 Kunden, `projekte.standort_id` befüllen und auf `not null`, `anreise_km` umziehen | 16 Projekte müssen einen Standort haben; `mandanten-pruefen.mjs` läuft durch |
| **0076** | `beteiligte`, `beteiligten_rollen` + Vorgaben, Rolle „Kunde" für die Standardstandorte | jeder Standardstandort hat genau einen Beteiligten mit Rolle „Kunde" |
| **0077** | `adressat_*` am Rapport, Dokumentbereich `standort`, Tabellenliste in 0053 erweitern, `projekte.verantwortlich_id` | Änderungsprotokoll erfasst die neuen Tabellen — sonst ist die Nachvollziehbarkeit still weg |
| **0078** | Aufräumen: `rapporte.kunde_id` und `kunden.anreise_km` fallen | **erst nach dem Deploy** des Codes, der sie nicht mehr liest |

**Warum 0078 getrennt ist:** Migrationen führst du von Hand aus, der Code
deployt bei jedem Push. Eine Spalte, die der laufende Code noch liest, darf
nicht vorher verschwinden. Also: hinzufügen — deployen — entfernen.

Ausserhalb der Datenbank, im selben Paket:

- `gesamtpreisMitModulen()` über die Schlüssel von `MODULPREISE` iterieren
  statt Module namentlich aufzuzählen.
- `BEREICH_ORDNER` (`dokumente-archiv.ts`) und `TABELLE_ZU_BEREICH`
  (`dokumente-pruefen.mjs`) um `standort` ergänzen.
- `statement_timeout` setzen.
- **Sicherheitsdatenblatt** schreiben und in die Doku-Pflege aufnehmen.

**Codeaufwand, gemessen:** 14 Stellen im Code lesen `rapporte` und `kunde_id`,
23 Dateien enthalten `kunde_id` überhaupt. Das ist Fleissarbeit, kein Umbau.

---

## 5. Prüfliste für jede neue Tabelle

Die eigentliche Leitplanke. Wer eine Tabelle anlegt, beantwortet zehn Fragen:

1. **`organisation_id not null` mit Fremdschlüssel auf `organisationen`?**
   Ohne ihn fällt die Tabelle still aus Vollexport (0067), Umfangszählung
   (0064) und Löschung (0063) — die lesen aus dem Katalog.
2. RLS eingeschaltet, Policies für Lesen und Schreiben getrennt gedacht?
3. `created_at`, `updated_at` mit Trigger, `geaendert_von`?
4. In die Tabellenliste des Änderungsprotokolls (0053) aufgenommen?
5. Echte Fremdschlüssel statt polymorpher Verweise — bei mehreren Bezugsarten
   je einer plus `num_nonnulls(...) = 1`?
6. Löschverhalten je Fremdschlüssel **begründet** gewählt
   (cascade · restrict · set null)?
7. Index `(organisation_id, <Sortier- oder Filterspalte>)`, nicht nur auf
   `organisation_id`?
8. Braucht ein Wert einen **Schnappschuss**, weil er in einem Dokument
   erscheint (Preis, Adresse, Bezeichnung)?
9. Wenn Dateien dazugehören: Bereich in `dokumente`, `BEREICH_ORDNER`,
   `TABELLE_ZU_BEREICH`?
10. Wenn eine App darauf schreiben wird: `quelle` und
    `idempotenz_schluessel`?

---

## 6. Etappen

**Etappe 1 — Leitplanken** (0071, 0072 und die Codepunkte) — *geschrieben am
21.08.2026, Migrationen warten auf die Ausführung.* Kein sichtbares
Feature, aber Voraussetzung für alles Weitere. Danach ist der Rapport am
Auftrag, die Timer sind eindeutig, und die Prüfliste steht.

**Etappe 2 — Beschriftungen** (0073). Klein und sofort spürbar: Der Betrieb
nennt die Dinge, wie er sie nennt.

**Etappe 3 — Parteien** (0074). Ansprechpersonen und Kontaktkanäle, sichtbar
am Kunden. Unabhängig nützlich, auch ohne Standorte.

**Etappe 4 — Standorte** (0075, 0076). Die Ebene, der Standardstandort, die
Beteiligten mit Rollen. Ab hier ist die Struktur da, die die Handwerker
beschrieben haben.

**Etappe 5 — Belege und Historie** (0077, 0078). Adressat je Dokument,
Standortseite mit Historie, Aufräumen.

Jede Etappe endet mit `npx tsc --noEmit`, `npm run lint`, `npm run build`,
Release-Eintrag, Hilfeartikel — und bei 0075 zusätzlich mit einem Lauf von
`scripts/mandanten-pruefen.mjs`.

---

## 7. Offene Punkte

**Entschieden am 21.08.2026:**

- Die zwei leeren Rapporte vom 15.08. (Mandant Demo AG, ohne Positionen)
  **werden gelöscht** — erledigt in 0071.
- Der Rollenwechsel **braucht ein Datum** — `gueltig_von`/`gueltig_bis`
  bleiben im Entwurf.
- Die Rechnung an den Eigentümer ist **dieselbe Rechnung an eine andere
  Adresse** (Zweitausfertigung), keine zweite Fakturierung.

**Weiter offen:**
1. **`projekte.kunde_id` heute `on delete cascade`:** Das Löschen eines Kunden
   löscht seine Aufträge. Mit Zeiteinträgen scheitert es (die stehen auf
   `restrict`), aber die Absicht ist unklar. Auf `restrict` umstellen?
2. **Darf ein Auftrag den Vertragspartner nachträglich wechseln?** Preise und
   Rabatte sind je Position eingefroren.
3. **Ist die verantwortliche Person am Auftrag** eine des Kunden oder eine des
   Standorts (Hauswart)? Vermutlich beides — dann muss das Feld jede
   Ansprechperson eines Beteiligten dieses Auftrags oder Standorts zulassen.
4. **Aufbewahrung des Änderungsprotokolls** — mit den neuen Tabellen wächst es
   schneller. Wie lange? Frage an die Rechtstexte.
