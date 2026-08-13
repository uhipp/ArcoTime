-- =========================================================
-- Mengenartikel, Kundenpreise und Rabattsteuerung
--
-- Vier zusammenhängende Erweiterungen:
--
-- 1) Artikel, die nicht nach Zeit abgerechnet werden (Kilometer, Spesen,
--    Kleinmaterial). Bisher konnte das System nur Dauer: dauer_minuten war
--    Pflicht, menge_stunden die einzige Mengengrösse, und sie floss
--    gleichzeitig in Rechnungsbetrag UND Arbeitszeitauswertung. Ein
--    Kilometer hat aber keine Dauer und darf nicht als Arbeitszeit zählen.
--
-- 2) Kundenspezifische Preise je Dienstleistung.
--
-- 3) Standardrabatt pro Kunde, der bei der Erfassung vorbelegt wird.
--
-- 4) Dienstleistungen, die keinen Rabatt zulassen (z.B. Reisespesen).
--    Gesperrt sind Teilrabatte von 1-99%; 100% bleibt erlaubt, damit die
--    bestehende Konvention "internes Projekt + Rabatt 100% = nicht
--    verrechnet" für alle Artikel nutzbar bleibt.
--
-- Führe diese Datei NACH 0001-0021 aus.
-- =========================================================

-- ---------------------------------------------------------
-- 1) Dienstleistungen: Einheit, Arbeitszeit-Kennzeichen, Rabattsperre
-- ---------------------------------------------------------
-- "einheit" war auf ('Stunde','Pauschale') eingeschränkt. Der Check fällt
-- weg, damit beliebige Einheiten möglich sind (Stück, km, kg, …) – welche
-- sinnvoll sind, entscheidet der Betrieb, nicht das Schema.
alter table dienstleistungen drop constraint if exists dienstleistungen_einheit_check;

-- Entscheidet, ob ein Eintrag dieser Dienstleistung nach Dauer erfasst wird
-- und in Stundensummen/Soll-Ist-Auswertungen zählt. false = Mengenartikel.
alter table dienstleistungen
  add column if not exists zaehlt_als_arbeitszeit boolean not null default true;

comment on column dienstleistungen.zaehlt_als_arbeitszeit is
  'true = Erfassung über Dauer, zählt in Stundenauswertungen. false = Mengenartikel (Stück, km, Spesen) – wird verrechnet, aber nie als Arbeitszeit gezählt.';

alter table dienstleistungen
  add column if not exists rabatt_erlaubt boolean not null default true;

comment on column dienstleistungen.rabatt_erlaubt is
  'false = kein Teilrabatt möglich (z.B. Reisespesen). 100% bleibt zulässig, damit nicht verrechnete Arbeit weiterhin erfassbar ist.';

-- ---------------------------------------------------------
-- 2) Kunden: Standardrabatt
-- ---------------------------------------------------------
-- Reine Vorbelegung für die Erfassung. Der tatsächlich gültige Rabatt wird
-- weiterhin pro Zeiteintrag gespeichert – eine spätere Änderung hier darf
-- bestehende Einträge nicht verändern (gleiches Prinzip wie Preis und
-- MWSt-Satz, siehe 0003 und 0021).
alter table kunden
  add column if not exists standard_rabatt_prozent numeric(5,2) not null default 0
    check (standard_rabatt_prozent between 0 and 100);

comment on column kunden.standard_rabatt_prozent is
  'Vorbelegung für neue Zeiteinträge dieses Kunden. Wirkt NICHT rückwirkend – der Rabatt wird pro Eintrag gespeichert.';

