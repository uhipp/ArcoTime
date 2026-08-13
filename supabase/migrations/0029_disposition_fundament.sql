-- =========================================================
-- Fundament für die Disposition
--
-- Der Rapport wandelt sich damit vom Nachweis im Nachhinein zum Auftrag im
-- Voraus: Ein Disponent legt Entwürfe an, weist sie einem Monteur zu und
-- plant Zeit dafür. Der Monteur füllt sie vor Ort mit den tatsächlichen
-- Positionen.
--
-- Diese Migration legt nur die Felder und den Modul-Schalter an. Die
-- Dispositionsoberfläche (Kalender, Ressourcenübersicht) folgt separat –
-- die Felder kosten nichts, solange sie leer bleiben, und ersparen später
-- eine Migration auf einer dann grösseren Tabelle.
--
-- Führe diese Datei NACH 0001-0028 aus.
-- =========================================================

-- ---------------------------------------------------------
-- 1) Planzeiten am Rapport
-- ---------------------------------------------------------
-- Bewusst getrennt von den Positionen: Nur so lässt sich Soll gegen Ist
-- vergleichen, und genau das ist der Zweck einer Ressourcenplanung. Die
-- Positionen tragen die tatsächlich geleistete Zeit, diese Felder die
-- eingeplante.
alter table rapporte add column if not exists geplant_von timestamptz;
alter table rapporte add column if not exists geplant_bis timestamptz;

comment on column rapporte.geplant_von is
  'Vom Disponenten eingeplanter Beginn. Unabhängig von der tatsächlich erfassten Zeit der Positionen – erst der Vergleich beider ergibt eine Ressourcenauswertung.';

-- Für die Kalenderabfrage "wer ist in diesem Zeitraum eingeplant".
create index if not exists idx_rapporte_planung
  on rapporte (mitarbeiter_id, geplant_von)
  where geplant_von is not null;

-- ---------------------------------------------------------
-- 2) Zuweisung vs. Ausführung
-- ---------------------------------------------------------
-- Bisher bedeutete mitarbeiter_id "hat ausgeführt". Mit der Disposition
-- kommt "ist eingeplant" dazu – und beides kann auseinanderfallen, wenn
-- kurzfristig jemand anderes fährt. Ohne die Trennung liesse sich hinterher
-- nicht mehr sagen, ob die Planung gehalten hat.
--
-- mitarbeiter_id bleibt die ausführende Person (so nutzt es der Rapport
-- heute schon und so hängen die Positionen daran). Neu daneben:
alter table rapporte add column if not exists geplant_fuer uuid references profiles(id);

comment on column rapporte.geplant_fuer is
  'Vom Disponenten eingeplante Person. Weicht von mitarbeiter_id ab, wenn der Einsatz kurzfristig jemand anderes übernommen hat.';

-- Bestehende Rapporte: eingeplant war, wer ausgeführt hat.
update rapporte set geplant_fuer = mitarbeiter_id where geplant_fuer is null;

-- ---------------------------------------------------------
-- 3) Modul-Schalter im Lizenzsystem
-- ---------------------------------------------------------
-- Die Disposition ist ein kostenpflichtiger Zusatz, den eine Organisation
-- dazubuchen kann oder nicht. Ein Schalter je Organisation statt eines
-- allgemeinen Feature-Systems: Es gibt vorerst genau ein Zusatzmodul, und
-- eine generische Modul-Tabelle wäre Vorratsbau für einen Bedarf, den es
-- noch nicht gibt. Kommt ein zweites Modul dazu, ist das der Moment, es zu
-- verallgemeinern.
alter table organisationen
  add column if not exists modul_disposition boolean not null default false;

comment on column organisationen.modul_disposition is
  'Kostenpflichtiges Zusatzmodul Disposition. false = Kalender und Planungsfelder bleiben verborgen.';

-- Die eigene Organisation bekommt es selbstverständlich.
update organisationen set modul_disposition = true
where id in (select organisation_id from profiles where ist_platform_admin);

-- ---------------------------------------------------------
-- 4) Hilfsfunktion für die Zugriffsprüfung
-- ---------------------------------------------------------
-- Wird von RLS-Policies und Server Actions genutzt, damit die Frage "darf
-- diese Organisation disponieren" nur an einer Stelle beantwortet wird.
create or replace function hat_modul_disposition()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (select o.modul_disposition
     from public.organisationen o
     where o.id = public.current_organisation_id()),
    false
  );
$$;
