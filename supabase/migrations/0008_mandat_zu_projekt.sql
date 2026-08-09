-- =========================================================
-- Phase 5, Schritt 7: Mandat -> Projekt umbenennen
--
-- Tabellen/Spalten werden umbenannt (wirkt sich auf die App-Terminologie
-- aus). RLS-Policies müssen dafür NICHT neu erstellt werden – Postgres
-- verfolgt Tabellen-/Spalten-Referenzen darin über interne IDs, nicht über
-- den Namen, das übersteht eine Umbenennung automatisch. PL/pgSQL-
-- Funktionsrümpfe sind dagegen reiner Text und werden bei jedem Aufruf neu
-- aufgelöst – die müssen wir explizit anpassen, sonst brechen sie.
--
-- Bewusste Vereinfachung: interne Funktions-/Trigger-/Index-Namen, die
-- weiterhin "mandat" im Namen tragen, werden NICHT umbenannt (rein
-- kosmetisch, kein Nutzer sieht das, zusätzliches Risiko ohne Nutzen).
--
-- Führe diese Datei NACH 0001-0007 aus.
-- =========================================================

-- ---------------------------------------------------------
-- 1) Tabellen umbenennen
-- ---------------------------------------------------------
alter table mandate rename to projekte;
alter table mandat_mitarbeiter rename to projekt_mitarbeiter;

-- ---------------------------------------------------------
-- 2) Spalten umbenennen
-- ---------------------------------------------------------
alter table projekt_mitarbeiter rename column mandat_id to projekt_id;
alter table zeiteintraege rename column mandat_id to projekt_id;
alter table belege_exporte rename column mandat_id to projekt_id;

-- ---------------------------------------------------------
-- 3) PL/pgSQL-Funktionsrümpfe anpassen (reiner Text, bricht sonst)
-- ---------------------------------------------------------
create or replace function set_organisation_von_mandat()
returns trigger as $$
begin
  select organisation_id into new.organisation_id from projekte where id = new.projekt_id;
  return new;
end;
$$ language plpgsql;

create or replace function set_organisation_von_mandat_mitarbeiter()
returns trigger as $$
begin
  select organisation_id into new.organisation_id from projekte where id = new.projekt_id;
  return new;
end;
$$ language plpgsql;

-- Parameternamen ändern sich (p_mandat_id -> p_projekt_id); Postgres
-- erlaubt das bei CREATE OR REPLACE nicht, daher zuerst löschen.
drop function if exists erstelle_export(uuid, date, date);

create function erstelle_export(p_projekt_id uuid, p_von date, p_bis date)
returns table(neue_belegnummer bigint, neuer_beleg_id uuid, anzahl int)
as $$
declare
  v_org_id uuid;
  v_belegnummer bigint;
  v_beleg_id uuid;
  v_anzahl int;
begin
  select organisation_id into v_org_id from projekte where id = p_projekt_id;
  if v_org_id is null then
    raise exception 'Projekt % nicht gefunden', p_projekt_id;
  end if;

  select count(*) into v_anzahl
  from zeiteintraege
  where projekt_id = p_projekt_id
    and beleg_id is null
    and datum between p_von and p_bis;

  if v_anzahl = 0 then
    return query select null::bigint, null::uuid, 0;
    return;
  end if;

  select naechste_belegnummer into v_belegnummer
  from projekte
  where id = p_projekt_id
  for update;

  while exists (
    select 1 from belege_exporte
    where belegnummer = v_belegnummer and organisation_id = v_org_id
  ) loop
    v_belegnummer := v_belegnummer + 1;
  end loop;

  insert into belege_exporte (belegnummer, projekt_id, organisation_id, zeitraum_von, zeitraum_bis, anzahl_positionen, erstellt_von)
  values (v_belegnummer, p_projekt_id, v_org_id, p_von, p_bis, v_anzahl, auth.uid())
  returning id into v_beleg_id;

  update zeiteintraege
  set beleg_id = v_beleg_id
  where projekt_id = p_projekt_id
    and beleg_id is null
    and datum between p_von and p_bis;

  update projekte set naechste_belegnummer = v_belegnummer + 1 where id = p_projekt_id;

  return query select v_belegnummer, v_beleg_id, v_anzahl;
end;
$$ language plpgsql;

-- DROP FUNCTION entfernt auch alle darauf erteilten Rechte -> neu vergeben
grant execute on function erstelle_export(uuid, date, date) to authenticated;

-- ---------------------------------------------------------
-- 4) View neu anlegen: Spalten-Aliasse mandat_* -> projekt_*
--    (DROP+CREATE, da CREATE OR REPLACE keine Spalten umbenennen kann –
--    siehe schon frühere Migrationen)
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
join profiles p on p.id = z.user_id;
