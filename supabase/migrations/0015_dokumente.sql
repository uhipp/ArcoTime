-- =========================================================
-- Phase 7: Dokumentenablage
-- Siehe docs/phase7-dokumente-plan.md
--
-- Führe diese Datei NACH 0001-0014 aus.
-- =========================================================

-- ---------------------------------------------------------
-- 1) Dokument-Kategorien (Auswahlliste, admin-verwaltbar wie die anderen
-- Auswahllisten aus der letzten Phase – nicht fix im Code).
-- ---------------------------------------------------------
create table if not exists dokument_kategorien (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null default current_organisation_id() references organisationen(id),
  bezeichnung text not null,
  sortierung int not null default 0,
  aktiv boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index if not exists uq_dokument_kategorien_org_bezeichnung
  on dokument_kategorien(organisation_id, bezeichnung);

alter table dokument_kategorien enable row level security;

create policy "dokument_kategorien_select" on dokument_kategorien for select using (
  organisation_id = current_organisation_id()
);
create policy "dokument_kategorien_write_admin" on dokument_kategorien for all using (
  is_admin() and organisation_id = current_organisation_id()
) with check (
  is_admin() and organisation_id = current_organisation_id()
);

insert into dokument_kategorien (organisation_id, bezeichnung, sortierung)
select o.id, w.bezeichnung, w.sortierung
from organisationen o
cross join (values
  ('Vertrag', 0),
  ('Rechnung', 1),
  ('Foto', 2),
  ('Ausweis', 3),
  ('Korrespondenz', 4),
  ('Sonstiges', 5)
) as w(bezeichnung, sortierung)
on conflict (organisation_id, bezeichnung) do nothing;

-- ---------------------------------------------------------
-- 2) Dokumente (polymorph: bereich + bezug_id statt vier separater
-- Tabellen, da Upload/Liste/Löschen für alle vier Kontexte identisch
-- sind). Zugriff auf die eigentliche Datei läuft ausschliesslich über
-- die Server-Actions/Route Handler dieser App (Service-Role-Client) –
-- der Storage-Bucket selbst ist privat, es gibt keinen direkten
-- Browser-Zugriff. Berechtigung wird dadurch an EINER Stelle geprüft
-- (dieser Tabelle), nicht zusätzlich in Storage-Policies.
-- ---------------------------------------------------------
create table if not exists dokumente (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null default current_organisation_id() references organisationen(id),
  bereich text not null check (bereich in ('kunde', 'projekt', 'mitarbeitende', 'anfrage', 'zeiteintrag')),
  bezug_id uuid not null,
  dateiname text not null,
  speicherpfad text not null,
  mime_type text,
  groesse_bytes bigint,
  kategorie_id uuid references dokument_kategorien(id),
  notiz text,
  hochgeladen_von uuid references profiles(id) default auth.uid(),
  created_at timestamptz not null default now()
);

create index if not exists idx_dokumente_bezug on dokumente(bereich, bezug_id);
create index if not exists idx_dokumente_organisation on dokumente(organisation_id);

alter table dokumente enable row level security;

-- Kunde/Projekt/Anfrage/Zeiteintrag: sichtbar für alle Mitglieder der
-- Organisation. Mitarbeitende: nur Admin und die betroffene Person selbst
-- (Personal-Dokumente sind sensibel) – siehe Plan.
create policy "dokumente_select" on dokumente for select using (
  organisation_id = current_organisation_id()
  and (
    bereich <> 'mitarbeitende'
    or is_admin()
    or bezug_id = auth.uid()
  )
);

-- Hochladen für den Bereich "Mitarbeitende" nur durch Admin (die
-- betroffene Person soll z.B. den eigenen Vertrag nicht selbst ersetzen
-- können); für die anderen Bereiche jedes Organisationsmitglied.
create policy "dokumente_insert" on dokumente for insert with check (
  organisation_id = current_organisation_id()
  and (
    bereich <> 'mitarbeitende'
    or is_admin()
  )
);

-- Update: Admin oder die hochladende Person – nötig, damit der
-- Upload-Ablauf den Platzhalter-Speicherpfad ("pending") nach dem
-- tatsächlichen Hochladen auf den echten Pfad setzen kann.
create policy "dokumente_update" on dokumente for update using (
  organisation_id = current_organisation_id()
  and (is_admin() or hochgeladen_von = auth.uid())
) with check (
  organisation_id = current_organisation_id()
  and (is_admin() or hochgeladen_von = auth.uid())
);

-- Löschen: Admin oder die Person, die das Dokument hochgeladen hat.
create policy "dokumente_delete" on dokumente for delete using (
  organisation_id = current_organisation_id()
  and (is_admin() or hochgeladen_von = auth.uid())
);

-- ---------------------------------------------------------
-- 3) Privater Storage-Bucket. Kein öffentlicher Zugriff, keine
-- clientseitigen Storage-Policies nötig – siehe Hinweis oben.
-- ---------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('dokumente', 'dokumente', false)
on conflict (id) do nothing;
