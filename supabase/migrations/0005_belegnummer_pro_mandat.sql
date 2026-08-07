-- =========================================================
-- Belegnummer pro Mandat (Phase 4)
-- Jedes Mandat verwaltet seine EIGENE nächste Belegnummer (statt einer
-- einzigen globalen Sequenz). Beim Export wird diese Nummer verwendet und
-- danach um 1 erhöht. Eindeutigkeit über alle Mandate hinweg wird zusätzlich
-- durch die unique-Constraint auf belege_exporte.belegnummer erzwungen –
-- die Funktion erstelle_export() springt bei einer Kollision automatisch
-- zur nächsten freien Nummer.
-- Führe diese Datei NACH 0001–0004 aus.
-- =========================================================

alter table mandate add column if not exists naechste_belegnummer bigint not null default 470000;

alter table belege_exporte alter column belegnummer drop default;
drop sequence if exists belegnummer_seq;

create or replace function erstelle_export(p_mandat_id uuid, p_von date, p_bis date)
returns table(neue_belegnummer bigint, neuer_beleg_id uuid, anzahl int)
as $$
declare
  v_belegnummer bigint;
  v_beleg_id uuid;
  v_anzahl int;
begin
  select count(*) into v_anzahl
  from zeiteintraege
  where mandat_id = p_mandat_id
    and beleg_id is null
    and datum between p_von and p_bis;

  if v_anzahl = 0 then
    return query select null::bigint, null::uuid, 0;
    return;
  end if;

  -- Mandat-Zeile sperren: verhindert, dass zwei gleichzeitige Exporte für
  -- dasselbe Mandat dieselbe Belegnummer vergeben.
  select naechste_belegnummer into v_belegnummer
  from mandate
  where id = p_mandat_id
  for update;

  if v_belegnummer is null then
    raise exception 'Mandat % nicht gefunden', p_mandat_id;
  end if;

  while exists (select 1 from belege_exporte where belegnummer = v_belegnummer) loop
    v_belegnummer := v_belegnummer + 1;
  end loop;

  insert into belege_exporte (belegnummer, mandat_id, zeitraum_von, zeitraum_bis, anzahl_positionen, erstellt_von)
  values (v_belegnummer, p_mandat_id, p_von, p_bis, v_anzahl, auth.uid())
  returning id into v_beleg_id;

  update zeiteintraege
  set beleg_id = v_beleg_id
  where mandat_id = p_mandat_id
    and beleg_id is null
    and datum between p_von and p_bis;

  update mandate set naechste_belegnummer = v_belegnummer + 1 where id = p_mandat_id;

  return query select v_belegnummer, v_beleg_id, v_anzahl;
end;
$$ language plpgsql;

grant execute on function erstelle_export(uuid, date, date) to authenticated;
