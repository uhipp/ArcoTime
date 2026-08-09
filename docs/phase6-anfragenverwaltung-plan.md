# Phase 6 – Anfragenverwaltung (Ticket-/CRM-Modul)

Status: **Entwurf zur Durchsicht — noch nicht umgesetzt.**

## Ausgangslage & Ziel

Kundenanfragen kommen über viele Kanäle (Telefon, persönlich, E-Mail, Brief,
WhatsApp), werden oft direkt erledigt, aber nicht erfasst — dadurch geht
sowohl die Information ("was wurde gemacht") als auch die Verrechnung
verloren. Ziel: eine Anfrage wird erfasst, geplant, einem Mitarbeiter
zugewiesen und bei Erledigung optional direkt verrechnet — ohne Umweg über
ein zweites System.

**Bewusst nicht Teil dieser Phase:** automatisches Einlesen von E-Mails aus
dem Postfach (Kanal bleibt vorerst manuell erfasst — siehe "Spätere
Erweiterung" unten).

## Begriffe (bestätigt)

- **Anfrage** — das zentrale Objekt (nicht "Ticket"/"Aufgabe")
- Ansicht: **Kanban-Board** nach Status
- Erledigen kann **direkt einen Zeiteintrag erzeugen**

## 1. Datenmodell

### Neue Tabelle `anfragen`

| Feld | Typ | Bemerkung |
|---|---|---|
| id | uuid | PK |
| organisation_id | uuid | wie überall, per Trigger von `kunde_id` abgeleitet |
| kunde_id | uuid | Pflicht |
| projekt_id | uuid | optional — Anfrage kann, muss aber nicht einem Projekt zugeordnet sein |
| titel | text | Kurzer Betreff |
| beschreibung | text | Details |
| kanal | text | telefon / email / whatsapp / brief / persoenlich / sonstiges |
| status | text | neu / in_bearbeitung / wiedervorlage / erledigt (= Kanban-Spalten) |
| prioritaet | text | tief / normal / hoch |
| zugewiesen_an | uuid → profiles | wer ist verantwortlich (nullable = "niemand", jeder kann übernehmen) |
| wiedervorlage_am | date | Erinnerungsdatum |
| erledigt_am | timestamptz | gesetzt beim Abschluss |
| zeiteintrag_id | uuid → zeiteintraege | gesetzt, falls verrechnet |
| erstellt_von | uuid → profiles | |
| erstellt_am / updated_at | timestamptz | |

### Neue Tabelle `anfragen_dokumente` (Teil 3, Dokumentenablage)

| Feld | Typ | Bemerkung |
|---|---|---|
| id | uuid | PK |
| organisation_id | uuid | |
| kunde_id | uuid | Pflicht — Dokument gehört immer zu einem Kunden |
| anfrage_id | uuid | optional — Dokument kann direkt einer Anfrage zugeordnet sein |
| dateiname | text | |
| storage_pfad | text | Pfad im Supabase-Storage-Bucket |
| groesse_bytes | bigint | |
| hochgeladen_von | uuid → profiles | |
| hochgeladen_am | timestamptz | |

Dateien selbst liegen in einem neuen Supabase-Storage-Bucket
(`dokumente`), Pfad-Konvention `{organisation_id}/{kunde_id}/{dateiname}`
— darauf aufbauend prüft die Storage-RLS-Regel, dass der erste Pfad-Teil
mit der eigenen Organisation übereinstimmt (Standard-Muster für
mandantenfähigen Datei-Speicher).

## 2. RLS

- `anfragen`: **Lesen** — alle Mitglieder der eigenen Organisation sehen
  alle Anfragen (bewusst offen, damit unzugewiesene Anfragen von jedem
  übernommen werden können — wie ein gemeinsames Ticket-Board).
  **Schreiben/Ändern** — Ersteller, zugewiesene Person, oder Admin; eine
  unzugewiesene Anfrage darf sich jede:r selbst zuweisen.
- `anfragen_dokumente`: gleiche Grundlogik wie `anfragen`.
- Storage-Bucket: eigene Policy auf `storage.objects`, prüft
  Organisationszugehörigkeit über den Pfad.

## 3. UI

### Kanban-Board (`/anfragen`)
Vier Spalten: **Neu / In Bearbeitung / Wiedervorlage / Erledigt**. Karten
zeigen Kunde, Titel, Kanal-Symbol, zugewiesene Person, Wiedervorlage-Datum
(rot hervorgehoben, falls überfällig). Verschieben per Drag & Drop ändert
den Status (dafür eine kleine, etablierte Bibliothek — `@dnd-kit/core` —
als neue Abhängigkeit).

### Erledigen-Dialog
Beim Verschieben einer Karte auf "Erledigt" öffnet sich ein kompaktes
Formular:
- Checkbox **"Nicht verrechnen"** (für nicht abrechenbare Anfragen)
- Falls nicht angehakt: Dienstleistung + Dauer wählen (vorbefüllt aus
  Titel/Beschreibung) → erzeugt automatisch einen Zeiteintrag über die
  bestehende Zeiterfassungs-Logik, verknüpft über `zeiteintrag_id`

### Neue Anfrage / Detail-Seite
Formular analog zu Kunden/Projekten: Kunde wählen (+ optional Projekt),
Titel, Beschreibung, Kanal, Priorität, Zuweisung, Wiedervorlage-Datum.

### Dashboard-Ergänzung: "Meine Wiedervorlagen"
Kleine Übersicht auf der Startseite: eigene, noch nicht erledigte
Anfragen mit `wiedervorlage_am <= heute`, überfällige rot markiert.

### Dokumente (Teil 3)
Auf der Kunden-Detailseite und auf der Anfrage-Detailseite: Datei-Upload
(Drag & Drop oder Datei-Auswahl), Liste der abgelegten Dokumente mit
Download-Link.

## 4. Reihenfolge

1. `anfragen`-Tabelle + RLS + Server Actions (CRUD)
2. Kanban-Board-UI inkl. Drag & Drop
3. Erledigen-Dialog mit Zeiteintrag-Verknüpfung
4. Dashboard-Widget "Meine Wiedervorlagen"
5. Dokumentenablage (Storage-Bucket, Upload/Liste, RLS)

Teile 1–4 sind ein zusammenhängender, gut abgrenzbarer erster Block. Teil 5
(Dokumente) ist technisch unabhängig und könnte auch separat/später
kommen, falls Zeit drängt.

## 5. Spätere Erweiterung (explizit nicht jetzt)

**Automatisches E-Mail-Einlesen** — Anfragen sollen künftig vielleicht
automatisch aus eingehenden E-Mails entstehen (Weiterleitung an eine
dedizierte Adresse, oder IMAP-Abruf), inkl. automatischer Zuordnung zum
Kunden per Absenderadresse. Das ist ein grundlegend anderer, deutlich
aufwändigerer Baustein (Mail-Parsing, Zuordnungslogik, Fehlerbehandlung
bei unbekannten Absendern) — separat zu planen, wenn Teil 1–5 im
Alltag bewährt sind.
