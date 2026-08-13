-- =========================================================
-- Fix: Rapport-Positionen waren in der Anwendung unsichtbar
--
-- 0026 hat zeiteintraege.rapport_id ergänzt, aber v_zeiteintraege nicht
-- angepasst. Die View listet ihre Spalten einzeln auf statt "select *",
-- die neue Spalte fehlte deshalb – jede Abfrage der Positionen eines
-- Rapports lief in "column v_zeiteintraege.rapport_id does not exist"
-- und lieferte eine leere Liste.
--
-- Exakt derselbe Fehler wie in 0011 (timer_gestartet_um). Wer künftig eine
-- Spalte zu zeiteintraege hinzufügt und sie in der Anwendung sehen will,
-- muss die View mit anpassen.
--
-- Ansonsten identisch zur Fassung aus 0022.
--
-- Führe diese Datei NACH 0001-0026 aus.
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
  case when z.dauer_minuten is not null
       then round(z.dauer_minuten / 60.0, 2)
  end as menge_stunden,
  z.beschreibung,
  z.rabatt_prozent,
  z.referenz,
  z.beleg_id,
  round(
    coalesce(z.dauer_minuten / 60.0, z.menge, 0) * z.preis * (1 - z.rabatt_prozent / 100.0),
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
  z.mwst_code,
  p.name as mitarbeiter_name,
  z.mitarbeiter_id,
  z.user_id,
  z.preis,
  d.klasse_id,
  dk.bezeichnung as klasse_bezeichnung,
  z.organisation_id,
  z.mwst_satz,
  z.menge,
  z.rapport_id,
  round(coalesce(z.dauer_minuten / 60.0, z.menge, 0), 2) as menge_verrechnet,
  d.einheit,
  d.zaehlt_als_arbeitszeit,
  d.rabatt_erlaubt
from zeiteintraege z
join projekte m on m.id = z.projekt_id
join kunden k on k.id = m.kunde_id
join dienstleistungen d on d.id = z.dienstleistung_id
left join dienstleistungsklassen dk on dk.id = d.klasse_id
join profiles p on p.id = z.mitarbeiter_id;

-- ---------------------------------------------------------
-- Preis auch beim Wechsel der Dienstleistung neu ermitteln
-- ---------------------------------------------------------
-- set_zeiteintrag_preis() lief bisher nur BEFORE INSERT. Das reichte,
-- solange ein Zeiteintrag nach dem Erfassen die Dienstleistung nicht mehr
-- wechselte. Beim Bearbeiten einer Rapport-Position ist genau das aber
-- möglich – der eingefrorene Preis der alten Leistung wäre dann schlicht
-- falsch.
--
-- Die Aktion leert bei einem Wechsel preis, mwst_code und mwst_satz; dieser
-- Trigger füllt sie mit derselben Logik neu (inklusive Kundenpreis). Bei
-- jeder anderen Änderung – Beschreibung, Menge, Rabatt – bleiben die
-- eingefrorenen Werte unangetastet, weil die Funktion nur auf NULL reagiert.
drop trigger if exists zeiteintraege_preis_bei_wechsel on zeiteintraege;
create trigger zeiteintraege_preis_bei_wechsel
  before update of dienstleistung_id on zeiteintraege
  for each row
  when (old.dienstleistung_id is distinct from new.dienstleistung_id)
  execute function set_zeiteintrag_preis();
