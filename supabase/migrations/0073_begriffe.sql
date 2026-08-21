-- =========================================================
-- 0073  Begriffe: der Betrieb nennt die Dinge, wie er sie nennt
-- =========================================================
--
-- Siehe docs/plan-parteien-standorte.md, Etappe 2.
--
-- Aus den Gesprächen: Für den Maler ist ein Auftrag ein Auftrag und die
-- Liegenschaft eine Liegenschaft; für den IT-Dienstleister ist dasselbe ein
-- Projekt an einem Standort, und aus der Anfrage wird ein Ticket. Das ist
-- keine Strukturfrage – die Struktur ist identisch, wie das Beispiel Migros
-- Region Basel mit ihren Filialen gezeigt hat. Es ist eine Frage der
-- Beschriftung.
--
-- Zwei Datenmodelle nebeneinander wären der falsche Weg (jede neue Funktion
-- müsste zweimal gedacht werden). Eine Tabelle mit Beschriftungen ist der
-- richtige: eine Struktur, viele Sprachen.
--
-- Einzahl UND Mehrzahl, weil sich die Mehrzahl im Deutschen nicht ableiten
-- lässt: Objekt/Objekte, aber Auftrag/Aufträge, Liegenschaft/Liegenschaften.
-- Wer versucht, ein "e" anzuhängen, produziert "Auftrage".

create table if not exists begriffe (
  organisation_id uuid not null default current_organisation_id()
    references organisationen(id),
  -- Kein check auf die erlaubten Schlüssel: Kommt eine Bezeichnung dazu,
  -- soll sie sich eintragen lassen, ohne dass vorher eine Migration die
  -- Prüfregel erweitert. Welche Schlüssel die Anwendung liest, steht in
  -- src/lib/begriffe.ts – und dort steht auch die Vorgabe, falls eine Zeile
  -- fehlt. Ein unbekannter Schlüssel ist damit harmlos.
  schluessel text not null,
  einzahl text not null,
  mehrzahl text not null,
  -- Ohne Geschlecht wird aus "Neues Projekt" ein "Neues Auftrag". Der Artikel
  -- lässt sich im Deutschen nicht aus dem Wort ableiten, so wenig wie die
  -- Mehrzahl – also gehört er dazu, sobald der Betrieb das Wort bestimmt.
  genus text not null default 'n' check (genus in ('m', 'f', 'n')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organisation_id, schluessel)
);

drop trigger if exists begriffe_updated_at on begriffe;
create trigger begriffe_updated_at before update on begriffe
  for each row execute function set_updated_at();

alter table begriffe enable row level security;

-- Lesen alle: Die Beschriftungen erscheinen auf jeder Seite.
drop policy if exists "begriffe_select" on begriffe;
create policy "begriffe_select" on begriffe for select using (
  organisation_id = current_organisation_id()
);

-- Pflegen der Admin – wie alle Auswahllisten (0014).
drop policy if exists "begriffe_write_admin" on begriffe;
create policy "begriffe_write_admin" on begriffe for all using (
  is_admin() and organisation_id = current_organisation_id()
) with check (
  is_admin() and organisation_id = current_organisation_id()
);

-- ---------------------------------------------------------
-- Vorgaben für alle bestehenden Organisationen
-- ---------------------------------------------------------
-- Die neutrale Fassung entspricht genau dem, was heute in der Anwendung
-- steht: Wer nichts ändert, merkt keinen Unterschied. Genau das ist der
-- Sinn einer Vorgabe.
--
-- "standort" ist schon dabei, obwohl die Ebene erst in Etappe 4 entsteht.
-- Sonst bräuchte es dort eine zweite Migration für eine Textzeile.
insert into begriffe (organisation_id, schluessel, einzahl, mehrzahl, genus)
select o.id, v.schluessel, v.einzahl, v.mehrzahl, v.genus
from organisationen o
cross join (values
  ('kunde',          'Kunde',          'Kunden',           'm'),
  ('standort',       'Standort',       'Standorte',        'm'),
  ('projekt',        'Projekt',        'Projekte',         'n'),
  ('anfrage',        'Anfrage',        'Anfragen',         'f'),
  ('rapport',        'Rapport',        'Rapporte',         'm'),
  ('dienstleistung', 'Dienstleistung', 'Dienstleistungen', 'f')
) as v(schluessel, einzahl, mehrzahl, genus)
on conflict (organisation_id, schluessel) do nothing;

