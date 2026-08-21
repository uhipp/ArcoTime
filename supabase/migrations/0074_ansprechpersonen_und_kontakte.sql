-- =========================================================
-- 0074  Ansprechpersonen und Kontaktkanäle
-- =========================================================
--
-- Siehe docs/plan-parteien-standorte.md, Etappe 3.
--
-- Aus den Gesprächen: Sobald ein Kunde grösser ist, gibt es dort mehrere
-- Personen, die für den Betrieb wichtig sind – mit eigenen Kontaktdaten und
-- teilweise an einem anderen Ort. Migros Region Basel ist Vertragspartner,
-- gearbeitet wird in den Filialen, und dort sitzt je eine Ansprechperson.
-- Beim Maler ist es die Sachbearbeiterin der Verwaltung und der Hauswart der
-- Liegenschaft.
--
-- Heute kennt ArcoTime davon nichts: kunden.email und kunden.telefon sind
-- eine Firmenadresse, und rapporte.unterzeichner_name ist ein Freitext, der
-- bei jedem Einsatz neu getippt wird.

-- ---------------------------------------------------------
-- 1) Der Geschäftspartner bekommt eine Rolle
-- ---------------------------------------------------------
-- Ein Eigentümer, ein Architekt oder eine Behörde braucht genau die Felder,
-- die ein Kunde hat: Adresse, Anrede, Sprache. Eine zweite Firmentabelle
-- wäre die schlechtere Verdoppelung – die Tabelle "kunden" IST bereits ein
-- Adressbuch. Sie bekommt deshalb ein Kennzeichen, und die Kundenlisten
-- filtern darauf.
--
-- Vorgabe true: Alle bestehenden Zeilen sind Kunden. Wer künftig nur
-- Eigentümer ist, wird ohne dieses Häkchen erfasst und erscheint damit nicht
-- in der Auswahl eines Auftrags.
alter table kunden
  add column if not exists ist_kunde boolean not null default true;

comment on column kunden.ist_kunde is
  'true = erscheint in der Kundenliste und kann Vertragspartner eines '
  'Auftrags sein. false = Geschäftspartner in anderer Rolle (Eigentümer, '
  'Architekt, Behörde) – ab 0076 über die Tabelle "beteiligte" verknüpft.';

create index if not exists idx_kunden_ist_kunde
  on kunden(organisation_id) where ist_kunde;

-- ---------------------------------------------------------
-- 2) Ansprechpersonen
-- ---------------------------------------------------------
-- Eine Person hängt an einem Geschäftspartner (die Sachbearbeiterin der
-- Verwaltung) ODER an einem Standort (der Hauswart) – genau an einem von
-- beiden. Der Standort kommt in 0075; die Spalte wird dort nachgezogen,
-- damit diese Migration nicht auf eine Tabelle wartet, die es noch nicht
-- gibt.
create table if not exists ansprechpersonen (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null default current_organisation_id()
    references organisationen(id),
  kunde_id uuid references kunden(id) on delete cascade,
  anrede text,
  vorname text,
  name text not null,
  funktion text,
  notiz text,
  -- Die Person, die standardmässig vorgeschlagen wird – etwa als
  -- Empfängerin eines Belegs.
  ist_standard boolean not null default false,
  aktiv boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  geaendert_von uuid references profiles(id),
  -- Bis 0075 ist der Kunde der einzige mögliche Bezug, also Pflicht. Die
  -- Bedingung wird dort durch num_nonnulls(kunde_id, standort_id) = 1
  -- ersetzt.
  constraint ansprechpersonen_bezug check (kunde_id is not null)
);

create index if not exists idx_ansprechpersonen_kunde
  on ansprechpersonen(kunde_id) where aktiv;
create index if not exists idx_ansprechpersonen_organisation
  on ansprechpersonen(organisation_id, name);

drop trigger if exists ansprechpersonen_updated_at on ansprechpersonen;
create trigger ansprechpersonen_updated_at before update on ansprechpersonen
  for each row execute function set_updated_at();

alter table ansprechpersonen enable row level security;

-- Lesen alle in der Organisation: Wer beim Kunden anruft, braucht die
-- Nummer. Anders als bei den Personal-Dokumenten (0015) ist hier nichts
-- Sensibles – es sind Geschäftskontakte.
drop policy if exists "ansprechpersonen_select" on ansprechpersonen;
create policy "ansprechpersonen_select" on ansprechpersonen for select using (
  organisation_id = current_organisation_id()
);

