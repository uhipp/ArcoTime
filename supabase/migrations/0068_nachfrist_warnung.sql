-- Vermerk über die verschickte Warnung vor Ablauf der Nachfrist
--
-- Die tägliche Prüfung schaut nach, welche Nachfristen bald ablaufen, und
-- warnt die Admins der betroffenen Organisation. Ohne diesen Vermerk ginge
-- diese Warnung an jedem der letzten sieben Tage erneut raus – aus einer
-- Hilfestellung würde eine Belästigung, und eine Mail, die täglich kommt,
-- liest niemand mehr.

alter table organisationen
  add column if not exists nachfrist_warnung_am timestamptz;

comment on column organisationen.nachfrist_warnung_am is
  'Zeitpunkt, zu dem vor dem Ablauf der Nachfrist gewarnt wurde. Verhindert, dass die Warnung täglich wiederholt wird.';
