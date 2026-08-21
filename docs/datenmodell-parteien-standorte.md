# Datenmodell: Standorte und Beteiligte

Arbeitsstand vom 21.08.2026 · **Entwurf, nichts entschieden, nichts gebaut**

Entstanden aus Gesprächen mit Interessenten (IT-Dienstleistung und Handwerk)
und aus der Frage, ob ArcoTime zwischen Kunde und Projekt eine Ebene fehlt.
Der Nutzer bespricht die Fragen aus Abschnitt 6 am 21.08. mit zwei
Handwerkern; danach wird entschieden.

---

## 1. Wo ArcoTime heute steht

```
kunden 1 ─── n projekte 1 ─── n zeiteinträge
                        └───── n rapporte      (rapporte.projekt_id ist NULL-fähig,
                                                rapporte.kunde_id ist Pflicht)
```

Nachgeprüft am 21.08.2026 gegen Schema und Daten:

- `projekte.kunde_id` Pflicht (`on delete cascade`), `zeiteintraege.projekt_id`
  Pflicht (`on delete restrict`).
- `rapporte.kunde_id` Pflicht, `rapporte.projekt_id` **optional** — der
  Rapport hängt in der Datenbank am Kunden, nicht am Projekt. Dass es sich
  anders anfühlt, liegt an einer Prüfung in `erstelleRapport()`.
  → **Zwei Wege zum Kunden**, nur von der Anwendung zusammengehalten.
  13 Rapporte, 2 davon ohne Projekt (beide leer, vom 15.08., vor der Prüfung).
  28 Rapportpositionen geprüft: keine Abweichung.
- **Keine Adressfelder** an `projekte` oder `rapporte`. Das Rapport-PDF druckt
  die Adresse des Kunden (`rapport-dokument-daten.ts`).
- `kunden.anreise_km` — 0050 begründet das ausdrücklich damit, die Distanz zu
  einem Kunden sei „eine Eigenschaft dieses Kunden und ändert sich nie".
- Keine Ansprechpersonen. `kunden.email`/`telefon` ist eine Firmenadresse,
  `rapporte.unterzeichner_name` ist Freitext.

## 2. Was die Gespräche zeigen

**Der IT-Dienstleister hat dieselbe Struktur wie der Handwerker.** Migros
Region Basel ist Kunde und Vertragspartner mit einer Adresse; gearbeitet wird
in den einzelnen Filialen — eigene Adresse, abweichende Anreise, eigene
Ansprechpersonen. Beim Maler heisst dasselbe Liegenschaft.

Damit ist die Ebene **nicht branchenspezifisch**, und die Unterscheidung
Projekt/Objekt ist zu einem guten Teil eine Frage der Beschriftung
(Standort · Filiale · Liegenschaft · Objekt · Anlage).

**Neu und schwerer: es gibt mehr Parteien als Kunde und Ansprechperson.**

- Die Liegenschaftsverwaltung ist Kunde, die Liegenschaft gehört einem
  **Eigentümer**. Organisatorisches wird mit ihm geklärt, und **gewisse Belege
  müssen an ihn adressiert** werden.
- Dieselbe Verwaltung arbeitet für verschiedene Eigentümer mit demselben
  Maler — er muss auseinanderhalten, welche Liegenschaft wem gehört.
- Bei grösseren Vorhaben kommen **Architekt, Bauleitung, Subunternehmer**
  dazu.
- Beim Dienstleister gibt es dasselbe Muster (Generalunternehmer,
  Systemlieferant, Hausdienst).

Das ist eine **zweite Achse**, nicht eine weitere Stufe: Die Kette
Kunde → Standort → Projekt beschreibt *wo* gearbeitet wird; die Beteiligten
beschreiben *wer mitredet* und *wer welchen Beleg bekommt*.

## 3. Entwurf

