-- =========================================================
-- Konfigurierbare Auswahllisten (Usability-Prinzip)
-- Auswahllisten sollen NICHT fix im Code stehen, sondern von Admins in
-- den Einstellungen selbst verwaltet werden können – wie bereits bei
-- dienstleistungsklassen/mwst_codes (0001) etabliert. Diese Migration
-- überführt Rabattsätze sowie Anfrage-Kanäle/-Prioritäten in dasselbe
-- Muster: eigene, organisationsgescopte Tabelle + RLS (alle lesen,
-- nur Admin schreibt), Aktiv-Flag statt Hard-Delete.
--
-- Führe diese Datei NACH 0001-0013 aus.
-- =========================================================

-- ---------------------------------------------------------
-- 1) Rabattsätze
-- ---------------------------------------------------------
create table if not exists rabattsaetze (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null default current_organisation_id() references organisationen(id),
  prozent numeric(5,2) not null check (prozent between 0 and 100),
  bezeichnung text,
  sortierung int not null default 0,
  aktiv boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index if not exists uq_rabattsaetze_org_prozent
  on rabattsaetze(organisation_id, prozent);

alter table rabattsaetze enable row level security;

create policy "rabattsaetze_select" on rabattsaetze for select using (
  organisation_id = current_organisation_id()
);
create policy "rabattsaetze_write_admin" on rabattsaetze for all using (
  is_admin() and organisation_id = current_organisation_id()
) with check (
  is_admin() and organisation_id = current_organisation_id()
);

-- Startwerte für die bestehende Organisation (bisher hart codiert im UI).
insert into rabattsaetze (organisation_id, prozent, bezeichnung, sortierung)
select o.id, w.prozent, w.bezeichnung, w.sortierung
from organisationen o
cross join (values
  (0, null, 0),
  (10, null, 1),
  (20, null, 2),
  (25, null, 3),
  (50, null, 4),
  (75, null, 5),
  (100, '100% (nicht verrechnet)', 6)
) as w(prozent, bezeichnung, sortierung)
on conflict (organisation_id, prozent) do nothing;

-- ---------------------------------------------------------
-- 2) Anfrage-Kanäle
-- ---------------------------------------------------------
create table if not exists anfrage_kanaele (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null default current_organisation_id() references organisationen(id),
  wert text not null,
  bezeichnung text not null,
  symbol text not null default '•',
  sortierung int not null default 0,
  aktiv boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index if not exists uq_anfrage_kanaele_org_wert
  on anfrage_kanaele(organisation_id, wert);

alter table anfrage_kanaele enable row level security;

create policy "anfrage_kanaele_select" on anfrage_kanaele for select using (
  organisation_id = current_organisation_id()
);
create policy "anfrage_kanaele_write_admin" on anfrage_kanaele for all using (
  is_admin() and organisation_id = current_organisation_id()
) with check (
  is_admin() and organisation_id = current_organisation_id()
);

insert into anfrage_kanaele (organisation_id, wert, bezeichnung, symbol, sortierung)
select o.id, w.wert, w.bezeichnung, w.symbol, w.sortierung
from organisationen o
cross join (values
  ('telefon', 'Telefon', '📞', 0),
  ('email', 'E-Mail', '📧', 1),
  ('whatsapp', 'WhatsApp', '💬', 2),
  ('brief', 'Brief', '✉️', 3),
  ('persoenlich', 'Persönlich', '🤝', 4),
  ('sonstiges', 'Sonstiges', '•', 5)
) as w(wert, bezeichnung, symbol, sortierung)
on conflict (organisation_id, wert) do nothing;

-- ---------------------------------------------------------
-- 3) Anfrage-Prioritäten
-- ---------------------------------------------------------
create table if not exists anfrage_prioritaeten (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null default current_organisation_id() references organisationen(id),
  wert text not null,
  bezeichnung text not null,
  farbe text not null default 'bg-gray-300',
  sortierung int not null default 0,
  aktiv boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index if not exists uq_anfrage_prioritaeten_org_wert
  on anfrage_prioritaeten(organisation_id, wert);

alter table anfrage_prioritaeten enable row level security;

create policy "anfrage_prioritaeten_select" on anfrage_prioritaeten for select using (
  organisation_id = current_organisation_id()
);
create policy "anfrage_prioritaeten_write_admin" on anfrage_prioritaeten for all using (
  is_admin() and organisation_id = current_organisation_id()
) with check (
  is_admin() and organisation_id = current_organisation_id()
);

insert into anfrage_prioritaeten (organisation_id, wert, bezeichnung, farbe, sortierung)
select o.id, w.wert, w.bezeichnung, w.farbe, w.sortierung
from organisationen o
cross join (values
  ('tief', 'Tief', 'bg-blue-300', 0),
  ('normal', 'Normal', 'bg-gray-300', 1),
  ('hoch', 'Hoch', 'bg-red-500', 2)
) as w(wert, bezeichnung, farbe, sortierung)
on conflict (organisation_id, wert) do nothing;

-- ---------------------------------------------------------
-- 4) anfragen.kanal / anfragen.prioritaet: feste CHECK-Listen entfernen
-- (Gültigkeit wird jetzt über die Auswahl im UI aus obigen Tabellen
-- sichergestellt, nicht mehr über eine im Code fixierte Werteliste).
-- anfragen.status bleibt bewusst FEST: die Kanban-Spalten und die
-- Erledigen-Logik sind im Code fest daran gekoppelt.
-- ---------------------------------------------------------
alter table anfragen drop constraint if exists anfragen_kanal_check;
alter table anfragen drop constraint if exists anfragen_prioritaet_check;