-- Schreiben alle: Wer vor Ort merkt, dass der Hauswart gewechselt hat, soll
-- das eintragen können, ohne den Admin zu fragen. Löschen bleibt beim
-- Admin – dieselbe Linie wie bei Kunden und Projekten
-- (siehe memory: Mitarbeitende erfassen und bearbeiten, löschen nur Admins).
drop policy if exists "ansprechpersonen_insert" on ansprechpersonen;
create policy "ansprechpersonen_insert" on ansprechpersonen for insert with check (
  organisation_id = current_organisation_id()
);

drop policy if exists "ansprechpersonen_update" on ansprechpersonen;
create policy "ansprechpersonen_update" on ansprechpersonen for update using (
  organisation_id = current_organisation_id()
) with check (
  organisation_id = current_organisation_id()
);

drop policy if exists "ansprechpersonen_delete_admin" on ansprechpersonen;
create policy "ansprechpersonen_delete_admin" on ansprechpersonen for delete using (
  is_admin() and organisation_id = current_organisation_id()
);

-- ---------------------------------------------------------
-- 3) Kontaktarten – eine Auswahlliste, wie alle anderen
-- ---------------------------------------------------------
-- Heute hat der Kunde genau eine Mailadresse und eine Telefonnummer.
-- Gebraucht werden Direktwahl, Mobil, WhatsApp – und beim IT-Dienstleister
-- Teams. Nichts davon gehört fix in den Code: Der nächste Kanal kommt
-- bestimmt.
create table if not exists kontakt_arten (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null default current_organisation_id()
    references organisationen(id),
  bezeichnung text not null,
  -- Steuert, wie der Wert angeboten wird: eine Mailadresse als mailto,
  -- eine Nummer als tel. Bewusst nur ein Hinweis für die Oberfläche und
  -- keine Prüfregel – wer "Zentrale (Mo–Fr)" einträgt, soll das dürfen.
  art text not null default 'text' check (art in ('text', 'email', 'telefon')),
  sortierung int not null default 0,
  aktiv boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organisation_id, bezeichnung)
);

drop trigger if exists kontakt_arten_updated_at on kontakt_arten;
create trigger kontakt_arten_updated_at before update on kontakt_arten
  for each row execute function set_updated_at();

alter table kontakt_arten enable row level security;

drop policy if exists "kontakt_arten_select" on kontakt_arten;
create policy "kontakt_arten_select" on kontakt_arten for select using (
  organisation_id = current_organisation_id()
);

drop policy if exists "kontakt_arten_write_admin" on kontakt_arten;
create policy "kontakt_arten_write_admin" on kontakt_arten for all using (
  is_admin() and organisation_id = current_organisation_id()
) with check (
  is_admin() and organisation_id = current_organisation_id()
);

insert into kontakt_arten (organisation_id, bezeichnung, art, sortierung)
select o.id, v.bezeichnung, v.art, v.sortierung
from organisationen o
cross join (values
  ('E-Mail',   'email',   0),
  ('Telefon',  'telefon', 1),
  ('Mobil',    'telefon', 2),
  ('Direktwahl', 'telefon', 3),
  ('WhatsApp', 'telefon', 4)
) as v(bezeichnung, art, sortierung)
on conflict (organisation_id, bezeichnung) do nothing;

-- ---------------------------------------------------------
-- 4) Kontakte
-- ---------------------------------------------------------
-- Hängen an einem Geschäftspartner ODER an einer Ansprechperson – genau an
-- einem von beiden. Der Standort kommt in 0075 dazu.
--
-- Echte Fremdschlüssel je Bezugsart statt eines polymorphen bezug_id: Der
-- fehlende Fremdschlüssel in "dokumente" hat am 18.08.2026 fünf verwaiste
-- Zeilen gekostet, zu denen niemand mehr sagen konnte, wohin sie gehören.
create table if not exists kontakte (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null default current_organisation_id()
    references organisationen(id),
  kunde_id uuid references kunden(id) on delete cascade,
  ansprechperson_id uuid references ansprechpersonen(id) on delete cascade,
  art_id uuid not null references kontakt_arten(id) on delete restrict,
  wert text not null,
  bemerkung text,
  ist_standard boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint kontakte_genau_ein_bezug
    check (num_nonnulls(kunde_id, ansprechperson_id) = 1)
);

