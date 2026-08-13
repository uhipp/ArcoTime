-- =========================================================
-- Einheiten als pflegbare Auswahlliste
--
-- 0022 hat den CHECK auf dienstleistungen.einheit entfernt und das Feld zu
-- Freitext gemacht. Das war zu kurz gedacht: Jede andere Auswahlliste der
-- App (Klassen, MWSt-Codes, Rabattsätze, Kanäle, Prioritäten,
-- Dokument-Kategorien) ist unter Einstellungen pflegbar – Einheiten waren
-- die einzige Ausnahme, und Freitext lädt zu Tippfehlern ein ("Stk",
-- "Stk.", "Stück" nebeneinander).
--
-- dienstleistungen.einheit bleibt bewusst ein Textfeld statt einer
-- Fremdschlüsselreferenz: Genau wie bei anfragen.kanal steht dort der
-- gewählte Wert, damit das Umbenennen oder Deaktivieren einer Einheit
-- bestehende Dienstleistungen nicht beschädigt. Die Tabelle speist nur die
-- Auswahlliste.
--
-- Führe diese Datei NACH 0001-0022 aus.
-- =========================================================

create table if not exists einheiten (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null default current_organisation_id() references organisationen(id),
  bezeichnung text not null,
  sortierung int not null default 0,
  aktiv boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organisation_id, bezeichnung)
);

drop trigger if exists einheiten_updated_at on einheiten;
create trigger einheiten_updated_at before update on einheiten
  for each row execute function set_updated_at();

alter table einheiten enable row level security;

drop policy if exists "einheiten_select" on einheiten;
create policy "einheiten_select" on einheiten for select using (
  organisation_id = current_organisation_id()
);

drop policy if exists "einheiten_write_admin" on einheiten;
create policy "einheiten_write_admin" on einheiten for all using (
  is_admin() and organisation_id = current_organisation_id()
) with check (
  is_admin() and organisation_id = current_organisation_id()
);

-- ---------------------------------------------------------
-- Startbestand je Organisation
-- ---------------------------------------------------------
-- current_organisation_id() greift hier nicht (die Migration läuft ohne
-- Anmeldekontext), deshalb explizit für jede Organisation.
insert into einheiten (organisation_id, bezeichnung, sortierung)
select o.id, v.bezeichnung, v.sortierung
from organisationen o
cross join (values
  ('Stunde', 10),
  ('Pauschale', 20),
  ('Stück', 30),
  ('km', 40)
) as v(bezeichnung, sortierung)
on conflict (organisation_id, bezeichnung) do nothing;

-- Bereits verwendete Einheiten übernehmen, damit keine Dienstleistung auf
-- einen Wert zeigt, der in der Auswahl fehlt.
insert into einheiten (organisation_id, bezeichnung, sortierung)
select distinct d.organisation_id, trim(d.einheit), 90
from dienstleistungen d
where d.einheit is not null and trim(d.einheit) <> ''
on conflict (organisation_id, bezeichnung) do nothing;
