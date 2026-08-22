-- =========================================================
-- 0079  Der Standort ist eine Adresse, nichts weiter
-- =========================================================
--
-- Siehe docs/plan-ablauf-standorte.md, Etappe 1. Setzt 0078 voraus.
--
-- Entscheidung des Nutzers vom 22.08.2026:
--
--   „Da Standorte lediglich die technische Möglichkeit bieten, eine
--    Aufteilungsstufe mehr zu haben, darf kein weiterer Informationsträger
--    ausser Projekt direkt am Standort hangen. … Ausser der Postadresse
--    gehört gar nichts in den Standort."
--
-- Damit gilt der Satz, an dem sich künftig jede Maske messen lässt:
-- Variante A (mit Standorten) gibt dem Betrieb GENAU ZWEI Dinge – mehrere
-- Adressen je Kunde erfassen und wählen, und Auswertungen je Adresse. Alles
-- andere ist in A und B identisch.
--
-- Diese Migration nimmt deshalb zurück, was 0076 zu weit gebaut hat. Die
-- Begründung dort war nicht falsch, sondern ihre Voraussetzung ist entfallen:
-- Weil die zusätzlichen Adressen (Architekt, Eigentümer, Hauswart) am Projekt
-- hängen, hat ein Standort zu jedem Zeitpunkt genau EINEN Kunden – und damit
-- eine gewöhnliche Spalte statt einer Beteiligtenzeile.

-- ---------------------------------------------------------
-- 0) Nachtrag zu 0078: die Branchenvorlagen
-- ---------------------------------------------------------
-- 0078 hat Wörter nur dort ersetzt, wo noch die alte Vorgabe stand. Dabei kam
-- heraus, dass die zwei Branchenvorlagen „Leistung" sagen – und „Leistung"
-- ist für eine Dose Farbe genauso falsch wie „Dienstleistung". Ein Betrieb,
-- der ein eigenes Wort will, setzt es in den Bezeichnungen.
update begriff_vorlagen
   set einzahl = 'Artikel', mehrzahl = 'Artikel', genus = 'm'
 where schluessel = 'artikel'
   and einzahl in ('Leistung', 'Dienstleistung');

-- ---------------------------------------------------------
-- 1) Der Standort bekommt seinen Kunden als Spalte
-- ---------------------------------------------------------
alter table standorte
  add column if not exists kunde_id uuid references kunden(id) on delete cascade;

-- Aus den Beteiligtenzeilen mit der Rolle „Kunde", die 0076 angelegt hat.
update standorte s
   set kunde_id = b.partner_id
  from beteiligte b
  join beteiligten_rollen r on r.id = b.rolle_id
 where b.standort_id = s.id
   and r.bezeichnung = 'Kunde'
   and s.kunde_id is null;

do $$
declare
  v_offen int;
  v_namen text;
begin
  select count(*), string_agg(bezeichnung, ', ')
    into v_offen, v_namen
    from standorte where kunde_id is null;
  if v_offen > 0 then
    raise exception
      'Für % Standort(e) fehlt der Kunde: %. Diese Zeilen sind von Hand zuzuordnen, bevor die Spalte Pflicht wird.',
      v_offen, v_namen;
  end if;
  raise notice 'Alle Standorte haben ihren Kunden.';
end $$;

alter table standorte alter column kunde_id set not null;
create index if not exists idx_standorte_kunde on standorte(kunde_id);

comment on column standorte.kunde_id is
  'Wer diese Adresse betreuen lässt. Genau einer je Zeitpunkt – die Frage, '
  'die 0076 über eine Beteiligtenzeile gelöst hat, stellt sich nicht mehr, '
  'seit die zusätzlichen Adressen am Projekt hängen (0079). '
  'Verkauf innerhalb der Organisation = Wechsel dieser Spalte; wer, wann und '
  'von wem auf wen hält das Änderungsprotokoll fest (0053). Verkauf nach '
  'draussen = Stilllegung über aktiv.';