create index if not exists idx_kontakte_kunde on kontakte(kunde_id);
create index if not exists idx_kontakte_person on kontakte(ansprechperson_id);

drop trigger if exists kontakte_updated_at on kontakte;
create trigger kontakte_updated_at before update on kontakte
  for each row execute function set_updated_at();

alter table kontakte enable row level security;

drop policy if exists "kontakte_select" on kontakte;
create policy "kontakte_select" on kontakte for select using (
  organisation_id = current_organisation_id()
);

drop policy if exists "kontakte_insert" on kontakte;
create policy "kontakte_insert" on kontakte for insert with check (
  organisation_id = current_organisation_id()
);

drop policy if exists "kontakte_update" on kontakte;
create policy "kontakte_update" on kontakte for update using (
  organisation_id = current_organisation_id()
) with check (
  organisation_id = current_organisation_id()
);

drop policy if exists "kontakte_delete_admin" on kontakte;
create policy "kontakte_delete_admin" on kontakte for delete using (
  is_admin() and organisation_id = current_organisation_id()
);

-- ---------------------------------------------------------
-- 5) Die bestehenden Angaben übernehmen
-- ---------------------------------------------------------
-- kunden.email und kunden.telefon bleiben stehen: Sie sind die Adresse des
-- Betriebs, und der halbe Code liest sie (Rapportversand, Kundenkontakt,
-- Comatic-Export). Hier entsteht nur eine Kopie als Kontakt, damit die
-- neuen Listen nicht leer aussehen und niemand dieselbe Nummer zweimal
-- eintippt.
--
-- Bewusst KEIN Verschieben und kein Löschen der Spalten: Das wäre eine
-- Änderung an zwei Wahrheiten gleichzeitig. Ob und wann die Altspalten
-- fallen, entscheidet ein eigener Schritt, wenn die Kontakte im Alltag
-- angekommen sind.
insert into kontakte (organisation_id, kunde_id, art_id, wert, ist_standard, bemerkung)
select k.organisation_id, k.id, a.id, trim(k.email), true, 'aus der Kundenadresse übernommen'
from kunden k
join kontakt_arten a
  on a.organisation_id = k.organisation_id and a.bezeichnung = 'E-Mail'
where k.email is not null and trim(k.email) <> ''
  and not exists (
    select 1 from kontakte x
    where x.kunde_id = k.id and x.art_id = a.id and x.wert = trim(k.email)
  );

insert into kontakte (organisation_id, kunde_id, art_id, wert, ist_standard, bemerkung)
select k.organisation_id, k.id, a.id, trim(k.telefon), true, 'aus der Kundenadresse übernommen'
from kunden k
join kontakt_arten a
  on a.organisation_id = k.organisation_id and a.bezeichnung = 'Telefon'
where k.telefon is not null and trim(k.telefon) <> ''
  and not exists (
    select 1 from kontakte x
    where x.kunde_id = k.id and x.art_id = a.id and x.wert = trim(k.telefon)
  );

-- ---------------------------------------------------------
-- 6) Das Änderungsprotokoll muss die neuen Tabellen kennen
-- ---------------------------------------------------------
-- Punkt 4 der Prüfliste. Die Tabellenliste in 0053 ist eine Handliste; wer
-- sie vergisst, verliert die Nachvollziehbarkeit still. Genau deshalb steht
-- sie im Plan.
do $$
declare
  t text;
  tabellen text[] := array['ansprechpersonen', 'kontakte', 'kontakt_arten', 'begriffe'];
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

comment on table ansprechpersonen is
  'Personen bei einem Geschäftspartner. Ab 0075 auch an einem Standort '
  '(Hauswart, Filialleitung). Geschäftskontakte, deshalb für alle in der '
  'Organisation lesbar – anders als die Personal-Dokumente aus 0015.';

comment on table kontakte is
  'Kontaktkanäle eines Partners oder einer Person. Genau ein Bezug je Zeile, '
  'erzwungen durch num_nonnulls – kein polymorphes bezug_id wie in dokumente.';
