-- =========================================================
-- Farbe pro Mitarbeitendem
--
-- Grundlage für die farbige Darstellung im Kalender (Zeiterfassung +
-- Anfragen je Mitarbeiter unterscheidbar). Bestehende Profile werden
-- deterministisch aus einer festen Palette eingefärbt; neue Profile
-- (Einladung) bekommen reihum je Organisation eine Farbe aus derselben
-- Palette, damit von Anfang an möglichst unterschiedliche Farben
-- vergeben sind. Admins können die Farbe später pro Person überschreiben
-- (siehe Mitarbeitende-Seite).
--
-- Führe diese Datei NACH 0001-0017 aus.
-- =========================================================

alter table profiles add column if not exists farbe text default '#457B9D';

with palette(idx, farbe) as (
  values
    (0, '#2563EB'), (1, '#DC2626'), (2, '#16A34A'), (3, '#D97706'),
    (4, '#7C3AED'), (5, '#DB2777'), (6, '#0D9488'), (7, '#57534E')
),
nummeriert as (
  select id, (row_number() over (order by created_at, id) - 1) % 8 as idx
  from profiles
)
update profiles p
set farbe = pal.farbe
from nummeriert n
join palette pal on pal.idx = n.idx
where p.id = n.id;

create or replace function handle_new_user()
returns trigger as $$
declare
  palette text[] := array['#2563EB','#DC2626','#16A34A','#D97706','#7C3AED','#DB2777','#0D9488','#57534E'];
  anzahl int;
begin
  select count(*) into anzahl
  from profiles
  where organisation_id = (new.raw_user_meta_data->>'organisation_id')::uuid;

  insert into public.profiles (id, name, vorname, nachname, email, organisation_id, farbe)
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
    palette[(coalesce(anzahl, 0) % 8) + 1]
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$ language plpgsql security definer;
