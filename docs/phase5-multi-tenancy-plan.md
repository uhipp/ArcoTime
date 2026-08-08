# Phase 5 – Multi-Tenancy-Grundlage für ArcoTime als SaaS

Status: **Entwurf zur Durchsicht — noch nicht umgesetzt.**

## Ziel

ArcoTime von einer Einzelfirmen-Lösung (nur Arcos Group) zu einer Plattform
machen, die mehrere unabhängige Lizenznehmer (andere Dienstleister) nutzen
können, mit vollständig getrennten Daten pro Lizenznehmer.

**Nicht Teil dieser Phase** (bewusst verschoben):
- ArcoFakt (QR-Rechnungen, Debitoren, Mahnwesen) — eigene Folgephase
- Self-Service-Registrierung neuer Lizenznehmer
- Automatisierte Lizenz-Abrechnung von Arcos Group an Lizenznehmer
- Feinere Zugriffssteuerung pro Kunde (über das bestehende Muster pro
  Projekt hinaus)

## Begriffsmodell (bestätigt)

```
Organisation (= Lizenznehmer, NEU)
  └─ Kunde                              (unverändert)
       └─ Projekt (bisher "Mandat")     (unverändert, nur Umbenennung)
            └─ Zeiterfassung, Dienstleistungen
```

Innerhalb einer Organisation bleibt exakt das bestehende Modell erhalten.
Es gibt genau **eine** neue Ebene: die Organisation selbst.

## 1. Datenmodell

### Neue Tabelle `organisationen`

| Feld | Typ | Zweck |
|---|---|---|
| id | uuid | PK |
| name | text | Anzeigename |
| status | text | aktiv / pausiert / gekündigt |
| plan_max_gleichzeitige_nutzer | int | Lizenz-Limit |
| abrechnungszyklus | text | monatlich / jährlich |
| preis_pro_zyklus | numeric | für spätere manuelle/automatisierte Abrechnung |
| erstellt_am | timestamptz | |

### `organisation_id` auf allen mandantenspezifischen Tabellen

Betrifft: `kunden`, `projekte` (bisher `mandate`), `dienstleistungen`,
`dienstleistungsklassen`, `mwst_codes`, `zeiteintraege`, `belege_exporte`,
`profiles`.

Bei `zeiteintraege` und `belege_exporte` wird `organisation_id` **zusätzlich
direkt gespeichert** (nicht nur über Projekt/Kunde erschlossen) — das macht
die RLS-Regeln einfacher und die Abfragen schneller. Ein Trigger stellt
sicher, dass sie beim Anlegen automatisch mit der Organisation des Projekts
übereinstimmt und nachträglich nicht verändert werden kann.

`plz_verzeichnis` bleibt **ohne** `organisation_id` — das ist geteiltes
Referenzmaterial (Schweizer Postleitzahlen), keine Mandantendaten.

### Zweite Rollen-Ebene: Platform-Admin

Neues Feld `profiles.ist_platform_admin boolean default false`. Unabhängig
von der bestehenden Rolle (admin/mitarbeiter) **innerhalb** einer
Organisation. Nur Arcos-Group-Personen bekommen dieses Flag; es erlaubt
Einsicht/Verwaltung der `organisationen`-Tabelle, sonst nichts zusätzlich.

### Umbenennung Mandat → Projekt

- Tabelle `mandate` → `projekte`
- Spalte `mandat_id` → `projekt_id` (in `zeiteintraege`, `belege_exporte`)
- Tabelle `mandat_mitarbeiter` → `projekt_mitarbeiter`
- Im Code: Routen `/mandate/*` → `/projekte/*` (mit Redirect von der alten
  Route als Sicherheitsnetz), Formulare/Komponenten, Typen, Server Actions,
  alle UI-Texte "Mandat" → "Projekt"

Postgres behält bei `RENAME TABLE`/`RENAME COLUMN` automatisch alle
Fremdschlüssel, Indizes und Policies bei — Views/Funktionen, die darauf
verweisen, müssen aber neu erstellt werden (wie schon bei den
`v_zeiteintraege`-Anpassungen in Phase 2/3 gesehen).

## 2. Row-Level-Security

Neue Hilfsfunktion:

```sql
create function current_organisation_id() returns uuid as $$
  select organisation_id from profiles where id = auth.uid();
$$ language sql security definer stable;
```

**Jede bestehende Policy** (aktuell ca. 15 über 9 Tabellen) wird um eine
Bedingung erweitert: `and organisation_id = current_organisation_id()`.
Das ist mechanisch, aber sicherheitskritisch — Fehler hier bedeuten im
schlimmsten Fall Daten-Leck zwischen zwei Lizenznehmern. Deshalb:

