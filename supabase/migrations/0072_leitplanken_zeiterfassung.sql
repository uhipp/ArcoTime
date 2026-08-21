-- =========================================================
-- 0072  Leitplanken in der Zeiterfassung
-- =========================================================
--
-- Siehe docs/plan-parteien-standorte.md, Etappe 1.
--
-- Vier Regeln, die heute nichts kosten und später teuer sind. Alle vier sind
-- bei der Analyse der Mitbewerber-App (Clockin) aufgefallen: Sobald ein Handy
-- schreibt – Doppeltipp, Wiederholung nach dem Funkloch, zweites Gerät –
-- passiert genau das, was die Anwendung heute nur im Code verhindert.
--
-- Nachgemessen am 21.08.2026: 39 Zeiteinträge, davon 7 mit Start und Ende,
-- 0 laufende Timer, 0 Überlappungen, keine Nachtschicht (kein Eintrag mit
-- Ende vor Beginn). Die Bedingungen greifen also ohne Datenbereinigung. Bei
-- zehn Millionen Zeilen wäre jede davon ein eigenes Projekt.

-- ---------------------------------------------------------
-- 1) Nur ein laufender Timer je Person
-- ---------------------------------------------------------
-- 0010 hat für diese Frage einen Index angelegt ("läuft bei mir schon ein
-- Timer?"), aber keinen eindeutigen: Geprüft wird im Code, vor dem Insert.
-- Zwischen Prüfung und Insert liegt ein Zeitfenster, und zwei Geräte oder
-- ein doppelter Tipp treffen es. Danach laufen zwei Timer, und beim Stoppen
-- erwischt man einen davon.
create unique index if not exists uq_zeiteintraege_ein_laufender_timer
  on zeiteintraege(mitarbeiter_id)
  where timer_gestartet_um is not null;

-- ---------------------------------------------------------
-- 2) Keine überlappenden Zeiten derselben Person
-- ---------------------------------------------------------
-- Eine Person kann nicht an zwei Orten arbeiten. Heute verhindert das
-- niemand; es fällt nur auf, weil die Tagesarbeitszeit-Prüfung (0025) bei
-- der Summe anschlägt – und die prüft Plausibilität, nicht Widerspruch.
--
-- Für den Stempelbetrieb einer App ist eine lückenlose, widerspruchsfreie
-- Tageslinie die Grundlage: Kommen ist der erste Start, Gehen das letzte
-- Ende, Pause ist die Lücke. Das funktioniert nur, wenn sich nichts
-- überlappt.
--
-- btree_gist, weil die Bedingung Gleichheit (mitarbeiter_id) und
-- Überschneidung (Zeitraum) mischt.
create extension if not exists btree_gist;

-- Der Zeitraum entsteht aus Datum und Uhrzeit. Läge das Ende vor dem Beginn
-- (Nachtschicht über Mitternacht), wäre tsrange ungültig und der Insert
-- würde scheitern – deshalb wird in diesem Fall ein Tag addiert. Heute gibt
-- es keinen solchen Eintrag; die Anwendung müsste ihn erst erlauben.
alter table zeiteintraege drop constraint if exists zeiteintraege_keine_ueberlappung;
alter table zeiteintraege add constraint zeiteintraege_keine_ueberlappung
  exclude using gist (
    mitarbeiter_id with =,
    tsrange(
      datum + start_zeit,
      datum + end_zeit + case when end_zeit < start_zeit then interval '1 day' else interval '0' end
    ) with &&
  )
  -- Nur für Einträge mit echten Uhrzeiten. Eine Dauererfassung ohne Zeiten
  -- ("3 Stunden am Dienstag") sagt nichts über die Lage im Tag und kann
  -- deshalb auch nichts überlappen.
  where (start_zeit is not null and end_zeit is not null);

-- ---------------------------------------------------------
-- 3) Woher kommt dieser Eintrag?
-- ---------------------------------------------------------
-- Bei Streit über Arbeitszeit ist das die erste Frage. Die Serverzeit
-- (created_at) ist die Wahrheit; die Gerätezeit eines Handys taugt nicht als
-- Beweis, sie lässt sich stellen.
alter table zeiteintraege
  add column if not exists quelle text not null default 'web';

alter table zeiteintraege drop constraint if exists zeiteintraege_quelle_check;
alter table zeiteintraege add constraint zeiteintraege_quelle_check
  check (quelle in ('web', 'app', 'import', 'system'));

comment on column zeiteintraege.quelle is
  'Wie der Eintrag entstanden ist: web (Anwendung im Browser), app (Handy), '
  'import (Übernahme aus einem anderen System), system (Standardpositionen, '
  'Disposition). Bestehende Einträge sind alle über den Browser entstanden.';

-- ---------------------------------------------------------
-- 4) Zweimal gesendet ist nicht zweimal gearbeitet
-- ---------------------------------------------------------
-- Ein Handy im Funkloch wiederholt die Übertragung. Ohne Schlüssel entstehen
-- zwei Einträge, und niemand merkt es – ausser der Kundin auf der Rechnung.
-- Der Schlüssel kommt vom Gerät und ist je Organisation eindeutig.
alter table zeiteintraege
  add column if not exists idempotenz_schluessel text;

create unique index if not exists uq_zeiteintraege_idempotenz
  on zeiteintraege(organisation_id, idempotenz_schluessel)
  where idempotenz_schluessel is not null;

comment on column zeiteintraege.idempotenz_schluessel is
  'Vom erfassenden Gerät erzeugter Schlüssel je Aktion. Eine wiederholte '
  'Übertragung (Funkloch, Doppeltipp) trifft den Unique-Index und legt '
  'keinen zweiten Eintrag an. Leer bei Erfassung über den Browser.';

-- ---------------------------------------------------------
-- 5) Der Mandant zuerst im Index
-- ---------------------------------------------------------
-- Jede Mandantentabelle hat einen Index auf organisation_id, aber fast keine
-- zusammengesetzten. Die häufigste Abfrage der Zeiterfassung lautet "diese
-- Organisation, dieser Zeitraum, nach Datum sortiert" – dafür braucht es die
-- Organisation an erster Stelle und das Datum daneben.
create index if not exists idx_zeiteintraege_organisation_datum
  on zeiteintraege(organisation_id, datum);

-- ---------------------------------------------------------
-- 6) Der laute Nachbar
-- ---------------------------------------------------------
-- Eine einzelne Abfrage soll nicht die ganze Datenbank blockieren. Gesetzt
-- wird nur, wenn nichts gesetzt IST: Supabase legt für 'authenticated' je
-- nach Projektalter selbst eine Grenze fest, und die still nach oben zu
-- verschieben wäre das Gegenteil des Gewollten.
--
-- service_role bleibt bewusst unangetastet: Darunter laufen Vollexport und
-- Dokumentenarchiv, die Minuten dauern dürfen.
do $$
declare
  v_gesetzt text;
begin
  select (regexp_match(array_to_string(rolconfig, ','), 'statement_timeout=([^,]+)'))[1]
    into v_gesetzt
    from pg_roles where rolname = 'authenticated';

  if v_gesetzt is null then
    execute 'alter role authenticated set statement_timeout = ''20s''';
    raise notice 'statement_timeout für authenticated auf 20s gesetzt.';
  else
    raise notice 'statement_timeout für authenticated ist bereits %s – unverändert gelassen.', v_gesetzt;
  end if;
end $$;
