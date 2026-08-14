-- =========================================================
-- 0049  Gruppen von Mitarbeitenden
-- =========================================================
--
-- Bei drei Mitarbeitenden ist die Tagesansicht der Disposition
-- übersichtlich. Bei zwanzig ist sie es nicht mehr: zwanzig Spalten, von
-- denen ein Disponent morgens vielleicht sechs braucht. Wer die
-- Sanitärabteilung plant, will die Elektriker nicht sehen.
--
-- Deshalb Gruppen: "Team Ost", "Sanitär", "Lernende". Sie sind eine
-- Sicht auf die Mitarbeitenden und keine Berechtigung – wer nicht in
-- einer Gruppe ist, verliert dadurch nichts. Aus demselben Grund darf
-- eine Person in mehreren Gruppen sein: Der Springer gehört zu beiden
-- Teams, und ihn zwingend einem zuzuordnen wäre eine Aussage, die im
-- Betrieb niemand treffen kann.

create table if not exists gruppen (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null default current_organisation_id() references organisationen(id),
  bezeichnung text not null,
  sortierung int not null default 0,
  aktiv boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organisation_id, bezeichnung)
);

drop trigger if exists gruppen_updated_at on gruppen;
create trigger gruppen_updated_at before update on gruppen
  for each row execute function set_updated_at();

create table if not exists gruppen_mitglieder (
  gruppe_id uuid not null references gruppen(id) on delete cascade,
  mitarbeiter_id uuid not null references profiles(id) on delete cascade,
  -- Eigene Spalte statt Unterabfrage auf gruppen – dieselbe Überlegung
  -- wie bei rapport_beteiligte (0045): Regeln, die sich gegenseitig
  -- abfragen, hat Postgres in diesem Projekt schon zweimal mit
  -- "infinite recursion" quittiert.
  organisation_id uuid not null references organisationen(id),
  primary key (gruppe_id, mitarbeiter_id)
);

create index if not exists idx_gruppen_mitglieder_person
  on gruppen_mitglieder (mitarbeiter_id);

-- organisation_id aus der Gruppe übernehmen, damit sie beim Einfügen
-- nicht mitgegeben werden muss und nicht falsch sein kann.
create or replace function set_organisation_von_gruppe()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  select g.organisation_id into new.organisation_id
  from public.gruppen g
  where g.id = new.gruppe_id;
  return new;
end;
$$;

drop trigger if exists gruppen_mitglieder_set_organisation on gruppen_mitglieder;
create trigger gruppen_mitglieder_set_organisation
  before insert or update of gruppe_id on gruppen_mitglieder
  for each row execute function set_organisation_von_gruppe();

alter table gruppen enable row level security;
alter table gruppen_mitglieder enable row level security;

-- Lesen dürfen alle: Die Gruppen stehen als Filter in der Disposition
-- und beim Zusammenstellen eines Teams.
drop policy if exists "gruppen_select" on gruppen;
create policy "gruppen_select" on gruppen for select using (
  organisation_id = current_organisation_id()
);

-- Pflegen tut sie der Admin unter Einstellungen – wie alle anderen
-- Auswahllisten auch (0030).
drop policy if exists "gruppen_write_admin" on gruppen;
create policy "gruppen_write_admin" on gruppen for all using (
  is_admin() and organisation_id = current_organisation_id()
) with check (
  is_admin() and organisation_id = current_organisation_id()
);

drop policy if exists "gruppen_mitglieder_select" on gruppen_mitglieder;
create policy "gruppen_mitglieder_select" on gruppen_mitglieder for select using (
  organisation_id = current_organisation_id()
);

drop policy if exists "gruppen_mitglieder_write_admin" on gruppen_mitglieder;
create policy "gruppen_mitglieder_write_admin" on gruppen_mitglieder for all using (
  is_admin() and organisation_id = current_organisation_id()
) with check (
  is_admin() and organisation_id = current_organisation_id()
);
