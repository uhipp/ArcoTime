-- =========================================================
-- 0051  Standardpositionen für neue Rapporte (Phase 11, Etappe B)
-- =========================================================
--
-- Ein Einsatz beginnt in vielen Betrieben immer gleich: Anfahrt und
-- Fahrzeit, in manchen Branchen zusätzlich eine Kleinmaterialpauschale.
-- Bisher tippte das jemand bei jedem Rapport von Hand – und wenn es
-- eilte, vergass er es.
--
-- Die Standardpositionen sagen, womit ein neuer Rapport beginnt. Wer
-- keine pflegt, merkt keinen Unterschied: Der Rapport entsteht wie
-- bisher leer.

create table if not exists rapport_standardpositionen (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null default current_organisation_id()
    references organisationen(id),
  dienstleistung_id uuid not null references dienstleistungen(id) on delete cascade,
  -- Menge bei Mengenartikeln, MINUTEN bei Leistungen, die als
  -- Arbeitszeit zählen. Was gemeint ist, ergibt sich aus der Leistung –
  -- eine zweite Spalte dafür wären zwei Wahrheiten über dasselbe.
  --
  -- Zwingend und grösser als null, weil die Datenbank das ohnehin
  -- verlangt: zeiteintraege_menge_oder_dauer lässt eine Position ohne
  -- Wert nicht zu (ausser mit laufendem Timer). Für die Fahrzeit trägt
  -- das Büro also eine Annahme ein, die der Monteur korrigiert – oder
  -- ab Etappe C der Timer überschreibt.
  vorgabe numeric(10,2) not null default 1 check (vorgabe > 0),
  sortierung int not null default 0,
  aktiv boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Dieselbe Leistung zweimal wäre in jedem gedachten Fall ein
  -- Versehen; wer wirklich zwei Zeilen braucht, legt zwei Leistungen an.
  unique (organisation_id, dienstleistung_id)
);

drop trigger if exists rapport_standardpositionen_updated_at on rapport_standardpositionen;
create trigger rapport_standardpositionen_updated_at
  before update on rapport_standardpositionen
  for each row execute function set_updated_at();

create index if not exists idx_rapport_standardpositionen_org
  on rapport_standardpositionen (organisation_id, sortierung);

alter table rapport_standardpositionen enable row level security;

-- Lesen alle: Die Liste wird beim Anlegen eines Rapports gebraucht, und
-- Rapporte legt jede und jeder an.
drop policy if exists "rapport_standardpositionen_select" on rapport_standardpositionen;
create policy "rapport_standardpositionen_select" on rapport_standardpositionen for select using (
  organisation_id = current_organisation_id()
);

-- Pflegen der Admin unter Einstellungen – wie alle Auswahllisten (0030).
drop policy if exists "rapport_standardpositionen_write_admin" on rapport_standardpositionen;
create policy "rapport_standardpositionen_write_admin" on rapport_standardpositionen for all using (
  is_admin() and organisation_id = current_organisation_id()
) with check (
  is_admin() and organisation_id = current_organisation_id()
);
