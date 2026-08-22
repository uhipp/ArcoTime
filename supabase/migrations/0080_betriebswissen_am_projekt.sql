-- =========================================================
-- 0080  Alles Betriebswissen hängt am Auftrag
-- =========================================================
--
-- Siehe docs/plan-ablauf-standorte.md, Etappe 1 und 2. Setzt 0079 voraus.
--
-- Anfahrt und Zugang ziehen an den Auftrag. Damit steht alles, was Hans
-- Chefmaler für einen Einsatz braucht, an EINER Stelle – und Variante B (ohne
-- Standorte) kann genau dasselbe wie Variante A.
--
-- Anfahrt und Zugang sind WERTE und keine Verknüpfungen: Es gibt nach dieser
-- Migration keine Zeile mehr, auf die man zeigen könnte. Der Vortrag ins
-- nächste Projekt ist deshalb zwingend eine Kopie. Die Regel dazu (vom letzten
-- Projekt am SELBEN Standort, beim ersten bleibt das Feld leer) steht in der
-- Anwendung, nicht hier – eine Kopie beim insert wäre eine stille Vorgabe,
-- und stille falsche Zahlen sind schlimmer als leere Felder.

-- ---------------------------------------------------------
-- 1) Die zwei Felder am Auftrag
-- ---------------------------------------------------------
alter table projekte
  add column if not exists anreise_km numeric(10,2),
  add column if not exists zugang text;

comment on column projekte.anreise_km is
  'Verrechnet je Einsatz, in der Regel Hin- und Rückfahrt. Bewusst nicht '
  '"Distanz": Sonst trägt der eine die einfache Strecke ein und der andere '
  'Hin und Zurück, und niemand merkt es (Wortlaut aus 0050). Stand bis 0080 '
  'am Kunden, kurz am Standort – gehört aber an den Auftrag, weil eine '
  'Verwaltung mit vierzig Liegenschaften vierzig Distanzen hat und ein '
  'Unterhaltsvertrag am selben Ort andere Ansätze haben kann als eine '
  'Sanierung.';
comment on column projekte.zugang is
  'Was der Ausführende vor Ort braucht: "Schlüssel Nr. 4 im Kasten links, '
  'Code 4711, sonst beim Hauswart klingeln (079…)". Mehrzeilig. Erscheint '
  'auf dem Arbeitsrapport – dort nützt es mehr als in einer Notiz, die '
  'niemand liest.';

-- ---------------------------------------------------------
-- 2) Die bestehenden Werte nachziehen
-- ---------------------------------------------------------
-- Der Weg der Anfahrt in diesem Projekt: kunden (0050) → Standardstandort
-- (0077) → Auftrag (hier). Der Umweg über den Standort war ein Schritt zu
-- weit; gelesen wird jetzt von dort, weil der Wert dort schon je Adresse
-- steht.
update projekte p
   set anreise_km = s.anreise_km
  from standorte s
 where s.id = p.standort_id
   and p.anreise_km is null
   and s.anreise_km is not null;

do $$
declare
  v_anzahl int;
begin
  select count(*) into v_anzahl from projekte where anreise_km is not null;
  raise notice '% Auftrag/Aufträge tragen jetzt eine Anfahrt.', v_anzahl;
end $$;

-- ---------------------------------------------------------
-- 3) Und weg vom Standort
-- ---------------------------------------------------------
-- „Ausser der Postadresse gehört gar nichts in den Standort."
alter table standorte drop column if exists anreise_km;
alter table standorte drop column if exists zugang;

