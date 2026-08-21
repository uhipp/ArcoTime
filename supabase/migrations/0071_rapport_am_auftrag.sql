-- =========================================================
-- 0071  Der Rapport hängt am Auftrag, nicht am Kunden
-- =========================================================
--
-- Siehe docs/plan-parteien-standorte.md, Etappe 1.
--
-- Nachgeprüft am 21.08.2026: rapporte trägt kunde_id (Pflicht) UND
-- projekt_id (NULL-fähig). Damit gibt es zwei Wege zum Kunden – direkt und
-- über das Projekt – und nichts hält sie zusammen. Dass sie heute
-- übereinstimmen, liegt allein an zwei Prüfungen in erstelleRapport() und
-- aktualisiereRapport(): Ohne Projekt lässt sich keine Position erfassen.
-- Die Datenbank erlaubt bis jetzt einen Rapport für Kunde A, dessen
-- Positionen im Projekt von Kunde B liegen. 28 Positionen geprüft, keine
-- Abweichung – die Garantie liegt aber in der Anwendung, nicht im Schema.
--
-- Das muss weg, BEVOR mit den Standorten eine dritte Ebene dazukommt: Sonst
-- gäbe es standort + projekt.kunde_id + rapport.kunde_id, also drei Wege zum
-- selben Kunden.
--
-- Diese Migration bindet den Rapport an den Auftrag. Die Spalte kunde_id
-- bleibt vorerst stehen und wird nur NULL-fähig – der laufende Code liest
-- sie noch. Sie fällt in 0078, nach dem Deploy des Codes, der ohne sie
-- auskommt. Reihenfolge: hinzufügen, deployen, entfernen.

-- ---------------------------------------------------------
-- 1) Rapporte ohne Projekt aufräumen
-- ---------------------------------------------------------
-- Es gibt zwei, beide vom 15.08.2026 im Mandanten "Demo AG", beide offen und
-- ohne eine einzige Position: Hüllen aus der Zeit vor der Prüfung im Code.
-- Der Nutzer hat das Löschen am 21.08.2026 freigegeben.
--
-- Die Bedingung ist absichtlich eng: nur ohne Projekt, nur ohne Positionen,
-- nur offen. Fände sich ein Rapport mit Positionen aber ohne Projekt, würde
-- ihn diese Migration NICHT anfassen – dann scheitert Schritt 2 laut und
-- jemand schaut hin. Eine Migration, die im Zweifel löscht, ist die falsche
-- Sorte Hilfsbereitschaft.
do $$
declare
  v_anzahl int;
begin
  delete from rapporte r
  where r.projekt_id is null
    and r.status = 'offen'
    and not exists (select 1 from zeiteintraege z where z.rapport_id = r.id);
  get diagnostics v_anzahl = row_count;
  raise notice 'Leere Rapporte ohne Projekt gelöscht: %', v_anzahl;
end $$;

-- ---------------------------------------------------------
-- 2) Das Projekt wird Pflicht
-- ---------------------------------------------------------
-- Scheitert das, gibt es noch einen Rapport ohne Projekt, der Positionen
-- oder einen Abschluss trägt. Der gehört von Hand angeschaut, nicht
-- automatisch behandelt.
alter table rapporte alter column projekt_id set not null;

comment on column rapporte.projekt_id is
  'Der Auftrag, zu dem dieser Rapport gehört. Pflicht seit 0071: Der Rapport '
  'hängt am Auftrag, und der Auftrag kennt den Kunden. Vorher war die Spalte '
  'NULL-fähig, und der Kunde stand zusätzlich am Rapport – zwei Wege zum '
  'selben Kunden, zusammengehalten nur von einer Prüfung im Code.';

-- ---------------------------------------------------------
-- 3) Der Kunde am Rapport wird NULL-fähig
-- ---------------------------------------------------------
-- Damit kann der Code aufhören, ihn zu schreiben, ohne dass Inserts
-- scheitern. Gelöscht wird die Spalte erst in 0078.
alter table rapporte alter column kunde_id drop not null;

comment on column rapporte.kunde_id is
  'ÜBERHOLT seit 0071, fällt in 0078. Der Kunde ergibt sich aus dem Projekt '
  '(projekte.kunde_id). Nicht mehr schreiben, nicht mehr lesen.';

-- ---------------------------------------------------------
-- 4) Der Weg vom Rapport zum Kunden führt jetzt über das Projekt
-- ---------------------------------------------------------
-- Ohne diesen Index wird aus jeder Rapportliste, die den Kundennamen zeigt,
-- ein Durchgang über alle Projekte. Heute bei 16 Projekten belanglos, bei
-- 200 Mandanten nicht mehr.
create index if not exists idx_projekte_kunde on projekte(kunde_id);

-- Und die Liste selbst: fast jede Rapportabfrage filtert nach Organisation
-- und sortiert nach Datum. Der bestehende Index kennt nur die Organisation.
create index if not exists idx_rapporte_organisation_datum
  on rapporte(organisation_id, datum desc);
