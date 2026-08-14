-- =========================================================
-- 0044  Projektleiter am Projekt (Phase 9, Etappe A)
-- =========================================================
--
-- Erster Schritt zu den Teamrapporten (siehe
-- docs/phase9-teamrapporte-plan.md). Bewusst allein und zuerst: Die
-- Projektleitung ist für sich schon nützlich – im Alltag will man wissen,
-- wer ein Projekt verantwortet – und sie steuert später die Vorbelegung
-- am Rapport und die Frage, wer abschliessen darf.
--
-- on delete set null statt cascade: Verlässt die verantwortliche Person
-- die Firma, verliert das Projekt seine Leitung, aber nicht seine
-- Existenz. Ein Projekt mitzulöschen, weil jemand geht, wäre absurd.
--
-- Bewusst KEINE Pflichtangabe: Bestehende Projekte haben keine, und ein
-- Feld nachträglich zur Pflicht zu machen hiesse, entweder alle Altdaten
-- zu raten oder das Speichern zu blockieren, bis jemand aufräumt.

alter table projekte
  add column if not exists projektleiter_id uuid references profiles(id) on delete set null;

create index if not exists idx_projekte_projektleiter on projekte(projektleiter_id)
  where projektleiter_id is not null;

comment on column projekte.projektleiter_id is
  'Verantwortliche Person des Projekts. Wird beim Anlegen eines Rapports '
  'vorgeschlagen und entscheidet später, wer einen Teamrapport abschliessen darf.';
