-- =========================================================
-- 0077  Der Auftrag hat einen Einsatzort
-- =========================================================
--
-- Siehe docs/plan-parteien-standorte.md, Etappe 4. Setzt 0076 voraus.
--
-- Am Auftrag stehen jetzt ZWEI Pflichtangaben, und sie sagen Verschiedenes:
--
--   kunde_id     WER bestellt und schuldet   (Vertragspartner)
--   standort_id  WO gearbeitet wird          (Einsatzort)
--
-- Das ist keine Redundanz. Aus dem Gespräch: „Das ist unterschiedlich und
-- beides ist möglich" – dieselbe Liegenschaft kann einen Auftrag mit der
-- Verwaltung und einen mit dem Eigentümer tragen. Genau deshalb ist
-- projekte.kunde_id in 0071 NICHT gestrichen worden.

-- ---------------------------------------------------------
-- 1) Die Spalte, zunächst ohne Pflicht
-- ---------------------------------------------------------
alter table projekte
  add column if not exists standort_id uuid references standorte(id) on delete restrict;

create index if not exists idx_projekte_standort on projekte(standort_id);

-- ---------------------------------------------------------
-- 2) Sie füllt sich selbst
-- ---------------------------------------------------------
-- Der entscheidende Schritt für einen Betrieb, der weiterläuft: Der laufende
-- Code kennt die Standorte noch nicht und schreibt beim Anlegen eines
-- Auftrags kein standort_id. Ohne diesen Trigger würde ein "not null" jeden
-- neuen Auftrag ablehnen, bis der neue Code deployt ist – und zwischen
-- Migration und Deploy liegen Minuten, in denen jemand arbeitet.
--
-- Mit ihm gilt: Wer nichts angibt, bekommt den Standardstandort seines
-- Kunden. Damit ist die Reihenfolge Migration → Deploy gefahrlos, und der
-- Weg greift auch für Import und Schnellerfassung.
create or replace function setze_projekt_standort()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.standort_id is null then
    new.standort_id := standardstandort(new.kunde_id);
  end if;
  return new;
end;
$$;

drop trigger if exists projekte_standort on projekte;
create trigger projekte_standort
  before insert on projekte
  for each row execute function setze_projekt_standort();

-- ---------------------------------------------------------
-- 3) Bestand nachziehen
-- ---------------------------------------------------------
update projekte p
   set standort_id = standardstandort(p.kunde_id)
 where p.standort_id is null;

-- Bleibt eine Zeile übrig, hat ihr Kunde keinen Standardstandort – das
-- passiert bei einem Geschäftspartner ohne Kundenrolle, der trotzdem
-- Aufträge trägt. Das ist von Hand anzuschauen und nicht automatisch zu
-- beheben: Lieber laut scheitern als einen Auftrag an einen fremden Ort
-- hängen.
do $$
declare
  v_offen int;
  v_beispiel text;
begin
  select count(*) into v_offen from projekte where standort_id is null;
  if v_offen > 0 then
    select string_agg(format('%s (Kunde %s)', p.bezeichnung, k.name), ', ')
      into v_beispiel
      from projekte p join kunden k on k.id = p.kunde_id
     where p.standort_id is null;
    raise exception
      'Für % Auftrag/Aufträge fehlt der Einsatzort: %. Bitte beim Kunden das Häkchen "ist Kunde" setzen (dann entsteht der Standardstandort) oder den Standort von Hand zuweisen.',
      v_offen, v_beispiel;
  end if;
  raise notice 'Alle Aufträge haben einen Einsatzort.';
end $$;

-- ---------------------------------------------------------
-- 4) Jetzt Pflicht
-- ---------------------------------------------------------
alter table projekte alter column standort_id set not null;

comment on column projekte.standort_id is
  'WO gearbeitet wird. Pflicht seit 0077; wird beim Insert aus dem '
  'Standardstandort des Kunden gefüllt, wenn nichts angegeben ist. Zusammen '
  'mit kunde_id (WER bestellt) die zwei Achsen des Auftrags – keine '
  'Redundanz, sondern zwei verschiedene Aussagen.';

-- ---------------------------------------------------------
-- 5) Die Anfahrt gehört zum Ort
-- ---------------------------------------------------------
-- „Wir verrechnen immer die km zur Liegenschaft, wo gearbeitet wird."
--
-- Der Trigger aus 0076 hat den Wert beim Anlegen des Standardstandorts
-- mitgenommen; dieser Lauf ist die Sicherung für Zeilen, bei denen der Wert
-- danach am Kunden geändert wurde. kunden.anreise_km bleibt vorerst stehen,
-- weil der laufende Code sie liest – sie fällt in 0078, nach dem Deploy.
update standorte s
   set anreise_km = k.anreise_km
  from beteiligte b
  join beteiligten_rollen r on r.id = b.rolle_id
  join kunden k on k.id = b.partner_id
 where b.standort_id = s.id
   and r.bezeichnung = 'Kunde'
   and s.ist_standard
   and s.anreise_km is null
   and k.anreise_km is not null;

-- Die Begründung in 0050 gilt nur für Betriebe mit einem Ort je Kunde und
-- wird hier ausdrücklich richtiggestellt.
comment on column kunden.anreise_km is
  'ÜBERHOLT seit 0077, fällt in 0078. Die Anfahrt gehört zum Einsatzort '
  '(standorte.anreise_km): Eine Verwaltung mit vierzig Liegenschaften hat '
  'vierzig verschiedene Distanzen. Nicht mehr schreiben.';
