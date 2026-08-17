-- Vollständiger Datenexport einer Organisation
--
-- AGB Ziffer 10: "Der Kunde kann seine Daten während der Vertragsdauer
-- jederzeit selbst in einem gängigen elektronischen Format exportieren."
--
-- Der bestehende Export unter /export ist etwas anderes: Er liefert die
-- Zeiteinträge im Format des Buchhaltungssystems Comatic und markiert sie
-- dabei als exportiert. Er deckt weder alle Daten ab noch taugt er in der
-- Nachfrist, weil er schreibt.
--
-- Diese Funktion liest den ganzen Mandanten – aus demselben Katalog wie
-- loesche_organisation (0063) und zaehle_organisation_daten (0064). Das ist
-- der Punkt: Was beim Löschen verschwindet, muss vorher herausgeholt werden
-- können. Zwei getrennte Listen würden früher oder später auseinanderlaufen,
-- und die Lücke fiele erst auf, wenn die Daten schon weg sind.
--
-- Nicht enthalten sind Zeilen, deren Fremdschlüssel "on delete set null"
-- trägt – das sind die Rechnungen, und die gehören der Arcos Group als
-- eigener Beleg, nicht dem Mandanten. Die Kundin sieht sie unter
-- Einstellungen -> Abonnement.

create or replace function exportiere_organisation(p_organisation uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_abhaengig record;
  v_zeilen jsonb;
  v_daten jsonb := '{}'::jsonb;
  v_organisation jsonb;
begin
  select to_jsonb(o) into v_organisation from organisationen o where o.id = p_organisation;
  if v_organisation is null then
    raise exception 'Organisation % existiert nicht', p_organisation;
  end if;

  -- Ohne Fremdschlüssel seit 0061, deshalb von Hand.
  select coalesce(jsonb_agg(to_jsonb(a)), '[]'::jsonb) into v_zeilen
    from aenderungsprotokoll a where a.organisation_id = p_organisation;
  v_daten := v_daten || jsonb_build_object('aenderungsprotokoll', v_zeilen);

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
      and c.confdeltype <> 'n'   -- 'set null': gehört Arcos, nicht dem Mandanten
      and c.conrelid <> 'public.organisationen'::regclass
    order by 1
  loop
    execute format(
      'select coalesce(jsonb_agg(to_jsonb(t)), ''[]''::jsonb) from %s t where t.%I = $1',
      v_abhaengig.tab, v_abhaengig.spalte
    ) into v_zeilen using p_organisation;

    v_daten := v_daten || jsonb_build_object(v_abhaengig.tab, v_zeilen);
  end loop;

  return jsonb_build_object(
    'format', 'arcotime-vollexport',
    -- Die Fassung steht dabei, weil ein Export unter Umständen Monate
    -- später wieder eingelesen wird. Ohne sie müsste man raten, gegen
    -- welchen Datenbankstand die Datei entstanden ist.
    'fassung', 1,
    'erstellt_am', now(),
    'organisation', v_organisation,
    'daten', v_daten
  );
end;
$$;

revoke all on function exportiere_organisation(uuid) from public, anon, authenticated;

comment on function exportiere_organisation(uuid) is
  'Liest alle Daten einer Organisation als JSON – aus demselben Katalog, aus dem loesche_organisation() löscht.';
