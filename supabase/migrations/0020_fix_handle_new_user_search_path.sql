-- =========================================================
-- Fix: Einladungen scheiterten mit "Database error saving new user"
--
-- handle_new_user() ist SECURITY DEFINER, hatte aber keinen fixierten
-- search_path. Die Funktion läuft damit zwar als "postgres", löst
-- unqualifizierte Tabellennamen aber über den search_path der AUFRUFENDEN
-- Session auf – und das ist bei einer Einladung GoTrues Rolle
-- "supabase_auth_admin", nicht die eigene SQL-Editor-Session.
--
-- Bis 0012 war das folgenlos, weil die Funktion ausschliesslich
-- "insert into public.profiles" verwendete. 0018 hat für die Farbpalette
-- ein unqualifiziertes "from profiles" davorgesetzt – seither schlug jede
-- Einladung fehl: die Tabelle löste nicht auf, der Insert in auth.users
-- rollte zurück, und GoTrue meldete nach aussen nur den generischen
-- Sammelfehler "Database error saving new user". Betroffen waren sowohl
-- die Selbstregistrierung (Stripe-Webhook) als auch /plattform und
-- /mitarbeiter.
--
-- Zwei Absicherungen, bewusst beide statt nur einer:
--   1) "set search_path" auf der Funktion – macht sie unabhängig vom
--      Aufrufer (und behebt zugleich die Linter-Warnung
--      "function_search_path_mutable": ohne fixierten search_path kann ein
--      Aufrufer einer SECURITY-DEFINER-Funktion untergeschobene Objekte
--      mit erhöhten Rechten ausführen lassen).
--   2) alle Tabellennamen schema-qualifiziert – dann bleibt es auch
--      korrekt, falls jemand die Funktion später ohne die Klausel neu
--      anlegt.
--
-- Führe diese Datei NACH 0001-0019 aus.
-- =========================================================

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  palette text[] := array['#2563EB','#DC2626','#16A34A','#D97706','#7C3AED','#DB2777','#0D9488','#57534E'];
  anzahl int;
begin
  select count(*) into anzahl
  from public.profiles
  where organisation_id = (new.raw_user_meta_data->>'organisation_id')::uuid;

  insert into public.profiles (id, name, vorname, nachname, email, organisation_id, farbe, role)
  values (
    new.id,
    coalesce(
      nullif(trim(coalesce(new.raw_user_meta_data->>'vorname', '') || ' ' || coalesce(new.raw_user_meta_data->>'nachname', '')), ''),
      new.raw_user_meta_data->>'name',
      new.email
    ),
    new.raw_user_meta_data->>'vorname',
    new.raw_user_meta_data->>'nachname',
    new.email,
    (new.raw_user_meta_data->>'organisation_id')::uuid,
    palette[(coalesce(anzahl, 0) % 8) + 1],
    coalesce(new.raw_user_meta_data->>'rolle_bei_einladung', 'mitarbeiter')
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

-- Gleiche Härtung für den zweiten Trigger auf profiles. Er ist nicht
-- SECURITY DEFINER und greift auf keine Tabelle zu, ist also nicht von
-- diesem Fehler betroffen – der fixierte search_path kostet aber nichts
-- und hält beide Trigger auf demselben Stand.
create or replace function sync_profile_name()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.vorname is not null or new.nachname is not null then
    new.name := trim(coalesce(new.vorname, '') || ' ' || coalesce(new.nachname, ''));
  end if;
  return new;
end;
$$;
