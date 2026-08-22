-- =========================================================
-- 0078  Aus Dienstleistungen werden Artikel
-- =========================================================
--
-- Siehe docs/plan-ablauf-standorte.md, Abschnitt 7.
--
-- Der Name war falsch, und zwar von Anfang an falscher werdend: Die Tabelle
-- hält seit 0022 auch Mengenartikel – Material, Spesen, Anfahrt. Eine Dose
-- Farbe ist keine Dienstleistung. Im ERP-Bereich heisst das Ding Artikel, und
-- ein Artikel kann eine Dienstleistung oder ein Material sein.
--
-- Warum umbenannt und nicht kommentiert: Anweisung des Nutzers vom
-- 22.08.2026, als Regel in projektstand.md aufgenommen – ein erkannter Fehler
-- wird ganz behoben, nicht dokumentiert. Der Umfang ist kein Argument
-- dagegen.
--
-- Diese Migration verliert KEINE Daten. „alter table … rename" berührt in
-- Postgres keine Zeile; Fremdschlüssel, Indizes und RLS-Regeln hängen an der
-- Tabelle und ziehen mit. Nachzuführen sind nur die Stellen, an denen der
-- Name als DATUM steht – und die stehen unten in Abschnitt 5 bis 7.
--
-- ACHTUNG Reihenfolge: Der laufende Code fragt nach „dienstleistungen" und
-- ist zwischen dieser Migration und dem Deploy des neuen Codes blind. Das
-- Fenster ist kurz und mit dem Nutzer abgesprochen.

-- ---------------------------------------------------------
-- 1) Die Tabellen
-- ---------------------------------------------------------
alter table if exists dienstleistungen rename to artikel;
alter table if exists dienstleistungsklassen rename to artikelklassen;

comment on table artikel is
  'Der Artikelstamm: alles, was in einer Rapportposition stehen kann – '
  'Arbeit, Material, Spesen, Anfahrt. Hiess bis 0078 "dienstleistungen", '
  'was seit 0022 (Mengenartikel) falsch war.';
comment on table artikelklassen is
  'Gruppierung der Artikel für Rabatte und Auswertungen. Hiess bis 0078 '
  '"dienstleistungsklassen".';

-- ---------------------------------------------------------
-- 2) Die Fremdschlüsselspalten
-- ---------------------------------------------------------
alter table zeiteintraege rename column dienstleistung_id to artikel_id;
alter table kundenpreise rename column dienstleistung_id to artikel_id;
alter table rapport_standardpositionen rename column dienstleistung_id to artikel_id;

-- kundenrabatte.klasse_id und artikel.klasse_id behalten ihren Namen: Sie
-- nennen die Klasse und nicht den Artikel, und "artikelklasse_id" wäre
-- länger ohne mehr zu sagen.

-- ---------------------------------------------------------
-- 3) Bedingungen, Indizes, Regeln und Trigger tragen den Namen mit
-- ---------------------------------------------------------
-- Postgres benennt sie beim Umbenennen der Tabelle NICHT mit. Eine
-- Bedingung, die "dienstleistungen_pkey" heisst, taucht in jeder
-- Fehlermeldung auf und erzählt weiter den alten Namen – genau das, was
-- diese Migration beheben soll (und lib/db-fehler.ts übersetzt nach dem
-- Namen der Bedingung, nicht nach ihrem Text).
--
-- Die Reihenfolge der Ersetzungen ist wichtig: Zuerst das längere Wort.
-- Sonst wird aus "dienstleistungen_pkey" ein "artikelen_pkey".
create or replace function pg_temp.neuer_name(alt text)
returns text language sql immutable as $$
  select replace(
           replace(
             replace(alt, 'dienstleistungsklassen', 'artikelklassen'),
             'dienstleistungen', 'artikel'),
           'dienstleistung', 'artikel')
$$;

do $$
declare
  r record;