```
kunden ─────────────────── 1:n ── standorte ── 1:n ── ansprechpersonen
 (Geschäftspartner,                 │
  Rolle „Kunde")                    └── 1:n ── projekte ── 1:n ── rapporte
                                                        └── 1:n ── zeiteinträge

beteiligte  (rolle + Verweis)
   an standorte  →  Eigentümer, Verwaltung, Hauswart
   an projekte   →  Architekt, Bauleitung, Subunternehmer
   an Belegen    →  abweichender Adressat
```

**Kern des Vorschlags: die Standortebene ist immer da, sichtbar ist sie nur,
wer sie braucht.**

- `projekte.standort_id` **NOT NULL**, `projekte.kunde_id` **entfällt**
  (abgeleitet über den Standort). Ein Weg zum Besitzer, schemagarantiert.
- Beim Anlegen eines Kunden entsteht automatisch ein **Standardstandort** mit
  Name und Adresse des Kunden. Das Projektformular zeigt das Feld nicht.
  Wer keine Standorte kennt, sieht `Kunde → Projekt` wie heute — kein Klick
  mehr, keine Erklärung.
- Wer sie braucht, schaltet die Ebene in den Einstellungen ein: Feld
  erscheint, Standardstandort umbenennbar, weitere anlegbar. **Ohne
  Datenmigration**, weil die Daten schon richtig liegen.
- `ansprechpersonen.standort_id` **NOT NULL** — der Standardstandort trägt die
  Kontakte der Zentrale. Wieder ein Weg: Person → Standort → Kunde. Keine
  Redundanz, kein nullable Mittelglied.
- **Warum die mittlere Ebene die implizite ist:** Am Projekt hängen
  `naechste_belegnummer` (0005), `kostenstelle`, `belege_exporte.projekt_id`
  und die Mitarbeiterzuweisung bei eingeschränkter Sichtbarkeit; und
  `zeiteintraege.projekt_id` ist Pflicht. Das Projekt kann nicht verschwinden,
  der Standort kann implizit sein.

**Was an den Standort gehört:** Adresse, `anreise_km` (heute am Kunden),
Zugang/Schlüssel/Hauswart, Notiz — und damit die Einsatzadresse auf dem
Rapport und die Historie über Jahre und Aufträge hinweg.

**Beschriftungen** kommen in eine kleine Tabelle `begriffe` je Organisation
(Schlüssel, Einzahl, Mehrzahl — die Mehrzahl lässt sich im Deutschen nicht
ableiten: Objekt/Objekte, aber Auftrag/Aufträge). Gleiches Muster wie die
konfigurierbaren Auswahllisten (0014). Gilt nicht nur hier: Der
IT-Dienstleister sagt Ticket statt Anfrage, mancher sagt Serviceschein statt
Rapport.

## 4. Wie die Beteiligten gebaut werden — und was das mit `kunden` macht

Ein Eigentümer braucht genau die Felder, die ein Kunde hat: Adresse, Anrede,
Sprache, später eine UID. Eine zweite Firmentabelle wäre die schlechtere
Verdoppelung. Vorschlag: **`kunden` ist schon heute eine
Geschäftspartner-Tabelle** (Anrede, Vorname, Name = „Nachname oder
Firmenname", Adresse, Währung, Zahlungskondition, `adress_schluessel` für den
Export) — sie bekommt Rollenkennzeichen, und die Listen filtern darauf. Der
Tabellenname bleibt; ihn zu ändern wäre kosmetisch und teuer (die
Umbenennung `mandate → projekte` in 0008 zeigt den Umfang).

**Personen bleiben eine eigene Tabelle.** Nicht wegen RLS — eine
selbstbezügliche Hierarchie mit `organisation_id` an jeder Zeile bräuchte
keinen rekursiven Policy-Ausdruck; mein Einwand vom 18.08. war da zu breit.
Der belastbare Grund ist die Integrität: Auf `kunden` zeigen heute
`projekte`, `rapporte`, `anfragen`, `kundenpreise`, `kundenrabatte` und mehr.
Lägen Personen in derselben Tabelle, könnte jeder dieser Fremdschlüssel
versehentlich auf eine Person zeigen, und **kein Check kann ausdrücken
„dieser Fremdschlüssel muss auf eine Zeile mit Rolle X zeigen"**. Zwei
Tabellen können das, weil der Fremdschlüssel selbst die Aussage trifft.

