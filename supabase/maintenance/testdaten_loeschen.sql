-- =========================================================
-- Einmalig: Testdaten "Hans Tester" / "Buchhaltung" löschen
-- Im Supabase SQL Editor ausführen (Cmd+A / Cmd+C -> einfügen -> Run).
-- Reihenfolge ist wegen Fremdschlüsseln wichtig (zuerst Zeiteinträge &
-- Export-Historie, dann Mandat/Dienstleistung, zuletzt Kunde).
-- =========================================================

delete from zeiteintraege
where mandat_id in (
  select m.id from mandate m
  join kunden k on k.id = m.kunde_id
  where k.name = 'Tester' and k.vorname = 'Hans'
);

delete from belege_exporte
where mandat_id in (
  select m.id from mandate m
  join kunden k on k.id = m.kunde_id
  where k.name = 'Tester' and k.vorname = 'Hans'
);

delete from mandate
where kunde_id in (select id from kunden where name = 'Tester' and vorname = 'Hans');

delete from dienstleistungen
where bezeichnung = 'Arbeitszeit Buchhaltung';

delete from kunden
where name = 'Tester' and vorname = 'Hans';
