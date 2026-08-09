-- =========================================================
-- Timer persistent machen
--
-- Bisher lief der Timer nur im Browser (React-State) – beim Verlassen der
-- Seite ging der laufende Eintrag verloren. Neu: "Timer starten" legt
-- sofort einen echten Zeiteintrag mit timer_gestartet_um an; "Dauer" ist
-- erst gesetzt, wenn der Timer gestoppt wird. So kann man die Seite
-- verlassen und später zurückkehren, ohne etwas zu verlieren.
--
-- Führe diese Datei NACH 0001-0009 aus.
-- =========================================================

alter table zeiteintraege add column if not exists timer_gestartet_um timestamptz;

-- dauer_minuten darf jetzt vorübergehend leer sein (während der Timer läuft)
alter table zeiteintraege alter column dauer_minuten drop not null;
alter table zeiteintraege drop constraint if exists zeiteintraege_dauer_minuten_check;
alter table zeiteintraege add constraint zeiteintraege_dauer_check check (
  timer_gestartet_um is not null or (dauer_minuten is not null and dauer_minuten > 0)
);

-- Schneller Check "läuft bei mir schon ein Timer?" beim Starten eines neuen
create index if not exists idx_zeiteintraege_timer_laufend
  on zeiteintraege(mitarbeiter_id)
  where timer_gestartet_um is not null;

-- Laufende (unfertige) Timer dürfen nie mitexportiert werden.
create or replace function erstelle_export(p_projekt_id uuid, p_von date, p_bis date)
returns table(neue_belegnummer bigint, neuer_beleg_id uuid, anzahl int)
as $$
declare
  v_org_id uuid;
  v_belegnummer bigint;
  v_beleg_id uuid;
  v_anzahl int;
begin
  select organisation_id into v_org_id from projekte where id = p_projekt_id;
  if v_org_id is null then
    raise exception 'Projekt % nicht gefunden', p_projekt_id;
  end if;

  select count(*) into v_anzahl
  from zeiteintraege
  where projekt_id = p_projekt_id
    and beleg_id is null
    and timer_gestartet_um is null
    and datum between p_von and p_bis;

  if v_anzahl = 0 then
    return query select null::bigint, null::uuid, 0;
    return;
  end if;

  select naechste_belegnummer into v_belegnummer
  from projekte
  where id = p_projekt_id
  for update;

  while exists (
    select 1 from belege_exporte
    where belegnummer = v_belegnummer and organisation_id = v_org_id
  ) loop
    v_belegnummer := v_belegnummer + 1;
  end loop;

  insert into belege_exporte (belegnummer, projekt_id, organisation_id, zeitraum_von, zeitraum_bis, anzahl_positionen, erstellt_von)
  values (v_belegnummer, p_projekt_id, v_org_id, p_von, p_bis, v_anzahl, auth.uid())
  returning id into v_beleg_id;

  update zeiteintraege
  set beleg_id = v_beleg_id
  where projekt_id = p_projekt_id
    and beleg_id is null
    and timer_gestartet_um is null
    and datum between p_von and p_bis;

  update projekte set naechste_belegnummer = v_belegnummer + 1 where id = p_projekt_id;

  return query select v_belegnummer, v_beleg_id, v_anzahl;
end;
$$ language plpgsql;
