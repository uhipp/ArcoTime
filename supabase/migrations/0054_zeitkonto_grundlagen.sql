-- =========================================================
-- 0054  Zeitkonto: Grundlagen (Phase 12, Etappe A)
-- =========================================================
--
-- Alles, was eine Arbeitszeitauswertung braucht – noch ohne die
-- Auswertung selbst. Die Angaben sind für sich nützlich: Eintritt,
-- Pensum und Ferienanspruch will ein Betrieb ohnehin geführt haben.
--
-- Zweites kostenpflichtiges Zusatzmodul neben der Disposition, deshalb
-- ein eigener Schalter je Organisation.

alter table organisationen
  add column if not exists modul_zeitkonto boolean not null default false;

comment on column organisationen.modul_zeitkonto is
  'Zusatzmodul Zeitkonto: Soll/Ist-Auswertung, Ferienguthaben, '
  'Monatsabschluss. Wie modul_disposition kostenpflichtig.';

-- ---------------------------------------------------------
-- 1) Wovon das Tages-Soll abhängt
-- ---------------------------------------------------------
-- Nicht jeder Betrieb arbeitet 42 Stunden in fünf Tagen. Aus diesen
-- beiden Werten entsteht das Tages-Soll, und ohne Tages-Soll lässt sich
-- kein einzelner Ferientag bewerten: Ein Monats-Soll von 176 Stunden
-- sagt nicht, was drei Ferientage kosten.
alter table organisationen
  add column if not exists wochenstunden numeric(5,2) not null default 42,
  add column if not exists arbeitstage_pro_woche numeric(3,1) not null default 5;

-- ---------------------------------------------------------
-- 2) Das Monats-Soll je Jahr
-- ---------------------------------------------------------
-- Die verbindliche Summe, in der Praxis meist vom Treuhänder geliefert.
create table if not exists soll_monate (
  organisation_id uuid not null default current_organisation_id()
    references organisationen(id),
  jahr int not null,
  monat int not null check (monat between 1 and 12),
  sollstunden numeric(6,2) not null check (sollstunden >= 0),
  updated_at timestamptz not null default now(),
  primary key (organisation_id, jahr, monat)
);

drop trigger if exists soll_monate_updated_at on soll_monate;
create trigger soll_monate_updated_at before update on soll_monate
  for each row execute function set_updated_at();

-- Eine Treuhänder-Tabelle hat die Feiertage bereits abgezogen. ArcoTime
-- kennt die Schliesstage aber auch – ohne diesen Schalter würden sie ein
-- zweites Mal abgezogen. Das ist die häufigste Fehlerquelle in solchen
-- Auswertungen, deshalb steht sie ausdrücklich da.
alter table organisationen
  add column if not exists feiertage_im_sollstunden_enthalten boolean not null default true;

-- ---------------------------------------------------------
-- 3) Anstellung und Pensum
-- ---------------------------------------------------------
alter table profiles
  add column if not exists eintritt date,
  add column if not exists austritt date;

comment on column profiles.austritt is
  'Gesetzt = die Person ist ausgetreten. Für die Auswertung wird das Soll '
  'im Austrittsmonat anteilig gerechnet. Das Konto selbst bleibt bestehen '
  '– deaktiviert wird getrennt davon.';

-- Pensum MIT Gültigkeit und nicht als einzelnes Feld: Wechselt jemand
-- per 1. Juli von 100 auf 80 Prozent, wäre sonst jede rückwirkende
-- Auswertung falsch. Dieselbe Überlegung wie beim eingefrorenen Preis am
-- Zeiteintrag – ein Stammdatum, das sich ändert, braucht seine
-- Geschichte.
create table if not exists pensen (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null default current_organisation_id()
    references organisationen(id),
  mitarbeiter_id uuid not null references profiles(id) on delete cascade,
  ab_datum date not null,
  pensum_prozent numeric(5,2) not null check (pensum_prozent > 0 and pensum_prozent <= 100),
  -- Teilzeit ist nicht gleich Teilzeit: 60 Prozent an drei ganzen Tagen
  -- ergibt ein anderes Tages-Soll als 60 Prozent an fünf kurzen – und
  -- damit einen anders bewerteten Ferientag. Leer = der Wert der
  -- Organisation.
  arbeitstage_pro_woche numeric(3,1) check (arbeitstage_pro_woche > 0),
  bemerkung text,
  created_at timestamptz not null default now(),
  unique (mitarbeiter_id, ab_datum)
);

