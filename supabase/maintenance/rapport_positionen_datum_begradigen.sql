-- =========================================================
-- Wartung: Positionen eines ABGESCHLOSSENEN Rapports auf das
--          Datum des Rapportkopfs bringen
-- =========================================================
--
-- Wofür: Vor Migration 0038 blieben Positionen auf ihrem alten Datum
-- stehen, wenn das Datum des Rapportkopfs nachträglich geändert wurde.
-- Bei einem noch offenen Rapport hat 0038 das bereits begradigt. Bei
-- einem abgeschlossenen bewusst nicht – sein Inhalt gilt als
-- unveränderlich, und ein stiller Eingriff wäre genau das, wovor die
-- Sperre schützt.
--
-- Dieses Skript ist der ausdrückliche, nachvollziehbare Eingriff für die
-- Rapporte, die vor 0038 in diesen Zustand geraten sind. Es setzt den
-- Rapport dafür kurz zurück auf "offen", weil sonst der Trigger greift.
--
-- WICHTIG – Organisation:
-- Bewusst KEIN current_organisation_id(). Diese Funktion liest auth.uid(),
-- und im SQL-Editor läuft alles als "postgres" ohne angemeldeten Nutzer –
-- sie liefert dort NULL, und jede Bedingung darauf trifft ins Leere
-- ("no rows returned", ohne dass etwas gefunden wurde). Stattdessen wird
-- die Organisation über den Namen bestimmt.
--
-- ANWENDUNG
--   1. Organisation und Rapportnummer unten eintragen (drei Stellen).
--   2. Nur den Vorschau-Block ausführen und das Ergebnis ansehen.
--   3. Erst wenn es stimmt: den Block darunter ausführen.

-- ---------------------------------------------------------
-- Vorschau: Was würde sich ändern?
-- ---------------------------------------------------------
-- Zeigt der Block nichts, gibt es entweder keine Abweichung – oder
-- Organisation beziehungsweise Nummer stimmen nicht. Der zweite Block
-- unten hilft beim Nachsehen.
select
  o.name as organisation,
  r.jahr,
  r.nummer,
  r.status,
  r.datum  as rapport_datum,
  z.id     as position_id,
  z.datum  as position_datum_bisher,
  z.beschreibung
from rapporte r
join organisationen o on o.id = r.organisation_id
join zeiteintraege z on z.rapport_id = r.id
where o.name = 'Demo AG'            -- <<< anpassen
  and r.jahr = 2026                 -- <<< anpassen
  and r.nummer = 1                  -- <<< anpassen
  and (z.datum is distinct from r.datum
       or z.mitarbeiter_id is distinct from r.mitarbeiter_id);

-- Zum Nachsehen, falls die Vorschau leer bleibt: alle Rapporte mit ihren
-- Organisationen und der Zahl abweichender Positionen.
select
  o.name as organisation,
  r.jahr,
  r.nummer,
  r.status,
  r.datum,
  count(z.id) filter (
    where z.datum is distinct from r.datum
       or z.mitarbeiter_id is distinct from r.mitarbeiter_id
  ) as abweichende_positionen
from rapporte r
join organisationen o on o.id = r.organisation_id
left join zeiteintraege z on z.rapport_id = r.id
group by o.name, r.jahr, r.nummer, r.status, r.datum
order by o.name, r.jahr, r.nummer;

-- ---------------------------------------------------------
-- Ausführen
-- ---------------------------------------------------------
begin;

-- Sperre kurz lösen. Ohne das lehnt pruefe_rapport_offen() die Änderung
-- ab – zu Recht, denn genau davor schützt sie im Normalbetrieb.
update rapporte r
set status = 'offen'
from organisationen o
where o.id = r.organisation_id
  and o.name = 'Demo AG'            -- <<< anpassen
  and r.jahr = 2026
  and r.nummer = 1;

update zeiteintraege z
set datum = r.datum,
    mitarbeiter_id = r.mitarbeiter_id
from rapporte r
join organisationen o on o.id = r.organisation_id
where r.id = z.rapport_id
  and o.name = 'Demo AG'            -- <<< anpassen
  and r.jahr = 2026
  and r.nummer = 1;

-- Zurück in den Endzustand. "abgeschlossen" ist richtig, solange keine
-- Unterschrift vorliegt; bei einem signierten Rapport hier stattdessen
-- 'signiert' eintragen.
update rapporte r
set status = 'abgeschlossen'
from organisationen o
where o.id = r.organisation_id
  and o.name = 'Demo AG'            -- <<< anpassen
  and r.jahr = 2026
  and r.nummer = 1;

commit;
