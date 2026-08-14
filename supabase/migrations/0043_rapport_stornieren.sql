-- =========================================================
-- 0043  Rapport stornieren
-- =========================================================
--
-- Der Weg für Korrekturen an einem abgeschlossenen Rapport: Er ist
-- unveränderlich, wird also ungültig gestellt und neu erstellt. Löschen
-- wäre falsch – die Nummer ist vergeben, der Kunde hat womöglich ein PDF,
-- und beides muss nachvollziehbar bleiben.
--
-- Als Datenbankfunktion und nicht als Update aus der Anwendung, aus
-- demselben Grund wie bei schliesse_rapport(): Die Regel
-- rapporte_update_offen lässt Änderungen nur zu, solange der Rapport offen
-- ist. Genau das soll sie auch – ein Storno ist die eng umrissene
-- Ausnahme, und sie gehört dorthin, wo die Regel steht.
--
-- Die Positionen bleiben stehen. Sie gelten ab jetzt dauerhaft als
-- vorläufig (0036), zählen also nirgends mehr – verschwinden aber nicht,
-- denn man muss sehen können, was ursprünglich verrechnet werden sollte.

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

  update public.rapporte r
  set status = 'storniert',
      storniert_am = now(),
      storno_grund = p_grund
  where r.id = p_rapport_id;
end;
$$;

grant execute on function storniere_rapport(uuid, text) to authenticated;
