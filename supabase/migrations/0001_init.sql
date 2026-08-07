-- =========================================================
-- Zeiterfassung App – Initiales Datenbankschema (Phase 1)
-- Führe diese Datei EINMAL im Supabase SQL Editor aus
-- (Dashboard -> SQL Editor -> New query -> Inhalt einfügen -> Run)
-- =========================================================

-- ---------- Hilfsfunktion: updated_at automatisch pflegen ----------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- =========================================================
-- 1. BENUTZER-PROFILE (erweitert auth.users um Name & Rolle)
-- =========================================================
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  role text not null default 'mitarbeiter' check (role in ('admin', 'mitarbeiter')),
  created_at timestamptz not null default now()
);

-- Legt beim Signup automatisch ein Profil an
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', new.email), 'mitarbeiter');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Helper: ist der aktuell eingeloggte User Admin?
create or replace function is_admin()
returns boolean as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer stable;

-- =========================================================
-- 2. FESTE LISTEN (Dienstleistungsklassen, MWSt-Codes)
-- =========================================================
create table if not exists dienstleistungsklassen (
  id uuid primary key default gen_random_uuid(),
  bezeichnung text not null unique,
  sortierung int not null default 0,
  aktiv boolean not null default true
);

insert into dienstleistungsklassen (bezeichnung, sortierung) values
  ('Beratung', 1),
  ('Administration', 2),
  ('Vor-Ort', 3),
  ('Reisezeit', 4)
on conflict (bezeichnung) do nothing;

create table if not exists mwst_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  satz numeric(5,2) not null default 0,
  bezeichnung text not null,
  aktiv boolean not null default true
);

-- Platzhalter-Einträge, im UI unter "Einstellungen" bitte an eure
-- effektiven Codes aus dem Buchhaltungssystem anpassen.
insert into mwst_codes (code, satz, bezeichnung) values
  ('B81', 8.1, 'Normalsatz 8.1%'),
  ('N81', 0.0, 'Nicht steuerbar')
on conflict (code) do nothing;

