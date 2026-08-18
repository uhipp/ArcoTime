# Phase 13: Angebote — Ideensammlung (Phase 1 von 3)

Stand: 18.08.2026 · **noch nichts umgesetzt** · Grundlage ist ein Telefonat
mit einem Interessenten, der ArcoTime kaufen würde, wenn er damit Angebote
schreiben kann.

> Dieses Dokument ist **Phase 1**: zusammentragen, ergänzen, Fragen stellen.
> Es entscheidet nichts. Phase 2 ist das Plandokument mit Datenmodell und
> Etappen, Phase 3 die Umsetzung.
>
> Alles unter **„Offene Fragen"** ist bewusst nicht beantwortet. Angebote
> berühren Preisrecht, MWST und Buchhaltung; geraten wäre schlimmer als
> gefragt.

---

## 1. Was der Interessent gesagt hat

- Er braucht ein Modul, um **Angebote** zu erstellen.
- Das Angebot ist dem Rapport **vorgelagert**.
- Bei Auftragserteilung soll **alles oder ein Teil** des Angebots in den
  Rapport übernommen werden.
- Bei der Anfrage braucht es eine **dritte Option**: nicht direkt in den
  Rapport, sondern ins Angebot.
- Aus Dienstleistungen sollten **Dienstleistungen und Produkte** werden,
  eventuell mit getrennten Masken, weil Produkte mehr Informationen brauchen.
- Mit Produkten kommt eventuell **Lagerführung**: Verfügbarkeit (schon im
  Angebot wichtig), Rückstandsmanagement, Lieferscheine mit Teillieferungen,
  Inventur.
- Bei den Kunden braucht es **Ansprechpersonen** (1 Firma – n Personen);
  Anfragen und Rapporte sollen einer Ansprechperson zugewiesen werden.
- Im Angebot braucht es **Wiedervorlagen**.
- Abgerechnet und lizenziert wie die Disposition: **kostenpflichtiges
  Zusatzmodul**.

---

## 2. Was ArcoTime heute schon hat — die Bausteine, die tragen

Das ist der Grund, warum das Modul realistisch ist: Fast jeder Baustein
existiert und ist im Betrieb erprobt.

| Vorhanden | Wo | Bedeutung fürs Angebot |
|---|---|---|
| Kunden mit Adresse, Währung, Zahlungskondition | `kunden` (0001) | Empfänger des Angebots |
| Kundenpreise, gestaffelt ab Menge | `kundenpreise` (0022) | Preisfindung im Angebot |
| Kundenrabatte je Leistungsklasse | `kundenrabatte` (0022) | Rabattvorschlag im Angebot |
| Leistungen mit Preis, Einheit, MWST-Code, Konto | `dienstleistungen` (0001, 0022) | Angebotspositionen |
| Mengenartikel (`zaehlt_als_arbeitszeit = false`) | 0022 | **Produkte gibt es im Ansatz schon** |
| Freie Einheiten (Stück, km, kg …) | `einheiten` (0023) | Produktmengen |
| MWST- und Preis-Schnappschuss an der Position | 0003, 0021 | Vorbild für den Angebots-Schnappschuss |
| Rapport mit Nummernkreis je Jahr, Status, Unterschrift, Storno | `rapporte` (0026, 0043) | Vorbild für den Angebots-Lebenszyklus |
| Rapportpositionen **sind Zeiteinträge** (`zeiteintraege.rapport_id`) | 0026 | entscheidend für die Übernahme, siehe 5 |
| Vorläufige Positionen: vorbereitete Rapporte zählen nicht | 0036 | genau der Zustand, in dem ein übernommenes Angebot landet |
| Standardpositionen für neue Rapporte | `rapport_standardpositionen` (0051) | Vorbild für Angebotsvorlagen |
| Anfragen mit Kanal, Status, Priorität, Wiedervorlage, Zuweisung | `anfragen` (0013) | Startpunkt des Angebots |
| Anfrage → Rapport / → Zeiteintrag, Dokumentübernahme | 0034 | Muster für Anfrage → Angebot |
| Täglicher Auftrag für Wiedervorlagen | `/api/cron/wiedervorlagen` | Erinnerung an Angebote |
| PDF im eigenen Layout mit Logo und Absender | `rapport-pdf.tsx`, `rechnung-pdf.tsx` | Angebots-PDF |
| Mailversand mit Textteil, eigenem Absender, Anhang | `src/lib/email.ts` | Angebot versenden |
| Dokumentenablage, polymorph je Bereich | `dokumente` (0015, 0034) | Pläne und Fotos am Angebot |
| Änderungsprotokoll je Tabelle | 0053 | Nachvollziehbarkeit |
| Vollexport und Löschung **aus dem Katalog** | 0063, 0064, 0067 | neue Tabellen sind automatisch dabei |
| Zwei kostenpflichtige Module, Freischaltung je Organisation | `modul_disposition`, `modul_zeitkonto` | Muster fürs dritte Modul |

