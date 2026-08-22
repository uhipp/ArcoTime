-- =========================================================
-- 0076  Die Ortsebene: Standorte und Beteiligte
-- =========================================================
--
-- Siehe docs/plan-parteien-standorte.md, Etappe 4.
--
-- Zwischen Kunde und Auftrag fehlt der ORT. Aus zwei Gesprächen mit
-- Handwerksbetrieben und aus dem Beispiel Migros Region Basel: Der
-- Vertragspartner hat eine Adresse, gearbeitet wird an vielen anderen — in
-- Filialen, in Liegenschaften. Heute druckt das Rapport-PDF die Adresse des
-- Kunden, und die Anfahrtskilometer hängen am Kunden (0050 begründet das
-- damit, die Distanz zu einem Kunden ändere sich nie — bei einer Verwaltung
-- mit vierzig Liegenschaften ist das schlicht falsch).
--
-- ZWEI ENTSCHEIDUNGEN, die den Bau bestimmen:
--
-- 1. Der Standort gehört dem MANDANTEN, nicht dem Kunden. Kein kunde_id.
--    Verwaltung und Eigentümer hängen als Beteiligte mit Gültigkeitszeitraum
--    daran. Nur so überlebt die Historie einen Verwaltungswechsel – die
--    Antwort beider Betriebe darauf war „das wäre eine super Option".
--
-- 2. Deshalb müssen die BETEILIGTEN in dieselbe Migration. Ohne sie gibt es
--    keine Verbindung zwischen einem Kunden und „seinem" Standardstandort,
--    und 0077 könnte projekte.standort_id nicht befüllen. Der Plan hatte die
--    beiden getrennt; beim Schreiben zeigte sich, dass das nicht geht.

-- ---------------------------------------------------------
-- 1) Standorte
-- ---------------------------------------------------------
create table if not exists standorte (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null default current_organisation_id()
    references organisationen(id),
  bezeichnung text not null,
  strasse text,
  hausnummer text,
  adresse_zusatz text,
  plz text,
  ort text,
  land text not null default 'CH',
  -- Zieht in 0077 von kunden hierher. „Verrechnet je Einsatz" und nicht
  -- „Distanz" – sonst trägt der eine die einfache Strecke ein und der
  -- andere Hin und Zurück, und niemand merkt es (Wortlaut aus 0050).
  anreise_km numeric(10,2),
  -- Was der Monteur vor Ort braucht: Schlüssel Nr. 4, Code 4711, „klingeln
  -- beim Hauswart". Ein Feld, kein Formular – die Betriebe schreiben das
  -- heute in die Projektnotiz.
  zugang text,
  notiz text,
  -- Der automatisch aus der Kundenadresse erzeugte Standort. Solange ein
  -- Kunde nur diesen hat, blendet die Oberfläche die ganze Ebene aus.
  ist_standard boolean not null default false,
  aktiv boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  geaendert_von uuid references profiles(id)
);

create index if not exists idx_standorte_organisation
  on standorte(organisation_id, bezeichnung);
create index if not exists idx_standorte_aktiv
  on standorte(organisation_id) where aktiv;

drop trigger if exists standorte_updated_at on standorte;
create trigger standorte_updated_at before update on standorte
  for each row execute function set_updated_at();

alter table standorte enable row level security;

drop policy if exists "standorte_select" on standorte;
create policy "standorte_select" on standorte for select using (
  organisation_id = current_organisation_id()
);

-- Erfassen und ändern alle, löschen nur der Admin – dieselbe Linie wie bei
-- Kunden, Projekten und Ansprechpersonen. Wer vor Ort merkt, dass der
-- Zugangscode gewechselt hat, soll das eintragen können.
drop policy if exists "standorte_insert" on standorte;
create policy "standorte_insert" on standorte for insert with check (
  organisation_id = current_organisation_id()
);

drop policy if exists "standorte_update" on standorte;
create policy "standorte_update" on standorte for update using (
  organisation_id = current_organisation_id()
) with check (
  organisation_id = current_organisation_id()
);

drop policy if exists "standorte_delete_admin" on standorte;
create policy "standorte_delete_admin" on standorte for delete using (
  is_admin() and organisation_id = current_organisation_id()
);

comment on table standorte is
  'Der Ort, an dem gearbeitet wird: Liegenschaft, Filiale, Objekt, Anlage – '
  'wie der Betrieb es nennt, sagt begriffe (0073). Gehört dem Mandanten und '
  'NICHT einem Kunden: Wechselt die Verwaltung, bleibt der Ort mit seiner '
  'Geschichte, und die Parteien daran wechseln (Tabelle beteiligte).';

