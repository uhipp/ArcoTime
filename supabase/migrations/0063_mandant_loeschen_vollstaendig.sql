-- Mandant vollständig löschen – ohne Liste zum Pflegen
--
-- Migration 0061 ging davon aus, dass die fachlichen Tabellen über
-- "on delete cascade" an organisationen hängen und es deshalb genügt, das
-- Änderungsprotokoll abzuräumen und dann die Organisation zu löschen.
--
-- Das stimmt nicht. Von 36 Fremdschlüsseln auf organisationen(id) hat genau
-- einer ein cascade. Aufgefallen ist es beim Löschen des zweiten
-- Testmandanten: "violates foreign key constraint einheiten_organisation_id_fkey".
-- Der erste Testmandant liess sich nur löschen, weil dort noch keine Daten
-- erfasst waren – die Löschung sah erfolgreich aus und war es nur zufällig.
-- Ein Mandant mit echten Zeiteinträgen wäre ebenso gescheitert.
--
-- Die naheliegende Korrektur wäre, einheiten in die Liste aufzunehmen. Damit
-- wäre der nächste Fall nur vertagt: Jede neue Tabelle müsste jemand daran
-- erinnern, hier nachgetragen zu werden, und vergisst man es, scheitert die
-- Löschung erst beim Kunden.
--
-- Deshalb liest die Funktion die abhängigen Tabellen jetzt aus dem Katalog
-- statt aus einer Aufzählung. Die Löschregel des Fremdschlüssels drückt
-- dabei die Absicht aus:
--
--   on delete set null  ->  die Zeile ÜBERLEBT (so bei rechnungen: ein Beleg
--                           ist nach Art. 958f OR zehn Jahre aufzubewahren)
--   alles andere        ->  die Zeile gehört zum Mandanten und geht mit
--
-- Neue Tabellen sind damit automatisch erfasst, sobald sie einen
-- Fremdschlüssel auf organisationen tragen – und den tragen sie, weil das
-- Mandantenmodell darauf beruht.

create or replace function loesche_organisation(p_organisation uuid)
returns table (tabelle text, anzahl bigint)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_abhaengig record;
  v_geloescht bigint;
  v_offen int;
  v_durchgang int := 0;
  v_ergebnis jsonb := '{}'::jsonb;
  v_letzter_fehler text;
begin
  if not exists (select 1 from organisationen where id = p_organisation) then
    raise exception 'Organisation % existiert nicht', p_organisation;
  end if;

  -- Das Änderungsprotokoll trägt seit 0061 bewusst keinen Fremdschlüssel
  -- mehr und taucht im Katalog deshalb nicht auf. Es enthält Personendaten
  -- und gehört zur Löschung dazu.
  delete from aenderungsprotokoll where organisation_id = p_organisation;
  get diagnostics v_geloescht = row_count;
  if v_geloescht > 0 then
    v_ergebnis := v_ergebnis || jsonb_build_object('aenderungsprotokoll', v_geloescht);
  end if;

  -- In mehreren Durchgängen, weil die abhängigen Tabellen auch untereinander
  -- Fremdschlüssel haben und die richtige Reihenfolge nicht vorab bekannt
  -- ist. Was in einem Durchgang blockiert, klappt im nächsten, sobald die
  -- Kindzeilen weg sind. Der Zähler begrenzt das, damit ein echter Zyklus
  -- nicht endlos dreht.
  loop
    v_durchgang := v_durchgang + 1;
    v_offen := 0;

    for v_abhaengig in
      select
        c.conrelid::regclass::text as tab,
        a.attname::text as spalte
      from pg_constraint c
      join pg_attribute a
        on a.attrelid = c.conrelid
       and a.attnum = c.conkey[1]
      where c.confrelid = 'public.organisationen'::regclass
        and c.contype = 'f'
        and array_length(c.conkey, 1) = 1
        -- 'n' = on delete set null: Diese Zeilen überleben den Mandanten.
        and c.confdeltype <> 'n'
        and c.conrelid <> 'public.organisationen'::regclass
      order by 1
    loop
      begin
        execute format('delete from %s where %I = $1', v_abhaengig.tab, v_abhaengig.spalte)
          using p_organisation;
        get diagnostics v_geloescht = row_count;
        if v_geloescht > 0 then
          v_ergebnis := v_ergebnis || jsonb_build_object(
            v_abhaengig.tab,
            coalesce((v_ergebnis ->> v_abhaengig.tab)::bigint, 0) + v_geloescht
          );
        end if;
      exception
        when foreign_key_violation then
          -- Kindzeilen in einer anderen Tabelle hängen noch daran.
          v_offen := v_offen + 1;
          v_letzter_fehler := sqlerrm;
      end;
    end loop;

    exit when v_offen = 0;

    if v_durchgang >= 10 then
      raise exception
        'Mandant % nicht löschbar: nach % Durchgängen blockieren noch % Tabellen. Zuletzt: %',
        p_organisation, v_durchgang, v_offen, v_letzter_fehler;
    end if;
  end loop;

  delete from organisationen where id = p_organisation;
  v_ergebnis := v_ergebnis || jsonb_build_object('organisationen', 1);

  return query
    select e.key::text, e.value::text::bigint
    from jsonb_each(v_ergebnis) e
    order by 1;
end;
$$;

revoke all on function loesche_organisation(uuid) from public, anon, authenticated;

comment on function loesche_organisation(uuid) is
  'Löscht einen Mandanten samt aller abhängigen Zeilen. Die abhängigen Tabellen werden aus dem Katalog gelesen, nicht aufgezählt; ein Fremdschlüssel mit "on delete set null" bedeutet, dass die Zeile den Mandanten überlebt.';
