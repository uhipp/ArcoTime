-- =========================================================
-- Fix: Positionen liessen sich nicht bearbeiten
--
-- v_zeiteintraege lieferte zwar dienstleistung_bezeichnung, aber nicht die
-- dienstleistung_id. Die Bearbeiten-Maske einer Rapport-Position konnte das
-- Auswahlfeld "Leistung" deshalb nicht vorbelegen – es blieb leer, und weil
-- es ein Pflichtfeld ist, liess sich nichts speichern.
--
-- Ursache ist dieselbe wie in 0011 und 0027: Die View listet ihre Spalten
-- einzeln auf. Wer aus ihr heraus bearbeiten will, braucht die
-- Fremdschlüssel und nicht nur die aufgelösten Bezeichnungen.
--
-- Ansonsten identisch zur Fassung aus 0027.
--
-- Führe diese Datei NACH 0001-0027 aus.
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
  z.dienstleistung_id,
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
