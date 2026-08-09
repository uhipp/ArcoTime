-- =========================================================
-- Fix: Endlosschleife in Row-Level-Security
--
-- Ursache: "mandat_mitarbeiter_select" prüfte per Subquery zurück auf
-- "mandate", deren eigene Policy "mandate_select" wiederum per Subquery
-- auf "mandat_mitarbeiter" prüft -> Postgres meldet "infinite recursion
-- detected in policy for relation mandate".
--
-- Fix: organisation_id direkt auf mandat_mitarbeiter speichern (wie schon
-- bei zeiteintraege/belege_exporte), damit dessen Policies ohne
-- Rückverweis auf "mandate" auskommen.
--
-- Führe diese Datei NACH 0006 aus.
-- =========================================================

alter table mandat_mitarbeiter add column if not exists organisation_id uuid references organisationen(id);

update mandat_mitarbeiter mm
set organisation_id = m.organisation_id
from mandate m
where m.id = mm.mandat_id and mm.organisation_id is null;

alter table mandat_mitarbeiter alter column organisation_id set not null;

create or replace function set_organisation_von_mandat_mitarbeiter()
returns trigger as $$
begin
  select organisation_id into new.organisation_id from mandate where id = new.mandat_id;
  return new;
end;
$$ language plpgsql;

drop trigger if exists mandat_mitarbeiter_set_organisation on mandat_mitarbeiter;
create trigger mandat_mitarbeiter_set_organisation
  before insert or update of mandat_id on mandat_mitarbeiter
  for each row execute function set_organisation_von_mandat_mitarbeiter();

drop policy if exists "mandat_mitarbeiter_select" on mandat_mitarbeiter;
create policy "mandat_mitarbeiter_select" on mandat_mitarbeiter for select using (
  organisation_id = current_organisation_id()
);

drop policy if exists "mandat_mitarbeiter_write_admin" on mandat_mitarbeiter;
create policy "mandat_mitarbeiter_write_admin" on mandat_mitarbeiter for all using (
  is_admin() and organisation_id = current_organisation_id()
) with check (
  is_admin() and organisation_id = current_organisation_id()
);
