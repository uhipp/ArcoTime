# Phase 7: Dokumentenablage

## Ziel

Dokumente (PDF, Bilder, Office-Dateien, E-Mails als Datei) sollen an vier
Stellen angehängt werden können:

- Kunden
- Projekte
- Mitarbeitende
- Anfragen und Zeiteinträge

Ein Anwender soll ein Dokument in unter 10 Sekunden hochladen können –
Usability hat Priorität vor Vollständigkeit. Automatisches E-Mail-Einlesen
(Weiterleiten an eine Postfach-Adresse) ist bewusst **nicht** Teil dieser
Phase (bereits im Anfragen-Plan zurückgestellt) – E-Mails werden vorerst als
Datei (`.eml`/`.msg` oder PDF-Ausdruck) hochgeladen, genau wie jeder andere
Dokumenttyp.

## Datenmodell

**Eine** generische, polymorphe Tabelle statt vier separater Tabellen –
Upload/Liste/Löschen ist für alle vier Kontexte identisch, nur `bereich` +
`bezug_id` unterscheiden sich. Das ist die einzige Stelle in dieser Phase,
an der wir bewusst vom "eigene Tabelle pro Auswahlliste"-Prinzip abweichen,
weil es hier nicht um eine Auswahlliste geht, sondern um eine
Datei-Zuordnung zu wechselnden Zieltabellen.

```sql
create table dokumente (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null default current_organisation_id(),
  bereich text not null check (bereich in ('kunde','projekt','mitarbeitende','anfrage','zeiteintrag')),
  bezug_id uuid not null,           -- id der Kunde/Projekt/Profil/Anfrage/Zeiteintrag-Zeile
  dateiname text not null,
  speicherpfad text not null,       -- Pfad im Supabase-Storage-Bucket
  mime_type text,
  groesse_bytes bigint,
  kategorie_id uuid references dokument_kategorien(id),
  notiz text,
  hochgeladen_von uuid references profiles(id) default auth.uid(),
  created_at timestamptz not null default now()
);
```

`dokument_kategorien` (z.B. "Vertrag", "Foto", "Rechnung", "Ausweis",
"Korrespondenz", "Sonstiges") ist – konsequent nach dem in dieser Session
etablierten Prinzip – eine weitere admin-verwaltbare Auswahlliste unter
Einstellungen, kein Fixwert im Code. Kategorie ist optional.

## Speicherung

Ein privater Supabase-Storage-Bucket (`dokumente`), **kein** direkter
Browser-Zugriff ohne Prüfung. Die Datei selbst läuft aber NICHT über eine
eigene Server-Function (Vercel-Funktionen haben ein Body-Limit, das
grössere Dateien sonst mit "413 Payload Too Large" abweisen würde),
sondern direkt zwischen Browser und Supabase Storage:

- **Upload**: Server Action prüft über den normalen (RLS-geprüften)
  Supabase-Client, ob die Zieltabelle (Kunde/Projekt/…) für den Anwender
  überhaupt sichtbar ist, legt dann die `dokumente`-Zeile an und erzeugt
  über den Service-Role-Client eine kurzlebige, auf genau diesen Pfad
  beschränkte signierte Upload-URL. Der Browser lädt die Datei direkt zu
  dieser URL hoch.
- **Download/Anzeige**: eine eigene Route (`/api/dokumente/[id]`) liest die
  `dokumente`-Zeile über den normalen RLS-Client (unsichtbar = 404) und
  leitet dann auf eine kurzlebige signierte Download-URL weiter.

Die Berechtigungsprüfung liegt damit an **einer** Stelle (der
`dokumente`-Tabelle), nicht doppelt in Storage-Policies UND App-Code – das
hat sich in dieser App bereits als das robustere Muster gezeigt (siehe die
frühere RLS-Rekursion bei `mandat_mitarbeiter`).

## Berechtigungen (RLS)

- **Kunde / Projekt / Anfrage / Zeiteintrag**: sichtbar für alle
  Mitglieder der Organisation (wie die zugehörigen Datensätze selbst).
- **Mitarbeitende**: sichtbar nur für Admin und die betroffene Person
  selbst (Personal-Dokumente sind sensibel) – bestätigt.
- **Löschen**: Admin oder die Person, die das Dokument hochgeladen hat.
- **Hochladen** für den Bereich "Mitarbeitende": nur Admin (die
  betroffene Person soll nicht selbst z.B. den eigenen Vertrag ersetzen
  können).

## Einschränkungen (v1, bewusst einfach gehalten)

- Erlaubte Dateitypen: PDF, Bilder (jpg/png/heic), Office
  (docx/xlsx/pptx/doc/xls/ppt), E-Mail-Dateien (eml/msg), Text (txt).
  Alles andere wird abgelehnt (Server- **und** Client-seitig geprüft).
- Grössenlimit: 20 MB pro Datei (grosszügig für Fotos/PDFs, verhindert
  aber versehentliche Riesen-Uploads).
- Keine Versionierung – ein neues Dokument ersetzt kein altes, beide
  bleiben nebeneinander stehen (einfachste Lösung, deckt den Alltag ab).
- Kein Volltext-Durchsuchen von Dokumentinhalten (Kategorie + Notiz-Feld
  reichen für v1 zur Auffindbarkeit).

## UI

Eine wiederverwendbare Komponente, in allen fünf Kontexten identisch
eingebettet:

- **Upload**: Drag & Drop-Fläche + klassischer Datei-Dialog, direktes
  Hochladen ohne Zwischenschritt (kein separates "Bearbeiten"-Formular
  vorher) – Kategorie/Notiz sind optionale Felder direkt daneben, nicht
  Pflicht, damit der schnelle Fall (Datei rein, fertig) nicht ausgebremst
  wird.
- **Liste**: Dateiname, Kategorie, Grösse, hochgeladen von/am, Download-
  und Löschen-Link. PDF/Bilder bekommen ein passendes Icon, sonst ein
  generisches Dokument-Icon.

Eingebettet auf:
- Kunde-Detailseite (unterhalb der neuen Historie-Sektion)
- Projekt-Detailseite
- Anfrage-Detailseite
- Zeiteintrag-Detailseite
- Mitarbeitende: dafür wird eine neue Detailseite `/mitarbeiter/[id]`
  nötig (aktuell gibt es nur die Listen-/Inline-Bearbeitungsseite) – die
  Dokumente-Sektion lebt dort, Admin sieht sie bei jeder Person, eine
  Person selbst nur bei sich.

## Umsetzungsschritte

1. Migration: `dokument_kategorien` (Auswahlliste, Einstellungen-Muster),
   `dokumente` (Kerntabelle + RLS), Storage-Bucket anlegen.
2. Server Actions: Upload (inkl. Typ-/Grössenprüfung), Löschen.
3. Route Handler für Download/Anzeige.
4. Einstellungen: Sektion für Dokument-Kategorien (wie die anderen
   Auswahllisten).
5. Wiederverwendbare Upload- + Listen-Komponenten.
6. Einbindung in Kunde-, Projekt-, Anfrage-, Zeiteintrag-Detailseiten.
7. Neue Mitarbeitende-Detailseite inkl. Dokumente-Sektion.
8. Build + Test.

## Bewusst nicht in dieser Phase

- Automatisches E-Mail-Einlesen (Weiterleiten an eine Postfach-Adresse) –
  eigene, spätere Phase bei Bedarf.
- Dokument-Versionierung.
- Volltextsuche/OCR über Dokumentinhalte.
- Virenscanner (bei Bedarf später über einen externen Dienst ergänzbar).
