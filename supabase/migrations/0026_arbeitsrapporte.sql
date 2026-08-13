-- =========================================================
-- Phase 8, Etappe 1: Arbeitsrapport als Behälter
--
-- Siehe docs/phase8-arbeitsrapport-plan.md für die Begründung der
-- Entwurfsentscheidungen.
--
-- Ein Rapport klammert die Positionen eines Kundeneinsatzes zusammen:
-- Anfahrt, Arbeitszeit, Material. Eine Position ist dabei ein ganz
-- normaler Zeiteintrag – seit 0022 trägt der wahlweise Stunden oder eine
-- Menge, jeweils mit Preis- und MWSt-Snapshot. Es braucht deshalb KEINE
-- eigene Positionstabelle, nur einen Kopf und eine Referenz darauf.
--
-- Diese Migration legt bereits alle Felder für Unterschrift und Versand an,
-- obwohl Etappe 1 sie noch nicht nutzt. Eine zweite Migration für ein paar
-- Spalten wäre unnötiger Aufwand, und der Status-CHECK muss die späteren
-- Werte ohnehin kennen.
--
-- Führe diese Datei NACH 0001-0025 aus.
-- =========================================================

-- ---------------------------------------------------------
-- 1) Nummernkreis je Organisation und Jahr
-- ---------------------------------------------------------
-- Format JJJJ-NNNN, jährlich neu beginnend. Eine Postgres-Sequenz taugt
-- dafür nicht (lässt sich nicht jährlich zurücksetzen), und ein
-- "select max(nummer) + 1" wäre bei zwei gleichzeitig abschliessenden
-- Personen nicht sicher. Deshalb ein eigener Zähler.
create table if not exists rapport_nummernkreis (
  organisation_id uuid not null references organisationen(id) on delete cascade,
  jahr int not null,
  letzte_nummer int not null default 0,
  primary key (organisation_id, jahr)
);

alter table rapport_nummernkreis enable row level security;

-- Gelesen und geschrieben wird ausschliesslich über die Funktion unten
-- (security definer). Eine Policy für direkten Zugriff gibt es bewusst
-- nicht – niemand soll den Zähler von Hand verstellen.

-- ---------------------------------------------------------
-- 2) Rapporte
-- ---------------------------------------------------------
create table if not exists rapporte (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null default current_organisation_id() references organisationen(id),

  -- Erst beim Abschliessen vergeben, damit ein verworfener Entwurf keine
  -- Lücke reisst. Getrennt gespeichert statt als Text, damit sich nach
  -- Jahr sortieren und filtern lässt.
  jahr int,
  nummer int,

  kunde_id uuid not null references kunden(id) on delete restrict,
  projekt_id uuid references projekte(id) on delete restrict,
  datum date not null default current_date,
  mitarbeiter_id uuid not null references profiles(id),

  -- offen -> signiert | abgeschlossen -> storniert.
  -- "abgeschlossen" = fertig, aber ohne Unterschrift (Kunde nicht
  -- anwesend, kein Empfang). Beide Endzustände sind unveränderlich.
  status text not null default 'offen'
    check (status in ('offen', 'signiert', 'abgeschlossen', 'storniert')),

  -- Unterschrift als PNG-Data-URL direkt in der Zeile: sie gehört
  -- untrennbar zum Rapport und ist wenige KB gross. Ein Storage-Objekt
  -- daneben könnte verwaisen oder separat gelöscht werden.
  unterschrift_png text,
  unterzeichner_name text,
  signiert_am timestamptz,

  -- Nur bei Status "abgeschlossen": warum keine Unterschrift vorliegt.
  abschluss_vermerk text,

  versendet_an text,
  versendet_am timestamptz,

  bemerkung text,
  storniert_am timestamptz,
  storno_grund text,

  erstellt_von uuid references profiles(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (organisation_id, jahr, nummer)
);

create index if not exists idx_rapporte_organisation on rapporte(organisation_id);
create index if not exists idx_rapporte_kunde on rapporte(kunde_id);
create index if not exists idx_rapporte_datum on rapporte(datum desc);

drop trigger if exists rapporte_updated_at on rapporte;
create trigger rapporte_updated_at before update on rapporte
  for each row execute function set_updated_at();

-- ---------------------------------------------------------
-- 3) Zeiteinträge als Positionen
-- ---------------------------------------------------------
-- "on delete set null": Wird ein Rapport gelöscht, bleiben die erfassten
-- Leistungen bestehen und sind weiterhin verrechenbar. Der Rapport ist ein
-- Dokument ÜBER Leistungen, nicht ihr Besitzer.
alter table zeiteintraege
  add column if not exists rapport_id uuid references rapporte(id) on delete set null;

create index if not exists idx_zeiteintraege_rapport on zeiteintraege(rapport_id);

comment on column zeiteintraege.rapport_id is
  'Optional. Gesetzt, wenn dieser Eintrag Position eines Arbeitsrapports ist. Einträge ohne Rapport (Fernwartung, Bürozeit, interne Arbeit) bleiben unverändert möglich.';

