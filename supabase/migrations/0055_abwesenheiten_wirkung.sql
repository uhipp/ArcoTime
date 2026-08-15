-- =========================================================
-- 0055  Was eine Abwesenheit bewirkt (Phase 12, Etappe B)
-- =========================================================
--
-- Bisher weiss eine Abwesenheitsart nur, ob sie die Planung blockiert.
-- Für das Zeitkonto ist das zu wenig: Ferien, Krankheit und
-- Überstundenabbau sehen im Kalender gleich aus und wirken völlig
-- verschieden.
--
-- Drei Angaben, unabhängig voneinander – deshalb drei Häkchen und keine
-- Aufzählung mit festen Fällen. Eine Aufzählung müsste bei jedem neuen
-- Fall erweitert werden, und die Betriebe erfinden mehr Fälle, als sich
-- vorwegnehmen lassen.

alter table abwesenheitsarten
  add column if not exists reduziert_soll boolean not null default true,
  add column if not exists belastet_ferien boolean not null default false,
  add column if not exists belastet_zeitsaldo boolean not null default false;

comment on column abwesenheitsarten.reduziert_soll is
  'Die Sollstunden des Tages entfallen – bezahlte Absenz. Nicht gesetzt '
  'bei Homeoffice oder Aussendienst: Dort wird gearbeitet.';

comment on column abwesenheitsarten.belastet_ferien is
  'Zieht Tage vom Ferienguthaben ab.';

comment on column abwesenheitsarten.belastet_zeitsaldo is
  'Bucht die Stunden vom Zeitsaldo ab – der Fall Überstundenabbau. '
  'Bewusst NICHT zusammen mit reduziert_soll: Wer Überstunden abbaut, '
  'schuldet die Zeit weiterhin, er hat sie nur vorher geleistet.';

-- ---------------------------------------------------------
-- Bestehende Arten sinnvoll vorbelegen
-- ---------------------------------------------------------
-- Der Standardwert oben (reduziert_soll = true) trifft die Mehrzahl:
-- Ferien, Krankheit, Unfall, Militär sind bezahlte Absenzen. Zwei
-- Gruppen brauchen etwas anderes.

-- Ferien belasten zusätzlich das Ferienkonto.
update abwesenheitsarten
set belastet_ferien = true
where belastet_ferien = false
  and (wert = 'ferien' or bezeichnung ilike '%ferien%')
  -- "Betriebsferien" sind keine bezogenen Ferientage der Person, sondern
  -- ein Schliesstag der Organisation – sie stehen dort und nicht hier.
  and bezeichnung not ilike '%betriebsferien%';

-- Arten, die die Planung NICHT blockieren, sind Arbeit an einem anderen
-- Ort – Homeoffice, Aussendienst, Weiterbildung im Betrieb. Dort wird
-- gearbeitet, also entfällt das Soll nicht.
update abwesenheitsarten
set reduziert_soll = false
where blockiert = false;

-- Der fehlende Fall: Überstundenabbau. Er belastet den Zeitsaldo und
-- lässt das Soll stehen – ohne ihn liesse sich Kompensation nicht von
-- Ferien unterscheiden, und genau das war der Anlass für diese Etappe.
insert into abwesenheitsarten (
  organisation_id, wert, bezeichnung, farbe, blockiert, sortierung,
  reduziert_soll, belastet_ferien, belastet_zeitsaldo
)
-- bg-purple-400 und nicht irgendein Farbwert: Tailwind erzeugt CSS nur
-- für Klassen, die als Literal im Quellcode stehen – die Auswahl in
-- lib/farben.ts ist deshalb abschliessend.
select o.id, 'kompensation', 'Überstundenabbau', 'bg-purple-400', true, 55,
       false, false, true
from organisationen o
where not exists (
  select 1 from abwesenheitsarten a
  where a.organisation_id = o.id and a.wert = 'kompensation'
);