-- ---------------------------------------------------------
-- 2) Damit ein Kunde noch löschbar bleibt
-- ---------------------------------------------------------
-- Ein Fallstrick, der ohne diesen Schritt erst beim ersten Löschversuch
-- aufgefallen wäre: Das Löschen eines Kunden räumt seine Projekte mit (cascade
-- seit 0008) und über die Spalte oben nun auch seine Standorte. Der
-- Fremdschlüssel projekte.standort_id stand aber auf RESTRICT, und RESTRICT
-- wird SOFORT geprüft – auch dann, wenn die verweisende Zeile im selben Befehl
-- verschwindet. Das Löschen wäre also mit einer unverständlichen Meldung
-- gescheitert.
--
-- NO ACTION prüft dasselbe, erlaubt die Prüfung aber am Ende des Befehls.
-- Verwaiste Aufträge sind damit weiterhin unmöglich; ein Kunde bleibt
-- löschbar.
alter table projekte drop constraint if exists projekte_standort_id_fkey;
alter table projekte add constraint projekte_standort_id_fkey
  foreign key (standort_id) references standorte(id) on delete no action;

-- ---------------------------------------------------------
-- 3) Die zwei Funktionen aus 0076 lesen jetzt die Spalte
-- ---------------------------------------------------------
create or replace function standardstandort(p_kunde uuid)
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select s.id
    from standorte s
   where s.kunde_id = p_kunde
     and s.ist_standard
   order by s.created_at
   limit 1;
$$;

comment on function standardstandort(uuid) is
  'Die vorgeschlagene Adresse eines Kunden. Seit 0079 eine gewöhnliche '
  'Abfrage auf standorte statt eines Wegs über die Beteiligten.';

create or replace function lege_standardstandort_an()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_standort uuid;
begin
  if not new.ist_kunde then
    return new;
  end if;

  -- Wiederholbar: Der Trigger läuft auch bei jedem update auf ist_kunde.
  select id into v_standort
    from standorte
   where kunde_id = new.id and ist_standard
   limit 1;

  if v_standort is not null then
    return new;
  end if;

  insert into standorte (
    organisation_id, kunde_id, bezeichnung, strasse, hausnummer,
    adresse_zusatz, plz, ort, land, anreise_km, ist_standard
  ) values (
    new.organisation_id,
    new.id,
    -- Der Name des Kunden als Bezeichnung: Wer die Ebene nie einschaltet,
    -- liest ihn in Listen und auf Belegen und merkt nichts von ihr.
    coalesce(nullif(trim(concat_ws(' ', new.vorname, new.name)), ''), 'Standort'),
    new.strasse, new.hausnummer, new.adresse_zusatz,
    new.plz, new.ort, coalesce(new.land, 'CH'),
    -- Zieht in 0080 ans Projekt weiter; hier noch mitgenommen, damit die
    -- Reihenfolge der Migrationen keinen Wert verliert.
    new.anreise_km,
    true
  );

  return new;
end;
$$;

-- ---------------------------------------------------------
-- 4) Die zusätzlichen Adressen hängen am Projekt
-- ---------------------------------------------------------
-- Die 14 Zeilen, die es gibt, sind ausschliesslich die strukturelle
-- Zugehörigkeit „dieser Ort gehört diesem Kunden" – nachgezählt am
-- 22.08.2026. Sie sind mit Abschnitt 1 in eine Spalte übergegangen und
-- haben hier keine Aufgabe mehr.
delete from beteiligte b
 using beteiligten_rollen r
 where r.id = b.rolle_id and r.bezeichnung = 'Kunde';

do $$
declare
  v_rest int;
begin
  select count(*) into v_rest from beteiligte where standort_id is not null;
  if v_rest > 0 then
    raise exception
      'Es hängen noch % Beteiligte an einem Standort. Sie müssten an ein Projekt umziehen – bitte von Hand ansehen.',
      v_rest;
  end if;
end $$;

