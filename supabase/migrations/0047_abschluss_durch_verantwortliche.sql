-- =========================================================
-- 0047  Abschluss durch die verantwortliche Person
--       (Phase 9, Etappe D)
-- =========================================================
--
-- Ein Rapport wird von der Person abgeschlossen, die ihn verantwortet –
-- der Projektleitung. Damit hat die Rolle eine Wirkung und ist keine
-- Beschriftung: Wer unterschreiben lässt, steht auch dafür ein, dass die
-- Positionen stimmen.
--
-- Admins duerfen ebenfalls. Sonst haengt ein Einsatz fest, sobald die
-- verantwortliche Person krank wird oder die Firma verlaesst – und der
-- einzige Ausweg waere ein Eingriff in der Datenbank.
--
-- Bewusst NICHT eingeschränkt: das Stornieren. Es ist eine Korrektur des
-- Büros und trifft oft gerade dann zu, wenn die verantwortliche Person
-- nicht greifbar ist.
--
-- Der Rest der Funktion ist unverändert gegenüber 0037.

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
  v_verantwortlich uuid;
begin
  if p_status not in ('signiert', 'abgeschlossen') then
    raise exception 'Ungültiger Zielstatus: %', p_status;
  end if;

  select r.organisation_id, extract(year from r.datum)::int, r.status, r.datum, r.mitarbeiter_id
    into v_org, v_jahr, v_status, v_datum, v_verantwortlich
  from public.rapporte r
  where r.id = p_rapport_id
    and r.organisation_id = public.current_organisation_id();

  if v_org is null then
    raise exception 'Rapport nicht gefunden.';
  end if;
  if v_verantwortlich is distinct from auth.uid() and not public.is_admin() then
    raise exception
      'Diesen Rapport schliesst die verantwortliche Person ab. Bitte an sie wenden oder oben eine andere eintragen.';
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