-- ---------------------------------------------------------
-- 3) Kundenpreise
-- ---------------------------------------------------------
-- "ab_menge" ist bereits jetzt vorgesehen, auch wenn die Oberfläche
-- vorerst nur einen Fixpreis anbietet (ab_menge = 0). Damit lassen sich
-- Staffelpreise später ohne Migration nachrüsten.
create table if not exists kundenpreise (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null default current_organisation_id() references organisationen(id),
  kunde_id uuid not null references kunden(id) on delete cascade,
  dienstleistung_id uuid not null references dienstleistungen(id) on delete cascade,
  ab_menge numeric(10,2) not null default 0,
  preis numeric(10,2) not null check (preis >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (kunde_id, dienstleistung_id, ab_menge)
);

create index if not exists idx_kundenpreise_suche
  on kundenpreise (kunde_id, dienstleistung_id, ab_menge desc);

drop trigger if exists kundenpreise_updated_at on kundenpreise;
create trigger kundenpreise_updated_at before update on kundenpreise
  for each row execute function set_updated_at();

alter table kundenpreise enable row level security;

drop policy if exists "kundenpreise_select" on kundenpreise;
create policy "kundenpreise_select" on kundenpreise for select using (
  organisation_id = current_organisation_id()
);

drop policy if exists "kundenpreise_write_admin" on kundenpreise;
create policy "kundenpreise_write_admin" on kundenpreise for all using (
  is_admin() and organisation_id = current_organisation_id()
) with check (
  is_admin() and organisation_id = current_organisation_id()
);

-- ---------------------------------------------------------
-- 3b) Kundenrabatte je Dienstleistungsklasse
-- ---------------------------------------------------------
-- Rabatt pro Klasse statt pro Dienstleistung: Ein Kunde bekommt z.B. auf
-- alle Beratungsleistungen 10%, ohne dass jede einzelne Dienstleistung
-- gepflegt werden muss. Neue Dienstleistungen derselben Klasse erben den
-- Rabatt automatisch.
--
-- Vorrang bei der Vorbelegung: Klassenrabatt vor
-- kunden.standard_rabatt_prozent – die speziellere Regel gewinnt.
create table if not exists kundenrabatte (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null default current_organisation_id() references organisationen(id),
  kunde_id uuid not null references kunden(id) on delete cascade,
  klasse_id uuid not null references dienstleistungsklassen(id) on delete cascade,
  rabatt_prozent numeric(5,2) not null check (rabatt_prozent between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (kunde_id, klasse_id)
);

create index if not exists idx_kundenrabatte_suche on kundenrabatte (kunde_id, klasse_id);

drop trigger if exists kundenrabatte_updated_at on kundenrabatte;
create trigger kundenrabatte_updated_at before update on kundenrabatte
  for each row execute function set_updated_at();

alter table kundenrabatte enable row level security;

drop policy if exists "kundenrabatte_select" on kundenrabatte;
create policy "kundenrabatte_select" on kundenrabatte for select using (
  organisation_id = current_organisation_id()
);

drop policy if exists "kundenrabatte_write_admin" on kundenrabatte;
create policy "kundenrabatte_write_admin" on kundenrabatte for all using (
  is_admin() and organisation_id = current_organisation_id()
) with check (
  is_admin() and organisation_id = current_organisation_id()
);

-- ---------------------------------------------------------
-- 4) Zeiteinträge: Menge neben Dauer
-- ---------------------------------------------------------
alter table zeiteintraege add column if not exists menge numeric(10,2);

comment on column zeiteintraege.menge is
  'Verrechnete Menge bei Mengenartikeln (Stück, km, …). Bei Zeit-Einträgen NULL – dort gilt dauer_minuten.';

-- dauer_minuten war "not null check (dauer_minuten > 0)". Für
-- Mengenartikel gibt es keine Dauer, die Spalte wird deshalb optional.
alter table zeiteintraege alter column dauer_minuten drop not null;
alter table zeiteintraege drop constraint if exists zeiteintraege_dauer_minuten_check;

-- Genau eine der beiden Grössen muss gesetzt sein – sonst entstünden
-- Einträge ohne jede Menge (Betrag 0, in keiner Auswertung sichtbar) oder
-- mit zwei widersprüchlichen Mengen.
alter table zeiteintraege drop constraint if exists zeiteintraege_menge_oder_dauer;
alter table zeiteintraege add constraint zeiteintraege_menge_oder_dauer check (
  (dauer_minuten is not null and dauer_minuten > 0 and menge is null)
  or
  (menge is not null and menge > 0 and dauer_minuten is null)
  -- Laufender Timer: Dauer wird erst beim Stoppen gesetzt.
  or (timer_gestartet_um is not null)
);

