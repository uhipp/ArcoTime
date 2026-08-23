-- =========================================================
-- 0082  Funktionskörper nachziehen
-- =========================================================
--
-- Ein Fehler in 0078 und 0079, gefunden vom Nutzer am 23.08.2026 beim
-- Speichern einer Position auf dem Telefon:
--
--   column kp.dienstleistung_id does not exist
--
-- Postgres benennt beim „alter table … rename" alles mit, was an der Tabelle
-- HÄNGT – Fremdschlüssel, Indizes, RLS-Regeln, Trigger. Es benennt nichts mit,
-- was den alten Namen im TEXT trägt: Funktionskörper sind Zeichenketten, und
-- niemand liest sie beim Umbenennen.
--
-- Meine Prüfung in 0078 hat Tabellen, Spalten, Bedingungen, Indizes, Regeln
-- und Trigger nachgezählt und gemeldet „kein dienstleistung mehr im Schema".
-- Sie hat pg_proc nicht angesehen. Eine Prüfung, die an der falschen Stelle
-- nachzählt, ist schlimmer als keine – sie erzeugt Zutrauen.
--
-- Am Ende dieser Migration steht die Prüfung, die gefehlt hat.

-- ---------------------------------------------------------
-- 1) Der Preis-Schnappschuss am Zeiteintrag
-- ---------------------------------------------------------
-- Unverändert gegenüber 0022 bis auf die drei alten Namen. Die Regel selbst
-- ist die aus 0003/0021/0022: Preis und MWSt werden beim Erfassen
-- festgeschrieben, damit eine späte Preisänderung alte Einträge nicht
-- verändert.
create or replace function set_zeiteintrag_preis()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_kunde_id uuid;
  v_menge numeric;
begin
  if new.preis is null then
    -- Menge für die Staffelauswahl: Stunden bei Zeit, sonst die Menge.
    v_menge := coalesce(new.dauer_minuten / 60.0, new.menge, 0);

    select k.id into v_kunde_id
    from public.projekte p
      join public.kunden k on k.id = p.kunde_id
    where p.id = new.projekt_id;

    select kp.preis into new.preis
    from public.kundenpreise kp
    where kp.kunde_id = v_kunde_id
      and kp.artikel_id = new.artikel_id
      and kp.ab_menge <= v_menge
    order by kp.ab_menge desc
    limit 1;

    if new.preis is null then
      select a.preis into new.preis
      from public.artikel a
      where a.id = new.artikel_id;
    end if;
  end if;

  if new.mwst_code is null and new.mwst_satz is null then
    select mw.code, mw.satz into new.mwst_code, new.mwst_satz
    from public.artikel a
      left join public.mwst_codes mw on mw.id = a.mwst_code_id
    where a.id = new.artikel_id;
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------
-- 2) Nachzählen – diesmal an der richtigen Stelle
-- ---------------------------------------------------------
-- Sucht die alten Namen dort, wo sie als TEXT stehen: in Funktionen,
-- Prozeduren und Sichten. Ohne diese Abfrage wäre der Fehler oben erst beim
-- nächsten Speichern aufgefallen – also beim Anwender.
do $$
declare
  v_treffer text;
begin
  select string_agg(distinct name, ', ')
    into v_treffer
  from (
    select p.proname as name
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.prosrc ~* '(dienstleistung|beteiligten_rollen|rapport_beteiligte|\mbeteiligte\M)'
    union all
    select c.relname
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public'
       and c.relkind in ('v', 'm')
       and pg_get_viewdef(c.oid) ~* '(dienstleistung|beteiligten_rollen|rapport_beteiligte|\mbeteiligte\M)'
  ) offen;

  if v_treffer is not null then
    raise exception
      'Diese Funktionen oder Sichten tragen noch einen alten Namen im Text: %. Postgres benennt Funktionskörper beim rename NICHT mit.',
      v_treffer;
  end if;
  raise notice 'Kein alter Name mehr in Funktionen oder Sichten.';
end $$;