## 5. Die Gabelung, die alles entscheidet

**Gehört ein Standort einem Kunden — oder ist er eine eigene Sache, an der
Parteien mit Rollen hängen?**

- **A: Standort gehört dem Kunden** (`standorte.kunde_id NOT NULL`). Einfach,
  ein Weg, passt zu Migros/Filiale. Aber: Wechselt eine Liegenschaft die
  Verwaltung, entsteht ein zweiter Standort — und die Historie zerfällt.
- **B: Standort ist eigenständig**, Verwaltung und Eigentümer sind Rollen mit
  Gültigkeitszeitraum. Die Historie hält über Verwaltungswechsel hinweg. Aber:
  Der Besitzerpfad zur Organisation läuft dann nicht mehr über den Kunden,
  jede Liste braucht die Frage „welcher Standort gehört gerade zu wem", und
  Export und Löschung müssen anders gedacht werden.

Beides ist verteidigbar. Die Antwort hängt daran, wie oft ein
Verwaltungswechsel real vorkommt und ob die Historie ihn überleben muss —
deshalb Frage 5 unten.

## 6. Fragen für die Gespräche mit den Handwerkern

**Zur Struktur**

1. Führst du pro Liegenschaft **mehrere Aufträge** getrennt, oder ist die
   Liegenschaft der Auftrag? (Entscheidet, ob die Projektebene für ihn
   sichtbar sein muss.)
2. Wer ist dein **Vertragspartner** — die Verwaltung oder der Eigentümer?
   Und wer bekommt die **Rechnung**: immer derselbe, oder je Auftrag
   verschieden?
3. Muss ein Beleg an den Eigentümer **adressiert** werden können, oder
   brauchst du ihn nur als Information? (Entscheidet, ob Beteiligte
   belegfähig sein müssen — mit Adresse, Anrede, allem.)
4. Wie viele Beteiligte sind bei einem grösseren Vorhaben real im Spiel, und
   willst du deren Kontaktdaten **in ArcoTime** pflegen — oder stehen die
   ohnehin im Bauleitungsprotokoll?
5. **Wechselt eine Liegenschaft die Verwaltung oder den Eigentümer?** Wenn ja:
   Willst du die Historie der Liegenschaft danach weiter sehen? (Das ist die
   Gabelung aus Abschnitt 5.)

**Zum Alltag**

6. Gehören die **Anfahrtskilometer** zur Liegenschaft oder zum Kunden? Oder
   verrechnest du eine Pauschale je Auftrag?
7. Wer **unterschreibt** den Rapport vor Ort — Hauswart, Mieter, Verwaltung?
   Willst du diese Personen im System pflegen, oder wird der Name jedes Mal
   getippt?
8. Was suchst du in der **Historie** einer Liegenschaft: erbrachte Leistungen,
   verwendetes Material (Farbtöne!), Fotos, oder die Belege?
9. Adressiert du Post je nach Anlass an verschiedene Personen desselben
   Kunden? (Angebot an die Verwaltung, Rapport an den Hauswart, Rechnung an
   den Eigentümer?)

**Zur Abgrenzung**

10. Gibt es beim Mieter noch eine Ebene (Wohnung, Stockwerk), oder genügt die
    Liegenschaft mit einer Notiz auf dem Rapport?

## 7. Fremde Adressen, die überall vorkommen

Aus der Praxis des Nutzers, und in den meisten Lösungen ungelöst: In den
Projekten tauchen ständig **fremde Adressen** auf — Architekt, Bauleitung, der
Elektriker, mit dem sich der IT-Dienstleister wegen der Netzwerkverkabelung
koordinieren muss, Behörden, Ämter. Dieselben Adressen kommen bei vielen
Kunden und Projekten wieder vor: Ein Architekt arbeitet für viele Verwaltungen
und Eigentümer.

