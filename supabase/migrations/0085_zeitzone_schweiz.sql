-- =========================================================
-- 0085  Schweizer Zeit statt Serverzeit
-- =========================================================
--
-- Der Server läuft auf UTC, die Betriebe arbeiten in UTC+1 (Winter) bzw.
-- UTC+2 (Sommer). Am 23.08.2026 hat das der Timer sichtbar gemacht: Wer um
-- 14:30 startete, bekam 12:30 in den Eintrag. Der Code ist im gleichen Zug
-- umgestellt (src/lib/date-utils.ts); hier folgt die Datenbank.
--
-- Drei getrennte Dinge, die alle dieselbe Ursache haben:
--
--   1) current_date ist der UTC-Tag. Zwischen 00:00 und 02:00 Ortszeit
--      steht dort noch der Vortag. Das betrifft die Vorgabewerte für
--      datum-Spalten UND die Prüfung "kein Datum in der Zukunft": Wer um
--      00:30 den Rapport von heute erfasst, wurde abgewiesen.
--
--   2) geplant_von und geplant_bis wurden als Zeichenkette OHNE Offset
--      geschrieben ("2026-08-23T08:00:00"). Postgres legt eine Angabe ohne
--      Offset in der Zeitzone der Sitzung ab, und die ist UTC. Ein auf
--      08:00 geplanter Einsatz steht damit als 08:00 UTC in der Datenbank,
--      also 10:00 Schweizer Zeit. Beim Anzeigen wurde derselbe Fehler
--      rückwärts gemacht – deshalb sah es richtig aus, und deshalb ist es
--      niemandem aufgefallen. Falsch war es trotzdem: Jeder Vergleich mit
--      now() und jeder Cron-Lauf rechnete zwei Stunden daneben.
--
--   3) Die Uhrzeiten in start_zeit und end_zeit (Spaltentyp `time`, also
--      Wanduhrzeit) sind für Einträge aus dem Timer um den Offset zu früh.
--      Diese Zeilen werden hier NICHT angefasst – warum, steht unten.

-- ---------------------------------------------------------
-- 0) Einmal-Sperre
-- ---------------------------------------------------------
-- Schritt 2 verschiebt Zeitstempel. Ein zweiter Lauf würde sie ein zweites
-- Mal verschieben, und danach wäre nicht mehr feststellbar, was richtig
-- ist. Also eine Spur, die den zweiten Lauf abbricht.
create table if not exists zeitzonen_korrektur (
  id int primary key default 1 check (id = 1),
  ausgefuehrt_am timestamptz not null default now(),
  verschobene_zeilen int not null
);

comment on table zeitzonen_korrektur is
  'Einmal-Sperre für 0085. Existiert die Zeile, ist die Verschiebung der '
  'Planzeiten erledigt und darf nicht wiederholt werden.';

-- ---------------------------------------------------------
-- 1) Der Schweizer Kalendertag als Funktion
-- ---------------------------------------------------------
create or replace function heute_ch()
returns date
language sql
stable
set search_path = public, pg_temp
as $$
  select (now() at time zone 'Europe/Zurich')::date;
$$;

comment on function heute_ch() is
  'Heutiger Kalendertag in Schweizer Zeit. Ersetzt current_date, das den '
  'UTC-Tag liefert und zwischen 00:00 und 02:00 Ortszeit noch auf dem '
  'Vortag steht. Deutschland und Österreich haben denselben Offset.';

-- Vorgabewerte
alter table zeiteintraege alter column datum set default heute_ch();
alter table rapporte      alter column datum set default heute_ch();
alter table projekte      alter column startdatum set default heute_ch();

-- ---------------------------------------------------------
-- 2) current_date in Funktionskörpern nachziehen
-- ---------------------------------------------------------
-- Die Lehre aus 0082: Postgres zieht Funktionskörper nicht mit. Und die
-- Lehre aus 0063/0064: keine Handliste – gefragt wird der Katalog.
do $$
declare
  v_funktion record;
  v_quelle text;
  v_anzahl int := 0;
