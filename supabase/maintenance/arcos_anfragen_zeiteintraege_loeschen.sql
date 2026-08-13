-- =========================================================
-- Testdatenmüll aufräumen: Anfragen und Zeiterfassungen der eigenen
-- Organisation löschen
--
-- Im Supabase SQL Editor ausführen. ZUERST nur den Vorschau-Block laufen
-- lassen (bis zur Markierung), prüfen was da steht, und erst dann den
-- Rest.
--
-- WIRD GELÖSCHT (nur in der eigenen Organisation):
--   - alle Anfragen
--   - alle Zeiteinträge, inklusive laufender Timer
--   - Export-Historie (belege_exporte) der eigenen Projekte
--   - Dokumente, die an Anfragen oder Zeiteinträgen hängen
--
-- BLEIBT UNVERÄNDERT:
--   - Kunden, Projekte, Mitarbeitende
--   - Dienstleistungen, Klassen, Einheiten, MWSt-Codes, Rabattsätze
--   - Kundenpreise und Kundenrabatte
--   - alle Einstellungen
--   - sämtliche Daten ANDERER Organisationen (Demo AG, Kundenmandanten)
--
-- WICHTIG: Dateien im Storage-Bucket "dokumente" werden NICHT entfernt,
-- das kann SQL nicht. Die zugehörigen Datenbankzeilen verschwinden, die
-- Dateien bleiben als Karteileichen liegen. Falls beim Testen Dokumente
-- hochgeladen wurden: im Dashboard unter Storage -> "dokumente" von Hand
-- löschen.
-- =========================================================

-- ---------------------------------------------------------
-- VORSCHAU – erst das hier ausführen und das Ergebnis prüfen
-- ---------------------------------------------------------
-- Die Organisation wird über das Platform-Admin-Konto bestimmt, nicht über
-- den Namen: Der Name ist in den Einstellungen editierbar, das Kennzeichen
-- nicht. Prüfe trotzdem, ob in "organisation" wirklich deine eigene steht.
with eigene as (
  select organisation_id as id from profiles where ist_platform_admin limit 1
)
select
  (select name from organisationen o join eigene e on e.id = o.id) as organisation,
  (select count(*) from anfragen a join eigene e on e.id = a.organisation_id) as anfragen,
  (select count(*) from zeiteintraege z join eigene e on e.id = z.organisation_id) as zeiteintraege,
  (select count(*) from zeiteintraege z join eigene e on e.id = z.organisation_id
     where z.timer_gestartet_um is not null) as davon_laufende_timer,
  (select count(*) from dokumente d join eigene e on e.id = d.organisation_id
     where d.bereich in ('anfrage', 'zeiteintrag')) as dokumente,
  (select count(*) from belege_exporte b
     join projekte p on p.id = b.projekt_id
     join eigene e on e.id = p.organisation_id) as export_historie;

-- =========================================================
-- AB HIER WIRD GELÖSCHT
-- =========================================================

-- Reihenfolge wegen der Fremdschlüssel:
--   anfragen.zeiteintrag_id  -> zeiteintraege
--   zeiteintraege.beleg_id   -> belege_exporte
-- Also: Anfragen vor Zeiteinträgen, Zeiteinträge vor Export-Historie.

begin;

-- 1) Dokumente, die an Anfragen oder Zeiteinträgen hängen. Dokumente an
--    Kunden, Projekten und Mitarbeitenden bleiben unberührt.
delete from dokumente d
using profiles pa
where pa.ist_platform_admin
  and d.organisation_id = pa.organisation_id
  and d.bereich in ('anfrage', 'zeiteintrag');

-- 2) Anfragen. Muss vor den Zeiteinträgen laufen, weil anfragen auf
--    zeiteintraege verweist.
delete from anfragen a
using profiles pa
where pa.ist_platform_admin
  and a.organisation_id = pa.organisation_id;

-- 3) Zeiteinträge, inklusive laufender Timer.
delete from zeiteintraege z
using profiles pa
where pa.ist_platform_admin
  and z.organisation_id = pa.organisation_id;

-- 4) Export-Historie der eigenen Projekte. Ohne diesen Schritt blieben
--    Belege stehen, die auf nicht mehr existierende Positionen zeigen.
--    Die Belegnummern-Sequenz wird bewusst NICHT zurückgesetzt: Eine
--    einmal vergebene Belegnummer soll nie ein zweites Mal auftauchen.
delete from belege_exporte b
using projekte p, profiles pa
where p.id = b.projekt_id
  and pa.ist_platform_admin
  and p.organisation_id = pa.organisation_id;

commit;

-- ---------------------------------------------------------
-- KONTROLLE – sollte für die eigene Organisation überall 0 zeigen
-- ---------------------------------------------------------
with eigene as (
  select organisation_id as id from profiles where ist_platform_admin limit 1
)
select
  (select count(*) from anfragen a join eigene e on e.id = a.organisation_id) as anfragen,
  (select count(*) from zeiteintraege z join eigene e on e.id = z.organisation_id) as zeiteintraege,
  (select count(*) from belege_exporte b
     join projekte p on p.id = b.projekt_id
     join eigene e on e.id = p.organisation_id) as export_historie,
  -- Diese müssen unverändert dastehen:
  (select count(*) from kunden k join eigene e on e.id = k.organisation_id) as kunden_unberuehrt,
  (select count(*) from projekte p join eigene e on e.id = p.organisation_id) as projekte_unberuehrt,
  (select count(*) from dienstleistungen d join eigene e on e.id = d.organisation_id) as dienstleistungen_unberuehrt;
