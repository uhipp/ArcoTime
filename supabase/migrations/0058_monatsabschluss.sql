-- =========================================================
-- 0058  Monatsabschluss im Zeitkonto (Phase 12, Etappe D)
-- =========================================================
--
-- Ohne Einfrieren ist ein Saldo wertlos. Korrigiert jemand im November
-- einen Zeiteintrag vom März, verschiebt sich rückwirkend jede Zahl, die
-- seither an die Lohnbuchhaltung ging – und niemand merkt es.
--
-- Der Abschluss hält Soll, Ist, Vortrag, Saldo und die Ferien fest, wie
-- sie im Moment des Abschlusses waren. Ab da rechnet das Zeitkonto den
-- Folgemonat auf diesem Stand weiter und nicht mehr von vorne.
-- Korrekturen laufen danach über eine Buchung im Folgemonat – dieselbe
-- Regel wie beim Storno eines abgeschlossenen Rapports.

create table if not exists monatsabschluesse (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null default current_organisation_id()
    references organisationen(id),
  mitarbeiter_id uuid not null references profiles(id) on delete cascade,
  jahr int not null,
  monat int not null check (monat between 1 and 12),
  soll_stunden numeric(7,2) not null,
  ist_stunden numeric(7,2) not null,
  kompensation_stunden numeric(7,2) not null default 0,
  buchungen_stunden numeric(7,2) not null default 0,
  saldo_vortrag numeric(7,2) not null,
  saldo_ende numeric(7,2) not null,
  ferien_bezogen_tage numeric(5,1) not null,
  ferien_rest_tage numeric(5,1) not null,
  -- Wie viele Rapporte des Monats beim Abschluss noch offen waren.
  -- Festgehalten und nicht bloss vorher gemeldet: Wer den Monat später
  -- ansieht, soll erkennen, ob Stunden fehlen könnten.
  offene_rapporte int not null default 0,
  abgeschlossen_am timestamptz not null default now(),
  abgeschlossen_von uuid references profiles(id) on delete set null default auth.uid(),
  unique (mitarbeiter_id, jahr, monat)
);

create index if not exists idx_monatsabschluesse_org
  on monatsabschluesse (organisation_id, jahr, monat);

alter table monatsabschluesse enable row level security;

-- Lesen darf die Person ihren eigenen Abschluss, der Admin alle.
drop policy if exists "monatsabschluesse_select" on monatsabschluesse;
create policy "monatsabschluesse_select" on monatsabschluesse for select using (
  organisation_id = current_organisation_id()
  and (is_admin() or mitarbeiter_id = auth.uid())
);

-- Abschliessen und wieder öffnen ist Sache des Büros.
drop policy if exists "monatsabschluesse_write_admin" on monatsabschluesse;
create policy "monatsabschluesse_write_admin" on monatsabschluesse for all using (
  is_admin() and organisation_id = current_organisation_id()
) with check (
  is_admin() and organisation_id = current_organisation_id()
);

-- Ins Änderungsprotokoll (0053): Ein Abschluss ist eine Aussage über die
-- Arbeitszeit einer Person, und das Wiederöffnen erst recht.
drop trigger if exists monatsabschluesse_protokoll on monatsabschluesse;
create trigger monatsabschluesse_protokoll
  after insert or update or delete on monatsabschluesse
  for each row execute function protokolliere_aenderung();
