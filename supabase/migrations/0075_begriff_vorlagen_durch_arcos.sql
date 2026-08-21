-- =========================================================
-- 0075  Branchenvorlagen pflegt Arcos, sichtbar für alle
-- =========================================================
--
-- 0073 hat begriff_vorlagen angelegt und mit drei Vorlagen gefüllt (Neutral,
-- Handwerk, IT-Dienstleistung). Geschrieben wurde bis jetzt nur über
-- Migrationen – jede neue Branche hätte ein Deployment gebraucht.
--
-- Das ist die falsche Bremse: Eine Vorlage ist Text, kein Code. Wenn nach
-- dem Gespräch mit einer Garage klar ist, dass dort "Auftrag" und "Fahrzeug"
-- die richtigen Wörter sind, soll sich das eintragen lassen, während das
-- Gespräch noch frisch ist.
--
-- Die Tabelle trägt bewusst kein organisation_id: Sie gehört Arcos und ist
-- für alle Mandanten sichtbar (die Leseregel aus 0073 erlaubt jeder
-- angemeldeten Person das Lesen). Schreiben darf nur, wer
-- ist_platform_admin trägt – dieselbe Grenze wie im Plattformbereich.

drop policy if exists "begriff_vorlagen_write_platform" on begriff_vorlagen;
create policy "begriff_vorlagen_write_platform" on begriff_vorlagen for all
  to authenticated
  using (is_platform_admin())
  with check (is_platform_admin());

-- Damit die Liste im Plattformbereich in einer sinnvollen Ordnung steht,
-- ohne dass jede Abfrage sortieren muss.
create index if not exists idx_begriff_vorlagen_ordnung
  on begriff_vorlagen(branche, sortierung);

comment on table begriff_vorlagen is
  'Vorschläge je Branche für die Einrichtung. Gehört Arcos, nicht dem '
  'Mandanten – daher ohne organisation_id und bewusst nicht im Vollexport. '
  'Lesen darf jede angemeldete Person, pflegen nur Plattform-Admins '
  '(0075): Eine Vorlage ist Text, kein Code, und soll ohne Deployment '
  'entstehen können.';