-- ---------------------------------------------------------
-- 4) RLS
-- ---------------------------------------------------------
alter table rapporte enable row level security;

-- Lesen: alle in der Organisation. Ein Rapport ist ein Betriebsdokument,
-- keine persönliche Notiz – dieselbe Logik wie bei Anfragen (0013).
drop policy if exists "rapporte_select" on rapporte;
create policy "rapporte_select" on rapporte for select using (
  organisation_id = current_organisation_id()
);

drop policy if exists "rapporte_insert" on rapporte;
create policy "rapporte_insert" on rapporte for insert with check (
  organisation_id = current_organisation_id()
);

-- Ändern und Löschen nur, solange der Rapport offen ist. Ein signierter
-- oder abgeschlossener Rapport ist unveränderlich – sonst wäre die
-- Unterschrift wertlos. Der Statuswechsel selbst läuft über die Funktion
-- schliesse_rapport() weiter unten, die diese Policy umgeht.
drop policy if exists "rapporte_update_offen" on rapporte;
create policy "rapporte_update_offen" on rapporte for update using (
  organisation_id = current_organisation_id() and status = 'offen'
) with check (
  organisation_id = current_organisation_id() and status = 'offen'
);

drop policy if exists "rapporte_delete_offen" on rapporte;
create policy "rapporte_delete_offen" on rapporte for delete using (
  organisation_id = current_organisation_id() and status = 'offen'
);

-- ---------------------------------------------------------
-- 5) Positionen eines abgeschlossenen Rapports sperren
-- ---------------------------------------------------------
-- Die RLS auf zeiteintraege kennt den Rapport nicht. Ohne diesen Trigger
-- liesse sich eine Position eines signierten Rapports nachträglich ändern
-- oder entfernen – die Unterschrift wäre wertlos.
create or replace function pruefe_rapport_offen()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  betroffener uuid;
  aktueller_status text;
begin
  betroffener := coalesce(new.rapport_id, old.rapport_id);
  if betroffener is null then
    return coalesce(new, old);
  end if;

  select r.status into aktueller_status from public.rapporte r where r.id = betroffener;

  if aktueller_status is not null and aktueller_status <> 'offen' then
    raise exception
      'Positionen eines % Rapports lassen sich nicht mehr ändern. Bitte den Rapport stornieren und neu erstellen.',
      aktueller_status;
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists zeiteintraege_rapport_gesperrt on zeiteintraege;
create trigger zeiteintraege_rapport_gesperrt
  before insert or update or delete on zeiteintraege
  for each row execute function pruefe_rapport_offen();

-- ---------------------------------------------------------
-- 6) Nummer vergeben und Rapport abschliessen
-- ---------------------------------------------------------
-- security definer, weil die Funktion den Nummernkreis fortschreibt (ohne
-- eigene RLS-Policy) und den Status auf einen Wert setzt, den die
-- Update-Policy oben gerade verbietet.
create or replace function schliesse_rapport(
  p_rapport_id uuid,
  p_status text,
  p_unterschrift text default null,
  p_unterzeichner text default null,
  p_vermerk text default null
)
returns table(jahr int, nummer int)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_org uuid;
  v_jahr int;
  v_nummer int;
  v_status text;
begin
  if p_status not in ('signiert', 'abgeschlossen') then
    raise exception 'Ungültiger Zielstatus: %', p_status;
  end if;

  select r.organisation_id, extract(year from r.datum)::int, r.status
    into v_org, v_jahr, v_status
  from public.rapporte r
  where r.id = p_rapport_id
    and r.organisation_id = public.current_organisation_id();

  if v_org is null then
    raise exception 'Rapport nicht gefunden.';
  end if;
  if v_status <> 'offen' then
    raise exception 'Dieser Rapport ist bereits abgeschlossen.';
  end if;
  if not exists (select 1 from public.zeiteintraege z where z.rapport_id = p_rapport_id) then
    raise exception 'Ein Rapport ohne Positionen lässt sich nicht abschliessen.';
  end if;

  -- Atomar hochzählen, auch wenn zwei Personen gleichzeitig abschliessen.
  insert into public.rapport_nummernkreis (organisation_id, jahr, letzte_nummer)
  values (v_org, v_jahr, 1)
  on conflict (organisation_id, jahr)
    do update set letzte_nummer = rapport_nummernkreis.letzte_nummer + 1
  returning letzte_nummer into v_nummer;

  update public.rapporte r
  set status = p_status,
      jahr = v_jahr,
      nummer = v_nummer,
      unterschrift_png = p_unterschrift,
      unterzeichner_name = p_unterzeichner,
      signiert_am = case when p_status = 'signiert' then now() end,
      abschluss_vermerk = p_vermerk
  where r.id = p_rapport_id;

  return query select v_jahr, v_nummer;
end;
$$;
