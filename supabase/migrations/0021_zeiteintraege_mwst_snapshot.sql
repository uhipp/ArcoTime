-- =========================================================
-- MWSt-Snapshot für Zeiteinträge
--
-- Bisher war nur der PREIS eingefroren (0003), der Steuersatz dagegen nur
-- über die Dienstleistung referenziert: zeiteintraege -> dienstleistungen
-- -> mwst_codes. Wurde in den Stammdaten der Satz eines MWSt-Codes
-- geändert, galt der neue Wert damit rückwirkend auch für längst erfasste
-- Einträge und für Exporte vergangener Perioden – buchhalterisch falsch.
--
-- Neu wird der Steuersatz beim Erfassen genauso eingefroren wie der Preis:
-- Bestehende Zeiteinträge behalten ihren Satz, nur ab der Änderung neu
-- erfasste bekommen den neuen. Damit lässt sich ein MWSt-Code gefahrlos
-- bearbeiten (siehe Einstellungen -> MWSt-Codes).
--
-- Führe diese Datei NACH 0001-0020 aus.
-- =========================================================

-- ---------------------------------------------------------
-- 1) Snapshot-Spalten
-- ---------------------------------------------------------
-- Bewusst die aufgelösten Werte (Code als Text, Satz als Zahl) statt einer
-- Referenz auf mwst_codes: Eine Referenz zeigte weiterhin auf eine
-- veränderliche Zeile und würde das Problem nur verschieben.
alter table zeiteintraege add column if not exists mwst_code text;
alter table zeiteintraege add column if not exists mwst_satz numeric(5,2);

comment on column zeiteintraege.mwst_satz is
  'Beim Erfassen eingefrorener MWSt-Satz in Prozent. Spätere Änderungen am MWSt-Code wirken bewusst NICHT zurück (analog zu zeiteintraege.preis).';

-- ---------------------------------------------------------
-- 2) Bestehende Einträge nachziehen
-- ---------------------------------------------------------
-- Einmalig mit dem heute gültigen Satz befüllen. Das ist die bestmögliche
-- Rekonstruktion – historische Sätze sind nirgends gespeichert, genau das
-- behebt diese Migration ja erst. Ab jetzt stimmt es.
update zeiteintraege z
set
  mwst_code = mw.code,
  mwst_satz = mw.satz
from dienstleistungen d
  left join mwst_codes mw on mw.id = d.mwst_code_id
where d.id = z.dienstleistung_id
  and z.mwst_code is null
  and z.mwst_satz is null;

-- ---------------------------------------------------------
-- 3) Trigger: Preis UND MWSt beim Einfügen einfrieren
-- ---------------------------------------------------------
-- Erweitert die bestehende Funktion aus 0003. Zusätzlich wird der
-- search_path fixiert und alles schema-qualifiziert – dieselbe Härtung wie
-- in 0020, damit die Funktion nicht vom search_path der aufrufenden Rolle
-- abhängt.
create or replace function set_zeiteintrag_preis()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.preis is null then
    select d.preis into new.preis
    from public.dienstleistungen d
    where d.id = new.dienstleistung_id;
  end if;

  -- Nur setzen, wenn nichts mitgegeben wurde: Ein Import historischer
  -- Daten darf seinen eigenen, korrekten Satz behalten.
  if new.mwst_code is null and new.mwst_satz is null then
    select mw.code, mw.satz into new.mwst_code, new.mwst_satz
    from public.dienstleistungen d
      left join public.mwst_codes mw on mw.id = d.mwst_code_id
    where d.id = new.dienstleistung_id;
  end if;

  return new;
end;
$$;

-- Trigger selbst bleibt unverändert (before insert), hier nur zur
-- Sicherheit neu gesetzt, falls er in einer Umgebung fehlt.
drop trigger if exists zeiteintraege_set_preis on zeiteintraege;
create trigger zeiteintraege_set_preis
  before insert on zeiteintraege
  for each row execute function set_zeiteintrag_preis();

-- ---------------------------------------------------------
-- 4) View auf den Snapshot umstellen
-- ---------------------------------------------------------
-- Bisher kam mwst_code aus dem Live-Join auf mwst_codes. Neu stammen Code
-- UND Satz aus dem Zeiteintrag selbst; der Join entfällt. Der Spaltenname
-- "mwst_code" bleibt gleich, damit Export und Auswertungen unverändert
-- funktionieren – neu dazu kommt "mwst_satz".
-- Ansonsten identisch zu 0011.
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
  z.mwst_code,
  p.name as mitarbeiter_name,
  z.mitarbeiter_id,
  z.user_id,
  z.preis,
  d.klasse_id,
  dk.bezeichnung as klasse_bezeichnung,
  z.organisation_id,
  z.mwst_satz
from zeiteintraege z
join projekte m on m.id = z.projekt_id
join kunden k on k.id = m.kunde_id
join dienstleistungen d on d.id = z.dienstleistung_id
left join dienstleistungsklassen dk on dk.id = d.klasse_id
join profiles p on p.id = z.mitarbeiter_id;