Üblicherweise wird er dann zehnmal vollständig erfasst. Bei einem Umzug oder
einer neuen Mailadresse ist das nicht mehr zu pflegen — und niemand weiss,
welche der zehn Kopien die richtige ist.

### Die Ursache: er ist im falschen Ordner abgelegt

Der Architekt ist **keine Adresse eines Kunden**. Er ist ein Geschäftspartner
**des Anwenders** (des Mandanten), der in vielen Projekten in der Rolle
„Architekt" auftritt. Wer ihn unter dem Kunden ablegt, muss ihn zwangsläufig
kopieren, sobald derselbe Architekt beim nächsten Kunden auftaucht.

### Der Ansatz: ein Adressbuch je Mandant, Rollen als Verknüpfung

- **Der Partner existiert genau einmal** je Organisation. `kunden` ist dafür
  schon heute die richtige Tabelle — sie ist eine Geschäftspartner-Tabelle mit
  `organisation_id`, Rollenkennzeichen entscheiden, wo er in Listen erscheint.
- **`beteiligte` verknüpft, kopiert nicht:** Rolle plus Verweis auf den
  Partner (und optional auf eine Ansprechperson dieses Partners). Eine
  Adressänderung ist ein Feld an einer Stelle, und alle zehn Projekte sind
  aktuell.
- **Die Rolle steht an der Verknüpfung, nicht am Partner.** Derselbe Architekt
  kann im Projekt A Architekt sein und gleichzeitig Kunde, wenn er sein
  eigenes Büro renovieren lässt.
- **Rollen sind eine konfigurierbare Auswahlliste** (Muster 0014, wie
  `anfrage_kanaele`): Architekt, Bauleitung, Eigentümer, Verwaltung, Hauswart,
  Subunternehmer, Fremdunternehmer, Behörde, Systemlieferant. Jedes Gewerbe
  hat eigene, und keines davon gehört in den Code.

### Kein polymorpher Verweis wie bei `dokumente`

`dokumente.bezug_id` trägt keinen Fremdschlüssel — die Rechnung dafür kam am
18.08.2026: fünf Dokumente hängen an Anfragen und Rapporten, die es nicht mehr
gibt. `beteiligte` soll das nicht wiederholen. Vorschlag: **echte, nullable
Fremdschlüssel je Bezugsart** (`standort_id`, `projekt_id`, `rapport_id`, …)
mit `on delete cascade` und einem Check, dass genau einer gesetzt ist:

```sql
check (num_nonnulls(standort_id, projekt_id, rapport_id) = 1)
```

Damit räumt die Datenbank auf, wenn ein Projekt verschwindet, und es entstehen
keine verwaisten Verknüpfungen.

### Der Widerspruch, der dabei zu lösen ist

Eine zentral gepflegte Adresse heisst: Sie **ändert sich rückwirkend**. Ein
Angebot, das der Architekt vor zwei Jahren erhalten hat, darf aber nicht
plötzlich seine neue Adresse zeigen.

Auflösung wie bei Preis und MWST (0003/0021): **Die Verknüpfung ist lebendig,
das Dokument ist eingefroren.** Wer im Projekt nachschaut, sieht die aktuelle
Adresse; jeder versendete Beleg trägt die Adresse, die beim Versand galt — bei
eingefrorenen PDF ergibt sich das von selbst, bei einem Adressat am Beleg
braucht es einen Schnappschuss.

### Wo diese Lösungen in der Praxis scheitern

Nicht am Datenmodell, sondern an der Erfassung. Ein Adressbuch nützt nichts,
wenn der Anwender den Architekten trotzdem neu anlegt, weil Suchen mühsamer
ist als Tippen. Drei Dinge gehören deshalb dazu:

1. **Suchen statt anlegen:** Das Beteiligten-Feld sucht im ganzen Adressbuch
   der Organisation, nicht nur bei diesem Kunden — mit Treffern nach Name,
   Ort, Mail und Telefon.