-- ---------------------------------------------------------
-- 2) Rollen der Beteiligten – eine Auswahlliste, wie alle
-- ---------------------------------------------------------
create table if not exists beteiligten_rollen (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null default current_organisation_id()
    references organisationen(id),
  bezeichnung text not null,
  sortierung int not null default 0,
  aktiv boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organisation_id, bezeichnung)
);

drop trigger if exists beteiligten_rollen_updated_at on beteiligten_rollen;
create trigger beteiligten_rollen_updated_at before update on beteiligten_rollen
  for each row execute function set_updated_at();

alter table beteiligten_rollen enable row level security;

drop policy if exists "beteiligten_rollen_select" on beteiligten_rollen;
create policy "beteiligten_rollen_select" on beteiligten_rollen for select using (
  organisation_id = current_organisation_id()
);

drop policy if exists "beteiligten_rollen_write_admin" on beteiligten_rollen;
create policy "beteiligten_rollen_write_admin" on beteiligten_rollen for all using (
  is_admin() and organisation_id = current_organisation_id()
) with check (
  is_admin() and organisation_id = current_organisation_id()
);

-- Vorgaben. „Kunde" steht bewusst zuoberst und wird von der Anwendung
-- gebraucht (siehe Trigger unten) – die übrigen sind Vorschläge, die ein
-- Betrieb löschen oder ergänzen darf.
insert into beteiligten_rollen (organisation_id, bezeichnung, sortierung)
select o.id, v.bezeichnung, v.sortierung
from organisationen o
cross join (values
  ('Kunde', 0),
  ('Eigentümer', 1),
  ('Verwaltung', 2),
  ('Hauswart', 3),
  ('Mieter', 4),
  ('Architekt', 5),
  ('Bauleitung', 6),
  ('Subunternehmer', 7),
  ('Behörde', 8)
) as v(bezeichnung, sortierung)
on conflict (organisation_id, bezeichnung) do nothing;

-- ---------------------------------------------------------
-- 3) Beteiligte
-- ---------------------------------------------------------
-- Die zweite Achse: Die Kette Kunde → Standort → Auftrag sagt, WO gearbeitet
-- wird; die Beteiligten sagen, WER mitredet und wer welchen Beleg bekommt.
--
-- Echte Fremdschlüssel je Bezugsart statt eines polymorphen bezug_id: Der
-- fehlende Fremdschlüssel in "dokumente" hat am 18.08.2026 fünf verwaiste
-- Zeilen gekostet, zu denen niemand mehr sagen konnte, wohin sie gehören.
-- Hier räumt die Datenbank selbst auf.
create table if not exists beteiligte (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null default current_organisation_id()
    references organisationen(id),
  rolle_id uuid not null references beteiligten_rollen(id) on delete restrict,
  -- Die Partei selbst. on delete restrict: Ein Partner, der irgendwo
  -- beteiligt ist, lässt sich nicht wegräumen, ohne die Beteiligung zu
  -- lösen – genau das verhindert die verwaisten Verweise.
  partner_id uuid not null references kunden(id) on delete restrict,
  -- Die konkrete Person bei dieser Partei. set null: Das Löschen einer
  -- Person darf die Beteiligung nicht sprengen.
  ansprechperson_id uuid references ansprechpersonen(id) on delete set null,
  standort_id uuid references standorte(id) on delete cascade,
  projekt_id uuid references projekte(id) on delete cascade,
  rapport_id uuid references rapporte(id) on delete cascade,
  -- Der Wechsel von Verwaltung oder Eigentümer soll die Historie
  -- überleben – ausdrücklich gewünscht am 21.08.2026.
  gueltig_von date,
  gueltig_bis date,
  notiz text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint beteiligte_genau_ein_bezug
    check (num_nonnulls(standort_id, projekt_id, rapport_id) = 1),
  constraint beteiligte_zeitraum_sinnvoll
    check (gueltig_bis is null or gueltig_von is null or gueltig_bis >= gueltig_von)
);

create index if not exists idx_beteiligte_standort on beteiligte(standort_id);
create index if not exists idx_beteiligte_projekt on beteiligte(projekt_id);
create index if not exists idx_beteiligte_rapport on beteiligte(rapport_id);
-- Für die Frage „welcher Standort gehört zu diesem Kunden" (Funktion unten).
create index if not exists idx_beteiligte_partner_rolle
  on beteiligte(partner_id, rolle_id);

drop trigger if exists beteiligte_updated_at on beteiligte;
create trigger beteiligte_updated_at before update on beteiligte
  for each row execute function set_updated_at();

