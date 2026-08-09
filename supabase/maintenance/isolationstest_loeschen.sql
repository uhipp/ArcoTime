-- =========================================================
-- Isolationstest wieder aufräumen (nach erfolgreicher Prüfung ausführen)
-- =========================================================

delete from mandate where bezeichnung = 'Geheimes Testmandat';
delete from kunden where name = 'Fremdfirma' and vorname = 'Isolationstest';
delete from organisationen where name = 'Test-Organisation Isolationstest';
