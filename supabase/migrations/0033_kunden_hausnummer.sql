-- =========================================================
-- 0033  Strukturierte Adresse: Strasse und Hausnummer trennen
-- =========================================================
--
-- Bisher stand die ganze Strassenangabe in einem Feld ("Bahnhofstrasse
-- 12"). Getrennte Felder sind sauberer auswertbar und entsprechen dem,
-- was Adressdienste und Buchhaltungen erwarten. PLZ und Ort waren schon
-- immer zwei Felder.
--
-- Bestehende Werte werden automatisch getrennt: Der hintere Teil gilt
-- als Hausnummer, wenn er mit einer Ziffer beginnt. Damit werden
-- "Bahnhofstrasse 12", "Bahnhofstrasse 12a" und "Bahnhofstrasse 12-14"
-- richtig aufgeteilt, waehrend "Im Winkel" oder "Postfach" ganz im
-- Strassenfeld bleiben. Faelle wie "Route de Berne 4bis" trifft es
-- ebenfalls. Umgekehrt bleibt eine Hausnummer VOR dem Strassennamen
-- (in der Schweiz unuebliche Schreibweise) unangetastet - lieber nichts
-- kaputt machen als schlau raten.

alter table kunden add column if not exists hausnummer text;

-- Trennung nur dort, wo noch keine Hausnummer erfasst ist, damit die
-- Migration wiederholbar bleibt.
-- Die Klammer um das ganze Muster ist Absicht: substring(... from ...)
-- gibt bei einem Muster mit Klammergruppe deren Inhalt zurueck, sonst
-- den gesamten Treffer. Mit einer expliziten Gruppe ist eindeutig, was
-- herauskommt.
update kunden
set
  hausnummer = substring(strasse from '\s([0-9][^ ]*(?:\s*[-/]\s*[^ ]+)?)\s*$'),
  strasse = nullif(trim(regexp_replace(strasse, '\s+[0-9][^ ]*(?:\s*[-/]\s*[^ ]+)?\s*$', '')), '')
where hausnummer is null
  and strasse ~ '\s[0-9][^ ]*(?:\s*[-/]\s*[^ ]+)?\s*$';

-- Der Export schreibt weiterhin eine einzige Spalte "Strasse" - das
-- Comatic-Format ist fest, eine zusaetzliche Spalte wuerde den Import
-- brechen. Die View setzt sie deshalb wieder zusammen, und der
-- Export-Code bleibt unveraendert.

create or replace view v_zeiteintraege
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
  -- Eine Spalte, wie der Comatic-Import sie erwartet: Strasse und
  -- Hausnummer wieder zusammengesetzt. nullif, damit ein Kunde ohne
  -- Adresse null liefert und nicht einen leeren String.
  nullif(trim(concat_ws(' ', k.strasse, k.hausnummer)), '') as strasse,
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
