-- =========================================================
-- Phase 5, Schritte 1-6: Multi-Tenancy-Fundament
-- Siehe docs/phase5-multi-tenancy-plan.md
--
-- Bewusst NOCH OHNE die Mandat->Projekt-Umbenennung (Schritt 7) – die
-- kommt erst nach Verifikation dieser Grundlage in einer separaten
-- Migration, damit sich Fehler nicht überlagern.
--
-- Führe diese Datei NACH 0001-0005 aus.
-- =========================================================

-- ---------------------------------------------------------
-- 1) Organisationen-Tabelle + Bootstrap "Arcos Group"
-- ---------------------------------------------------------
create table if not exists organisationen (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  status text not null default 'aktiv' check (status in ('aktiv', 'pausiert', 'gekuendigt')),
  plan_max_gleichzeitige_nutzer int not null default 5,
  abrechnungszyklus text not null default 'monatlich' check (abrechnungszyklus in ('monatlich', 'jaehrlich')),
  preis_pro_zyklus numeric(10, 2),
  waehrung text not null default 'CHF',
  erstellt_am timestamptz not null default now()
);

insert into organisationen (name) values ('Arcos Group')
on conflict (name) do nothing;

-- ---------------------------------------------------------
-- 2) profiles erweitern: Organisation, Platform-Admin, Aktivität
-- ---------------------------------------------------------
alter table profiles add column if not exists organisation_id uuid references organisationen(id);
alter table profiles add column if not exists ist_platform_admin boolean not null default false;
alter table profiles add column if not exists letzte_aktivitaet timestamptz;

-- Bestehende Profile (bisher nur Arcos Group) der Bootstrap-Organisation zuordnen
update profiles set organisation_id = (select id from organisationen where name = 'Arcos Group')
where organisation_id is null;

-- Bestehenden Admin-Account zusätzlich als Platform-Admin markieren
update profiles set ist_platform_admin = true
where role = 'admin' and organisation_id = (select id from organisationen where name = 'Arcos Group');

-- ---------------------------------------------------------
-- 3) Hilfsfunktionen
-- ---------------------------------------------------------
create or replace function current_organisation_id()
returns uuid as $$
  select organisation_id from profiles where id = auth.uid();
$$ language sql security definer stable;

create or replace function is_platform_admin()
returns boolean as $$
  select exists (
    select 1 from profiles where id = auth.uid() and ist_platform_admin = true
  );
$$ language sql security definer stable;

-- ---------------------------------------------------------
-- 4) organisation_id auf allen mandantenspezifischen Tabellen
--    (nullable -> Backfill -> not null, damit bestehende Daten nicht
--    verloren gehen oder die Migration mitten drin fehlschlägt)
-- ---------------------------------------------------------
alter table kunden add column if not exists organisation_id uuid default current_organisation_id() references organisationen(id);
alter table mandate add column if not exists organisation_id uuid references organisationen(id);
alter table dienstleistungsklassen add column if not exists organisation_id uuid default current_organisation_id() references organisationen(id);
alter table mwst_codes add column if not exists organisation_id uuid default current_organisation_id() references organisationen(id);
alter table dienstleistungen add column if not exists organisation_id uuid default current_organisation_id() references organisationen(id);
alter table zeiteintraege add column if not exists organisation_id uuid references organisationen(id);
alter table belege_exporte add column if not exists organisation_id uuid references organisationen(id);

-- Backfill: aktuell gehört alles zu Arcos Group
update kunden set organisation_id = (select id from organisationen where name = 'Arcos Group') where organisation_id is null;
update mandate set organisation_id = (select id from organisationen where name = 'Arcos Group') where organisation_id is null;
update dienstleistungsklassen set organisation_id = (select id from organisationen where name = 'Arcos Group') where organisation_id is null;
update mwst_codes set organisation_id = (select id from organisationen where name = 'Arcos Group') where organisation_id is null;
update dienstleistungen set organisation_id = (select id from organisationen where name = 'Arcos Group') where organisation_id is null;
update zeiteintraege set organisation_id = (select id from organisationen where name = 'Arcos Group') where organisation_id is null;
update belege_exporte set organisation_id = (select id from organisationen where name = 'Arcos Group') where organisation_id is null;

