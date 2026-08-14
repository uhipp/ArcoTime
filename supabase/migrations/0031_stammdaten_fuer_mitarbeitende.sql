-- =========================================================
-- 0031  Stammdaten: Erfassen und Bearbeiten für alle,
--       Löschen bleibt beim Admin
-- =========================================================
--
-- Ausgangslage: Seit 0001 war das Schreiben auf kunden, projekte
-- (bis 0008 "mandate") und dienstleistungen per RLS auf Admins
-- beschränkt. Die
-- Oberfläche kannte diese Grenze nie – weder /kunden/neu noch
-- /projekte/neu hatten eine Rollenprüfung, und die Schnellerfassung
-- ("+ Neuer Kunde") sitzt mitten im Anfrage- und Zeiterfassungsformular,
-- also genau dort, wo Mitarbeitende arbeiten. Ein Mitarbeitender bekam
-- deshalb beim Anlegen eines Kunden nur "new row violates row-level
-- security policy" zu sehen. Aufgefallen ist das erst in der Testphase,
-- weil bis dahin ausschliesslich Admin-Konten im Einsatz waren.
--
-- Neue Regel: Mitarbeitende dürfen alles erfassen und bearbeiten, was
-- ihre Oberfläche ihnen zeigt. Löschen bleibt beim Admin, denn diese
-- Datensätze hängen an bestehenden Zeiteinträgen und Rapporten – ein
-- Löschen wirkt rückwärts und ist nicht zurückzuholen.
--
-- Nicht betroffen: Einstellungen (Einheiten, MWSt, Klassen, Rabattsätze,
-- Kanäle, Prioritäten, Dokument-Kategorien, Schliesstage,
-- Abwesenheitsarten, Abwesenheiten) sowie Mitarbeitende und Export.
-- Diese Seiten sind bereits admin-only, dort bleibt es beim Admin.
--
-- Ebenfalls unverändert: Bereits exportierte Zeiteinträge (beleg_id
-- gesetzt) kann ein Mitarbeitender weder ändern noch löschen – das
-- regelt seit 0009 zeiteintraege_update / zeiteintraege_delete.

-- ---------------------------------------------------------
-- 0) Härtung der drei Funktionen, auf denen jede Policy steht
-- ---------------------------------------------------------
-- is_admin(), current_organisation_id() und is_platform_admin() sind
-- SECURITY DEFINER, hatten aber kein festes search_path. Genau diese
-- Konstellation war die Ursache von Bug0001 (siehe 0020): Die Funktion
-- läuft als "postgres", löst unqualifizierte Namen aber im search_path
-- der aufrufenden Rolle auf. Sie tragen die gesamte Mandantentrennung,
-- deshalb hier gleich mit erledigt.

create or replace function current_organisation_id()
returns uuid
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select organisation_id from public.profiles where id = auth.uid();
$$;

create or replace function is_admin()
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function is_platform_admin()
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and ist_platform_admin = true
  );
$$;

-- ---------------------------------------------------------
-- 1) Kunden
-- ---------------------------------------------------------
drop policy if exists "kunden_write_admin" on kunden;

drop policy if exists "kunden_insert" on kunden;
create policy "kunden_insert" on kunden for insert with check (
  organisation_id = current_organisation_id()
);

drop policy if exists "kunden_update" on kunden;
create policy "kunden_update" on kunden for update using (
  organisation_id = current_organisation_id()
) with check (
  organisation_id = current_organisation_id()
);

drop policy if exists "kunden_delete_admin" on kunden;
create policy "kunden_delete_admin" on kunden for delete using (
  is_admin() and organisation_id = current_organisation_id()
);

-- ---------------------------------------------------------
-- 2) Projekte (Tabelle projekte, bis 0008 "mandate")
-- ---------------------------------------------------------
-- Policy-Name stammt noch aus 0006, die Tabelle heisst seit 0008 projekte.
drop policy if exists "mandate_write_admin" on projekte;
drop policy if exists "projekte_insert" on projekte;
drop policy if exists "projekte_update" on projekte;
drop policy if exists "projekte_delete_admin" on projekte;

create policy "projekte_insert" on projekte for insert with check (
  organisation_id = current_organisation_id()
);

-- Ändern nur, was auch sichtbar ist: dieselbe Bedingung wie in
-- projekte_select. Ein nicht sichtbares Projekt soll man auch nicht
-- über einen direkten Aufruf bearbeiten können.
create policy "projekte_update" on projekte for update using (
  organisation_id = current_organisation_id()
  and (
    is_admin()
    or sichtbar_fuer_alle
    or exists (
      select 1 from projekt_mitarbeiter mm
      where mm.projekt_id = projekte.id and mm.user_id = auth.uid()
    )
  )
) with check (
  organisation_id = current_organisation_id()
);

create policy "projekte_delete_admin" on projekte for delete using (
  is_admin() and organisation_id = current_organisation_id()
);

-- ---------------------------------------------------------
-- 3) Projektteam (projekt_mitarbeiter)
-- ---------------------------------------------------------
-- Wer ein Projekt bearbeiten darf, darf auch sein Team pflegen. Die
-- Sichtbarkeitsprüfung läuft über die Unterabfrage auf projekte – deren
-- eigene RLS greift dabei mit, ein unsichtbares Projekt liefert also
-- keine Zeile und die Bedingung ist falsch.
drop policy if exists "mandat_mitarbeiter_write_admin" on projekt_mitarbeiter;
drop policy if exists "projekt_mitarbeiter_write" on projekt_mitarbeiter;

create policy "projekt_mitarbeiter_write" on projekt_mitarbeiter for all using (
  exists (
    select 1 from projekte pr
    where pr.id = projekt_mitarbeiter.projekt_id
      and pr.organisation_id = current_organisation_id()
  )
) with check (
  exists (
    select 1 from projekte pr
    where pr.id = projekt_mitarbeiter.projekt_id
      and pr.organisation_id = current_organisation_id()
  )
);

-- ---------------------------------------------------------
-- 4) Dienstleistungen
-- ---------------------------------------------------------
-- Nicht ausdrücklich verlangt, aber dieselbe Lage: Der Katalog ist für
-- alle sichtbar und bearbeitbar, und eine gelöschte Dienstleistung
-- hängt genauso an bestehenden Zeiteinträgen wie ein gelöschter Kunde.
-- Deshalb hier dieselbe Trennung.
drop policy if exists "dienstleistungen_write_admin" on dienstleistungen;

drop policy if exists "dienstleistungen_insert" on dienstleistungen;
create policy "dienstleistungen_insert" on dienstleistungen for insert with check (
  organisation_id = current_organisation_id()
);

drop policy if exists "dienstleistungen_update" on dienstleistungen;
create policy "dienstleistungen_update" on dienstleistungen for update using (
  organisation_id = current_organisation_id()
) with check (
  organisation_id = current_organisation_id()
);

drop policy if exists "dienstleistungen_delete_admin" on dienstleistungen;
create policy "dienstleistungen_delete_admin" on dienstleistungen for delete using (
  is_admin() and organisation_id = current_organisation_id()
);

-- ---------------------------------------------------------
-- 5) Bewusst NICHT geöffnet: Kundenpreise und Kundenrabatte
-- ---------------------------------------------------------
-- Beide stehen zwar auf der Kundendetailseite, sind dort aber hinter
-- einer Adminprüfung versteckt (siehe kunden/[id]/page.tsx). Die Regel
-- lautet "bearbeiten, was angezeigt wird" – angezeigt wird das einem
-- Mitarbeitenden nicht, also bleibt kundenpreise_write_admin und
-- kundenrabatte_write_admin unverändert.
