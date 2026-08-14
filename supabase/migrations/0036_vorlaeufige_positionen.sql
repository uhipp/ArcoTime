-- =========================================================
-- 0036  Vorläufige Positionen: Entwürfe zählen noch nicht
-- =========================================================
--
-- Ein Rapport wird in der Regel VORBEREITET: Die Disposition legt die
-- Aufträge der kommenden Woche an, mit bereits bekannten Positionen
-- (Reisespesen, angenommene Stunden) und einer Beschreibung dessen, was
-- der Monteur umsetzen soll. Vor Ort passt er die Werte an und schliesst
-- ab.
--
-- Bis dahin ist eine Position eine Absicht, kein Nachweis. Sie stand aber
-- schon als vollwertiger Zeiteintrag in Auswertungen und im Export – und
-- weil ein vorbereiteter Rapport in der Zukunft liegt, standen dort sogar
-- Zeiten, die noch gar nicht geleistet sein KONNTEN.
--
-- Gelöst wird das über den Zustand, nicht über den Ort: Die Position
-- bleibt ein Zeiteintrag, gilt aber als vorläufig, solange ihr Rapport
-- nicht signiert oder abgeschlossen ist. Eine Zwischentabelle mit
-- Kopierschritt beim Abschliessen wurde bewusst verworfen – sie führte
-- Preis-, MWSt- und Rabatt-Logik doppelt und könnte beim Kopieren halb
-- durchlaufen.
--
-- Was vorläufige Positionen NICHT betrifft: die Tagesarbeitszeit-Prüfung.
-- Die fragt "ist dieser Tag physisch plausibel", nicht "ist das
-- verrechenbar" – und schlägt damit auch an, wenn die Disposition
-- jemandem vierzehn Stunden auf einen Tag legt.

create or replace view v_zeiteintraege
  with (security_invoker = true)
as
select
  z.id,
  z.datum,
  z.start_zeit,
  z.end_zeit,
  z.dauer_minuten,
  z.timer_gestartet_um,
  case when z.dauer_minuten is not null
       then round(z.dauer_minuten / 60.0, 2)
  end as menge_stunden,
  z.beschreibung,
  z.rabatt_prozent,
  z.referenz,
  z.beleg_id,
  round(
    coalesce(z.dauer_minuten / 60.0, z.menge, 0) * z.preis * (1 - z.rabatt_prozent / 100.0),
    2
  ) as betrag,
  m.id as projekt_id,
  m.bezeichnung as projekt_bezeichnung,
  m.kostenstelle,
  k.id as kunde_id,
  k.adress_schluessel,
  k.anrede,
  k.vorname,
  k.name as kunde_name,
  k.adresse_zusatz,
  -- Eine Spalte, wie der Comatic-Import sie erwartet: Strasse und
  -- Hausnummer wieder zusammengesetzt. nullif, damit ein Kunde ohne
  -- Adresse null liefert und nicht einen leeren String.
  nullif(trim(concat_ws(' ', k.strasse, k.hausnummer)), '') as strasse,
  k.postfach,
  k.plz,
  k.ort,
  k.land,
  k.email,
  k.telefon,
  k.waehrung,
  k.zahlungskondition_tage,
  d.bezeichnung as dienstleistung_bezeichnung,
  d.konto,
  z.mwst_code,
  p.name as mitarbeiter_name,
  z.mitarbeiter_id,
  z.user_id,
  z.preis,
  d.klasse_id,
  dk.bezeichnung as klasse_bezeichnung,
  z.organisation_id,
  z.mwst_satz,
  z.menge,
  z.rapport_id,
  z.dienstleistung_id,
  round(coalesce(z.dauer_minuten / 60.0, z.menge, 0), 2) as menge_verrechnet,
  d.einheit,
  d.zaehlt_als_arbeitszeit,
  d.rabatt_erlaubt,
  -- Vorläufig ist alles, was zu einem Rapport gehört, der noch nicht
  -- signiert oder abgeschlossen ist. Ein Entwurf kann geändert, ergänzt
  -- oder ganz verworfen werden; ein stornierter Rapport gilt als nie
  -- geleistet. In beiden Fällen darf die Position weder in Auswertungen
  -- noch in den Export.
  --
  -- Bewusst als Spalte der View und nicht als Feld am Zeiteintrag: Es gibt
  -- nichts nachzuführen, wenn ein Rapport seinen Status wechselt. Der
  -- Statuswechsel IST die Änderung.
  coalesce(r.status is not null and r.status not in ('signiert', 'abgeschlossen'), false)
    as vorlaeufig,
  r.status as rapport_status
from zeiteintraege z
join projekte m on m.id = z.projekt_id
join kunden k on k.id = m.kunde_id
join dienstleistungen d on d.id = z.dienstleistung_id
left join dienstleistungsklassen dk on dk.id = d.klasse_id
join profiles p on p.id = z.mitarbeiter_id
left join rapporte r on r.id = z.rapport_id;


-- ---------------------------------------------------------
-- Export übergeht vorläufige Positionen
-- ---------------------------------------------------------
-- Die Funktion arbeitet direkt auf zeiteintraege und kennt die View
-- nicht. Ohne diese Ergänzung landete ein vorbereiteter Rapport in der
-- nächsten Abrechnung, und die Belegnummer wäre vergeben, bevor die
-- Arbeit getan ist.

create or replace function erstelle_export(p_projekt_id uuid, p_von date, p_bis date)
returns table(neue_belegnummer bigint, neuer_beleg_id uuid, anzahl int)
language plpgsql
security definer
set search_path = public, pg_temp
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
  from zeiteintraege z
  left join rapporte r on r.id = z.rapport_id
  where z.projekt_id = p_projekt_id
    and z.beleg_id is null
    and z.datum between p_von and p_bis
    and (r.id is null or r.status in ('signiert', 'abgeschlossen'));

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

  update zeiteintraege z
  set beleg_id = v_beleg_id
  where z.projekt_id = p_projekt_id
    and z.beleg_id is null
    and z.datum between p_von and p_bis
    and not exists (
      select 1 from rapporte r
      where r.id = z.rapport_id
        and r.status not in ('signiert', 'abgeschlossen')
    );

  update projekte set naechste_belegnummer = v_belegnummer + 1 where id = p_projekt_id;

  return query select v_belegnummer, v_beleg_id, v_anzahl;
end;
$$;

grant execute on function erstelle_export(uuid, date, date) to authenticated;

-- ---------------------------------------------------------
-- Abschliessen nur mit Datum bis heute
-- ---------------------------------------------------------
-- Ein Rapport wird für die Zukunft vorbereitet – das ist der Normalfall.
-- Nicht möglich ist, ihn dort auch ABZUSCHLIESSEN: Arbeit von morgen kann
-- heute nicht geleistet sein. Genau hier wird aus Absicht ein Nachweis,
-- also gehört die Prüfung an diese Stelle und nicht an die Position.
--
-- Nur der Datumsteil wird geprüft, nicht die Uhrzeit: Wer um 16:55 einen
-- Einsatz bis 17:00 abschliesst, tut nichts Falsches.
--
-- Der Rest der Funktion ist unverändert gegenüber 0026.

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