**Was fehlt und wirklich neu ist:** das Angebot selbst mit eigenen
Positionen, die Ansprechpersonen, die Produktfelder — und, falls es dazu
kommt, das Lager.

---

## 3. Das Angebot als Dokument

### 3.1 Lebenszyklus

Vorschlag, gebaut nach dem Muster des Rapports (`offen → signiert |
abgeschlossen → storniert`), aber mit dem Unterschied, dass ein Angebot
**abgelehnt** werden kann und von selbst **verfällt**:

```
Entwurf ──► versendet ──┬─► angenommen ──► (Rapport/Auftrag)
                        ├─► teilweise angenommen
                        ├─► abgelehnt
                        ├─► verfallen  (Gültigkeit abgelaufen)
                        └─► zurückgezogen
```

- **Entwurf**: frei änderbar, keine Nummer (wie beim Rapport, damit ein
  verworfener Entwurf keine Lücke in den Nummernkreis reisst).
- **Versendet**: bekommt Nummer und Datum, ist ab hier **unveränderlich**.
  Ein Angebot, das man nach dem Versand still ändern kann, ist als Grundlage
  für einen Auftrag wertlos.
- Änderung nach dem Versand nur als **neue Fassung** (siehe 3.3).
- **Verfallen** setzt der tägliche Auftrag, nicht ein Mensch — hier ist die
  Automatik ungefährlich, weil sie nichts löscht.

### 3.2 Nummernkreis

Wie beim Rapport: `unique (organisation_id, jahr, nummer)`, Anzeigeform
`2026-0001`. Erst beim Versenden vergeben.

*Frage: eigener Kreis für Angebote oder derselbe wie beim Rapport? Getrennt
ist üblich — bitte bestätigen.*

### 3.3 Fassungen statt Änderungen

Der Kunde ruft an und will „dasselbe, aber ohne die Position C und mit 5 %
Nachlass". Zwei Wege:

- **Revision am selben Angebot**: `2026-0042 V2`, die Vorfassung bleibt
  lesbar erhalten.
- **Neues Angebot mit Verweis** auf das ersetzte.

Vorschlag: Revision am selben Angebot (`fassung int`, `ersetzt_angebot_id`),
weil der Kunde von *einem* Angebot spricht und die Trefferquote-Statistik
sonst jedes Nachfassen als verlorenes Angebot zählt.

### 3.4 Inhalt neben den Positionen

- Anschrift (Kunde + **Ansprechperson**, siehe 8), Referenz/Betreff
- Angebotsdatum, **gültig bis** (Vorschlag: Vorgabe in Tagen je Organisation)
- **Einleitungs- und Schlusstext**, frei überschreibbar, mit Vorgabetext je
  Organisation (Textbausteine)
- Voraussichtliche **Ausführungsfrist / Lieferfrist**
- Zahlungskondition (aus dem Kunden, überschreibbar)
- Hinweis auf AGB / Vorbehalte
- Sachbearbeiter (wer das Angebot verantwortet)
- interne **Notiz**, die nie auf dem PDF erscheint

