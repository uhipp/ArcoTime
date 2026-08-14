-- =========================================================
-- 0045  Team am Rapport (Phase 9, Etappe B)
-- =========================================================
--
-- Ein Einsatz wird oft von mehreren Personen zusammen erledigt: ein
-- Projektleiter mit zwei Monteuren. Bisher kannte ein Rapport genau eine
-- Person, und zwar zweimal – mitarbeiter_id für die Ausführung,
-- geplant_fuer für die Planung.
--
-- Neu hält eine Tabelle alle Beteiligten. rapporte.mitarbeiter_id behält
-- seine Bedeutung: die VERANTWORTLICHE Person, also die Projektleitung.
--
-- geplant_fuer wandert in diese Tabelle und wird danach nicht mehr
-- gelesen. Zwei Quellen für dieselbe Aussage laufen auseinander – das ist
-- in diesem Projekt schon mehrfach passiert, zuletzt bei den
-- Positionsdaten des Rapportkopfs (0038).

create table if not exists rapport_beteiligte (
  rapport_id uuid not null references rapporte(id) on delete cascade,
  mitarbeiter_id uuid not null references profiles(id) on delete cascade,
  -- Eigene Spalte, KEINE Unterabfrage auf rapporte in der Regel unten.
  -- Genau so entstand die Endlosschleife in 0007, und 0031 hat sie
  -- versehentlich wiederholt: Wenn A auf B prüft und B auf A, gibt
  -- Postgres auf.
  organisation_id uuid not null references organisationen(id),
  erfasst_am timestamptz not null default now(),
  primary key (rapport_id, mitarbeiter_id)
);

create index if not exists idx_rapport_beteiligte_person
  on rapport_beteiligte (mitarbeiter_id);

-- organisation_id aus dem Rapport übernehmen, damit sie beim Einfügen
-- nicht mitgegeben werden muss und nicht falsch sein kann.
create or replace function set_organisation_von_rapport()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  select r.organisation_id into new.organisation_id
  from public.rapporte r
  where r.id = new.rapport_id;
  return new;
end;
$$;

drop trigger if exists rapport_beteiligte_set_organisation on rapport_beteiligte;
create trigger rapport_beteiligte_set_organisation
  before insert or update of rapport_id on rapport_beteiligte
  for each row execute function set_organisation_von_rapport();

alter table rapport_beteiligte enable row level security;

drop policy if exists "rapport_beteiligte_select" on rapport_beteiligte;
create policy "rapport_beteiligte_select" on rapport_beteiligte for select using (
  organisation_id = current_organisation_id()
);

-- Schreiben für alle in der Organisation: Das Team ist reine Planung,
-- keine Berechtigung. Auch die Disposition, die selbst nicht mitfährt,
-- muss es zusammenstellen können.
drop policy if exists "rapport_beteiligte_write" on rapport_beteiligte;
create policy "rapport_beteiligte_write" on rapport_beteiligte for all using (
  organisation_id = current_organisation_id()
) with check (
  organisation_id = current_organisation_id()
);

-- ---------------------------------------------------------
-- Bestehende Planung übernehmen
-- ---------------------------------------------------------
-- Jeder Rapport mit geplant_fuer bekommt eine Zeile. Ohne das wäre die
-- bisherige Planung nach dieser Migration unsichtbar.
insert into rapport_beteiligte (rapport_id, mitarbeiter_id, organisation_id)
select r.id, r.geplant_fuer, r.organisation_id
from rapporte r
where r.geplant_fuer is not null
on conflict do nothing;

-- Zusätzlich die verantwortliche Person: Sie gehört zum Einsatz, auch
-- wenn bisher niemand sie ausdrücklich eingeplant hat.
insert into rapport_beteiligte (rapport_id, mitarbeiter_id, organisation_id)
select r.id, r.mitarbeiter_id, r.organisation_id
from rapporte r
where r.mitarbeiter_id is not null
  and r.geplant_von is not null
on conflict do nothing;

comment on column rapporte.geplant_fuer is
  'VERALTET seit 0045. Die Beteiligten stehen in rapport_beteiligte. '
  'Die Spalte wird nicht mehr gelesen und nicht mehr geschrieben; sie '
  'bleibt vorerst stehen, damit ein Rückweg offen ist.';