alter table beteiligte drop constraint if exists beteiligte_genau_ein_bezug;
alter table beteiligte drop column if exists standort_id;
alter table beteiligte drop column if exists rapport_id;
alter table beteiligte alter column projekt_id set not null;

alter table beteiligte rename to projekt_adressen;
alter table beteiligten_rollen rename to adress_rollen;

comment on table projekt_adressen is
  'Die zusätzlichen Adressen an einem Auftrag, mit Rolle: Eigentümer, '
  'Verwaltung, Architekt, Bauleitung, Subunternehmer, Behörde, Hauswart, '
  'Mieter. Eine Verknüpfung und keine Kopie – die Adresse steht einmal im '
  'Adressbuch, zieht das Büro um, stimmt es in allen Aufträgen. '
  'Hiess bis 0079 "beteiligte" und hing damals am Standort; die Ebene war '
  'eine zu viel (siehe docs/plan-ablauf-standorte.md).';
comment on table adress_rollen is
  'In welcher Rolle eine Adresse an einem Auftrag beteiligt ist. Die Rolle '
  '"Kunde" ist in 0079 entfallen: Wer bestellt, steht als Spalte am Auftrag, '
  'und wem eine Adresse gehört, als Spalte am Standort.';

-- ---------------------------------------------------------
-- 5) Die Rolle „Kunde" ist keine Rolle mehr
-- ---------------------------------------------------------
delete from adress_rollen where bezeichnung = 'Kunde';

-- ---------------------------------------------------------
-- 6) Zwei ähnliche Namen für Verschiedenes
-- ---------------------------------------------------------
-- rapport_beteiligte sind die MITARBEITENDEN an einem Teamrapport,
-- projekt_adressen die externen Adressen. Zwei fast gleiche Namen für
-- Verschiedenes sind eine Falle; umbenannt, solange fast keine Daten
-- darin stehen. Der neue Name passt zum bestehenden projekt_mitarbeiter.
alter table if exists rapport_beteiligte rename to rapport_mitarbeiter;

comment on table rapport_mitarbeiter is
  'Wer an einem Rapport mitgearbeitet hat (Teamrapport, 0044). Hiess bis '
  '0079 "rapport_beteiligte" und war damit von den externen Adressen '
  '(projekt_adressen) kaum zu unterscheiden.';

-- ---------------------------------------------------------
-- 7) Was am Standort nicht mehr hingehört
-- ---------------------------------------------------------
-- Nachgezählt: keine Zeile trägt Zugang oder Notiz. zugang und anreise_km
-- bleiben bis 0080 stehen – dort werden sie ans Projekt umgezogen und danach
-- entfernt. Die Notiz fällt schon hier, weil projekte.notizen es längst gibt.
alter table standorte drop column if exists notiz;

-- Der Hauswart ist eine der zusätzlichen Adressen am Auftrag, keine Person
-- an einer Adresse. Nachgezählt: keine Zeile nutzt die Spalte.
alter table ansprechpersonen drop constraint if exists ansprechpersonen_genau_ein_bezug;
alter table ansprechpersonen drop column if exists standort_id;
alter table ansprechpersonen
  add constraint ansprechpersonen_bezug check (kunde_id is not null);

-- Dasselbe für die Kontaktkanäle: Eine Postadresse hat keine Telefonnummer.
alter table kontakte drop constraint if exists kontakte_genau_ein_bezug;
alter table kontakte drop column if exists standort_id;
alter table kontakte add constraint kontakte_genau_ein_bezug
  check (num_nonnulls(kunde_id, ansprechperson_id) = 1);

-- ---------------------------------------------------------
-- 8) Bedingungen, Indizes, Regeln und Trigger tragen die Namen mit
-- ---------------------------------------------------------
-- Postgres benennt sie beim Umbenennen der Tabelle nicht mit, und
-- lib/db-fehler.ts übersetzt nach dem NAMEN der Bedingung. Reihenfolge der
-- Ersetzungen: zuerst das längere Wort, sonst wird aus
-- „rapport_beteiligte_pkey" ein „rapport_projekt_adressen_pkey".
create or replace function pg_temp.neuer_name(alt text)
returns text language sql immutable as $$
  select replace(
           replace(
             replace(alt, 'rapport_beteiligte', 'rapport_mitarbeiter'),
             'beteiligten_rollen', 'adress_rollen'),
           'beteiligte', 'projekt_adressen')
