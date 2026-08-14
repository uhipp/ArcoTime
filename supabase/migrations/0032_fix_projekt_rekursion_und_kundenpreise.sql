-- =========================================================
-- 0032  Rekursion in den Projekt-Policies beheben,
--       Preise & Rabatte für Mitarbeitende öffnen
-- =========================================================
--
-- 1) "infinite recursion detected in policy for relation projekte"
--
-- Genau dieser Fehler war schon einmal da und wurde in 0007 behoben:
-- projekt_mitarbeiter fragte per Unterabfrage auf projekte zurück,
-- während projekte_select seinerseits auf projekt_mitarbeiter prüft.
-- 0007 hat den Kreis aufgebrochen, indem projekt_mitarbeiter ein
-- eigenes organisation_id bekam (per Trigger gefüllt) und die Policy
-- nur noch dieses prüft.
--
-- 0031 hat die Unterabfrage wieder eingebaut und damit die Rekursion
-- zurückgeholt – ab da schlug jede Seite fehl, an der Projekte hängen,
-- auch für Admins. Diese Migration stellt 0007 wieder her.
--
-- Merksatz für künftige Policies auf projekt_mitarbeiter: niemals auf
-- projekte zurückfragen, immer das eigene organisation_id nehmen.
-- Die umgekehrte Richtung (projekte fragt auf projekt_mitarbeiter) ist
-- unproblematisch, solange nur eine der beiden Seiten verweist.

drop policy if exists "projekt_mitarbeiter_write" on projekt_mitarbeiter;
drop policy if exists "mandat_mitarbeiter_write_admin" on projekt_mitarbeiter;

-- Wer ein Projekt bearbeiten darf, darf auch sein Team pflegen –
-- gemäss der Regel aus 0031 also alle in der Organisation.
create policy "projekt_mitarbeiter_write" on projekt_mitarbeiter for all using (
  organisation_id = current_organisation_id()
) with check (
  organisation_id = current_organisation_id()
);

-- Sicherheitshalber auch die Leseregel wieder auf den Stand von 0007
-- bringen, falls sie über eine spätere Migration einen Rückverweis
-- bekommen hat.
drop policy if exists "mandat_mitarbeiter_select" on projekt_mitarbeiter;
create policy "mandat_mitarbeiter_select" on projekt_mitarbeiter for select using (
  organisation_id = current_organisation_id()
);

-- ---------------------------------------------------------
-- 2) Kundenpreise und Kundenrabatte
-- ---------------------------------------------------------
-- 0031 hatte beide bewusst admin-only gelassen, weil der Block auf der
-- Kundendetailseite hinter einer Adminprüfung lag. Diese Prüfung fällt
-- jetzt weg: Mitarbeitende sollen Preise und Rabatte sehen und pflegen
-- können. Beides sind ohnehin nur Vorgaben für die ERFASSUNG – der
-- Preis wird beim Anlegen eines Zeiteintrags eingefroren, der Rabatt
-- nur vorgeschlagen. Eine Änderung wirkt also nie rückwärts, und ein
-- "entfernen" ist Teil des Bearbeitens, nicht ein Löschen von Historie.

drop policy if exists "kundenpreise_write_admin" on kundenpreise;
drop policy if exists "kundenpreise_write" on kundenpreise;
create policy "kundenpreise_write" on kundenpreise for all using (
  organisation_id = current_organisation_id()
) with check (
  organisation_id = current_organisation_id()
);

drop policy if exists "kundenrabatte_write_admin" on kundenrabatte;
drop policy if exists "kundenrabatte_write" on kundenrabatte;
create policy "kundenrabatte_write" on kundenrabatte for all using (
  organisation_id = current_organisation_id()
) with check (
  organisation_id = current_organisation_id()
);
