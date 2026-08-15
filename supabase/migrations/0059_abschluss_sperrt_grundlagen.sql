-- =========================================================
-- 0059  Ein Abschluss sperrt seine Grundlagen
-- =========================================================
--
-- Korrektur zu 0058. Dort wurden die berechneten Zahlen eingefroren, die
-- zugrunde liegenden Zeiteinträge blieben aber änderbar. Damit zeigt die
-- Auswertung X und das Zeitkonto Y – und niemand merkt es.
--
-- Der Fall aus der Praxis: Die Personaladministration schliesst den Monat
-- ab, die Buchhaltung hat die letzte Woche noch nicht exportiert. Ein
-- Projektleiter, der mit beidem nichts zu tun hat, korrigiert einen
-- Zeiteintrag vom 28. – und der Fehler ist da, ohne dass ihn jemand
-- bemerkt.
--
-- Grundsatz: Wer Zahlen einfriert, muss verhindern, dass sich die Daten
-- dahinter noch ändern. Sonst ist der Abschluss eine Behauptung.
--
-- Vier Sperren:
--   1. Zeiteinträge eines abgeschlossenen Monats sind unveränderlich –
--      auch für Admins.
--   2. Exportierte Zeiteinträge ebenso; die bisherige Admin-Ausnahme
--      entfällt.
--   3. Ein Rapport lässt sich nicht abschliessen oder stornieren, wenn
--      seine Stunden in einem abgeschlossenen Monat liegen.
--   4. Ein Monat lässt sich nicht abschliessen, solange Rapporte dieser
--      Person darin offen sind. Damit kann Fall 3 gar nicht mehr
--      eintreten.

-- ---------------------------------------------------------
-- 1) Die Prüffunktion
-- ---------------------------------------------------------
-- SECURITY DEFINER, weil sie in Regeln für Personen läuft, die
-- monatsabschluesse gar nicht lesen dürfen: Ein Monteur soll nicht die
-- Abschlüsse seiner Kollegen sehen – aber die Regel muss sie kennen.
create or replace function monat_abgeschlossen(p_mitarbeiter uuid, p_datum date)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.monatsabschluesse a
    where a.mitarbeiter_id = p_mitarbeiter
      and a.jahr = extract(year from p_datum)::int
      and a.monat = extract(month from p_datum)::int
  );
$$;

-- ---------------------------------------------------------
-- 2) Zeiteinträge sperren
-- ---------------------------------------------------------
-- Der Export bleibt möglich: erstelle_export() läuft als SECURITY
-- DEFINER und umgeht diese Regeln. Die Buchhaltung kann also auch nach
-- einem Monatsabschluss noch verrechnen – sie ändert keine Stunden,
-- sondern setzt nur die Belegnummer.

drop policy if exists "zeiteintraege_insert" on zeiteintraege;
create policy "zeiteintraege_insert" on zeiteintraege for insert with check (
  organisation_id = current_organisation_id()
  and not monat_abgeschlossen(mitarbeiter_id, datum)
);

drop policy if exists "zeiteintraege_update" on zeiteintraege;
create policy "zeiteintraege_update" on zeiteintraege for update using (
  organisation_id = current_organisation_id()
  -- Verrechnete Zeit ist unantastbar. Die frühere Ausnahme für Admins
  -- ist entfallen: Was exportiert ist, liegt in der Buchhaltung, und
  -- eine Korrektur dort läuft über den Beleg und nicht über die
  -- Zeiterfassung.
  and beleg_id is null
  and not monat_abgeschlossen(mitarbeiter_id, datum)
) with check (
  organisation_id = current_organisation_id()
  -- Auch das Verschieben IN einen abgeschlossenen Monat hinein ist
  -- gesperrt – sonst wäre die Sperre in einem Zug zu umgehen.
  and not monat_abgeschlossen(mitarbeiter_id, datum)
);