$$;

do $$
declare
  r record;
begin
  for r in
    select c.conname, c.conrelid::regclass::text as tabelle
      from pg_constraint c
      join pg_class t on t.oid = c.conrelid
      join pg_namespace n on n.oid = t.relnamespace
     where n.nspname = 'public' and c.conname like '%beteiligte%'
  loop
    execute format('alter table %s rename constraint %I to %I',
                   r.tabelle, r.conname, pg_temp.neuer_name(r.conname));
  end loop;

  for r in
    select indexname from pg_indexes
     where schemaname = 'public' and indexname like '%beteiligte%'
  loop
    execute format('alter index %I rename to %I',
                   r.indexname, pg_temp.neuer_name(r.indexname));
  end loop;

  for r in
    select policyname, tablename from pg_policies
     where schemaname = 'public' and policyname like '%beteiligte%'
  loop
    execute format('alter policy %I on public.%I rename to %I',
                   r.policyname, r.tablename, pg_temp.neuer_name(r.policyname));
  end loop;

  for r in
    select t.tgname, c.relname
      from pg_trigger t
      join pg_class c on c.oid = t.tgrelid
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and not t.tgisinternal
       and t.tgname like '%beteiligte%'
  loop
    execute format('alter trigger %I on public.%I rename to %I',
                   r.tgname, r.relname, pg_temp.neuer_name(r.tgname));
  end loop;
end $$;

-- ---------------------------------------------------------
-- 9) Das Änderungsprotokoll
-- ---------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['projekt_adressen', 'adress_rollen', 'rapport_mitarbeiter'] loop
    execute format('drop trigger if exists %I on public.%I', t || '_protokoll', t);
    execute format(
      'create trigger %I after insert or update or delete on public.%I
         for each row execute function protokolliere_aenderung()',
      t || '_protokoll', t
    );
  end loop;
end $$;

-- Die Zeilen tragen den Tabellennamen als Text.
update aenderungsprotokoll set tabelle = 'rapport_mitarbeiter' where tabelle = 'rapport_beteiligte';
update aenderungsprotokoll set tabelle = 'adress_rollen'       where tabelle = 'beteiligten_rollen';
update aenderungsprotokoll set tabelle = 'projekt_adressen'    where tabelle = 'beteiligte';

-- ---------------------------------------------------------
-- 10) Nachzählen statt hoffen
-- ---------------------------------------------------------
do $$
declare
  v_rest int;
  v_namen text;
begin
  select count(*), string_agg(distinct name, ', ') into v_rest, v_namen
  from (
    select conname as name from pg_constraint c
      join pg_class t on t.oid = c.conrelid
      join pg_namespace n on n.oid = t.relnamespace
     where n.nspname = 'public' and conname like '%beteiligte%'
    union all
    select indexname from pg_indexes
     where schemaname = 'public' and indexname like '%beteiligte%'
    union all
    select policyname from pg_policies
     where schemaname = 'public' and policyname like '%beteiligte%'
    union all
    select table_name from information_schema.tables
     where table_schema = 'public' and table_name like '%beteiligte%'
    union all
    select column_name from information_schema.columns
     where table_schema = 'public' and column_name like '%standort_id%'
       and table_name in ('ansprechpersonen', 'kontakte', 'projekt_adressen')
  ) offen;

  if v_rest > 0 then
    raise exception 'Der alte Zustand steckt noch an % Stellen: %', v_rest, v_namen;
  end if;
  raise notice 'Der Standort ist eine Adresse. Die zusätzlichen Adressen hängen am Auftrag.';
end $$;
