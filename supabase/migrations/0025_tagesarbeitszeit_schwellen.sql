-- =========================================================
-- Schwellen für die Tagesarbeitszeit
--
-- Bisher liessen sich pro Mitarbeitendem und Tag beliebig viele Stunden
-- erfassen, auch mit sich überschneidenden Zeiten. Für die Fakturierung
-- ist das gelegentlich gewollt (zwei Kunden zur selben Zeit betreut),
-- für Soll/Ist-Auswertungen pro Person macht es die Zahlen aber wertlos –
-- 30 Stunden an einem Tag gibt es nicht.
--
-- Zwei Schwellen, beide pro Organisation einstellbar, weil Betriebe
-- unterschiedliche Arbeitszeiten haben:
--
--   warnung_ab_minuten_pro_tag  sichtbarer Hinweis, Speichern bleibt möglich
--   sperre_ab_minuten_pro_tag   Speichern wird verweigert
--
-- NULL schaltet die jeweilige Schwelle ab.
--
-- Führe diese Datei NACH 0001-0024 aus.
-- =========================================================

alter table organisationen
  add column if not exists warnung_ab_minuten_pro_tag int default 600;

alter table organisationen
  add column if not exists sperre_ab_minuten_pro_tag int default 1440;

comment on column organisationen.warnung_ab_minuten_pro_tag is
  'Ab dieser Tagessumme je Mitarbeitendem erscheint beim Erfassen ein Hinweis. Standard 600 = 10 Stunden. NULL = keine Warnung.';

comment on column organisationen.sperre_ab_minuten_pro_tag is
  'Ab dieser Tagessumme wird das Speichern verweigert. Standard 1440 = 24 Stunden, also physikalisch unmöglich und praktisch immer ein Tippfehler. NULL = keine Sperre.';

-- Index für die Tagesabfrage "was hat diese Person an diesem Tag schon
-- erfasst" – läuft künftig bei jeder Erfassung.
create index if not exists idx_zeiteintraege_mitarbeiter_datum
  on zeiteintraege (mitarbeiter_id, datum);
