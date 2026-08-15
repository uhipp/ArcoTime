-- =========================================================
-- 0056  Betriebsferien belasten das Ferienguthaben
-- =========================================================
--
-- Korrektur zu 0055. Dort war "Betriebsferien" von der Belastung des
-- Ferienkontos ausgenommen, mit der Begründung, es sei ein Schliesstag
-- der Organisation und kein bezogener Ferientag der Person. Der erste
-- Teil stimmt, der zweite nicht:
--
-- Der Arbeitgeber darf den Zeitpunkt der Ferien bestimmen (Art. 329c
-- Abs. 2 OR). Betriebsferien gehen deshalb ganz normal vom jährlichen
-- Ferienanspruch der Mitarbeitenden ab.
--
-- Damit brauchen die Schliesstage eine Unterscheidung, die sie bisher
-- nicht hatten: Ein Feiertag (1. August) kostet keine Ferientage,
-- Betriebsferien kosten welche. Beides steht heute in derselben Tabelle
-- und sah für ArcoTime gleich aus.

alter table schliesstage
  add column if not exists belastet_ferien boolean not null default false;

comment on column schliesstage.belastet_ferien is
  'Betriebsferien: Die Tage gehen vom Ferienanspruch der Mitarbeitenden '
  'ab (Art. 329c Abs. 2 OR). Bei Feiertagen und Brückentagen nicht '
  'gesetzt – die kosten keine Ferientage.';

-- Bestehende Einträge: Was nach Betriebsferien aussieht, wird so
-- gekennzeichnet. Bewusst eng über den Namen und mit einem Hinweis in
-- der Oberfläche – ein falsch gesetztes Häkchen kostet jemandem
-- Ferientage, und das fällt erst bei der Jahresabrechnung auf.
update schliesstage
set belastet_ferien = true
where belastet_ferien = false
  and (bezeichnung ilike '%betriebsferien%' or bezeichnung ilike '%werkferien%');

-- Und die Ausnahme aus 0055 zurücknehmen: Gibt es eine Abwesenheitsart
-- "Betriebsferien", belastet auch sie das Ferienkonto.
update abwesenheitsarten
set belastet_ferien = true
where belastet_ferien = false
  and bezeichnung ilike '%betriebsferien%';