alter table kunden alter column organisation_id set not null;
alter table mandate alter column organisation_id set not null;
alter table dienstleistungsklassen alter column organisation_id set not null;
alter table mwst_codes alter column organisation_id set not null;
alter table dienstleistungen alter column organisation_id set not null;
alter table zeiteintraege alter column organisation_id set not null;
alter table belege_exporte alter column organisation_id set not null;

create index if not exists idx_kunden_organisation on kunden(organisation_id);
create index if not exists idx_mandate_organisation on mandate(organisation_id);
create index if not exists idx_dienstleistungen_organisation on dienstleistungen(organisation_id);
create index if not exists idx_zeiteintraege_organisation on zeiteintraege(organisation_id);
create index if not exists idx_belege_exporte_organisation on belege_exporte(organisation_id);

-- ---------------------------------------------------------
-- 5) Eindeutigkeit war bisher global, muss neu PRO ORGANISATION gelten
--    (zwei Lizenznehmer dürfen z.B. beide eine Klasse "Beratung" haben)
-- ---------------------------------------------------------
alter table dienstleistungsklassen drop constraint if exists dienstleistungsklassen_bezeichnung_key;
alter table dienstleistungsklassen add constraint dienstleistungsklassen_org_bezeichnung_key unique (organisation_id, bezeichnung);

alter table mwst_codes drop constraint if exists mwst_codes_code_key;
alter table mwst_codes add constraint mwst_codes_org_code_key unique (organisation_id, code);

alter table kunden drop constraint if exists kunden_adress_schluessel_key;
alter table kunden add constraint kunden_org_adress_schluessel_key unique (organisation_id, adress_schluessel);

alter table belege_exporte drop constraint if exists belege_exporte_belegnummer_key;
alter table belege_exporte add constraint belege_exporte_org_belegnummer_key unique (organisation_id, belegnummer);

-- ---------------------------------------------------------
-- 6) organisation_id bei Projekten/Zeiteinträgen/Belegen automatisch und
--    unveränderlich von der übergeordneten Zeile ableiten (Mandat <- Kunde;
--    Zeiteintrag/Beleg <- Mandat), statt sich auf die aktuelle Session zu
--    verlassen. Schützt auch bei künftigen Admin-Werkzeugen/Skripten.
-- ---------------------------------------------------------
create or replace function set_organisation_von_kunde()
returns trigger as $$
begin
  select organisation_id into new.organisation_id from kunden where id = new.kunde_id;
  return new;
end;
$$ language plpgsql;

drop trigger if exists mandate_set_organisation on mandate;
create trigger mandate_set_organisation
  before insert or update of kunde_id on mandate
  for each row execute function set_organisation_von_kunde();

create or replace function set_organisation_von_mandat()
returns trigger as $$
begin
  select organisation_id into new.organisation_id from mandate where id = new.mandat_id;
  return new;
end;
$$ language plpgsql;

drop trigger if exists zeiteintraege_set_organisation on zeiteintraege;
create trigger zeiteintraege_set_organisation
  before insert or update of mandat_id on zeiteintraege
  for each row execute function set_organisation_von_mandat();

drop trigger if exists belege_exporte_set_organisation on belege_exporte;
create trigger belege_exporte_set_organisation
  before insert or update of mandat_id on belege_exporte
  for each row execute function set_organisation_von_mandat();