-- =========================================================
-- 3. KUNDEN (Adressverwaltung)
-- =========================================================
create table if not exists kunden (
  id uuid primary key default gen_random_uuid(),
  adress_schluessel text unique, -- externe Referenz-ID fürs Buchhaltungssystem (Comatic Remote_ID)
  anrede text,
  vorname text,
  name text not null, -- Nachname oder Firmenname
  adresse_zusatz text, -- "Zuhanden/Adresse 1"
  strasse text,
  postfach text,
  plz text,
  ort text,
  land text not null default 'CH',
  email text,
  telefon text,
  waehrung text not null default 'CHF',
  zahlungskondition_tage int not null default 30,
  notizen text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists kunden_updated_at on kunden;
create trigger kunden_updated_at before update on kunden
  for each row execute function set_updated_at();

-- =========================================================
-- 4. MANDATE (ein Kunde kann mehrere Mandate haben)
-- =========================================================
create table if not exists mandate (
  id uuid primary key default gen_random_uuid(),
  kunde_id uuid not null references kunden(id) on delete cascade,
  bezeichnung text not null,
  status text not null default 'aktiv' check (status in ('aktiv', 'inaktiv')),
  kostenstelle text, -- wird 1:1 in den Export "Kostenstelle" übernommen
  startdatum date not null default current_date,
  notizen text,
  sichtbar_fuer_alle boolean not null default true, -- false = nur zugewiesene Mitarbeitende sehen dieses Mandat
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists mandate_updated_at on mandate;
create trigger mandate_updated_at before update on mandate
  for each row execute function set_updated_at();

-- Zuweisung einzelner Mitarbeitender zu einem eingeschränkten Mandat
create table if not exists mandat_mitarbeiter (
  mandat_id uuid not null references mandate(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  primary key (mandat_id, user_id)
);

-- =========================================================
-- 5. DIENSTLEISTUNGSKATALOG
-- =========================================================
create table if not exists dienstleistungen (
  id uuid primary key default gen_random_uuid(),
  bezeichnung text not null,
  beschreibung text,
  klasse_id uuid not null references dienstleistungsklassen(id),
  preis numeric(10,2) not null, -- Preis pro Einheit
  einheit text not null default 'Stunde' check (einheit in ('Stunde', 'Pauschale')),
  konto text, -- Buchhaltungskonto, wird 1:1 in den Export "Konto" übernommen
  mwst_code_id uuid references mwst_codes(id),
  aktiv boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists dienstleistungen_updated_at on dienstleistungen;
create trigger dienstleistungen_updated_at before update on dienstleistungen
  for each row execute function set_updated_at();

-- =========================================================
-- 6. ZEITEINTRÄGE (die eigentliche Erfassung)
-- =========================================================
create table if not exists zeiteintraege (
  id uuid primary key default gen_random_uuid(),
  mandat_id uuid not null references mandate(id) on delete restrict,
  dienstleistung_id uuid not null references dienstleistungen(id) on delete restrict,
  user_id uuid not null references profiles(id) default auth.uid(),
  datum date not null default current_date,
  start_zeit time,
  end_zeit time,
  dauer_minuten int not null check (dauer_minuten > 0),
  beschreibung text, -- freie Notiz -> Export-Spalte "Beschreibung"
  rabatt_prozent numeric(5,2) not null default 0 check (rabatt_prozent between 0 and 100),
  referenz text,
  beleg_id uuid, -- gesetzt sobald exportiert (siehe Tabelle belege_exporte)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists zeiteintraege_updated_at on zeiteintraege;
create trigger zeiteintraege_updated_at before update on zeiteintraege
  for each row execute function set_updated_at();

create index if not exists idx_zeiteintraege_datum on zeiteintraege(datum);
create index if not exists idx_zeiteintraege_mandat on zeiteintraege(mandat_id);
create index if not exists idx_zeiteintraege_user on zeiteintraege(user_id);

-- Praktische View: Zeiteintrag inkl. berechnetem Betrag & allen Export-relevanten Feldern
-- security_invoker=true ist wichtig: sonst würde die View mit den Rechten des
-- View-Besitzers laufen und die RLS-Regeln der Basistabellen umgehen.
create or replace view v_zeiteintraege
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
    (z.dauer_minuten / 60.0) * d.preis * (1 - z.rabatt_prozent / 100.0),
    2
  ) as betrag,
  m.id as mandat_id,
  m.bezeichnung as mandat_bezeichnung,
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
  z.user_id
from zeiteintraege z
join mandate m on m.id = z.mandat_id
join kunden k on k.id = m.kunde_id
join dienstleistungen d on d.id = z.dienstleistung_id
left join mwst_codes mw on mw.id = d.mwst_code_id
join profiles p on p.id = z.user_id;

-- =========================================================
-- 7. EXPORT / BELEGNUMMERN
-- =========================================================
create sequence if not exists belegnummer_seq start with 470000;

create table if not exists belege_exporte (
  id uuid primary key default gen_random_uuid(),
  belegnummer bigint not null unique default nextval('belegnummer_seq'),
  mandat_id uuid not null references mandate(id),
  zeitraum_von date not null,
  zeitraum_bis date not null,
  anzahl_positionen int not null default 0,
  erstellt_von uuid references profiles(id),
  erstellt_am timestamptz not null default now()
);

alter table zeiteintraege
  add constraint zeiteintraege_beleg_fk
  foreign key (beleg_id) references belege_exporte(id);

-- =========================================================
-- 8. ROW LEVEL SECURITY
-- =========================================================
alter table profiles enable row level security;
alter table kunden enable row level security;
alter table mandate enable row level security;
alter table mandat_mitarbeiter enable row level security;
alter table dienstleistungsklassen enable row level security;
alter table mwst_codes enable row level security;
alter table dienstleistungen enable row level security;
alter table zeiteintraege enable row level security;
alter table belege_exporte enable row level security;

-- profiles: jeder sieht alle Profile (für Namen-Anzeige), aber nur Admin ändert Rollen
create policy "profiles_select_all" on profiles for select using (true);
create policy "profiles_update_own_or_admin" on profiles for update
  using (id = auth.uid() or is_admin());

-- Stammdaten (Kunden, Mandate, Klassen, MWSt, Dienstleistungen):
-- alle eingeloggten Benutzer dürfen lesen, nur Admin schreibt.
create policy "kunden_select" on kunden for select using (auth.uid() is not null);
create policy "kunden_write_admin" on kunden for all using (is_admin()) with check (is_admin());

create policy "mandate_select" on mandate for select using (
  is_admin()
  or sichtbar_fuer_alle
  or exists (select 1 from mandat_mitarbeiter mm where mm.mandat_id = mandate.id and mm.user_id = auth.uid())
);
create policy "mandate_write_admin" on mandate for all using (is_admin()) with check (is_admin());

create policy "mandat_mitarbeiter_select" on mandat_mitarbeiter for select using (auth.uid() is not null);
create policy "mandat_mitarbeiter_write_admin" on mandat_mitarbeiter for all using (is_admin()) with check (is_admin());

create policy "klassen_select" on dienstleistungsklassen for select using (auth.uid() is not null);
create policy "klassen_write_admin" on dienstleistungsklassen for all using (is_admin()) with check (is_admin());

create policy "mwst_select" on mwst_codes for select using (auth.uid() is not null);
create policy "mwst_write_admin" on mwst_codes for all using (is_admin()) with check (is_admin());

create policy "dienstleistungen_select" on dienstleistungen for select using (auth.uid() is not null);
create policy "dienstleistungen_write_admin" on dienstleistungen for all using (is_admin()) with check (is_admin());

-- Zeiteinträge: jeder erfasst/sieht/ändert eigene Einträge, Admin sieht/ändert alle
create policy "zeiteintraege_select" on zeiteintraege for select using (
  user_id = auth.uid() or is_admin()
);
create policy "zeiteintraege_insert" on zeiteintraege for insert with check (
  user_id = auth.uid() or is_admin()
);
create policy "zeiteintraege_update" on zeiteintraege for update using (
  (user_id = auth.uid() and beleg_id is null) or is_admin()
);
create policy "zeiteintraege_delete" on zeiteintraege for delete using (
  (user_id = auth.uid() and beleg_id is null) or is_admin()
);

-- Export-Belege: nur Admin erstellt/sieht (Buchhaltungsvorgang)
create policy "belege_admin_only" on belege_exporte for all using (is_admin()) with check (is_admin());

-- Erstes eigenes Profil auf 'admin' setzen (einmalig nach dem allerersten Signup ausführen):
-- update profiles set role = 'admin' where id = auth.uid();
