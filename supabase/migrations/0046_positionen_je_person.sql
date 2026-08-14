-- =========================================================
-- 0046  Positionen gehören einer Person (Phase 9, Etappe C)
-- =========================================================
--
-- Bei einem Einsatz mit mehreren Beteiligten muss jede Stundenposition
-- einer Person zugeordnet sein – sonst laufen alle Stunden auf die
-- verantwortliche Person und jede Auswertung je Mitarbeitendem ist
-- falsch. Material und Reisespesen brauchen das nicht, sie gehören zum
-- Auftrag.

-- ---------------------------------------------------------
-- 1) Der Kopf zieht nur noch das DATUM nach
-- ---------------------------------------------------------
-- 0038 hat Datum UND Person nachgeführt, weil beide für den ganzen
-- Einsatz galten. Mit einem Team gilt das für die Person nicht mehr: Wer
-- eine Stunde geleistet hat, steht an der Position und darf nicht durch
-- eine Änderung im Kopf überschrieben werden.
--
-- Das Datum bleibt: Es gilt weiterhin für den ganzen Einsatz, und genau
-- dessen Auseinanderlaufen hat den Rapport 2026-0001 aus dem Export
-- fallen lassen.

create or replace function rapport_positionen_nachfuehren()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.datum is distinct from old.datum then
    update public.zeiteintraege z
    set datum = new.datum
    where z.rapport_id = new.id
      and z.datum is distinct from new.datum;
  end if;
  return new;
end;
$$;

drop trigger if exists rapporte_positionen_nachfuehren on rapporte;
create trigger rapporte_positionen_nachfuehren
  after update of datum on rapporte
  for each row execute function rapport_positionen_nachfuehren();

-- ---------------------------------------------------------
-- 2) Wer darf eine Position ändern
-- ---------------------------------------------------------
-- Bisher: nur wer sie erfasst hat oder auf wen sie gebucht ist – sonst
-- Admin. Bei einem vorbereiteten Team-Rapport trifft das auf die meisten
-- Beteiligten nicht zu: Die Disposition hat die Position angelegt und auf
-- die verantwortliche Person gebucht, korrigieren soll sie aber der
-- Monteur vor Ort.
--
-- Schlimmer noch: Eine von RLS abgelehnte Änderung kommt ohne Fehler
-- zurück, nur mit null betroffenen Zeilen. Die Anwendung meldete
-- "gespeichert", und die Korrektur war weg.
--
-- Neu gilt die Regel aus 0031 auch hier: Mitarbeitende bearbeiten, was
-- ihre Oberfläche ihnen zeigt. Die harte Grenze bleibt der Export –
-- verrechnete Zeit ist unantastbar.

drop policy if exists "zeiteintraege_update" on zeiteintraege;
create policy "zeiteintraege_update" on zeiteintraege for update using (
  organisation_id = current_organisation_id()
  and (beleg_id is null or is_admin())
) with check (
  organisation_id = current_organisation_id()
);

-- Löschen bleibt enger: Einen fremden Eintrag zu entfernen ist etwas
-- anderes, als ihn zu korrigieren. Positionen eines Rapports löscht, wer
-- am Rapport arbeitet – das deckt der Zusatz über rapport_id ab.
drop policy if exists "zeiteintraege_delete" on zeiteintraege;
create policy "zeiteintraege_delete" on zeiteintraege for delete using (
  organisation_id = current_organisation_id()
  and beleg_id is null
  and (
    user_id = auth.uid()
    or mitarbeiter_id = auth.uid()
    or rapport_id is not null
    or is_admin()
  )
);