-- ---------------------------------------------------------
-- 7) erstelle_export(): Belegnummer-Kollisionsprüfung muss jetzt pro
--    Organisation erfolgen (zwei Lizenznehmer dürfen dieselbe Nummer
--    unabhängig voneinander verwenden)
-- ---------------------------------------------------------
create or replace function erstelle_export(p_mandat_id uuid, p_von date, p_bis date)
returns table(neue_belegnummer bigint, neuer_beleg_id uuid, anzahl int)
as $$
declare
  v_org_id uuid;
  v_belegnummer bigint;
  v_beleg_id uuid;
  v_anzahl int;
begin
  select organisation_id into v_org_id from mandate where id = p_mandat_id;
  if v_org_id is null then
    raise exception 'Mandat % nicht gefunden', p_mandat_id;
  end if;

  select count(*) into v_anzahl
  from zeiteintraege
  where mandat_id = p_mandat_id
    and beleg_id is null
    and datum between p_von and p_bis;

  if v_anzahl = 0 then
    return query select null::bigint, null::uuid, 0;
    return;
  end if;

  select naechste_belegnummer into v_belegnummer
  from mandate
  where id = p_mandat_id
  for update;

  while exists (
    select 1 from belege_exporte
    where belegnummer = v_belegnummer and organisation_id = v_org_id
  ) loop
    v_belegnummer := v_belegnummer + 1;
  end loop;

  insert into belege_exporte (belegnummer, mandat_id, organisation_id, zeitraum_von, zeitraum_bis, anzahl_positionen, erstellt_von)
  values (v_belegnummer, p_mandat_id, v_org_id, p_von, p_bis, v_anzahl, auth.uid())
  returning id into v_beleg_id;

  update zeiteintraege
  set beleg_id = v_beleg_id
  where mandat_id = p_mandat_id
    and beleg_id is null
    and datum between p_von and p_bis;

  update mandate set naechste_belegnummer = v_belegnummer + 1 where id = p_mandat_id;

  return query select v_belegnummer, v_beleg_id, v_anzahl;
end;
$$ language plpgsql;

-- ---------------------------------------------------------
-- 8) RLS-Policies: bestehende Regeln um Organisations-Prüfung erweitern
--    (is_admin() bleibt ein reiner Rollen-Check; die Organisationsgrenze
--    wird explizit in jeder Policy ergänzt statt in is_admin() versteckt)
-- ---------------------------------------------------------

-- profiles
drop policy if exists "profiles_select_all" on profiles;
create policy "profiles_select_own_org" on profiles for select using (
  organisation_id = current_organisation_id() or is_platform_admin()
);

drop policy if exists "profiles_update_own_or_admin" on profiles;
create policy "profiles_update_own_or_admin" on profiles for update using (
  id = auth.uid() or (is_admin() and organisation_id = current_organisation_id())
);

-- kunden
drop policy if exists "kunden_select" on kunden;
create policy "kunden_select" on kunden for select using (
  organisation_id = current_organisation_id()
);

drop policy if exists "kunden_write_admin" on kunden;
create policy "kunden_write_admin" on kunden for all using (
  is_admin() and organisation_id = current_organisation_id()
) with check (
  is_admin() and organisation_id = current_organisation_id()
);

-- mandate
drop policy if exists "mandate_select" on mandate;
create policy "mandate_select" on mandate for select using (
  organisation_id = current_organisation_id()
  and (
    is_admin()
    or sichtbar_fuer_alle
    or exists (select 1 from mandat_mitarbeiter mm where mm.mandat_id = mandate.id and mm.user_id = auth.uid())
  )
);

drop policy if exists "mandate_write_admin" on mandate;
create policy "mandate_write_admin" on mandate for all using (
  is_admin() and organisation_id = current_organisation_id()
) with check (
  is_admin() and organisation_id = current_organisation_id()
);

-- mandat_mitarbeiter (kein eigenes organisation_id-Feld -> über das Mandat prüfen)
drop policy if exists "mandat_mitarbeiter_select" on mandat_mitarbeiter;
create policy "mandat_mitarbeiter_select" on mandat_mitarbeiter for select using (
  exists (select 1 from mandate m where m.id = mandat_mitarbeiter.mandat_id and m.organisation_id = current_organisation_id())
);

