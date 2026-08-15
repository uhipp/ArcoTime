-- =========================================================
-- 0057  Manuelle Buchungen im Zeitkonto (Phase 12, Etappe C)
-- =========================================================
--
-- Nicht jede Bewegung im Zeitkonto entsteht aus erfasster Zeit oder aus
-- einer Abwesenheit. Überstunden werden ausbezahlt, gekürzt oder
-- verfallen zum Jahreswechsel; und wenn ein Betrieb ArcoTime einführt,
-- bringt jede Person einen Saldo mit, den es hier noch nicht gibt.
--
-- Das sind keine Abwesenheiten und gehören nicht in dieses Feld.

create table if not exists zeitkonto_buchungen (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null default current_organisation_id()
    references organisationen(id),
  mitarbeiter_id uuid not null references profiles(id) on delete cascade,
  datum date not null,
  -- Positiv = Gutschrift, negativ = Belastung. Beides kommt vor: der
  -- Startsaldo bei der Einführung ebenso wie die Auszahlung von
  -- Überstunden.
  stunden numeric(6,2) not null check (stunden <> 0),
  -- Pflicht: Eine Buchung ohne Begründung ist in einem Jahr niemandem
  -- mehr erklärbar – am wenigsten der Person, der sie gehört.
  grund text not null,
  erfasst_von uuid references profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create index if not exists idx_zeitkonto_buchungen_person
  on zeitkonto_buchungen (mitarbeiter_id, datum);

alter table zeitkonto_buchungen enable row level security;

-- Lesen darf die Person ihre eigenen, der Admin alle. Erfassen nur der
-- Admin: Eine Gutschrift, die sich jede Person selbst buchen kann, ist
-- keine.
drop policy if exists "zeitkonto_buchungen_select" on zeitkonto_buchungen;
create policy "zeitkonto_buchungen_select" on zeitkonto_buchungen for select using (
  organisation_id = current_organisation_id()
  and (is_admin() or mitarbeiter_id = auth.uid())
);

drop policy if exists "zeitkonto_buchungen_write_admin" on zeitkonto_buchungen;
create policy "zeitkonto_buchungen_write_admin" on zeitkonto_buchungen for all using (
  is_admin() and organisation_id = current_organisation_id()
) with check (
  is_admin() and organisation_id = current_organisation_id()
);

-- Ins Änderungsprotokoll (0053): Eine Buchung verschiebt den Saldo einer
-- Person, das muss nachvollziehbar sein.
drop trigger if exists zeitkonto_buchungen_protokoll on zeitkonto_buchungen;
create trigger zeitkonto_buchungen_protokoll
  after insert or update or delete on zeitkonto_buchungen
  for each row execute function protokolliere_aenderung();