alter table beteiligte enable row level security;

drop policy if exists "beteiligte_select" on beteiligte;
create policy "beteiligte_select" on beteiligte for select using (
  organisation_id = current_organisation_id()
);

drop policy if exists "beteiligte_insert" on beteiligte;
create policy "beteiligte_insert" on beteiligte for insert with check (
  organisation_id = current_organisation_id()
);

drop policy if exists "beteiligte_update" on beteiligte;
create policy "beteiligte_update" on beteiligte for update using (
  organisation_id = current_organisation_id()
) with check (
  organisation_id = current_organisation_id()
);

drop policy if exists "beteiligte_delete" on beteiligte;
create policy "beteiligte_delete" on beteiligte for delete using (
  organisation_id = current_organisation_id()
);

comment on table beteiligte is
  'Rolle einer Partei an einem Ort, einem Auftrag oder einem Beleg. Genau ein '
  'Bezug je Zeile (num_nonnulls) – kein polymorphes bezug_id wie in dokumente. '
  'Mit Gültigkeitszeitraum, damit ein Wechsel der Verwaltung die Historie des '
  'Ortes nicht zerreisst.';

-- ---------------------------------------------------------
-- 4) Ansprechpersonen und Kontakte dürfen am Standort hängen
-- ---------------------------------------------------------
-- 0074 hat die Bedingung „kunde_id ist Pflicht" gesetzt, weil es die
-- Standorte noch nicht gab. Jetzt gilt das, was der Plan vorsah: genau ein
-- Bezug. Der Hauswart hängt am Ort, die Sachbearbeiterin am Partner.
alter table ansprechpersonen
  add column if not exists standort_id uuid references standorte(id) on delete cascade;

alter table ansprechpersonen drop constraint if exists ansprechpersonen_bezug;
alter table ansprechpersonen add constraint ansprechpersonen_genau_ein_bezug
  check (num_nonnulls(kunde_id, standort_id) = 1);

create index if not exists idx_ansprechpersonen_standort
  on ansprechpersonen(standort_id) where standort_id is not null;

alter table kontakte
  add column if not exists standort_id uuid references standorte(id) on delete cascade;

alter table kontakte drop constraint if exists kontakte_genau_ein_bezug;
alter table kontakte add constraint kontakte_genau_ein_bezug
  check (num_nonnulls(kunde_id, standort_id, ansprechperson_id) = 1);

create index if not exists idx_kontakte_standort
  on kontakte(standort_id) where standort_id is not null;

-- ---------------------------------------------------------
-- 5) Die Ebene ein- und ausschalten
-- ---------------------------------------------------------
-- Wer keine Standorte kennt (ein IT-Dienstleister mit einem Ort je Kunde),
-- soll die Ebene nie sehen. Sie ist trotzdem in der Datenbank – deshalb
-- braucht das Einschalten später KEINE Datenmigration.
alter table organisationen
  add column if not exists standorte_aktiv boolean not null default false;

comment on column organisationen.standorte_aktiv is
  'false = die Oberfläche blendet die Standortebene aus und setzt still den '
  'Standardstandort. true = Feld sichtbar, mehrere Standorte pflegbar. Die '
  'Daten liegen in beiden Fällen gleich.';

-- ---------------------------------------------------------
-- 6) Der Standardstandort entsteht von selbst
-- ---------------------------------------------------------
-- Als Trigger und nicht in der Server Action: Er muss auch beim Import, bei
-- der Schnellerfassung und bei jedem anderen Schreibweg greifen. Ein Kunde
-- ohne Standort wäre ab 0077 ein Kunde, für den sich kein Auftrag anlegen
-- lässt.
--
-- Nur für echte Kunden (ist_kunde): Ein Architekt oder eine Behörde braucht
-- keinen Einsatzort. Wird das Häkchen später gesetzt, greift derselbe
-- Trigger über das update.
create or replace function lege_standardstandort_an()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_standort uuid;
  v_rolle uuid;