begin
  -- Bedingungen (Primärschlüssel, Fremdschlüssel, unique, check)
  for r in
    select c.conname, c.conrelid::regclass::text as tabelle
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public' and c.conname like '%dienstleistung%'
  loop
    execute format('alter table %s rename constraint %I to %I',
                   r.tabelle, r.conname, pg_temp.neuer_name(r.conname));
    raise notice 'Bedingung % → %', r.conname, pg_temp.neuer_name(r.conname);
  end loop;

  -- Indizes, die nicht an einer Bedingung hängen
  for r in
    select indexname from pg_indexes
    where schemaname = 'public' and indexname like '%dienstleistung%'
  loop
    execute format('alter index %I rename to %I',
                   r.indexname, pg_temp.neuer_name(r.indexname));
    raise notice 'Index % → %', r.indexname, pg_temp.neuer_name(r.indexname);
  end loop;

  -- RLS-Regeln
  for r in
    select policyname, tablename from pg_policies
    where schemaname = 'public' and policyname like '%dienstleistung%'
  loop
    execute format('alter policy %I on public.%I rename to %I',
                   r.policyname, r.tablename, pg_temp.neuer_name(r.policyname));
    raise notice 'Regel % → %', r.policyname, pg_temp.neuer_name(r.policyname);
  end loop;

  -- Trigger (der Protokolltrigger heisst <tabelle>_protokoll)
  for r in
    select t.tgname, c.relname
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and not t.tgisinternal
      and t.tgname like '%dienstleistung%'
  loop
    execute format('alter trigger %I on public.%I rename to %I',
                   r.tgname, r.relname, pg_temp.neuer_name(r.tgname));
    raise notice 'Trigger % → %', r.tgname, pg_temp.neuer_name(r.tgname);
  end loop;
end $$;

-- ---------------------------------------------------------
-- 4) Die View
-- ---------------------------------------------------------
-- Sie muss neu gebaut werden: Die Verweise auf die Tabellen ziehen mit, ihre
-- eigenen Ausgabespalten nicht – die heissen so, wie sie hier stehen.
--
-- Unverändert gegenüber 0036 bis auf zwei Spaltennamen und die zwei joins.
drop view if exists v_zeiteintraege;

create view v_zeiteintraege
  with (security_invoker = true)
as
select
  z.id,
  z.datum,
  z.start_zeit,
  z.end_zeit,
  z.dauer_minuten,
  z.timer_gestartet_um,
  case when z.dauer_minuten is not null
       then round(z.dauer_minuten / 60.0, 2)
  end as menge_stunden,
  z.beschreibung,
  z.rabatt_prozent,
  z.referenz,
  z.beleg_id,
  round(
    coalesce(z.dauer_minuten / 60.0, z.menge, 0) * z.preis * (1 - z.rabatt_prozent / 100.0),
    2
  ) as betrag,
  m.id as projekt_id,
  m.bezeichnung as projekt_bezeichnung,
  m.kostenstelle,
  k.id as kunde_id,
  k.adress_schluessel,
  k.anrede,
  k.vorname,
  k.name as kunde_name,
  k.adresse_zusatz,
  -- Eine Spalte, wie der Comatic-Import sie erwartet: Strasse und
  -- Hausnummer wieder zusammengesetzt. nullif, damit ein Kunde ohne
  -- Adresse null liefert und nicht einen leeren String.
  nullif(trim(concat_ws(' ', k.strasse, k.hausnummer)), '') as strasse,
  k.postfach,
  k.plz,
  k.ort,
  k.land,
  k.email,
  k.telefon,
  k.waehrung,
  k.zahlungskondition_tage,
  a.bezeichnung as artikel_bezeichnung,
  a.konto,
  z.mwst_code,
  p.name as mitarbeiter_name,
  z.mitarbeiter_id,
  z.user_id,
  z.preis,
  a.klasse_id,
  ak.bezeichnung as klasse_bezeichnung,
  z.organisation_id,
  z.mwst_satz,
  z.menge,
  z.rapport_id,
  z.artikel_id,
  round(coalesce(z.dauer_minuten / 60.0, z.menge, 0), 2) as menge_verrechnet,
  a.einheit,
  a.zaehlt_als_arbeitszeit,
  a.rabatt_erlaubt,
  -- Vorläufig ist alles, was zu einem Rapport gehört, der noch nicht
  -- signiert oder abgeschlossen ist (0036).
  coalesce(r.status is not null and r.status not in ('signiert', 'abgeschlossen'), false)
    as vorlaeufig,
  r.status as rapport_status
