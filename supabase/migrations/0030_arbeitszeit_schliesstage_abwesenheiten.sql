-- =========================================================
-- Arbeitszeitfenster, Schliesstage und Abwesenheiten
--
-- Die Disposition schlägt freie Zeiten vor. Bisher nahm sie dafür einen
-- fest verdrahteten Arbeitstag von 07:00-18:00 an und wusste nichts von
-- Feiertagen, Betriebsferien oder abwesenden Mitarbeitenden. Ein Vorschlag,
-- der jemanden am 1. August oder mitten in dessen Ferien einplant, ist
-- schlimmer als gar kein Vorschlag.
--
-- Drei Ebenen, die sich überlagern:
--   1. Arbeitszeitfenster  – gilt für die ganze Organisation, täglich
--   2. Schliesstage        – gilt für die ganze Organisation, an bestimmten Tagen
--   3. Abwesenheiten       – gilt für eine Person, an bestimmten Tagen
--
-- Führe diese Datei NACH 0001-0029 aus.
-- =========================================================

-- ---------------------------------------------------------
-- 1) Arbeitszeitfenster je Organisation
-- ---------------------------------------------------------
-- In Minuten seit Mitternacht, wie die Tagesarbeitszeit-Schwellen aus 0025 –
-- so lässt sich damit rechnen, ohne Text zu zerlegen.
alter table organisationen
  add column if not exists arbeitstag_von_minuten int not null default 420;   -- 07:00
alter table organisationen
  add column if not exists arbeitstag_bis_minuten int not null default 1080;  -- 18:00

comment on column organisationen.arbeitstag_von_minuten is
  'Beginn des Arbeitstags in Minuten seit Mitternacht. Rahmen für die Vorschläge freier Zeiten in der Disposition – Termine ausserhalb bleiben von Hand erfassbar.';

-- ---------------------------------------------------------
-- 2) Schliesstage: Feiertage, Betriebsferien, Brückentage
-- ---------------------------------------------------------
-- Als Zeitraum statt als Einzeltag: Betriebsferien sind zwei Wochen, und
-- vierzehn Zeilen dafür wären weder zu pflegen noch zu überblicken. Ein
-- einzelner Feiertag ist der Sonderfall von = bis.
create table if not exists schliesstage (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null default current_organisation_id() references organisationen(id),
  von date not null,
  bis date not null,
  bezeichnung text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (bis >= von)
);

create index if not exists idx_schliesstage_zeitraum on schliesstage (organisation_id, von, bis);

drop trigger if exists schliesstage_updated_at on schliesstage;
create trigger schliesstage_updated_at before update on schliesstage
  for each row execute function set_updated_at();

alter table schliesstage enable row level security;

drop policy if exists "schliesstage_select" on schliesstage;
create policy "schliesstage_select" on schliesstage for select using (
  organisation_id = current_organisation_id()
);

drop policy if exists "schliesstage_write_admin" on schliesstage;
create policy "schliesstage_write_admin" on schliesstage for all using (
  is_admin() and organisation_id = current_organisation_id()
) with check (
  is_admin() and organisation_id = current_organisation_id()
);

-- ---------------------------------------------------------
-- 3) Abwesenheitsarten als pflegbare Liste
-- ---------------------------------------------------------
-- Gleiche Bauart wie Kanäle und Prioritäten (0014): sichtbare Bezeichnung,
-- Farbe für den Kalender, unveränderlicher interner Schlüssel.
create table if not exists abwesenheitsarten (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null default current_organisation_id() references organisationen(id),
  wert text not null,
  bezeichnung text not null,
  farbe text not null default 'bg-gray-300',
  -- false = die Person ist trotzdem einsatzfähig (z.B. Aussendienst,
  -- Weiterbildung vor Ort). Steuert, ob die Disposition warnt.
  blockiert boolean not null default true,
  sortierung int not null default 0,
  aktiv boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organisation_id, wert)
);

drop trigger if exists abwesenheitsarten_updated_at on abwesenheitsarten;
create trigger abwesenheitsarten_updated_at before update on abwesenheitsarten
  for each row execute function set_updated_at();

alter table abwesenheitsarten enable row level security;

drop policy if exists "abwesenheitsarten_select" on abwesenheitsarten;
create policy "abwesenheitsarten_select" on abwesenheitsarten for select using (
  organisation_id = current_organisation_id()
);

drop policy if exists "abwesenheitsarten_write_admin" on abwesenheitsarten;
create policy "abwesenheitsarten_write_admin" on abwesenheitsarten for all using (
  is_admin() and organisation_id = current_organisation_id()
) with check (
  is_admin() and organisation_id = current_organisation_id()
);

insert into abwesenheitsarten (organisation_id, wert, bezeichnung, farbe, blockiert, sortierung)
select o.id, v.wert, v.bezeichnung, v.farbe, v.blockiert, v.sortierung
from organisationen o
cross join (values
  ('ferien',        'Ferien',        'bg-blue-300',   true,  10),
  ('krankheit',     'Krankheit',     'bg-red-500',    true,  20),
  ('unfall',        'Unfall',        'bg-red-500',    true,  30),
  ('militaer',      'Militär/Zivil', 'bg-green-500',  true,  40),
  ('weiterbildung', 'Weiterbildung', 'bg-amber-400',  true,  50),
  ('sonstiges',     'Sonstiges',     'bg-gray-300',   true,  60)
) as v(wert, bezeichnung, farbe, blockiert, sortierung)
on conflict (organisation_id, wert) do nothing;

-- ---------------------------------------------------------
-- 4) Abwesenheiten je Person
-- ---------------------------------------------------------
-- Ebenfalls als Zeitraum. Halbe Tage über die optionalen Uhrzeiten: leer
-- bedeutet ganztägig, was der Normalfall ist.
create table if not exists abwesenheiten (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null default current_organisation_id() references organisationen(id),
  mitarbeiter_id uuid not null references profiles(id) on delete cascade,
  von date not null,
  bis date not null,
  von_zeit time,
  bis_zeit time,
  art text not null default 'ferien',
  bemerkung text,
  erfasst_von uuid references profiles(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (bis >= von)
);

create index if not exists idx_abwesenheiten_person
  on abwesenheiten (mitarbeiter_id, von, bis);

drop trigger if exists abwesenheiten_updated_at on abwesenheiten;
create trigger abwesenheiten_updated_at before update on abwesenheiten
  for each row execute function set_updated_at();

alter table abwesenheiten enable row level security;

-- Lesen: alle in der Organisation. Wer disponiert, muss sehen, wer da ist –
-- und die Kalenderansicht zeigt Abwesenheiten ohnehin allen. Der GRUND
-- steht bewusst in einem eigenen Feld: Wem "Krankheit" zu viel Information
-- ist, kann die Art "Sonstiges" verwenden.
drop policy if exists "abwesenheiten_select" on abwesenheiten;
create policy "abwesenheiten_select" on abwesenheiten for select using (
  organisation_id = current_organisation_id()
);

-- Schreiben nur Admins: Ferien und Krankheit erfasst das Büro, nicht die
-- betroffene Person selbst.
drop policy if exists "abwesenheiten_write_admin" on abwesenheiten;
create policy "abwesenheiten_write_admin" on abwesenheiten for all using (
  is_admin() and organisation_id = current_organisation_id()
) with check (
  is_admin() and organisation_id = current_organisation_id()
);