begin
  for v_funktion in
    select p.oid,
           p.proname,
           pg_get_functiondef(p.oid) as definition
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.prokind = 'f'
       and p.prosrc ~* '\mcurrent_date\M'
  loop
    -- \m und \M sind Wortgrenzen: "current_date" darf nicht in einem
    -- längeren Namen getroffen werden.
    v_quelle := regexp_replace(v_funktion.definition, '\mcurrent_date\M', 'heute_ch()', 'gi');
    execute v_quelle;
    v_anzahl := v_anzahl + 1;
    raise notice 'current_date -> heute_ch() in %', v_funktion.proname;
  end loop;
  raise notice '% Funktion(en) nachgezogen.', v_anzahl;
end $$;

-- Nachzählen: Es darf keine Funktion mehr mit current_date geben.
do $$
declare
  v_rest text;
begin
  select string_agg(p.proname, ', ')
    into v_rest
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.prokind = 'f'
     and p.prosrc ~* '\mcurrent_date\M';
  if v_rest is not null then
    raise exception 'Diese Funktionen rechnen weiter mit current_date: %', v_rest;
  end if;
  raise notice 'Keine Funktion rechnet mehr mit current_date.';
end $$;

-- ---------------------------------------------------------
-- 3) Die Planzeiten geraderücken
-- ---------------------------------------------------------
-- Bisher gespeichert: 08:00 UTC, gemeint war 08:00 Schweizer Zeit.
--
--   geplant_von at time zone 'UTC'          -> nackte 08:00
--   ... at time zone 'Europe/Zurich'        -> 08:00 CEST = 06:00 UTC
--
-- Der Umweg über die Zeitzonendatenbank rechnet je Zeile mit dem Offset,
-- der an DIESEM Datum galt: eine Stunde im Winter, zwei im Sommer. Ein
-- pauschales "minus zwei Stunden" wäre für jeden Einsatz zwischen Ende
-- Oktober und Ende März falsch.
do $$
declare
  v_zeilen int;
begin
  if exists (select 1 from zeitzonen_korrektur) then
    raise notice 'Planzeiten wurden bereits korrigiert – Schritt übersprungen.';
    return;
  end if;

  update rapporte
     set geplant_von = case
           when geplant_von is null then null
           else (geplant_von at time zone 'UTC') at time zone 'Europe/Zurich'
         end,
         geplant_bis = case
           when geplant_bis is null then null
           else (geplant_bis at time zone 'UTC') at time zone 'Europe/Zurich'
         end
   where geplant_von is not null
      or geplant_bis is not null;

  get diagnostics v_zeilen = row_count;
  insert into zeitzonen_korrektur (verschobene_zeilen) values (v_zeilen);
  raise notice '% Rapport(e) mit Planzeiten geraderückt.', v_zeilen;
end $$;

-- ---------------------------------------------------------
-- 4) Was hier NICHT korrigiert wird, und warum
-- ---------------------------------------------------------
-- start_zeit und end_zeit sind Wanduhrzeiten. Wer sie von Hand eingetippt
-- hat, hat sie richtig eingetippt; wer den Timer benutzt hat, hat sie um
-- den Offset zu früh. Nach dem Stoppen wird timer_gestartet_um auf null
-- gesetzt – hinterher ist an der Zeile nicht mehr erkennbar, woher die
-- Uhrzeit kam. Eine pauschale Verschiebung würde also die von Hand
-- erfassten Zeiten kaputtmachen.
--
-- Deshalb bleibt es bei einer Liste: Diese Einträge sind von Hand zu
-- prüfen. Die Dauer ist in allen Fällen richtig – sie wird aus zwei
-- Zeitstempeln gerechnet, und die Differenz zweier UTC-Zeitpunkte stimmt.
-- Falsch sind nur die beiden Uhrzeiten daneben.
do $$
declare
  v_offen int;
begin
  select count(*) into v_offen
    from zeiteintraege
   where start_zeit is not null;
  if v_offen > 0 then
    raise notice
      'Hinweis: % Zeiteintrag/Zeiteinträge haben eine Uhrzeit. Wo sie aus dem Timer kommt, ist sie um 1-2 Stunden zu früh und von Hand zu korrigieren (die Dauer stimmt).',
      v_offen;
  end if;
end $$;

-- Ein laufender Timer hat noch keine Endzeit, aber eine falsche Startzeit.
-- Den kann man rechnen, denn timer_gestartet_um steht noch da.
update zeiteintraege
   set start_zeit = to_char(timer_gestartet_um at time zone 'Europe/Zurich', 'HH24:MI')
 where timer_gestartet_um is not null;
