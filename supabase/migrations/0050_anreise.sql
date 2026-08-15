-- =========================================================
-- 0050  Anreise: Kilometer am Kunden (Phase 11, Etappe A)
-- =========================================================
--
-- Die Distanz zu einem Kunden ist eine Eigenschaft dieses Kunden und
-- ändert sich nie. Sie bei jedem Einsatz aus dem Kopf einzutippen ist
-- die Sorte Arbeit, die eine Anwendung abnehmen soll – und jedes Mal
-- eine Gelegenheit für einen Zahlendreher.

-- ---------------------------------------------------------
-- 1) Der Wert am Kunden
-- ---------------------------------------------------------
-- Bewusst "was verrechnet wird" und nicht "wie weit es ist": Sonst trägt
-- der eine die einfache Strecke ein und der andere Hin und Zurück, und
-- niemand merkt es, weil beides plausibel aussieht. Der Feldname und die
-- Beschriftung im Formular müssen das sagen.
alter table kunden
  add column if not exists anreise_km numeric(10,2);

comment on column kunden.anreise_km is
  'Zu verrechnende Kilometer je Einsatz bei diesem Kunden (in der Regel '
  'Hin- und Rückfahrt). Dient als Vorschlag beim Erfassen und wird an der '
  'Position eingefroren – eine spätere Änderung wirkt nicht rückwirkend.';

-- ---------------------------------------------------------
-- 2) Welche Leistung den Vorschlag trägt
-- ---------------------------------------------------------
-- Naheliegend wäre eine fest verdrahtete Dienstleistung "Reise-km", die
-- es in jeder Organisation geben muss. Dagegen spricht das Prinzip, auf
-- dem ArcoTime aufgebaut ist – nichts an den Auswahllisten ist fix im
-- Code – und drei reale Fälle: Die eine Organisation nennt es
-- "Wegpauschale", die andere "Kilometergeld"; manche haben mehrere Sätze
-- (Servicewagen, Lieferwagen); und wer keine Kilometer verrechnet, hätte
-- eine Position, die er nicht löschen darf.
--
-- Ein Häkchen an beliebigen Leistungen leistet dasselbe, ohne etwas
-- festzuschreiben. Eine Anfahrtspauschale ist damit übrigens gratis
-- abgedeckt: eine Leistung ohne Häkchen mit fester Menge 1.
alter table dienstleistungen
  add column if not exists menge_aus_anreise boolean not null default false;

comment on column dienstleistungen.menge_aus_anreise is
  'Schlägt beim Erfassen die Anreise-Kilometer des Kunden als Menge vor. '
  'Beliebig viele Leistungen dürfen das tragen.';

-- ---------------------------------------------------------
-- 3) Bestehende Organisationen
-- ---------------------------------------------------------
-- Wo es bereits eine Leistung gibt, die offensichtlich Kilometer
-- abrechnet, wird das Häkchen gesetzt. Absichtlich eng gefasst und nur
-- über den Namen: Ein falsch gesetztes Häkchen macht einen Vorschlag,
-- wo keiner hingehört, und das fällt beim Erfassen auf – ein fehlendes
-- ist dagegen in zwei Klicks nachgeholt.
update dienstleistungen
set menge_aus_anreise = true
where menge_aus_anreise = false
  and (
    bezeichnung ilike '%reise-km%'
    or bezeichnung ilike '%reisekilometer%'
    or bezeichnung ilike '%kilometer%'
    or bezeichnung ilike '%km %'
    or bezeichnung ilike '% km'
    or bezeichnung = 'km'
  );
