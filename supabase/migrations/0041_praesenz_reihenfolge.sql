-- =========================================================
-- 0041  Präsenz: wer zuerst da war, darf speichern
-- =========================================================
--
-- Fehler in 0040: Die Regel lautete "ist jemand anders anwesend, sperre
-- das Speichern". Bei zwei Personen sperren sich damit beide gegenseitig
-- und niemand kann mehr speichern – eine Blockade, aus der man nur
-- herauskommt, indem einer die Seite verlässt.
--
-- Es braucht eine Reihenfolge. Wer den Datensatz zuerst geöffnet hat,
-- behält das Recht zu speichern; wer später dazukommt, sieht den Hinweis
-- und kann nur lesen. Das ist die Regel, die man aus jedem Dateiserver
-- kennt, und sie ist fair: Niemand verliert das Recht an etwas, das er
-- bereits bearbeitet.
--
-- zuletzt_gesehen taugt dafür nicht – der Wert wandert mit jedem
-- Lebenszeichen. Es braucht den Zeitpunkt des Öffnens, und der darf sich
-- nicht mehr ändern.

alter table bearbeitungen
  add column if not exists begonnen_am timestamptz not null default now();

-- Bestehende Einträge: Der Beginn ist unbekannt, das letzte Lebenszeichen
-- ist die beste verfügbare Annäherung.
update bearbeitungen set begonnen_am = zuletzt_gesehen where begonnen_am > zuletzt_gesehen;

comment on column bearbeitungen.begonnen_am is
  'Zeitpunkt des Öffnens. Bleibt über die Lebenszeichen hinweg unverändert '
  'und entscheidet, wer speichern darf: die früheste aktive Anwesenheit. '
  'Wird nur zurückgesetzt, wenn die Anwesenheit zwischenzeitlich abgelaufen war.';