-- Der Trigger aus 0079 nimmt die Anfahrt des Kunden mit an den neuen
-- Standardstandort. Beides gibt es hier nicht mehr – neu geschrieben, damit
-- er keine gelöschte Spalte anfasst.
create or replace function lege_standardstandort_an()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_standort uuid;
begin
  if not new.ist_kunde then
    return new;
  end if;

  -- Wiederholbar: Der Trigger läuft auch bei jedem update auf ist_kunde.
  select id into v_standort
    from standorte
   where kunde_id = new.id and ist_standard
   limit 1;

  if v_standort is not null then
    return new;
  end if;

  insert into standorte (
    organisation_id, kunde_id, bezeichnung, strasse, hausnummer,
    adresse_zusatz, plz, ort, land, ist_standard
  ) values (
    new.organisation_id,
    new.id,
    -- Der Name des Kunden als Bezeichnung: Wer die Ebene nie einschaltet,
    -- liest ihn in Listen und auf Belegen und merkt nichts von ihr.
    coalesce(nullif(trim(concat_ws(' ', new.vorname, new.name)), ''), 'Standort'),
    new.strasse, new.hausnummer, new.adresse_zusatz,
    new.plz, new.ort, coalesce(new.land, 'CH'),
    true
  );

  return new;
end;
$$;

-- ---------------------------------------------------------
-- 4) Und weg vom Kunden
-- ---------------------------------------------------------
alter table kunden drop column if exists anreise_km;

-- ---------------------------------------------------------
-- 5) Der Kunde am Rapport – seit 0071 überfällig
-- ---------------------------------------------------------
-- Der Kunde ergibt sich aus dem Auftrag. 0071 hat die Spalte nullable
-- gemacht und ihr Ende angekündigt; der Code schreibt sie seit Etappe 1
-- nicht mehr.
alter table rapporte drop column if exists kunde_id;

-- ---------------------------------------------------------
-- 6) Was beim neuen Auftrag mitkommt, stellt der Betrieb ein
-- ---------------------------------------------------------
-- „Ich bin immer dafür möglichst flexibel zu bleiben und so viel wie möglich
-- in den Einstellungen parametrisieren zu lassen." (22.08.2026)
--
-- Einzelne Spalten und kein jsonb: Eine Spalte lässt sich in SQL prüfen,
-- kommentieren und ohne Tippfehler abfragen – und die Liste ändert sich
-- selten. Die Vorgaben sind das, was für einen neuen Mandanten sinnvoll ist,
-- keine Vorschrift.
alter table organisationen
  -- Werte (Kopie): Sie gehören zum Weg und zur Tür und sind am selben Ort
  -- meist gleich.
  add column if not exists vortrag_anreise_km boolean not null default true,
  add column if not exists vortrag_zugang boolean not null default true,
  -- Verknüpfung: kostet nichts und bleibt richtig, wenn das Büro umzieht.
  add column if not exists vortrag_adressen boolean not null default true,
  -- Aus: wechselt von Vorhaben zu Vorhaben.
  add column if not exists vortrag_projektleitung boolean not null default false,
  add column if not exists vortrag_team boolean not null default false,
  add column if not exists vortrag_kostenstelle boolean not null default false,
  -- Aus: Die Notiz von damals gilt selten heute.
  add column if not exists vortrag_notizen boolean not null default false;

comment on column organisationen.vortrag_anreise_km is
  'Beim Anlegen eines Auftrags die Anfahrt vom letzten Auftrag am SELBEN '
  'Standort übernehmen. Beim ersten Auftrag an einer Adresse bleibt das Feld '
  'leer – eine vorgetragene Distanz von einer anderen Liegenschaft wäre '
  'plausibel und falsch.';

-- ---------------------------------------------------------
-- 7) Nachzählen statt hoffen
-- ---------------------------------------------------------
do $$
declare
  v_rest int;
  v_namen text;
begin
  select count(*), string_agg(table_name || '.' || column_name, ', ')
    into v_rest, v_namen
    from information_schema.columns
   where table_schema = 'public'
     and (   (table_name = 'standorte' and column_name in ('anreise_km', 'zugang', 'notiz'))
          or (table_name = 'kunden' and column_name = 'anreise_km')
          or (table_name = 'rapporte' and column_name = 'kunde_id'));

  if v_rest > 0 then
    raise exception 'Diese Spalten hätten fallen sollen: %', v_namen;
  end if;

  if not exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'projekte'
       and column_name in ('anreise_km', 'zugang')
     having count(*) = 2
  ) then
    raise exception 'Am Auftrag fehlen anreise_km oder zugang.';
  end if;

  raise notice 'Anfahrt und Zugang stehen am Auftrag. Der Standort ist eine Adresse.';
end $$;