**Test-Vorgehen vor Abschluss dieser Phase:** eine zweite Test-Organisation
mit eigenen Testdaten anlegen und explizit verifizieren, dass ein Nutzer der
einen Organisation unter keinen Umständen Daten der anderen sieht — für
jede betroffene Tabelle einzeln.

## 3. Lizenz-Durchsetzung (gleichzeitig aktive Nutzer)

Wie besprochen: pragmatischer Aktivitäts-Fenster-Ansatz, kein hartes
Session-Management.

- `profiles.letzte_aktivitaet timestamptz` — wird bei Anfragen aktualisiert
  (gedrosselt, z.B. nur wenn älter als 2 Minuten, um nicht bei jedem
  Request zu schreiben)
- "Gleichzeitig aktiv" = Anzahl Profile derselben Organisation mit
  `letzte_aktivitaet` innerhalb der letzten 15 Minuten
- Beim Login-Versuch wird geprüft: Ist das Limit der Organisation bereits
  erreicht? Wenn ja: Anmeldung wird mit klarer Meldung verweigert
  ("Maximale Anzahl gleichzeitiger Nutzer erreicht")

## 4. Onboarding neuer Lizenznehmer (MVP, manuell)

Für den Start **kein** öffentliches Registrierungsformular — Arcos Group
(Platform-Admin) legt neue Organisationen und deren ersten Admin-Nutzer an:

1. Platform-Admin erstellt im neuen Plattform-Bereich eine Organisation
   (Name, Nutzer-Limit, Abrechnungszyklus)
2. Erste Person wird wie bisher über Supabase-Dashboard eingeladen
   (E-Mail-Einladung, kein Passwort-Handling nötig)
3. Platform-Admin verknüpft das neue Profil einmalig per SQL-Snippet mit
   der richtigen `organisation_id` und setzt die Rolle auf `admin`
   (gleiches Muster wie unser eigenes Onboarding — kein Service-Role-Key
   nötig)
4. Diese Person kann danach **innerhalb ihrer eigenen Organisation**
   weitere Mitarbeitende einladen (das bestehende Einladungs-Muster
   funktioniert unverändert, nur jetzt organisationsbezogen)

*Komfortablere In-App-Einladung (ohne Umweg über Supabase-Dashboard) wäre
ein sinnvoller nächster Schritt, braucht aber die Supabase Admin-API
(Service-Role-Key) — das würde ich als separate, spätere Erweiterung
behandeln, nicht Teil dieser Grundlage.*

## 5. Platform-Admin-Bereich

Neue, schlanke Sektion (nur sichtbar mit `ist_platform_admin`):
- Liste aller Organisationen mit Status, Nutzer-Limit, Anzahl aktiver Nutzer
- Neue Organisation anlegen / Plan bearbeiten / Status ändern (pausieren
  bei Zahlungsrückstand o.ä.)

Bewusst **kein** automatisierter Abrechnungsversand in dieser Phase.

## 6. Migrationsreihenfolge (grob)

1. `organisationen`-Tabelle anlegen, Zeile "Arcos Group" einfügen
2. `organisation_id` (nullable) auf allen betroffenen Tabellen ergänzen
3. Backfill: alle bestehenden Zeilen bekommen die Arcos-Group-Organisation
4. `organisation_id` auf `not null` setzen + Fremdschlüssel + Index
5. `profiles`: `organisation_id`, `ist_platform_admin` ergänzen, bestehenden
   Account als Platform-Admin markieren
6. Alle RLS-Policies um Organisations-Prüfung erweitern
7. Umbenennung `mandate` → `projekte` (DB) + Code-weite Anpassung
8. Lizenz-Aktivitätstracking + Login-Prüfung
9. Platform-Admin-Bereich (minimal)
10. Testphase mit zweiter Dummy-Organisation zur Isolations-Prüfung

## 7. Grösseneinordnung

Das ist die aufwändigste Einzelphase bisher — deutlich mehr als Phase 1–4
einzeln, vor allem wegen der sicherheitskritischen RLS-Überarbeitung und der
Mandat→Projekt-Umbenennung (betrifft ~15–20 Dateien). Ich würde das in den
oben stehenden Schritten sequenziell umsetzen und nach Schritt 6
(RLS fertig) eine Zwischen-Verifikation machen, bevor die Umbenennung
(Schritt 7) dazukommt — damit Fehler sich nicht überlagern.
