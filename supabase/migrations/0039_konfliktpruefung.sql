-- =========================================================
-- 0039  Konfliktprüfung bei gleichzeitiger Bearbeitung
-- =========================================================
--
-- Bisher gewann beim gleichzeitigen Bearbeiten schlicht der Letzte: Zwei
-- Personen öffnen denselben Datensatz, beide speichern, und die Arbeit
-- der Ersten ist spurlos weg. Urs hat das mit zwei Rechnern an einem
-- Projekt nachgestellt.
--
-- Die Absicherung läuft über updated_at: Das Formular merkt sich beim
-- Öffnen den Stand und schickt ihn beim Speichern mit. Das Update greift
-- nur, wenn der Stand noch derselbe ist – sonst betrifft es null Zeilen
-- und die Anwendung meldet den Konflikt, statt zu überschreiben.
--
-- Bewusst KEINE harte Sperre auf dem Datensatz: Der Browser liefert kein
-- verlässliches Signal beim Schliessen, Zuklappen oder Verbindungsverlust
-- – verwaiste Sperren wären die Regel, und eine Mittagspause würde
-- Kolleginnen aussperren. Ein Präsenzhinweis, der von selbst abläuft,
-- folgt als zweiter Schritt; die Prüfung hier gilt unabhängig davon und
-- greift auch genau in dem Moment, in dem eine Präsenz ausläuft.
--
-- Diese Migration liefert nur das fehlende Stück: WER zuletzt geändert
-- hat. updated_at allein sagt, DASS jemand war – für eine brauchbare
-- Meldung braucht es den Namen.

alter table kunden           add column if not exists geaendert_von uuid references profiles(id);
alter table projekte         add column if not exists geaendert_von uuid references profiles(id);
alter table dienstleistungen add column if not exists geaendert_von uuid references profiles(id);
alter table zeiteintraege    add column if not exists geaendert_von uuid references profiles(id);
alter table anfragen         add column if not exists geaendert_von uuid references profiles(id);
alter table rapporte         add column if not exists geaendert_von uuid references profiles(id);

-- Eigene Funktion statt einer Erweiterung von set_updated_at(): Diese
-- Funktion hängt an Tabellen, die die neue Spalte nicht haben, und würde
-- dort mit einem Fehler stehenbleiben.
--
-- auth.uid() ist in einem Trigger verfügbar und liefert NULL, wenn die
-- Änderung nicht aus einer Anmeldung stammt – etwa aus einem
-- Wartungsskript. Genau richtig: Dann gibt es niemanden zu nennen.
create or replace function set_geaendert_von()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.geaendert_von = auth.uid();
  return new;
end;
$$;

drop trigger if exists kunden_geaendert_von on kunden;
create trigger kunden_geaendert_von before update on kunden
  for each row execute function set_geaendert_von();

drop trigger if exists projekte_geaendert_von on projekte;
create trigger projekte_geaendert_von before update on projekte
  for each row execute function set_geaendert_von();

drop trigger if exists dienstleistungen_geaendert_von on dienstleistungen;
create trigger dienstleistungen_geaendert_von before update on dienstleistungen
  for each row execute function set_geaendert_von();

drop trigger if exists zeiteintraege_geaendert_von on zeiteintraege;
create trigger zeiteintraege_geaendert_von before update on zeiteintraege
  for each row execute function set_geaendert_von();

drop trigger if exists anfragen_geaendert_von on anfragen;
create trigger anfragen_geaendert_von before update on anfragen
  for each row execute function set_geaendert_von();

drop trigger if exists rapporte_geaendert_von on rapporte;
create trigger rapporte_geaendert_von before update on rapporte
  for each row execute function set_geaendert_von();