create index if not exists idx_pensen_person on pensen (mitarbeiter_id, ab_datum desc);

-- ---------------------------------------------------------
-- 4) Ferienanspruch je Jahr
-- ---------------------------------------------------------
create table if not exists ferienanspruch (
  organisation_id uuid not null default current_organisation_id()
    references organisationen(id),
  mitarbeiter_id uuid not null references profiles(id) on delete cascade,
  jahr int not null,
  -- In Tagen geführt und später in Stunden bewertet: 20, 25, fünf Wochen
  -- für Lernende. Halbe Tage kommen vor.
  tage numeric(4,1) not null check (tage >= 0),
  uebertrag_tage numeric(4,1) not null default 0,
  bemerkung text,
  updated_at timestamptz not null default now(),
  primary key (mitarbeiter_id, jahr)
);

drop trigger if exists ferienanspruch_updated_at on ferienanspruch;
create trigger ferienanspruch_updated_at before update on ferienanspruch
  for each row execute function set_updated_at();

-- ---------------------------------------------------------
-- 5) Zugriff
-- ---------------------------------------------------------
-- Anstellungsdaten sind Personaldaten: Der Admin pflegt sie, die Person
-- sieht die eigenen. Dieselbe Aufteilung wie bei den Dokumenten am
-- Mitarbeitenden.
alter table soll_monate enable row level security;
alter table pensen enable row level security;
alter table ferienanspruch enable row level security;

drop policy if exists "soll_monate_select" on soll_monate;
create policy "soll_monate_select" on soll_monate for select using (
  organisation_id = current_organisation_id()
);

drop policy if exists "soll_monate_write_admin" on soll_monate;
create policy "soll_monate_write_admin" on soll_monate for all using (
  is_admin() and organisation_id = current_organisation_id()
) with check (
  is_admin() and organisation_id = current_organisation_id()
);

drop policy if exists "pensen_select" on pensen;
create policy "pensen_select" on pensen for select using (
  organisation_id = current_organisation_id()
  and (is_admin() or mitarbeiter_id = auth.uid())
);

drop policy if exists "pensen_write_admin" on pensen;
create policy "pensen_write_admin" on pensen for all using (
  is_admin() and organisation_id = current_organisation_id()
) with check (
  is_admin() and organisation_id = current_organisation_id()
);

drop policy if exists "ferienanspruch_select" on ferienanspruch;
create policy "ferienanspruch_select" on ferienanspruch for select using (
  organisation_id = current_organisation_id()
  and (is_admin() or mitarbeiter_id = auth.uid())
);

drop policy if exists "ferienanspruch_write_admin" on ferienanspruch;
create policy "ferienanspruch_write_admin" on ferienanspruch for all using (
  is_admin() and organisation_id = current_organisation_id()
) with check (
  is_admin() and organisation_id = current_organisation_id()
);

-- ---------------------------------------------------------
-- 6) Protokoll
-- ---------------------------------------------------------
-- Die neuen Tabellen gehören ins Änderungsprotokoll (0053): Pensum und
-- Ferienanspruch sind Personaldaten, deren Änderung nachvollziehbar sein
-- muss.
do $$
declare
  t text;
begin
  foreach t in array array['soll_monate', 'pensen', 'ferienanspruch'] loop
    execute format('drop trigger if exists %I on public.%I', t || '_protokoll', t);
    execute format(
      'create trigger %I after insert or update or delete on public.%I
         for each row execute function protokolliere_aenderung()',
      t || '_protokoll', t
    );
  end loop;
end;
$$;
