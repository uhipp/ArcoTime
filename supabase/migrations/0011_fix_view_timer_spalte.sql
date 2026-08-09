-- =========================================================
-- Fix: v_zeiteintraege gab "timer_gestartet_um" nie aus
--
-- Migration 0010 hat die Spalte auf der Basistabelle "zeiteintraege"
-- ergänzt, aber die View wurde dabei nicht angepasst (sie listet ihre
-- Spalten explizit statt "select *"). Dadurch sahen Zeiterfassung-Liste
-- und Auswertungen (die über die View lesen) laufende Timer nicht -
-- "Dauer" erschien als "null h" statt als laufender Timer erkannt zu
-- werden. Die einzelne Eintrag-Seite las direkt von der Basistabelle und
-- war davon nicht betroffen.
--
-- Führe diese Datei NACH 0001-0010 aus.
-- =========================================================

drop view if exists v_zeiteintraege;

create view v_zeiteintraege
  with (security_invoker = true)
as
select
  z.id,
  z.datum,
  z.start_zeit,
  z.end_zeit,
  z.dauer_minuten,
  z.timer_gestartet_um,
  round(z.dauer_minuten / 60.0, 2) as menge_stunden,
  z.beschreibung,
  z.rabatt_prozent,
  z.referenz,
  z.beleg_id,
  round(
    (z.dauer_minuten / 60.0) * z.preis * (1 - z.rabatt_prozent / 100.0),
    2
  ) as betrag,
  m.id as projekt_id,
  m.bezeichnung as projekt_bezeichnung,
  m.kostenstelle,
  k.id as kunde_id,
  k.adress_schluessel,
  k.anrede,
  k.vorname,
  k.name as kunde_name,
  k.adresse_zusatz,
  k.strasse,
  k.postfach,
  k.plz,
  k.ort,
  k.land,
  k.email,
  k.telefon,
  k.waehrung,
  k.zahlungskondition_tage,
  d.bezeichnung as dienstleistung_bezeichnung,
  d.konto,
  mw.code as mwst_code,
  p.name as mitarbeiter_name,
  z.mitarbeiter_id,
  z.user_id,
  z.preis,
  d.klasse_id,
  dk.bezeichnung as klasse_bezeichnung,
  z.organisation_id
from zeiteintraege z
join projekte m on m.id = z.projekt_id
join kunden k on k.id = m.kunde_id
join dienstleistungen d on d.id = z.dienstleistung_id
left join mwst_codes mw on mw.id = d.mwst_code_id
left join dienstleistungsklassen dk on dk.id = d.klasse_id
join profiles p on p.id = z.mitarbeiter_id;
