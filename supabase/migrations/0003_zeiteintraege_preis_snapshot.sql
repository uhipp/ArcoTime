-- =========================================================
-- Preis-Snapshot für Zeiteinträge (Phase 2)
-- Friert den Dienstleistungspreis beim Erfassen ein, damit spätere
-- Preisänderungen im Katalog bereits erfasste Einträge nicht nachträglich
-- verändern (wichtig für Auswertungen & Export von vergangenen Perioden).
-- Führe diese Datei NACH 0001_init.sql und 0002_plz_verzeichnis.sql aus.
-- =========================================================

alter table zeiteintraege add column if not exists preis numeric(10,2);

create or replace function set_zeiteintrag_preis()
returns trigger as $$
begin
  if new.preis is null then
    select d.preis into new.preis from dienstleistungen d where d.id = new.dienstleistung_id;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists zeiteintraege_set_preis on zeiteintraege;
create trigger zeiteintraege_set_preis
  before insert on zeiteintraege
  for each row execute function set_zeiteintrag_preis();

-- View neu erstellen: Betrag basiert jetzt auf dem eingefrorenen Preis (z.preis)
-- statt dem aktuellen Katalogpreis (d.preis).
create or replace view v_zeiteintraege
  with (security_invoker = true)
as
select
  z.id,
  z.datum,
  z.start_zeit,
  z.end_zeit,
  z.dauer_minuten,
  round(z.dauer_minuten / 60.0, 2) as menge_stunden,
  z.beschreibung,
  z.rabatt_prozent,
  z.referenz,
  z.beleg_id,
  z.preis,
  round(
    (z.dauer_minuten / 60.0) * z.preis * (1 - z.rabatt_prozent / 100.0),
    2
  ) as betrag,
  m.id as mandat_id,
  m.bezeichnung as mandat_bezeichnung,
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
  z.user_id
from zeiteintraege z
join mandate m on m.id = z.mandat_id
join kunden k on k.id = m.kunde_id
join dienstleistungen d on d.id = z.dienstleistung_id
left join mwst_codes mw on mw.id = d.mwst_code_id
join profiles p on p.id = z.user_id;