begin
  if not new.ist_kunde then
    return new;
  end if;

  -- Schon vorhanden? Dann nichts tun. Der Trigger läuft auch bei jedem
  -- update auf ist_kunde und muss deshalb wiederholbar sein.
  select b.standort_id into v_standort
    from beteiligte b
    join beteiligten_rollen r on r.id = b.rolle_id
    join standorte s on s.id = b.standort_id
   where b.partner_id = new.id
     and r.bezeichnung = 'Kunde'
     and s.ist_standard
   limit 1;

  if v_standort is not null then
    return new;
  end if;

  select id into v_rolle
    from beteiligten_rollen
   where organisation_id = new.organisation_id and bezeichnung = 'Kunde'
   limit 1;

  -- Ohne die Rolle keine Verknüpfung. Lieber laut scheitern als einen
  -- Standort anlegen, der zu niemandem gehört.
  if v_rolle is null then
    raise exception
      'Rolle "Kunde" fehlt in Organisation % – Standardstandort nicht anlegbar', new.organisation_id;
  end if;

  insert into standorte (
    organisation_id, bezeichnung, strasse, hausnummer, adresse_zusatz,
    plz, ort, land, anreise_km, ist_standard
  ) values (
    new.organisation_id,
    -- Der Name des Kunden als Bezeichnung: Wer die Ebene nie einschaltet,
    -- liest ihn in Listen und auf Belegen und merkt nichts von ihr.
    coalesce(nullif(trim(concat_ws(' ', new.vorname, new.name)), ''), 'Standort'),
    new.strasse, new.hausnummer, new.adresse_zusatz,
    new.plz, new.ort, coalesce(new.land, 'CH'),
    new.anreise_km,
    true
  )
  returning id into v_standort;

  insert into beteiligte (organisation_id, rolle_id, partner_id, standort_id)
  values (new.organisation_id, v_rolle, new.id, v_standort);

  return new;
end;
$$;

drop trigger if exists kunden_standardstandort on kunden;
create trigger kunden_standardstandort
  after insert or update of ist_kunde on kunden
  for each row execute function lege_standardstandort_an();

-- ---------------------------------------------------------
-- 7) Nachschlagen: welcher Standort gehört zu diesem Kunden?
-- ---------------------------------------------------------
-- Eine Funktion statt einer zweiten Spalte am Standort: Die Verbindung steht
-- in beteiligte, und zwei Stellen, die dasselbe behaupten, laufen
-- auseinander. Gebraucht beim Anlegen eines Auftrags und beim Backfill.
create or replace function standardstandort(p_kunde uuid)
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select b.standort_id
    from beteiligte b
    join beteiligten_rollen r on r.id = b.rolle_id
    join standorte s on s.id = b.standort_id
   where b.partner_id = p_kunde
     and r.bezeichnung = 'Kunde'
     and s.ist_standard
   order by s.created_at
   limit 1;
$$;

comment on function standardstandort(uuid) is
  'Der automatisch erzeugte Einsatzort eines Kunden. Die Verbindung steht in '
  'beteiligte (Rolle "Kunde"), nicht als zweite Spalte am Standort.';

-- ---------------------------------------------------------
-- 8) Bestand nachziehen
-- ---------------------------------------------------------
-- Für jeden bestehenden Kunden einen Standardstandort. Bewusst über denselben
-- Weg wie der Trigger, damit es nur eine Logik gibt: ein update, das nichts
-- ändert, löst ihn aus.
do $$
declare
  v_vorher int;
  v_nachher int;
begin
  select count(*) into v_vorher from standorte;
  update kunden set ist_kunde = ist_kunde where ist_kunde;
  select count(*) into v_nachher from standorte;
  raise notice 'Standardstandorte angelegt: % (vorher %, nachher %)',
    v_nachher - v_vorher, v_vorher, v_nachher;
end $$;

-- ---------------------------------------------------------
-- 9) Dokumente am Standort
-- ---------------------------------------------------------
-- Fotos vom Objekt, Pläne, das Farbmuster von 2019. Die Prüfregel zählt die
-- Bereiche einzeln auf und muss deshalb ersetzt werden – dieselbe Klasse wie
-- bei 0034.
alter table dokumente drop constraint if exists dokumente_bereich_check;
alter table dokumente add constraint dokumente_bereich_check
  check (bereich in ('kunde', 'projekt', 'mitarbeitende', 'anfrage',
                     'zeiteintrag', 'rapport', 'standort'));

-- ---------------------------------------------------------
-- 10) Änderungsprotokoll
-- ---------------------------------------------------------
-- Punkt 4 der Prüfliste aus dem Plan. Die Tabellenliste in 0053 ist eine
-- Handliste; wer sie vergisst, verliert die Nachvollziehbarkeit still.
do $$
declare
  t text;
  tabellen text[] := array['standorte', 'beteiligte', 'beteiligten_rollen'];
begin
  foreach t in array tabellen loop
    if to_regclass('public.' || t) is not null then
      execute format('drop trigger if exists %I on public.%I', t || '_protokoll', t);
      execute format(
        'create trigger %I after insert or update or delete on public.%I
           for each row execute function protokolliere_aenderung()',
        t || '_protokoll', t
      );
    end if;
  end loop;
end $$;
