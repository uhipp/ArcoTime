-- =========================================================
-- 0037  Fix: "column reference \"jahr\" is ambiguous"
-- =========================================================
--
-- Der Abschluss eines Rapports scheiterte mit
--   column reference "jahr" is ambiguous
--
-- Ursache: Die Funktion ist als "returns table(jahr int, nummer int)"
-- deklariert. Damit gibt es im Rumpf zwei Variablen namens jahr und
-- nummer – und an dieser Stelle
--
--   on conflict (organisation_id, jahr)
--
-- weiss PL/pgSQL nicht, ob die Spalte von rapport_nummernkreis oder die
-- Rueckgabevariable gemeint ist. In der Konfliktliste eines INSERT ist
-- das nicht aufloesbar, also bricht Postgres ab.
--
-- Der Fehler steckt seit 0026 in der Funktion. Aufgefallen ist er erst
-- jetzt, weil sie bis zum Bau des Abschluss-Knopfes nie aufgerufen wurde
-- – ein gutes Beispiel dafuer, dass ungenutzter Code nicht "funktioniert",
-- sondern nur ungeprueft ist.
--
-- Behoben mit "#variable_conflict use_column": Wo ein Name sowohl Spalte
-- als auch Variable sein koennte, gewinnt die Spalte. Genau das ist hier
-- ueberall gemeint; die Variablen heissen v_jahr und v_nummer und sind
-- davon nicht betroffen.
--
-- Bewusst ueber die Direktive statt ueber umbenannte Rueckgabespalten:
-- Ein Umbenennen verlangt DROP FUNCTION, und damit gehen die erteilten
-- Rechte verloren, die dann wieder gesetzt werden muessen. Der Rumpf ist
-- ansonsten unveraendert gegenueber 0036.

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
#variable_conflict use_column
declare
  v_org uuid;
  v_jahr int;
  v_nummer int;
  v_status text;
  v_datum date;
begin
  if p_status not in ('signiert', 'abgeschlossen') then
    raise exception 'Ungültiger Zielstatus: %', p_status;
  end if;

  select r.organisation_id, extract(year from r.datum)::int, r.status, r.datum
    into v_org, v_jahr, v_status, v_datum
  from public.rapporte r
  where r.id = p_rapport_id
    and r.organisation_id = public.current_organisation_id();

  if v_org is null then
    raise exception 'Rapport nicht gefunden.';
  end if;
  if v_status <> 'offen' then
    raise exception 'Dieser Rapport ist bereits abgeschlossen.';
  end if;
  if v_datum > current_date then
    raise exception 'Ein Rapport mit Datum in der Zukunft lässt sich nicht abschliessen – die Arbeit ist noch nicht geleistet.';
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

grant execute on function schliesse_rapport(uuid, text, text, text, text) to authenticated;