-- ---------------------------------------------------------
-- Vorlagen je Branche
-- ---------------------------------------------------------
-- Damit bei der Einrichtung nicht sechs Felder von Hand zu tippen sind.
-- Bewusst eine eigene Tabelle und nicht fix im Code: Die nächste Branche
-- (Garage, Gartenbau, Treuhand) soll sich eintragen lassen, ohne dass ein
-- Deployment nötig ist.
--
-- Sie gehört Arcos, nicht dem Mandanten – deshalb KEIN organisation_id und
-- damit auch nicht im Vollexport oder in der Mandantenlöschung. Das ist die
-- Ausnahme von der Regel aus der Prüfliste, und sie ist hier gewollt: Es
-- sind keine Kundendaten.
create table if not exists begriff_vorlagen (
  branche text not null,
  schluessel text not null,
  einzahl text not null,
  mehrzahl text not null,
  genus text not null default 'n' check (genus in ('m', 'f', 'n')),
  sortierung int not null default 0,
  primary key (branche, schluessel)
);

alter table begriff_vorlagen enable row level security;

-- Lesen darf jede angemeldete Person: Die Vorlagen sind allgemeines Wissen
-- ("ein Maler nennt es Auftrag"), keine Betriebsdaten. Geschrieben wird nur
-- über Migrationen.
drop policy if exists "begriff_vorlagen_select" on begriff_vorlagen;
create policy "begriff_vorlagen_select" on begriff_vorlagen for select
  to authenticated using (true);

insert into begriff_vorlagen (branche, schluessel, einzahl, mehrzahl, genus, sortierung) values
  ('Neutral',            'kunde',          'Kunde',          'Kunden',           'm', 0),
  ('Neutral',            'standort',       'Standort',       'Standorte',        'm', 1),
  ('Neutral',            'projekt',        'Projekt',        'Projekte',         'n', 2),
  ('Neutral',            'anfrage',        'Anfrage',        'Anfragen',         'f', 3),
  ('Neutral',            'rapport',        'Rapport',        'Rapporte',         'm', 4),
  ('Neutral',            'dienstleistung', 'Dienstleistung', 'Dienstleistungen', 'f', 5),

  ('Handwerk',           'kunde',          'Kunde',          'Kunden',           'm', 0),
  ('Handwerk',           'standort',       'Liegenschaft',   'Liegenschaften',   'f', 1),
  ('Handwerk',           'projekt',        'Auftrag',        'Aufträge',         'm', 2),
  ('Handwerk',           'anfrage',        'Anfrage',        'Anfragen',         'f', 3),
  ('Handwerk',           'rapport',        'Rapport',        'Rapporte',         'm', 4),
  ('Handwerk',           'dienstleistung', 'Leistung',       'Leistungen',       'f', 5),

  ('IT-Dienstleistung',  'kunde',          'Kunde',          'Kunden',           'm', 0),
  ('IT-Dienstleistung',  'standort',       'Standort',       'Standorte',        'm', 1),
  ('IT-Dienstleistung',  'projekt',        'Projekt',        'Projekte',         'n', 2),
  ('IT-Dienstleistung',  'anfrage',        'Ticket',         'Tickets',          'n', 3),
  ('IT-Dienstleistung',  'rapport',        'Serviceschein',  'Servicescheine',   'm', 4),
  ('IT-Dienstleistung',  'dienstleistung', 'Leistung',       'Leistungen',       'f', 5)
on conflict (branche, schluessel) do nothing;

comment on table begriffe is
  'Beschriftungen je Organisation. Eine Struktur, viele Sprachen: Der Maler '
  'sagt Auftrag und Liegenschaft, der IT-Dienstleister Projekt und Standort, '
  'und aus der Anfrage wird bei ihm ein Ticket. Fehlt eine Zeile, gilt die '
  'Vorgabe aus src/lib/begriffe.ts.';

comment on table begriff_vorlagen is
  'Vorschläge je Branche für die Einrichtung. Gehört Arcos, nicht dem '
  'Mandanten – daher ohne organisation_id und bewusst nicht im Vollexport.';
