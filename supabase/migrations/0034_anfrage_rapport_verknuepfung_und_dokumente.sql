-- =========================================================
-- 0034  Anfrage <-> Rapport verknüpfen, Dokumente am Rapport
-- =========================================================

-- ---------------------------------------------------------
-- 1) Rückverknüpfung Anfrage <-> Rapport
-- ---------------------------------------------------------
-- Die Anfrage hält bereits zeiteintrag_id, wenn sie über einen
-- Zeiteintrag abgeschlossen wurde. Für den Weg über einen Rapport fehlte
-- das Gegenstück.
--
-- Bewusst dieselbe Richtung wie beim Zeiteintrag: Der Verweis steht an
-- der Anfrage, nicht am Rapport. Damit gibt es genau eine Quelle der
-- Wahrheit, und die Rückrichtung (Rapport -> Anfrage) wird per Abfrage
-- über diese Spalte aufgelöst, statt sie zusätzlich am Rapport zu
-- speichern. Zwei Spalten, die dasselbe behaupten, laufen sonst früher
-- oder später auseinander.
--
-- on delete set null: Wird ein Rapport gelöscht (nur im Entwurf
-- möglich), verliert die Anfrage den Verweis, bleibt aber erledigt.

alter table anfragen
  add column if not exists rapport_id uuid references rapporte(id) on delete set null;

-- Die Rückrichtung ist eine Suche über diese Spalten – ohne Index wäre
-- das ein Table Scan auf jeder Rapport- und Zeiteintrags-Detailseite.
create index if not exists idx_anfragen_rapport on anfragen(rapport_id)
  where rapport_id is not null;
create index if not exists idx_anfragen_zeiteintrag on anfragen(zeiteintrag_id)
  where zeiteintrag_id is not null;

-- ---------------------------------------------------------
-- 2) Dokumente auch am Rapport
-- ---------------------------------------------------------
-- Anweisungen, Pläne und Fotos gehören zu dem Einsatz, den der Monteur
-- vor sich hat. Bisher kannte die Dokumentenablage den Rapport nicht.
--
-- Die Prüfregel listet die erlaubten Bereiche einzeln auf und muss
-- deshalb ersetzt werden – dieselbe Klasse wie bei den Views, die ihre
-- Spalten einzeln aufzählen (0011, 0027, 0028).

alter table dokumente drop constraint if exists dokumente_bereich_check;

alter table dokumente
  add constraint dokumente_bereich_check
  check (bereich in ('kunde', 'projekt', 'mitarbeitende', 'anfrage', 'zeiteintrag', 'rapport'));

-- Die Policies von 0015 bleiben unverändert gültig: Sie unterscheiden
-- nur "mitarbeitende" (sensibel) von allem anderen, und "rapport" fällt
-- damit automatisch unter die normale, organisationsweite Sichtbarkeit.
