-- =========================================================
-- 0040  Präsenz: wer hat einen Datensatz gerade offen
-- =========================================================
--
-- Ergänzung zur Konfliktprüfung aus 0039. Die Prüfung verhindert den
-- Datenverlust zuverlässig, meldet ihn aber erst beim Speichern – wenn
-- die Arbeit schon getan ist. Der Hinweis hier kommt beim Öffnen und
-- verhindert, dass zwei Personen überhaupt erst nebeneinander tippen.
--
-- Bewusst KEINE Sperre auf dem Datensatz, sondern eine Anwesenheit mit
-- Verfallsdatum: Der Browser liefert kein verlässliches Signal beim
-- Schliessen, Zuklappen oder Verbindungsverlust. Eine echte Sperre müsste
-- von Hand aufgehoben werden, und eine Mittagspause würde die Kollegin
-- aussperren. Bleibt das Lebenszeichen aus, läuft die Anwesenheit von
-- selbst ab, und der Datensatz ist wieder frei.
--
-- Die Anwendung sperrt währenddessen das Speichern. Das ist eine bewusste
-- Entscheidung: Ein Hinweis, der sagt "wird gerade bearbeitet", und
-- daneben ein Knopf, der trotzdem speichert, wäre eine Einladung zum
-- Konflikt. Weil die Anwesenheit von selbst abläuft, kann dabei niemand
-- dauerhaft ausgesperrt bleiben.

create table if not exists bearbeitungen (
  organisation_id uuid not null default current_organisation_id() references organisationen(id),
  -- Frei benannter Bereich statt Fremdschlüssel je Tabelle: Der Hinweis
  -- soll ohne Migration an jedem neuen Formular funktionieren.
  bereich text not null,
  bezug_id uuid not null,
  mitarbeiter_id uuid not null references profiles(id) on delete cascade,
  zuletzt_gesehen timestamptz not null default now(),
  primary key (bereich, bezug_id, mitarbeiter_id)
);

create index if not exists idx_bearbeitungen_bezug
  on bearbeitungen (bereich, bezug_id, zuletzt_gesehen desc);

alter table bearbeitungen enable row level security;

-- Nur das eigene organisation_id prüfen, KEINE Unterabfrage auf die
-- betroffene Tabelle: Genau so entstand die Endlosschleife in 0007 und
-- nochmals in 0031. Die Tabelle enthält ohnehin nur die Information, wer
-- gerade wo tippt.
drop policy if exists "bearbeitungen_select" on bearbeitungen;
create policy "bearbeitungen_select" on bearbeitungen for select using (
  organisation_id = current_organisation_id()
);

-- Schreiben darf jede und jeder – aber nur den eigenen Eintrag. Sonst
-- liesse sich eine fremde Anwesenheit setzen oder löschen und damit die
-- Sperre eines anderen aufheben.
drop policy if exists "bearbeitungen_write_eigene" on bearbeitungen;
create policy "bearbeitungen_write_eigene" on bearbeitungen for all using (
  organisation_id = current_organisation_id() and mitarbeiter_id = auth.uid()
) with check (
  organisation_id = current_organisation_id() and mitarbeiter_id = auth.uid()
);

-- Aufräumen alter Einträge.
--
-- security definer, weil die Regel oben nur das Löschen des EIGENEN
-- Eintrags erlaubt – abgelaufene Einträge anderer müssen aber ebenfalls
-- verschwinden, sonst sperrt ein abgestürzter Browser den Datensatz für
-- immer. Der Aufruf ist harmlos: Er löscht ausschliesslich, was älter als
-- die Verfallszeit ist, und nur in der eigenen Organisation.
create or replace function raeume_bearbeitungen()
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  delete from public.bearbeitungen
  where organisation_id = public.current_organisation_id()
    and zuletzt_gesehen < now() - interval '10 minutes';
$$;

grant execute on function raeume_bearbeitungen() to authenticated;
