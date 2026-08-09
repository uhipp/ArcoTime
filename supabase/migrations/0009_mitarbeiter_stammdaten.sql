-- =========================================================
-- Mitarbeiter-Stammdaten + Mitarbeiter-Feld bei Zeiteinträgen
--
-- Bisher gab es nur "profiles.name" (meist die E-Mail) und der angemeldete
-- Nutzer war automatisch "der Mitarbeiter". Neu: Vorname/Nachname als
-- richtige Stammdaten, und ein eigenes "mitarbeiter_id"-Feld pro
-- Zeiteintrag, weil erfassende Person und ausführende Person
-- unterschiedlich sein können.
--
-- Führe diese Datei NACH 0001-0008 aus.
-- =========================================================

-- ---------------------------------------------------------
-- 1) Vorname/Nachname auf profiles, "name" bleibt als angezeigter,
--    automatisch synchronisierter Anzeigename bestehen (an vielen Stellen
--    im Code schon verwendet -> so bleibt dort nichts kaputt).
-- ---------------------------------------------------------
alter table profiles add column if not exists vorname text;
alter table profiles add column if not exists nachname text;

-- Best-effort-Aufteilung des bisherigen "name" (meist "Vorname Nachname"
-- oder eine E-Mail-Adresse) - admin kann das pro Mitarbeiter danach in der
-- neuen Mitarbeiter-Seite korrigieren.
update profiles
set
  vorname = case when position(' ' in name) > 0 then split_part(name, ' ', 1) else null end,
  nachname = case when position(' ' in name) > 0 then substring(name from position(' ' in name) + 1) else name end
where vorname is null and nachname is null;

create or replace function sync_profile_name()
returns trigger as $$
begin
  if new.vorname is not null or new.nachname is not null then
    new.name := trim(coalesce(new.vorname, '') || ' ' || coalesce(new.nachname, ''));
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists profiles_sync_name on profiles;
create trigger profiles_sync_name
  before insert or update of vorname, nachname on profiles
  for each row execute function sync_profile_name();

-- ---------------------------------------------------------
-- 2) mitarbeiter_id auf zeiteintraege: wer hat die Arbeit ausgeführt
--    (kann von "user_id" = wer hat erfasst abweichen).
-- ---------------------------------------------------------
alter table zeiteintraege add column if not exists mitarbeiter_id uuid references profiles(id);

update zeiteintraege set mitarbeiter_id = user_id where mitarbeiter_id is null;

alter table zeiteintraege alter column mitarbeiter_id set not null;
create index if not exists idx_zeiteintraege_mitarbeiter on zeiteintraege(mitarbeiter_id);

-- ---------------------------------------------------------
-- 3) RLS: Ersteller UND zugewiesener Mitarbeiter dürfen sehen/bearbeiten
--    (bestätigt) - zusätzlich zu Admin.
-- ---------------------------------------------------------
drop policy if exists "zeiteintraege_select" on zeiteintraege;
create policy "zeiteintraege_select" on zeiteintraege for select using (
  organisation_id = current_organisation_id()
  and (user_id = auth.uid() or mitarbeiter_id = auth.uid() or is_admin())
);

drop policy if exists "zeiteintraege_update" on zeiteintraege;
create policy "zeiteintraege_update" on zeiteintraege for update using (
  organisation_id = current_organisation_id()
  and (
    ((user_id = auth.uid() or mitarbeiter_id = auth.uid()) and beleg_id is null)
    or is_admin()
  )
);

drop policy if exists "zeiteintraege_delete" on zeiteintraege;
create policy "zeiteintraege_delete" on zeiteintraege for delete using (
  organisation_id = current_organisation_id()
  and (
    ((user_id = auth.uid() or mitarbeiter_id = auth.uid()) and beleg_id is null)
    or is_admin()
  )
);

-- ---------------------------------------------------------
-- 4) View: "mitarbeiter_name" soll die ausführende Person zeigen (nicht
--    zwingend die erfassende) -> Join auf mitarbeiter_id statt user_id.
-- ---------------------------------------------------------
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
  round(z.dauer_minuten / 60.0, 2) as menge_stunden,
  z.beschreibung,
  z.rabatt_prozent,
  z.referenz,
  z.beleg_id,
  round(
    (z.dauer_minuten / 60.0) * z.preis * (1 - z.rabatt_prozent / 100.0),
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
  k.strasse,
  k.postfach,
  k.plz,
  k.ort,
  k.land,
  k.email,
  k.telefon,
  k.waehrung,
  k.zahlungskondition_tage,
  d.bezeichnung as dienstleistung_bezeichnung,
  d.konto,
  mw.code as mwst_code,
  p.name as mitarbeiter_name,
  z.mitarbeiter_id,
  z.user_id,
  z.preis,
  d.klasse_id,
  dk.bezeichnung as klasse_bezeichnung,
  z.organisation_id
from zeiteintraege z
join projekte m on m.id = z.projekt_id
join kunden k on k.id = m.kunde_id
join dienstleistungen d on d.id = z.dienstleistung_id
left join mwst_codes mw on mw.id = d.mwst_code_id
left join dienstleistungsklassen dk on dk.id = d.klasse_id
join profiles p on p.id = z.mitarbeiter_id;
