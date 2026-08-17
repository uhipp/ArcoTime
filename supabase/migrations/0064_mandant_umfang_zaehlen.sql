-- Was hängt an einem Mandanten? – dieselbe Quelle wie beim Löschen
--
-- Der Probelauf von scripts/mandant-loeschen.mjs zählte bisher eine im
-- Skript aufgeschriebene Liste von Tabellen ab. Beim Löschen der
-- "Hans Meier AG" kündigte er drei Protokollzeilen an; tatsächlich gingen
-- zusätzlich sieben Abwesenheitsarten und vier Einheiten mit.
--
-- Das ist der gefährlichere Teil des Fehlers aus 0063: Der Probelauf ist die
-- Bremse vor einer nicht umkehrbaren Aktion. Zeigt er zu wenig, bestätigt
-- man die Löschung im Glauben, es hänge kaum etwas daran. Eine Prüfung, die
-- stillschweigend nichts findet, ist schlimmer als gar keine.
--
-- Diese Funktion liest deshalb aus demselben Katalog wie
-- loesche_organisation und zählt genau die Zeilen, die dort gelöscht würden.
-- Ankündigung und Ausführung können damit nicht mehr auseinanderlaufen.

create or replace function zaehle_organisation_daten(p_organisation uuid)
returns table (tabelle text, anzahl bigint)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_abhaengig record;
  v_anzahl bigint;
begin
  -- Ohne Fremdschlüssel seit 0061, deshalb wie dort von Hand.
  select count(*) into v_anzahl
    from aenderungsprotokoll where organisation_id = p_organisation;
  if v_anzahl > 0 then
    tabelle := 'aenderungsprotokoll'; anzahl := v_anzahl; return next;
  end if;

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
      and c.confdeltype <> 'n'   -- 'set null': überlebt den Mandanten
      and c.conrelid <> 'public.organisationen'::regclass
    order by 1
  loop
    execute format('select count(*) from %s where %I = $1', v_abhaengig.tab, v_abhaengig.spalte)
      into v_anzahl using p_organisation;
    if v_anzahl > 0 then
      tabelle := v_abhaengig.tab; anzahl := v_anzahl; return next;
    end if;
  end loop;
end;
$$;

revoke all on function zaehle_organisation_daten(uuid) from public, anon, authenticated;

comment on function zaehle_organisation_daten(uuid) is
  'Zählt die Zeilen, die loesche_organisation() entfernen würde – aus demselben Katalog gelesen, damit Probelauf und Löschung nicht auseinanderlaufen.';
