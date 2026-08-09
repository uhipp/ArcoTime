-- =========================================================
-- E-Mail-Feld für Mitarbeitende-Stammdaten
--
-- Bisher stand die E-Mail nur in auth.users (nicht direkt aus der App
-- abfragbar). Neu: profiles.email wird beim Anlegen automatisch befüllt
-- und einmalig für bestehende Profile nachgezogen.
--
-- Führe diese Datei NACH 0001-0011 aus.
-- =========================================================

alter table profiles add column if not exists email text;

update profiles p
set email = u.email
from auth.users u
where u.id = p.id and p.email is null;

-- Liest bei der Einladung mitgegebene Zusatzangaben (vorname, nachname,
-- organisation_id) direkt aus den Nutzer-Metadaten, damit ein über die
-- neue Einladungsfunktion angelegtes Profil sofort korrekt zugeordnet ist
-- (kein manueller Nachtrag mehr nötig).
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, vorname, nachname, email, organisation_id)
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
    (new.raw_user_meta_data->>'organisation_id')::uuid
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$ language plpgsql security definer;
