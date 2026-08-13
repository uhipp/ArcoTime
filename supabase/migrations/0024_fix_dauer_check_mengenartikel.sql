-- =========================================================
-- Fix: Mengenartikel liessen sich nicht speichern
--
-- Fehlermeldung beim Erfassen von z.B. Reisespesen:
--   new row for relation "zeiteintraege" violates check constraint
--   "zeiteintraege_dauer_check"
--
-- Ursache: 0022 wollte den Dauer-Zwang aufheben und hat dafür
-- "zeiteintraege_dauer_minuten_check" gedroppt – diesen Namen gibt es aber
-- seit 0010 nicht mehr. Dort wurde der Check beim Einbau des Timers durch
-- "zeiteintraege_dauer_check" ersetzt:
--
--   check (timer_gestartet_um is not null
--          or (dauer_minuten is not null and dauer_minuten > 0))
--
-- Der DROP lief deshalb ins Leere (drop ... if exists meldet nichts), der
-- alte Check blieb aktiv und verlangt weiterhin eine Dauer. Für einen
-- Mengenartikel ist dauer_minuten aber NULL.
--
-- Der in 0022 ergänzte "zeiteintraege_menge_oder_dauer" ersetzt ihn
-- vollständig und ist strenger: Er verlangt GENAU eine der beiden
-- Mengengrössen und lässt den laufenden Timer ebenso zu.
--
-- Führe diese Datei NACH 0001-0023 aus.
-- =========================================================

alter table zeiteintraege drop constraint if exists zeiteintraege_dauer_check;

-- Sicherheitshalber auch den Check aus 0022 neu setzen: Läuft diese
-- Migration auf einer Datenbank, in der 0022 aus irgendeinem Grund nur
-- teilweise durchlief, ist sie danach trotzdem im richtigen Zustand.
alter table zeiteintraege drop constraint if exists zeiteintraege_menge_oder_dauer;
alter table zeiteintraege add constraint zeiteintraege_menge_oder_dauer check (
  (dauer_minuten is not null and dauer_minuten > 0 and menge is null)
  or
  (menge is not null and menge > 0 and dauer_minuten is null)
  -- Laufender Timer: Dauer wird erst beim Stoppen gesetzt.
  or (timer_gestartet_um is not null)
);
