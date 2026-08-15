-- =========================================================
-- 0052  Datenpflege je Organisation
-- =========================================================
--
-- Aufgefallen an Migration 0033 (Strasse und Hausnummer trennen): Sie hat
-- per update in die Inhalte ALLER Organisationen eingegriffen. Solange
-- Arcos und die Demo AG derselben Person gehören, ist das unkritisch. Bei
-- fremden Mandanten ist es ein Vertrauensthema.
--
-- Die beschlossene Aufteilung in drei Klassen:
--
--   Schema (Spalten, Regeln, Views)  -> sofort für alle, nichts zu tun
--   Datenqualität (Altwerte umformen) -> je Organisation auf Knopfdruck
--   Korrektheit und Sicherheit        -> sofort für alle, Information danach
--
-- Wichtigste Regel: Das SCHEMA wird niemals je Organisation
-- freigeschaltet, nur die Bereinigung der Altdaten. Sonst laufen mehrere
-- Datenmodelle gleichzeitig in Produktion, jeder Lesepfad braucht
-- dauerhaft beide Varianten – und ein Teil der Kunden drückt nie auf den
-- Knopf.
--
-- Geschützt wird nicht über Einwilligung, sondern über Rückholbarkeit:
-- Ein Kunde kann nicht beurteilen, ob eine Heuristik für seine 800
-- Adressen passt. Seine Zustimmung ist schwacher Schutz, ein
-- "rückgängig" ist echter. Deshalb hält diese Tabelle die alten Werte.

create table if not exists datenpflege_laeufe (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null default current_organisation_id()
    references organisationen(id),
  -- Schlüssel der Aufgabe, wie sie im Code definiert ist.
  aufgabe text not null,
  ausgefuehrt_am timestamptz not null default now(),
  ausgefuehrt_von uuid references profiles(id) default auth.uid(),
  anzahl int not null default 0,
  -- Die alten Werte, Zeile für Zeile: [{ "id": "...", "spalte": alt }, …].
  -- Ohne sie gäbe es kein Zurück, und ohne Zurück bliebe nur die
  -- Einwilligung – die hier nichts wert wäre.
  vorher jsonb not null default '[]'::jsonb,
  rueckgaengig_am timestamptz,
  rueckgaengig_von uuid references profiles(id)
);

create index if not exists idx_datenpflege_laeufe_org
  on datenpflege_laeufe (organisation_id, ausgefuehrt_am desc);

alter table datenpflege_laeufe enable row level security;

-- Lesen und Auslösen darf der Admin der eigenen Organisation. Die
-- Aufgaben greifen in Stammdaten ein; das ist keine Alltagsarbeit.
drop policy if exists "datenpflege_laeufe_admin" on datenpflege_laeufe;
create policy "datenpflege_laeufe_admin" on datenpflege_laeufe for all using (
  is_admin() and organisation_id = current_organisation_id()
) with check (
  is_admin() and organisation_id = current_organisation_id()
);