### 3.5 Versand

Bestehende Infrastruktur: PDF erzeugen, per Mail mit Textteil und eigenem
Absender an die Ansprechperson, Blindkopie an den Sachbearbeiter, Ablage der
PDF im privaten Speicher (wie die Rechnungen in 0062). Versanddatum und
Empfänger werden am Angebot vermerkt — sonst weiss später niemand, welche
Fassung beim Kunden liegt.

*Idee für später, nicht für Etappe A:* Annahme durch den Kunden über einen
signierten Link, mit Unterschrift auf dem Bildschirm — die Mechanik dafür
gibt es schon beim Rapport. Das wäre der erste Baustein eines Kundenportals
und sollte bewusst als eigenes Vorhaben behandelt werden.

---

## 4. Positionen im Angebot

### 4.1 Eigene Tabelle, nicht Zeiteinträge

Rapportpositionen sind Zeiteinträge (0026). Für das Angebot geht das nicht:
Es ist noch **nichts geleistet**, und ein Zeiteintrag behauptet immer, dass
jemand gearbeitet hat. Also `angebot_positionen` als eigene Tabelle.

Damit fällt eine Entscheidung, die 0036 bewusst anders getroffen hat (keine
Zwischentabelle mit Kopierschritt). Der Unterschied: Dort ging es um
dieselbe Sache in zwei Zuständen, hier um zwei verschiedene Sachen — Absicht
gegen Nachweis.

### 4.2 Was eine Position braucht

- Verweis auf Leistung/Produkt **plus Schnappschuss** von Bezeichnung,
  Einheit, Preis, MWST-Satz und Rabatt. Ein Angebot muss in drei Monaten
  noch zeigen, was zugesagt war — auch wenn die Preisliste sich geändert hat.
- Menge, Einheit, Einzelpreis, Rabatt, Zeilensumme
- **Freitextposition** ohne Leistungsbezug (es gibt immer etwas, das in
  keiner Liste steht)
- Reihenfolge (Sortierung, verschiebbar)

### 4.3 Titel, Gruppen, Zwischensummen