from zeiteintraege z
join projekte m on m.id = z.projekt_id
join kunden k on k.id = m.kunde_id
join artikel a on a.id = z.artikel_id
left join artikelklassen ak on ak.id = a.klasse_id
join profiles p on p.id = z.mitarbeiter_id
left join rapporte r on r.id = z.rapport_id;

-- ---------------------------------------------------------
-- 5) Das Änderungsprotokoll
-- ---------------------------------------------------------
-- Die Liste in 0053 nennt die Tabellen namentlich – eine Handliste, und
-- deshalb hier nachzuführen. Die Trigger selbst hat Abschnitt 3 schon
-- umbenannt; dieser Block ist die Sicherung für den Fall, dass einer fehlt.
do $$
declare
  t text;
begin
  foreach t in array array['artikel', 'artikelklassen'] loop
    execute format('drop trigger if exists %I on public.%I', t || '_protokoll', t);
    execute format(
      'create trigger %I after insert or update or delete on public.%I
         for each row execute function protokolliere_aenderung()',
      t || '_protokoll', t
    );
  end loop;
end $$;

-- Die Zeilen des Protokolls tragen den Tabellennamen als Text. Ohne diesen
-- Lauf erzählt die Historie weiter vom alten Namen, und ein Filter auf
-- „artikel" findet nichts von vorher.
update aenderungsprotokoll set tabelle = 'artikelklassen'
 where tabelle = 'dienstleistungsklassen';
update aenderungsprotokoll set tabelle = 'artikel'
 where tabelle = 'dienstleistungen';

-- ---------------------------------------------------------
-- 6) Die Spaltenwahl
-- ---------------------------------------------------------
-- Sie steht je Anwender als Text in der Datenbank (0048). Ohne Nachführung
-- verliert jeder seine Spaltenauswahl für diese Liste – kein Datenverlust,
-- aber eine unnötige Überraschung.
update spaltenwahl set liste = 'artikel' where liste = 'dienstleistungen';

-- ---------------------------------------------------------
-- 7) Die Bezeichnungen
-- ---------------------------------------------------------
-- Der Schlüssel des Begriffs heisst mit (0073). Die Wörter werden nur dort
-- ersetzt, wo noch die alte Vorgabe steht: Ein Betrieb, der bewusst
-- „Leistung" gesetzt hat, behält sein Wort – genau dafür gibt es die
-- Bezeichnungen.
update begriffe
   set schluessel = 'artikel',
       einzahl = case when einzahl = 'Dienstleistung' then 'Artikel' else einzahl end,
       mehrzahl = case when mehrzahl = 'Dienstleistungen' then 'Artikel' else mehrzahl end,
       genus = case when einzahl = 'Dienstleistung' then 'm' else genus end
 where schluessel = 'dienstleistung';

update begriff_vorlagen
   set schluessel = 'artikel',
       einzahl = case when einzahl = 'Dienstleistung' then 'Artikel' else einzahl end,
       mehrzahl = case when mehrzahl = 'Dienstleistungen' then 'Artikel' else mehrzahl end,
       genus = case when einzahl = 'Dienstleistung' then 'm' else genus end
 where schluessel = 'dienstleistung';

-- ---------------------------------------------------------
-- 8) Nachzählen statt hoffen
-- ---------------------------------------------------------
do $$
declare
  v_rest int;
  v_namen text;
begin
  select count(*), string_agg(distinct name, ', ')
    into v_rest, v_namen
  from (
    select conname as name from pg_constraint c
      join pg_class t on t.oid = c.conrelid
      join pg_namespace n on n.oid = t.relnamespace
     where n.nspname = 'public' and conname like '%dienstleistung%'
    union all
    select indexname from pg_indexes
     where schemaname = 'public' and indexname like '%dienstleistung%'
    union all
    select policyname from pg_policies
     where schemaname = 'public' and policyname like '%dienstleistung%'
    union all
    select column_name from information_schema.columns
     where table_schema = 'public' and column_name like '%dienstleistung%'
    union all
    select table_name from information_schema.tables
     where table_schema = 'public' and table_name like '%dienstleistung%'
  ) offen;

  if v_rest > 0 then
    raise exception 'Der alte Name steckt noch an % Stellen: %', v_rest, v_namen;
  end if;
  raise notice 'Umbenennung vollständig: kein "dienstleistung" mehr im Schema.';
end $$;
