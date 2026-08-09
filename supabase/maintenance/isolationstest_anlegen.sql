-- =========================================================
-- Isolations-Test (Phase 5): temporäre zweite Organisation mit Testdaten
-- Im Supabase SQL Editor ausführen. Danach in ArcoTime als Arcos-Group-
-- Admin einloggen und prüfen (siehe Anleitung im Chat).
-- Aufräumen danach mit isolationstest_loeschen.sql.
-- =========================================================

insert into organisationen (name, plan_max_gleichzeitige_nutzer)
values ('Test-Organisation Isolationstest', 3);

insert into kunden (organisation_id, name, vorname, ort, land)
select id, 'Fremdfirma', 'Isolationstest', 'Nirgendwo', 'CH'
from organisationen where name = 'Test-Organisation Isolationstest';

insert into mandate (organisation_id, kunde_id, bezeichnung)
select k.organisation_id, k.id, 'Geheimes Testmandat'
from kunden k where k.name = 'Fremdfirma' and k.vorname = 'Isolationstest';

-- Zur Kontrolle: sollte jetzt 2 Zeilen zeigen (Arcos Group + Testorganisation)
select id, name from organisationen order by erstellt_am;
