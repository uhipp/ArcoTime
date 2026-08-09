-- =========================================================
-- Erlaubt dem eigenen Admin einer Organisation, den Anzeigenamen der
-- eigenen Organisation zu ändern (bisher konnte das nur ein
-- Platform-Admin von Arcos Group selbst – zu restriktiv für den
-- Alltag: jeder Mandant soll seinen eigenen Titel im Header selbst
-- setzen können, siehe Einstellungen).
--
-- Zusätzliche PERMISSIVE Policy neben der bestehenden
-- "organisationen_write_platform" (Policies desselben Befehlstyps werden
-- von Postgres mit OR verknüpft) – Plan/Abrechnung bleiben weiterhin nur
-- über den Platform-Admin änderbar, diese Policy erlaubt zusätzlich dem
-- eigenen Admin den Zugriff auf die eigene Organisation (die App-UI
-- bietet dafür ohnehin nur ein Namensfeld an).
--
-- Führe diese Datei NACH 0001-0015 aus.
-- =========================================================
create policy "organisationen_update_own_admin" on organisationen for update using (
  is_admin() and id = current_organisation_id()
) with check (
  is_admin() and id = current_organisation_id()
);