drop policy if exists "mandat_mitarbeiter_write_admin" on mandat_mitarbeiter;
create policy "mandat_mitarbeiter_write_admin" on mandat_mitarbeiter for all using (
  is_admin() and exists (select 1 from mandate m where m.id = mandat_mitarbeiter.mandat_id and m.organisation_id = current_organisation_id())
) with check (
  is_admin() and exists (select 1 from mandate m where m.id = mandat_mitarbeiter.mandat_id and m.organisation_id = current_organisation_id())
);

-- dienstleistungsklassen
drop policy if exists "klassen_select" on dienstleistungsklassen;
create policy "klassen_select" on dienstleistungsklassen for select using (
  organisation_id = current_organisation_id()
);

drop policy if exists "klassen_write_admin" on dienstleistungsklassen;
create policy "klassen_write_admin" on dienstleistungsklassen for all using (
  is_admin() and organisation_id = current_organisation_id()
) with check (
  is_admin() and organisation_id = current_organisation_id()
);

-- mwst_codes
drop policy if exists "mwst_select" on mwst_codes;
create policy "mwst_select" on mwst_codes for select using (
  organisation_id = current_organisation_id()
);

drop policy if exists "mwst_write_admin" on mwst_codes;
create policy "mwst_write_admin" on mwst_codes for all using (
  is_admin() and organisation_id = current_organisation_id()
) with check (
  is_admin() and organisation_id = current_organisation_id()
);

-- dienstleistungen
drop policy if exists "dienstleistungen_select" on dienstleistungen;
create policy "dienstleistungen_select" on dienstleistungen for select using (
  organisation_id = current_organisation_id()
);

drop policy if exists "dienstleistungen_write_admin" on dienstleistungen;
create policy "dienstleistungen_write_admin" on dienstleistungen for all using (
  is_admin() and organisation_id = current_organisation_id()
) with check (
  is_admin() and organisation_id = current_organisation_id()
);

-- zeiteintraege
drop policy if exists "zeiteintraege_select" on zeiteintraege;
create policy "zeiteintraege_select" on zeiteintraege for select using (
  organisation_id = current_organisation_id() and (user_id = auth.uid() or is_admin())
);

drop policy if exists "zeiteintraege_insert" on zeiteintraege;
create policy "zeiteintraege_insert" on zeiteintraege for insert with check (
  organisation_id = current_organisation_id() and (user_id = auth.uid() or is_admin())
);

drop policy if exists "zeiteintraege_update" on zeiteintraege;
create policy "zeiteintraege_update" on zeiteintraege for update using (
  organisation_id = current_organisation_id()
  and ((user_id = auth.uid() and beleg_id is null) or is_admin())
);

drop policy if exists "zeiteintraege_delete" on zeiteintraege;
create policy "zeiteintraege_delete" on zeiteintraege for delete using (
  organisation_id = current_organisation_id()
  and ((user_id = auth.uid() and beleg_id is null) or is_admin())
);

-- belege_exporte
drop policy if exists "belege_admin_only" on belege_exporte;
create policy "belege_admin_only" on belege_exporte for all using (
  is_admin() and organisation_id = current_organisation_id()
) with check (
  is_admin() and organisation_id = current_organisation_id()
);

-- organisationen (neu)
alter table organisationen enable row level security;

create policy "organisationen_select_own_or_platform" on organisationen for select using (
  id = current_organisation_id() or is_platform_admin()
);

create policy "organisationen_write_platform" on organisationen for all using (
  is_platform_admin()
) with check (
  is_platform_admin()
);

-- plz_verzeichnis bleibt bewusst unverändert (geteiltes Referenzmaterial,
-- keine Mandantendaten).