2. **Duplikat erkennen, bevor es entsteht:** Beim Anlegen prüfen (Name
   normalisiert + PLZ, oder Mail/Telefon gleich) und fragen „Meinst du
   diesen?". Das ist die Stelle, die entscheidet, ob es zehn Kopien gibt.
3. **Zusammenführen, was schon doppelt ist:** Zwei Partner verschmelzen — die
   überlebende Zeile wählen, alle Verknüpfungen umhängen, den Rest
   protokollieren. Das gehört in die **Datenpflege (0052)**, die genau dafür
   gebaut ist: Sie hält die alten Werte, jeder Lauf ist rückholbar. Ein Merge
   ohne „rückgängig" wäre bei 800 Adressen unverantwortlich.

### Kontaktkanäle: Mail, Telefon, WhatsApp, und was als nächstes kommt

Heute hat `kunden` genau `email` und `telefon`. Der Bedarf ist grösser
(Direktwahl, Mobil, WhatsApp, beim Dienstleister Teams). Vorschlag: eine
Kindtabelle `kontakte` (Art, Wert, Bemerkung, `ist_standard`) mit
konfigurierbarer Art-Liste, für **alle Parteien von Anfang an** — Partner,
Standorte, Ansprechpersonen. Die beiden bestehenden Spalten werden in
derselben Migration mitgenommen; bei 13 Kunden ist das eine Handvoll Zeilen,
bei zahlenden Kunden wäre es ein Eingriff im Betrieb.

### Was bewusst nicht kommt: ein Adressbuch über alle Mandanten

Verlockend („den Architekten pflegt einer, alle haben ihn richtig"), aber
falsch: RLS ist die Sicherheitsgrenze zwischen Mandanten, und ein gemeinsamer
Adressbestand würde Kundendaten des einen Betriebs im anderen sichtbar machen.
Die AVV sagt das Gegenteil zu. Dass derselbe Architekt in zehn Mandanten
zehnmal steht, ist deshalb **kein Fehler, sondern die Grenze** — jeder Betrieb
pflegt sein Adressbuch.

### Was der Ansatz nebenbei mitbringt

Steht die Beteiligtenliste am Projekt und am Rapport, hat der Monteur vor Ort
die Nummer des Elektrikers auf dem Gerät, ohne im Büro anzurufen. Kosten:
nahe null, weil die Daten schon da sind.

---

## 8. Was davon unabhängig ist

Das Arbeitspaket **Datenmodell-Leitplanken** hängt an keiner dieser
Entscheidungen und kann vorher laufen:

- Die **Redundanz beim Rapport** auflösen (`rapporte.kunde_id` neben dem Weg
  über das Projekt). Muss ohnehin weg, **bevor** eine Ebene dazukommt — sonst
  vererbt sie sich: `standort.kunde_id` + `projekt.kunde_id` +
  `rapport.kunde_id` wären drei Wege zum selben Kunden.
- Die **Handlisten** abbauen: `gesamtpreisMitModulen()` (zählt Module
  namentlich auf), die Tabellenliste des Änderungsprotokolls (0053),
  `dokumente_bereich_check`, `BEREICH_ORDNER`, `TABELLE_ZU_BEREICH`.
- **Module über Stripe abrechnen** statt von Hand unter `/plattform`.
- Eine Prüfliste festhalten, die jede neue Tabelle beantworten muss (kommt sie
  über den Katalog in Export und Löschung mit? Was passiert beim Löschen des
  Bezugs? Braucht sie einen Schnappschuss?).

Ein Argument für „bald entscheiden": Heute stehen **13 Kunden und 16
Projekte** in zwei internen Mandanten, kein zahlender Kunde. Ein
Standardstandort je Kunde anzulegen und 16 Projekte umzuhängen ist eine
Migration von zwanzig Zeilen. Mit zehn zahlenden Kunden ist es ein Eingriff
im Betrieb.