Angebote über mehr als eine Seite brauchen Struktur: Titel („1 Elektro", „2
Sanitär") mit Zwischensumme. Vorschlag: eine Positionsart `titel` in
derselben Tabelle, statt einer zweiten Tabelle für Gruppen.

### 4.4 Optionale und Eventualpositionen

Der wichtigste Baustein für die **Teilübernahme**:

- **Normalposition** — Teil des Angebotspreises
- **Optionale Position** — wird ausgewiesen, aber nicht mitgerechnet
  („Wartungsvertrag, auf Wunsch")
- **Alternativposition** — ersetzt eine andere („statt Variante A")

Ohne diese Unterscheidung landet später jede Option im Auftrag oder in
keinem.

### 4.5 Pauschale gegen Aufwand

Entscheidend und heute nicht abgebildet: Ist das Angebot ein **Pauschalpreis**
oder eine **Kostenschätzung nach Aufwand**?

- Pauschale: Was der Monteur an Stunden erfasst, ist **intern** — verrechnet
  wird die Pauschale. Der Rapport darf die Stunden dann nicht in den
  Comatic-Export schieben.
- Nach Aufwand: Die erfassten Stunden werden verrechnet, das Angebot war eine
  Schätzung.

Das ist eine Verrechnungsart am Angebot (und damit am Auftrag), und sie
verändert das Verhalten des Rapports. **Offene Frage 3.**

### 4.6 Kalkulation und Marge

Wenn Produkte einen Einkaufspreis tragen (siehe 9), lässt sich je Position
und je Angebot der **Deckungsbeitrag** zeigen — nur intern, nie auf dem PDF.
Das ist der Punkt, an dem ein Angebotsmodul aufhört, ein Formulargenerator zu
sein. Kostet wenig, wenn der Einkaufspreis sowieso im Produkt steht.

### 4.7 Rundung, Nachlass, Skonto

Gesamtrabatt in Prozent oder Betrag, Rundung auf 5 Rappen, Skontosatz.
**Offene Frage 4** — insbesondere, ob der Gesamtrabatt auf die Positionen
verteilt werden muss (für die Buchhaltung meist ja, als eigene Zeile).

---

## 5. Vom Angebot in den Rapport

Der Kern der Anfrage des Interessenten — und die Stelle mit den meisten
offenen Fragen.

### 5.1 Ein Angebot, mehrere Rapporte

Ein angenommenes Angebot ist ein **Auftrag**, und ein Auftrag kann mehrere
Einsätze bedeuten (drei Tage Montage = drei Rapporte). Die Beziehung ist
also `1 Angebot : n Rapporte`, nicht 1:1.

Vorschlag in der bewährten Richtung von 0034: Der Verweis steht beim
Rapport (`rapporte.angebot_id`), nicht beim Angebot. Eine Quelle der
Wahrheit, Rückrichtung per Abfrage.

### 5.2 Was die Übernahme tut

Ausgewählte Positionen werden zu **vorläufigen Positionen** eines neuen oder
bestehenden Rapports — das ist genau der Zustand, den 0036 geschaffen hat:
sichtbar, planbar, aber noch nicht verrechenbar. Der Monteur korrigiert vor
Ort, schliesst ab, und erst dann zählen sie.

Zwei Feinheiten:

- **Produktpositionen** sind keine Arbeitszeit
  (`zaehlt_als_arbeitszeit = false`) und dürfen die Tagesarbeitszeit-Prüfung
  nicht auslösen. Das funktioniert heute schon so.
- Eine Position, die im Angebot **optional** war und nicht bestellt wurde,
  darf nicht mitkommen.

### 5.3 Teilübernahme und was mit dem Rest passiert

Wenn nur ein Teil bestellt wird:

- Status **teilweise angenommen**
- die nicht bestellten Positionen bleiben am Angebot als *nicht bestellt*
  vermerkt (nicht gelöscht — sonst ist die Nachverfolgung weg)
- was übernommen wurde, muss am Angebot **sichtbar** sein, damit dieselbe
  Position nicht zweimal in zwei Rapporte wandert

Vorschlag: `angebot_positionen.bestellt boolean` plus eine Spur, in welchen
Rapport eine Position gewandert ist.

### 5.4 Soll gegen Ist — der eigentliche Mehrwert

Sobald Angebot und Rapporte verknüpft sind, lässt sich zeigen: **kalkuliert
gegen geleistet**, je Auftrag, in Stunden und in Franken. Das ist die Zahl,
für die ein Handwerksbetrieb ein Modul kauft — sie sagt ihm, ob er richtig
kalkuliert. Sie kostet fast nichts, weil beide Seiten schon in der Datenbank
stehen.

Damit verbunden: eine Warnung, wenn die geleisteten Stunden die kalkulierten
überschreiten (bei Pauschalaufträgen der Punkt, an dem Geld verloren geht).

---

## 6. Der Weg von der Anfrage

Heute bietet die Anfrage drei Wege an: *Erledigen mit Zeiteintrag*,
*Erledigen mit Rapport*, *Nur als erledigt markieren*. Neu dazu:
**Angebot erstellen**.

Wichtig — und ein Unterschied zu den bestehenden Wegen: Eine Anfrage, aus
der ein Angebot wird, ist **nicht erledigt**. Sie wartet. Vorschlag:

- `anfragen.angebot_id` (wie `rapport_id` in 0034, `on delete set null`)
- Status bleibt `in_bearbeitung` oder wird `wiedervorlage` mit dem Datum der
  Angebots-Wiedervorlage
- erledigt wird die Anfrage, wenn das Angebot abgelehnt/verfallen ist oder
  der daraus entstandene Rapport abgeschlossen ist

Die Dokumentübernahme (Pläne, Fotos aus der Anfrage) funktioniert wie bei
0034 — das Angebot braucht dafür nur den neuen Dokumentbereich `angebot`.

*Wenn kein Angebotsmodul gebucht ist, erscheint der vierte Knopf nicht* —
wie die Disposition heute in `rapporte/neu`.

---

## 7. Wiedervorlagen und Nachverfolgung

- `wiedervorlage_am` am Angebot, genau wie bei der Anfrage
- der bestehende tägliche Auftrag `/api/cron/wiedervorlagen` bekommt die
  Angebote dazu: „Angebot 2026-0042 an Muster AG, versendet vor 10 Tagen,
  gültig bis 15.09."
- eine **Erinnerung an den Kunden** wäre der nächste Schritt (Textbaustein
  „dürfen wir nachfragen") — bewusst nur auf Knopfdruck, nie automatisch
- Übersichtsliste mit Filter nach Status, Fälligkeit, Sachbearbeiter
- **Trefferquote**: angebotenes Volumen, angenommenes Volumen, Quote je
  Monat und je Sachbearbeiter. Fällt fast von selbst an, sobald die Status
  gepflegt sind.

---

## 8. Ansprechpersonen beim Kunden

Klein, unabhängig nützlich und Voraussetzung für ein sauberes Angebot.

```
kunden 1 ─── n kunden_ansprechpersonen
   (anrede, vorname, name, funktion, email, telefon, mobil,
    notiz, ist_standard, aktiv)
```

Wirkt an mehr Stellen als es zunächst scheint:

- **Angebot**: Anschrift und Mailempfänger
- **Anfrage**: „von wem kam die Anfrage" — heute steht das im Text
- **Rapport**: wer unterschreibt (`rapporte.unterzeichner_name` ist heute
  ein Freitext — künftig wählbar, weiterhin frei überschreibbar, weil vor
  Ort auch jemand anderes unterschreibt)
- **Kontaktdaten** in Listen und auf PDF

Vorschlag zur Abgrenzung: **ins Basispaket**, nicht ins Modul. Ansprech-
personen sind nützlich, auch wenn nie ein Angebot geschrieben wird, und ein
Kundenstamm, der je nach Lizenz anders aussieht, ist schwer zu erklären.

Migration bestehender Daten: `kunden.email`/`telefon` bleiben als Firmen-
adresse bestehen; keine automatische Umwandlung in eine Ansprechperson —
raten wäre hier falsch (**offene Frage 8**).

---

## 9. Dienstleistungen und Produkte

### 9.1 Der Ausgangspunkt ist besser als gedacht

Ein „Produkt" gibt es faktisch schon: eine Leistung mit
`zaehlt_als_arbeitszeit = false` und freier Einheit (Stück, kg, km). Sie
wird verrechnet, zählt nicht als Arbeitszeit, kennt MWST-Code, Konto,
Kundenpreise und Rabattsperre.

Was fehlt, sind **Felder** und eine **getrennte Maske** — nicht ein zweites
Datenmodell.

### 9.2 Was ein Produkt zusätzlich braucht

- Artikelnummer (intern), Lieferanten-Artikelnummer, EAN
- Lieferant, Einkaufspreis, Beschaffungszeit in Tagen
- Beschreibung für das Angebot (länger als eine Bezeichnung), Bild
- Verpackungseinheit / Mindestbestellmenge
- Gewicht, Abmessungen (für Versand — nur wenn es Lieferscheine gibt)
- Nachfolgeartikel / Ersatzartikel
- Lagerort, Mindestbestand *(nur mit Lager, siehe 10)*

### 9.3 Eine Tabelle oder zwei?

**Vorschlag: eine Tabelle, zwei Masken.** `dienstleistungen` bekommt eine
`art` (`leistung` | `produkt`) und die Produktfelder; die Oberfläche zeigt
je Art nur, was passt.

Begründung: Zeiteinträge, Rapportpositionen, Kundenpreise, Kundenrabatte,
Standardpositionen, der Comatic-Export und die Auswertungen verweisen alle
auf `dienstleistungen`. Eine zweite Tabelle bedeutet, dass **jede** dieser
Stellen künftig zwei Fremdschlüssel führen muss („entweder Leistung oder
Produkt") — das ist die Sorte Änderung, die man an einer Stelle vergisst.

Der Preis dafür sind Spalten, die bei Leistungen leer bleiben. Das ist die
billigere Unschönheit.

*Der Name der Tabelle bleibt `dienstleistungen`; ein Umbenennen wäre eine
Migration quer durch die Anwendung ohne fachlichen Gewinn. In der Oberfläche
heisst der Bereich künftig „Leistungen und Produkte".*

---

## 10. Lagerführung — bewusst ein eigenes Vorhaben

Der Interessent hat es selbst als „eventuell" formuliert, und dabei sollte
es für Phase 13 bleiben. Was er aufgezählt hat, ist der Umfang eines
eigenen Produkts:

| Baustein | Was daran hängt |
|---|---|
| Bestand je Artikel | Lagerorte, Zu- und Abgänge, Buchungsjournal |
| Verfügbarkeit im Angebot | reservierte Menge, freie Menge, Zulauf |
| Rückstandsmanagement | offene Bestellungen beim Lieferanten, Termine |
| Lieferscheine, Teillieferungen | eigenes Dokument mit Nummernkreis |
| Inventur | Zähllisten, Differenzen, **Bewertung** (Art. 960 OR) |
| Bewertung | Durchschnitts- oder FIFO-Methode, Abschluss, Treuhänder |

Die letzten beiden Zeilen sind der Grund für die Abgrenzung: Sobald ein
Lagerwert in eine Bilanz einfliesst, sind es Buchhaltungsregeln, und die
werden hier nicht geraten (**offene Fragen 10–12**).

### Der pragmatische Zwischenschritt

Für das Angebot braucht es meist keinen Bestand, sondern eine **Aussage zur
Lieferbarkeit**. Mit zwei Feldern am Produkt — `beschaffungszeit_tage` und
einem Vermerk „ab Lager / auf Bestellung" — steht auf dem Angebot „Lieferzeit
ca. 5 Arbeitstage", und das deckt einen grossen Teil des Bedarfs, ohne eine
Lagerbuchhaltung zu eröffnen.

**Empfehlung: Angebote ohne Lager ausliefern.** Erst wenn zahlende Kunden
das Modul nutzen, entscheidet sich, ob das Lager Phase 14 wird — und dann
mit einem eigenen Plan und einer Frage an den Treuhänder.

---

## 11. Lizenzierung und Abrechnung

### 11.1 Bezugsgrösse

Die beiden bestehenden Module folgen einer Logik (`src/lib/lizenzpreise.ts`):
Nutzen fürs Büro → **Pauschale** (Disposition, CHF 49/490); Nutzen je Person
→ **je Lizenz** (Zeitkonto, CHF 4/40).

Angebote schreibt das Büro, nicht der Monteur. Nach dieser Logik also eine
**Pauschale**. Vorschlag zur Diskussion: **CHF 39/390 pro Monat/Jahr**, etwas
unter der Disposition, weil das Angebotsmodul in Etappe A weniger bewegliche
Teile hat.

Gegenargument, das zu prüfen ist: In einem 20-Mann-Betrieb schreiben
mehrere Personen Angebote, und der Nutzen wächst mit dem Volumen, nicht mit
der Kopfzahl — was wieder für die Pauschale spricht. **Offene Frage 13** ist
also nur die Höhe, nicht die Art.

### 11.2 Was am Lizenzweg nachzuziehen ist

Zwei Dinge, die heute schon Baustellen sind und mit dem dritten Modul
drängender werden:

1. **Module werden nicht über Stripe abgerechnet.** `MODULPREISE` dient der
   Anzeige, die Freischaltung macht Arcos von Hand unter `/plattform`
   (`plattform.ts`: „die Selbstbuchung über Stripe folgt als eigenes
   Paket"). Bei drei Modulen ist das kein Provisorium mehr, sondern eine
   Rechnung, die jemand von Hand stellt. Das gehört gelöst, bevor das dritte
   Modul dazukommt — einmal für alle.
2. **`gesamtpreisMitModulen()` zählt die Module namentlich auf**
   (`{ disposition?, zeitkonto? }`). Ein drittes Modul bedeutet, diese
   Signatur an jeder Aufrufstelle nachzuziehen — dieselbe Handliste, die
   0063/0064 aus guten Gründen abgeschafft haben. Vorschlag: über die
   Schlüssel von `MODULPREISE` iterieren, dann trägt sich ein neues Modul
   selbst ein.

### 11.3 Testphase fürs Modul

Ein Modul, das man 30 Tage ausprobieren kann, verkauft sich anders als eines,
das man buchen muss. Heute gibt es nur die Testphase der ganzen Anwendung.
**Offene Frage 14.**

---

## 12. Was gratis mitkommt — und was nachzuziehen ist

**Kommt von selbst**, weil aus dem Postgres-Katalog gelesen wird: Vollexport
(0067), Umfangszählung (0064) und Löschung (0063) erfassen jede neue Tabelle,
sobald sie einen Fremdschlüssel auf `organisationen` trägt. Die Arbeit vom
18.08. macht sich hier bezahlt.

**Muss von Hand nachgezogen werden** — das sind die Handlisten im Code:

- `0053`: die Tabellenliste für das Änderungsprotokoll
  (`angebote`, `angebot_positionen`, `kunden_ansprechpersonen`)
- `dokumente_bereich_check`: neuer Bereich `angebot`
- `BEREICH_ORDNER` in `src/lib/dokumente-archiv.ts` (Ordner „Angebote" im
  Export-ZIP)
- `TABELLE_ZU_BEREICH` in `scripts/dokumente-pruefen.mjs` (bricht sonst
  bewusst ab — genau wie vorgesehen)
- `gesamtpreisMitModulen()` und die Modul-Schalter unter `/plattform`
- Berechtigungen in `src/lib/berechtigungen.ts` und `docs/berechtigungen.md`
- Navigation und Startseite (`layout.tsx`, `page.tsx`) hinter dem Modulschalter
- Hilfeartikel, Release-Einträge, Word-Dokumentation

---

## 13. Vorschlag für die Etappen (Grundlage für Phase 2)

Die Reihenfolge folgt einer Regel: Jede Etappe muss für sich einen Nutzen
haben, den man einem Kunden zeigen kann.

**Etappe 0 — Ansprechpersonen** *(Basispaket, kein Modul)*
Tabelle, Maske am Kunden, Auswahl in Anfrage und Rapport. Unabhängig
nützlich, kleines Risiko, ebnet den Weg.

**Etappe A — Angebot schreiben und versenden**
Angebot mit Positionen, Titeln, optionalen Positionen, Preis-Schnappschuss,
Lebenszyklus, Nummernkreis, PDF, Mailversand, Dokumente, Wiedervorlage,
Modulschalter. Hier ist das Modul verkaufbar.

**Etappe B — Vom Angebot zum Auftrag**
Teilübernahme in einen oder mehrere Rapporte, dritte Option an der Anfrage,
Nachverfolgung, Trefferquote, Soll-gegen-Ist.

**Etappe C — Produkte**
`art` an den Leistungen, getrennte Maske, Produktfelder, Beschaffungszeit
und Lieferbarkeitsvermerk, Einkaufspreis und Marge im Angebot.

**Etappe D — Feinschliff**
Textbausteine, Angebotsvorlagen, Gesamtrabatt und Rundung, Erinnerung an
den Kunden, Auswertungen.

**Später, eigener Plan:** Lager (Phase 14), Auftragsbestätigung und
Lieferscheine, Annahme durch den Kunden über einen Link.

---

## 14. Offene Fragen

Fachliche Fragen, die nicht geraten werden. Nummeriert, damit wir sie in
Phase 2 abhaken können.

**Angebot**

1. Eigener Nummernkreis für Angebote, getrennt vom Rapport?
2. Standard-Gültigkeitsdauer (30 Tage?), und soll ein abgelaufenes Angebot
   automatisch auf „verfallen" gehen oder nur gemeldet werden?
3. **Pauschale gegen Aufwand:** Braucht der Interessent Pauschalangebote? Und
   wenn ja — was passiert mit den erfassten Stunden im Comatic-Export, wenn
   pauschal verrechnet wird?
4. Gesamtrabatt: als eigene Position auf dem Angebot ausweisen oder auf die
   Positionen verteilen? Rundung auf 5 Rappen? Skonto?
5. MWST im Angebot: Preise exklusive mit Ausweis der MWST, oder wahlweise
   inklusive (B2C)? Was gilt bei Kunden im Ausland (Reverse Charge, wie in
   der Arcos-Rechnung)?
6. Muss ein Angebot **Vorauszahlung oder Teilzahlungen** vorsehen
   (Anzahlung bei Auftragserteilung)?
7. Braucht es zwischen Angebot und Rapport eine **Auftragsbestätigung** als
   eigenes Dokument, oder genügt der Status „angenommen"?

**Ansprechpersonen**

8. Sollen bestehende `kunden.email`/`telefon` bei der Einführung zu einer
   ersten Ansprechperson werden, oder bleiben sie strikt die Firmenadresse?
9. Darf eine Ansprechperson Pflicht sein, wenn ein Angebot versendet wird?

**Produkte und Lager**

10. Braucht der Interessent das Lager **jetzt** oder ist die Aussage zur
    Lieferzeit vorerst genug? (Antwort entscheidet über Phase 14.)
11. Falls Lager: Bewertungsmethode (Durchschnitt, FIFO) — und wer sagt uns,
    was der Treuhänder erwartet?
12. Falls Lieferscheine: eigener Nummernkreis, und wie verhält sich ein
    Lieferschein zum Rapport (beides Nachweise über dieselbe Lieferung)?

**Lizenz**

13. Höhe der Modulpauschale (Vorschlag CHF 39/390)?
14. Eigene Testphase je Modul — und wenn ja, wie lange?
15. Soll das Modul in der Preistabelle auf arcocloud.ch erscheinen, bevor es
    fertig ist („in Vorbereitung")? Das entscheidet, ob der Interessent
    darauf warten kann.

**Zum Interessenten selbst**

16. Welche Branche, wie viele Personen, wie viele Angebote im Monat? Das
    ändert die Gewichtung — ein Elektriker mit fünf Angeboten im Monat
    braucht etwas anderes als ein Handel mit fünfzig.
17. Was schreibt er heute? (Word, Bexio, Excel) Wenn ein Vorgängersystem
    existiert, gehört ein Blick auf ein echtes Angebot dazu, bevor wir das
    Datenmodell festlegen — ein reales Muster ist mehr wert als jede
    Aufzählung hier.

---

## 15. Was nicht dazugehört

Zur Abgrenzung, damit das Modul nicht zum zweiten Produkt wird:

- **Rechnungsstellung an Endkunden.** ArcoTime exportiert nach Comatic; die
  Rechnung schreibt die Buchhaltung. Das Angebot ändert daran nichts.
- **Mahnwesen, Debitoren, Zahlungseingänge.**
- **Einkauf und Bestellwesen** beim Lieferanten (gehört zum Lager, nicht
  zum Angebot).
- **Kalkulationswerkzeuge** (Aufmass, Leistungsverzeichnisse, GAEB) —
  eigene Welt.
- **Kundenportal.** Reizvoll, aber ein eigenes Vorhaben mit eigener
  Sicherheitsbetrachtung.