drop policy if exists "zeiteintraege_delete" on zeiteintraege;
create policy "zeiteintraege_delete" on zeiteintraege for delete using (
  organisation_id = current_organisation_id()
  and beleg_id is null
  and not monat_abgeschlossen(mitarbeiter_id, datum)
);

-- ---------------------------------------------------------
-- 3) Rapporte: Abschluss und Storno
-- ---------------------------------------------------------
-- Beides verändert rückwirkend, was als geleistete Zeit gilt: Der
-- Abschluss macht vorläufige Positionen gültig, das Storno macht
-- gültige ungültig. Liegt eine Position in einem abgeschlossenen Monat,
-- ist beides eine nachträgliche Änderung an einer festgehaltenen Zahl.
create or replace function rapport_beruehrt_abschluss(p_rapport_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_treffer text;
begin
  select to_char(z.datum, 'MM.YYYY') into v_treffer
  from public.zeiteintraege z
  where z.rapport_id = p_rapport_id
    and public.monat_abgeschlossen(z.mitarbeiter_id, z.datum)
  limit 1;

  return v_treffer;
end;
$$;

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
  v_abschluss text;
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

  -- Neu in 0059: Der Abschluss macht vorläufige Positionen gültig.
  -- Läge eine davon in einem abgeschlossenen Monat, änderte sich dessen
  -- Ist nachträglich – und das Zeitkonto widerspräche der Auswertung.
  v_abschluss := public.rapport_beruehrt_abschluss(p_rapport_id);
  if v_abschluss is not null then
    raise exception
      'Für % ist das Zeitkonto bereits abgeschlossen. Der Rapport lässt sich nicht abschliessen, ohne die festgehaltenen Stunden zu verändern – bitte den Monat unter Einstellungen wieder öffnen.', v_abschluss;
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

create or replace function storniere_rapport(
  p_rapport_id uuid,
  p_grund text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_abschluss text;
  v_status text;
  v_exportiert int;
begin
  if coalesce(btrim(p_grund), '') = '' then
    raise exception 'Bitte einen Grund angeben – er bleibt am Rapport vermerkt.';
  end if;

  select r.status into v_status
  from public.rapporte r
  where r.id = p_rapport_id
    and r.organisation_id = public.current_organisation_id();

  if v_status is null then
    raise exception 'Rapport nicht gefunden.';
  end if;
  if v_status = 'offen' then
    raise exception 'Ein Entwurf wird nicht storniert, sondern gelöscht.';
  end if;
  if v_status = 'storniert' then
    raise exception 'Dieser Rapport ist bereits storniert.';
  end if;

  -- Bereits exportierte Positionen liegen in der Buchhaltung. Sie
  -- stillschweigend aus jeder Auswertung zu nehmen hiesse, eine Rechnung
  -- um ihre Grundlage zu bringen.
  select count(*) into v_exportiert
  from public.zeiteintraege z
  where z.rapport_id = p_rapport_id
    and z.beleg_id is not null;

  if v_exportiert > 0 then
    raise exception
      'Nicht möglich: % Position(en) sind bereits exportiert und damit in der Buchhaltung. Eine Korrektur muss dort erfolgen.',
      v_exportiert;
  end if;

  -- Neu in 0059: Das Storno macht gültige Stunden ungültig – in einem
  -- abgeschlossenen Monat wäre das eine nachträgliche Änderung an einer
  -- festgehaltenen Zahl.
  v_abschluss := public.rapport_beruehrt_abschluss(p_rapport_id);
  if v_abschluss is not null then
    raise exception
      'Für % ist das Zeitkonto bereits abgeschlossen. Der Rapport lässt sich nicht stornieren, ohne die festgehaltenen Stunden zu verändern – bitte den Monat unter Einstellungen wieder öffnen.', v_abschluss;
  end if;

  update public.rapporte r
  set status = 'storniert',
      storniert_am = now(),
      storno_grund = p_grund
  where r.id = p_rapport_id;
end;
$$;
