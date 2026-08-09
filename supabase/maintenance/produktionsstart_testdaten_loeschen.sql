-- =========================================================
-- Produktionsstart: alle Testdaten entfernen
-- Im Supabase SQL Editor ausführen (Cmd+A / Cmd+C -> einfügen -> Run).
--
-- Wird gelöscht: Kunden, Projekte, Zeiteinträge, Anfragen, Dokumente
-- (Datenbank-Zeilen), Export-Historie, sowie die zweite Organisation aus
-- dem Isolationstest von Phase 5.
--
-- Bleibt UNVERÄNDERT (bewusst, siehe Absprache): Dienstleistungsklassen,
-- Dienstleistungskatalog inkl. Preise, MWSt-Codes, Rabattsätze,
-- Anfrage-Kanäle/-Prioritäten, Dokument-Kategorien, alle Mitarbeitenden-
-- Logins (Organisation "Arcos Group").
--
-- Reihenfolge ist wegen Fremdschlüsseln wichtig: erst die Tabellen, die
-- auf andere verweisen (anfragen, zeiteintraege, belege_exporte,
-- dokumente), dann kunden (worüber projekte automatisch mit-gelöscht
-- werden, da "on delete cascade").
--
-- WICHTIG: Dies löscht KEINE Dateien aus dem Storage-Bucket "dokumente"
-- (das kann SQL nicht). Falls bereits Test-Dokumente hochgeladen wurden:
-- im Supabase Dashboard unter Storage -> Bucket "dokumente" -> alle
-- Dateien markieren -> löschen.
-- =========================================================

-- Zur Kontrolle VOR dem Löschen: kurzer Überblick, was betroffen ist.
select
  (select count(*) from kunden) as kunden,
  (select count(*) from projekte) as projekte,
  (select count(*) from zeiteintraege) as zeiteintraege,
  (select count(*) from anfragen) as anfragen,
  (select count(*) from dokumente) as dokumente,
  (select count(*) from belege_exporte) as belege_exporte,
  (select count(*) from organisationen) as organisationen;

-- Ab hier wird gelöscht.
delete from dokumente;
delete from anfragen;
delete from zeiteintraege;
delete from belege_exporte;
delete from kunden; -- cascadiert automatisch zu projekte -> projekt_mitarbeiter

-- Zweite Organisation aus dem Isolationstest (Phase 5) – hatte nie eigene
-- Logins, nur die soeben bereits gelöschten Kunde/Projekt-Testzeilen.
delete from organisationen where name = 'Test-Organisation Isolationstest';

-- Zur Kontrolle NACH dem Löschen: sollte überall 0 zeigen (ausser
-- organisationen = 1, nur noch Arcos Group).
select
  (select count(*) from kunden) as kunden,
  (select count(*) from projekte) as projekte,
  (select count(*) from zeiteintraege) as zeiteintraege,
  (select count(*) from anfragen) as anfragen,
  (select count(*) from dokumente) as dokumente,
  (select count(*) from belege_exporte) as belege_exporte,
  (select count(*) from organisationen) as organisationen;