-- ---------------------------------------------------------
-- 5) Preis-Snapshot um Kundenpreis erweitern
-- ---------------------------------------------------------
-- Reihenfolge der Preisermittlung: kundenspezifischer Preis (höchste
-- passende Staffel) vor Katalogpreis. Wie bisher nur, wenn kein Preis
-- mitgegeben wurde.
create or replace function set_zeiteintrag_preis()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_kunde_id uuid;
  v_menge numeric;
begin
  if new.preis is null then
    -- Menge für die Staffelauswahl: Stunden bei Zeit, sonst die Menge.
    v_menge := coalesce(new.dauer_minuten / 60.0, new.menge, 0);

    select k.id into v_kunde_id
    from public.projekte p
      join public.kunden k on k.id = p.kunde_id
    where p.id = new.projekt_id;

    select kp.preis into new.preis
    from public.kundenpreise kp
    where kp.kunde_id = v_kunde_id
      and kp.dienstleistung_id = new.dienstleistung_id
      and kp.ab_menge <= v_menge
    order by kp.ab_menge desc
    limit 1;

    if new.preis is null then
      select d.preis into new.preis
      from public.dienstleistungen d
      where d.id = new.dienstleistung_id;
    end if;
  end if;

  if new.mwst_code is null and new.mwst_satz is null then
    select mw.code, mw.satz into new.mwst_code, new.mwst_satz
    from public.dienstleistungen d
      left join public.mwst_codes mw on mw.id = d.mwst_code_id
    where d.id = new.dienstleistung_id;
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------
-- 6) View: einheitliche Mengenspalte
-- ---------------------------------------------------------
-- "menge_stunden" bleibt erhalten und bezeichnet weiterhin AUSSCHLIESSLICH
-- Arbeitszeit (bei Mengenartikeln NULL) – Auswertungen dürfen Kilometer
-- nicht zu Stunden addieren.
--
-- Neu daneben "menge_verrechnet": die Grösse, mit der gerechnet und
-- exportiert wird, also Stunden ODER Stückzahl. Der Betrag basiert
-- darauf.
drop view if exists v_zeiteintraege;

create view v_zeiteintraege
  with (security_invoker = true)
as
select
  z.id,
  z.datum,
  z.start_zeit,
  z.end_zeit,
  z.dauer_minuten,
  z.timer_gestartet_um,
  case when z.dauer_minuten is not null
       then round(z.dauer_minuten / 60.0, 2)
  end as menge_stunden,
  z.beschreibung,
  z.rabatt_prozent,
  z.referenz,
  z.beleg_id,
  round(
    coalesce(z.dauer_minuten / 60.0, z.menge, 0) * z.preis * (1 - z.rabatt_prozent / 100.0),
    2
  ) as betrag,
  m.id as projekt_id,
  m.bezeichnung as projekt_bezeichnung,
  m.kostenstelle,
  k.id as kunde_id,
  k.adress_schluessel,
  k.anrede,
  k.vorname,
  k.name as kunde_name,
  k.adresse_zusatz,
  k.strasse,
  k.postfach,
  k.plz,
  k.ort,
  k.land,
  k.email,
  k.telefon,
  k.waehrung,
  k.zahlungskondition_tage,
  d.bezeichnung as dienstleistung_bezeichnung,
  d.konto,
  z.mwst_code,
  p.name as mitarbeiter_name,
  z.mitarbeiter_id,
  z.user_id,
  z.preis,
  d.klasse_id,
  dk.bezeichnung as klasse_bezeichnung,
  z.organisation_id,
  z.mwst_satz,
  z.menge,
  round(coalesce(z.dauer_minuten / 60.0, z.menge, 0), 2) as menge_verrechnet,
  d.einheit,
  d.zaehlt_als_arbeitszeit,
  d.rabatt_erlaubt
from zeiteintraege z
join projekte m on m.id = z.projekt_id
join kunden k on k.id = m.kunde_id
join dienstleistungen d on d.id = z.dienstleistung_id
left join dienstleistungsklassen dk on dk.id = d.klasse_id
join profiles p on p.id = z.mitarbeiter_id;
