# Phase 8: Arbeitsrapport mit Unterschrift

## Ziel

Ein Mitarbeitender fährt zum Kunden, erbringt eine Leistung, verbraucht
Material. Am Ende soll ein **Arbeitsrapport** stehen, den der Kunde vor Ort
unterschreibt und als Kopie erhält:

1. Anreise – x km
2. Arbeitszeit – x Std., mit Beschreibung der Leistung
3. Material – 1..n Positionen, x Stk.

Preise stehen bewusst **nicht** darauf (siehe Abschnitt „PDF und Versand").

Heute lässt sich das nur als mehrere unverbundene Zeiteinträge abbilden.
Es fehlt die Klammer darum: ein Dokument, das den Einsatz als Ganzes zeigt,
unterschrieben werden kann und beim Kunden landet.

## Warum ein Behälter und kein neues Modul

Zwei Varianten standen zur Wahl:

**A – ein Projekt pro Kundenauftrag.** Missbraucht "Projekt" als
Auftragsbehälter. Bei wöchentlichen Einsätzen entstünden pro Kunde dutzende
Projekte, und die Projektliste – heute ein Ordnungsmittel – würde unbrauchbar.
Vor allem löst A das eigentliche Problem nicht: Es entsteht kein Dokument.

**B – der Rapport als eigener Kopfdatensatz.** Gewählt.

Der entscheidende Punkt: Eine Rapport-Position ist nichts anderes als ein
Zeiteintrag. Seit Migration `0022` trägt ein Zeiteintrag wahlweise Stunden
**oder** eine Menge (km, Stück), jeweils mit eigenem Preis-Snapshot,
MWSt-Snapshot und Rabatt. Es braucht deshalb **keine neue Positionstabelle** –
nur einen Kopf und eine Referenz darauf.

Alles Bestehende funktioniert unverändert weiter: Preisermittlung inklusive
Kundenpreisen, Kunden- und Klassenrabatte, Rabattsperre, Export,
Auswertungen, Tagesarbeitszeit-Prüfung.

## Der Rapport ist optional

Nicht jede Arbeit gehört auf einen Rapport: Fernwartung, Büroarbeit, interne
Zeit, eine telefonisch erledigte Anfrage. Ein Zeiteintrag ohne `rapport_id`
bleibt exakt das, was er heute ist.

Das ist eine bewusste Abgrenzung gegen die naheliegende Variante "jede
Zeiterfassung ist ein Rapport": Sie würde die Hälfte aller Einträge zwingen,
ein Kunde-vor-Ort-Dokument zu sein, und einen funktionierenden Ablauf ohne
Not verkomplizieren.

## Datenmodell

```sql
create table rapporte (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null default current_organisation_id() references organisationen(id),
  jahr int,                            -- Teil der Rapportnummer, siehe unten
  nummer int,                          -- laufend je Organisation und Jahr
  kunde_id uuid not null references kunden(id) on delete restrict,
  projekt_id uuid references projekte(id) on delete restrict,
  datum date not null default current_date,
  mitarbeiter_id uuid not null references profiles(id),

  -- offen -> signiert | abgeschlossen -> storniert.
  -- "abgeschlossen" = fertig, aber ohne Unterschrift (Kunde nicht anwesend,
  -- kein Empfang). Beide Endzustände sind gleichermassen unveränderlich.
  status text not null default 'offen'
    check (status in ('offen','signiert','abgeschlossen','storniert')),

  -- Unterschrift als PNG (data-URL) direkt in der Zeile: sie gehört
  -- untrennbar zum Rapport und ist wenige KB gross. Ein Storage-Objekt
  -- daneben könnte verwaisen oder separat gelöscht werden.
  unterschrift_png text,
  unterzeichner_name text,             -- wer beim Kunden unterschrieben hat
  signiert_am timestamptz,

  -- Nur bei Status "abgeschlossen": warum keine Unterschrift vorliegt.
  -- Pflichtfeld in diesem Fall, sonst ist der Rapport später nicht
  -- interpretierbar.
  abschluss_vermerk text,

  versendet_an text,                   -- Mailadresse zum Zeitpunkt des Versands
  versendet_am timestamptz,

  bemerkung text,                      -- freier Text auf dem Rapport
  storniert_am timestamptz,
  storno_grund text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organisation_id, jahr, nummer)
);

alter table zeiteintraege
  add column rapport_id uuid references rapporte(id) on delete set null;

create index idx_zeiteintraege_rapport on zeiteintraege(rapport_id);
```

`on delete set null` bei der Position: Wird ein Rapport gelöscht, bleiben die
erfassten Leistungen bestehen und sind weiterhin verrechenbar. Ein Rapport
ist ein Dokument über Leistungen, nicht ihr Besitzer.

### Rapportnummer

Format **`JJJJ-NNNN`**, also `2026-0001`, je Organisation und **jährlich neu
beginnend** (entschieden 13.08.2026). Die bestehende `naechste_belegnummer`
hängt am Projekt und dient dem Export – sie ist dafür nicht verwendbar.

Weil die Nummer jährlich zurückgesetzt wird, taugt eine Postgres-Sequenz
nicht. Stattdessen eine Funktion, die je Organisation und Jahr hochzählt:

```sql
-- Zähler getrennt halten statt aus rapporte.nummer abzuleiten: Ein
-- "select max(...) + 1" über eine wachsende Tabelle wird langsam und ist
-- bei gleichzeitigen Zugriffen heikel.
create table rapport_nummernkreis (
  organisation_id uuid not null references organisationen(id),
  jahr int not null,
  letzte_nummer int not null default 0,
  primary key (organisation_id, jahr)
);
```

Die Vergabe läuft in einer `security definer`-Funktion mit
`insert ... on conflict do update set letzte_nummer = letzte_nummer + 1
returning letzte_nummer` – atomar, auch wenn zwei Personen gleichzeitig
signieren.

Die Nummer wird **erst beim Abschliessen** vergeben (signiert oder
abgeschlossen), nicht beim Anlegen – ein verworfener Entwurf soll keine
Lücke reissen. Ein Storno behält seine Nummer, damit die Reihe lückenlos
bleibt.

Gespeichert werden Jahr und laufende Nummer getrennt (`jahr int`,
`nummer int`), die Anzeige `2026-0001` entsteht bei der Ausgabe. Sortieren
und Filtern nach Jahr bleibt damit möglich, ohne Text zu zerlegen.

## Unveränderlichkeit nach der Unterschrift

Ein signierter Rapport, der sich nachträglich ändern lässt, macht die
Unterschrift wertlos. Ab Status `signiert` **oder** `abgeschlossen` gilt:

- Kopfdaten und Positionen sind gesperrt (RLS-Policy plus Prüfung in den
  Server Actions, nicht nur in der Oberfläche)
- Positionen lassen sich weder hinzufügen noch entfernen
- Korrekturen laufen über **Storno + Neuerstellung**, mit Verweis auf die
  stornierte Nummer

Das muss von Anfang an im Statusmodell stecken – nachrüsten hiesse, bereits
signierte Dokumente nachträglich anzuzweifeln.

Die zugehörigen Zeiteinträge bleiben davon unberührt bearbeitbar, solange
sie nicht exportiert sind. Ein Widerspruch ist das nicht: Der Rapport
dokumentiert, was der Kunde bestätigt hat; die Fakturierung ist ein
getrennter Vorgang mit eigener Sperre über `beleg_id`.

## Verbindung vor Ort

**Das grösste technische Risiko dieses Vorhabens** – grösser als die
Unterschrift.

ArcoTime ist eine Webanwendung. Im Heizungskeller ohne Empfang ist sie nicht
verfügbar, und genau dort steht der Mitarbeitende mit dem Tablet. Ein
Rapport, der beim Speichern verlorengeht, ist schlimmer als gar keiner.

Drei mögliche Haltungen:

1. **Bewusst akzeptieren.** Der Rapport wird dort erfasst und unterschrieben,
   wo Empfang besteht – bei den meisten Kunden also direkt vor Ort. Im
   Funkloch wird er nachträglich fertiggestellt.
2. **Lokal zwischenspeichern.** Entwurf im Browser halten
   (IndexedDB/localStorage) und beim nächsten Empfang absenden. Machbar,
   aber Konflikte und Teilzustände wollen durchdacht sein.
3. **Vollwertige Offline-Fähigkeit** (Service Worker, Synchronisation).
   Eigenes Vorhaben, nicht Teil dieser Phase.

**Entschieden: Variante 1** (13.08.2026). Variante 2 bleibt als Folgeschritt
offen, sobald der Ablauf im Alltag steht – ohne echte Nutzung lässt sich
nicht beurteilen, wie oft ein Funkloch überhaupt stört.

Wichtige Konsequenz für Etappe 2: Unterschrieben wird auf dem **Gerät des
angemeldeten Mitarbeitenden**, der es dem Kunden hinhält. Es braucht damit
**keine öffentliche Signaturseite** mit Einmal-Token, Ablauffrist und
eigener Absicherung – eine Angriffsfläche, die wir uns sparen. Die Mail an
den Kunden ist die Kopie des fertigen Dokuments, nicht der Signaturweg.

Fällt die Verbindung aus, bleibt der Rapport im Status `offen` und wird
später fertiggestellt. Für diesen Fall braucht es die Antwort auf offene
Frage 3 (siehe unten): ob ein Rapport auch ohne Unterschrift abschliessbar
sein soll.

## PDF und Versand

**PDF:** Bisher erzeugt die Anwendung nur Excel (`exceljs`). Für den Rapport
braucht es einen PDF-Generator. Kandidat: `pdf-lib` oder `@react-pdf/renderer`
– beide laufen serverseitig ohne Browser-Abhängigkeit. Puppeteer scheidet
aus: zu schwer für eine serverlose Umgebung.

Inhalt: Kopf mit Arcos-Logo und Rapportnummer, Kunde, Datum, Mitarbeitender,
Positionstabelle mit **Bezeichnung, Menge und Einheit – ohne Preise**,
Bemerkung, Unterschriftsbild mit Name und Zeitstempel. Fehlt die
Unterschrift, steht stattdessen der Abschlussvermerk dort.

**Warum keine Preise** (entschieden 13.08.2026): Der Rapport bestätigt, dass
eine Arbeit ausgeführt wurde – er ist Leistungsnachweis, nicht Rechnung. Im
B2B unterschreibt oft eine Person ohne Zeichnungsberechtigung; eine
Unterschrift unter einen Betrag wäre dort wertlos oder sogar irreführend.
Der Auftrag ist erteilt, die Stundensätze sind der Kundin bekannt. Was der
Rapport belegen muss, sind **Menge und Art** der Leistung – und genau das
steht drauf.

Für die Umsetzung heisst das: Die Preisspalten im PDF-Generator als
abschaltbaren Block bauen, nicht weglassen. Braucht später eine andere
Organisation einen Beleg für Bar- oder Kartenzahlung, ist es ein Schalter
statt eines Umbaus.

**Versand:** an `kunden.email` über den bestehenden `sendeMail`-Helper. Der
Teil ist inzwischen der einfachste – Hostpoint-SMTP, DKIM und DMARC stehen
seit dem 12.08.2026.

Das PDF wird zusätzlich in der Dokumentenablage abgelegt (`bereich =
'rapport'`), damit es später auffindbar bleibt. Dafür braucht der
CHECK-Constraint auf `dokumente.bereich` einen weiteren Wert.

## Oberfläche

**Liste `/rapporte`** – Rapporte mit Nummer, Datum, Kunde, Status, Betrag.
Filter nach Status und Zeitraum.

**Detailseite `/rapporte/[id]`** – Kopfdaten oben, darunter die Positionen
als Tabelle mit "+ Position"-Schaltfläche. Jede Position öffnet dieselbe
Auswahl wie die Zeiterfassung: Dienstleistung wählen, dann je nach Art Dauer
oder Menge. Summen live darunter.

**Signieren** – eigener Schritt, bewusst getrennt vom Bearbeiten. Grosses
Unterschriftsfeld (Canvas, Touch), Feld für den Namen der unterzeichnenden
Person, Bestätigungsschritt mit deutlichem Hinweis, dass der Rapport danach
gesperrt ist.

**Aus einer Anfrage heraus** – beim Erledigen einer Anfrage soll wahlweise
ein Rapport statt eines einzelnen Zeiteintrags entstehen können. Das ist die
natürliche Brücke zwischen den beiden Modulen.

## Umsetzung in drei Etappen

Jede Etappe ist für sich nutzbar und einzeln testbar.

**Etappe 1 – Rapport als Behälter.** Tabelle, Positionen, Liste,
Detailseite, Summen. Kein Signieren, kein PDF. Bringt sofort Nutzen: Ein
Einsatz ist als Einheit sichtbar statt als verstreute Einzeleinträge.

**Etappe 2 – PDF und Unterschrift.** Signaturfeld, Statuswechsel auf
`signiert`, Sperre, PDF-Erzeugung, Ablage in der Dokumentenablage.

**Etappe 3 – Versand.** Mail an den Kunden mit PDF im Anhang,
Versandprotokoll auf dem Rapport, erneutes Senden möglich.

## Bewusst nicht in dieser Phase

- **Offline-Fähigkeit** über Service Worker – eigenes Vorhaben, siehe oben
- **Unterschrift des Mitarbeitenden** zusätzlich zur Kundenunterschrift
- **Fotos vom Einsatz** direkt im Rapport – die Dokumentenablage kann das
  bereits, eine Einbettung ins PDF wäre Zusatzarbeit
- **Rapport-Vorlagen** für wiederkehrende Einsätze
- **Direkte Rechnungsstellung** aus dem Rapport – die Fakturierung läuft
  weiterhin über den bestehenden Export nach Comatic

## Offene Entscheidungen

Alle vier am 13.08.2026 entschieden – hier zum Nachlesen, warum.

1. ~~**Nummernkreis**~~ – `JJJJ-NNNN`, jährlich neu beginnend, je
   Organisation. Übersichtlicher als eine endlos wachsende Zahl.
2. ~~**Verbindung vor Ort**~~ – entschieden am 13.08.2026: Variante 1, keine
   Offline-Unterstützung im ersten Wurf. Signiert wird auf dem Gerät des
   Mitarbeitenden, eine öffentliche Signaturseite entfällt.
3. ~~**Signatur ohne Kunde**~~ – ja, Status `abgeschlossen` mit
   Pflichtvermerk, warum keine Unterschrift vorliegt. Durch Variante 1 bei
   Frage 2 tritt der Fall zwangsläufig auf.
4. ~~**MWSt / Preise auf dem Rapport**~~ – gar keine Preise. Der Rapport ist
   Leistungsnachweis, nicht Rechnung: Im B2B unterschreibt oft eine Person
   ohne Zeichnungsberechtigung, der Auftrag ist erteilt und die Stundensätze
   sind bekannt. Bestätigt wird, dass die Arbeit ausgeführt wurde. Die
   Preisspalten werden im PDF-Generator dennoch als abschaltbarer Block
   angelegt, falls später eine Organisation einen Zahlungsbeleg braucht.
