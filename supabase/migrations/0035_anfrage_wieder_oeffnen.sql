-- =========================================================
-- 0035  Anfrage wieder öffnen, wenn der Nachweis verschwindet
-- =========================================================
--
-- Eine Anfrage wird erledigt, indem ein Zeiteintrag oder ein Rapport
-- daraus entsteht. Wird dieser Nachweis später gelöscht, blieb die
-- Anfrage auf "erledigt" stehen – ohne Zeiteintrag, ohne Rapport und
-- ohne Weg zurück: Die Oberfläche bietet die Abschlusswege nur bei einer
-- offenen Anfrage an. Der Vorgang war damit in einer Sackgasse.
--
-- Aufgefallen beim Testen: Rapport aus einer Anfrage erzeugt, dabei die
-- Dokumente zu markieren vergessen, Rapport gelöscht, um es nochmals zu
-- machen – und die Anfrage liess sich nicht mehr übergeben.

-- ---------------------------------------------------------
-- 1) Vorherigen Status merken
-- ---------------------------------------------------------
-- Ohne diese Spalte liesse sich beim Wiederöffnen nur raten. Eine
-- Anfrage kann aus "neu", "in_bearbeitung" oder "wiedervorlage" heraus
-- abgeschlossen werden, und wer sie zurückbekommt, soll sie dort
-- wiederfinden, wo sie war – nicht in einer Spalte, die die Anwendung
-- sich ausgedacht hat.
--
-- Bewusst ohne Prüfregel auf die erlaubten Werte: Die Spalte ist reiner
-- Merkposten und wird beim Wiederöffnen sofort wieder geleert. Eine
-- zweite Liste erlaubter Status müsste bei jeder Änderung mitgepflegt
-- werden.

alter table anfragen
  add column if not exists status_vor_abschluss text;

-- ---------------------------------------------------------
-- 2) Zeiteintrag löschbar machen
-- ---------------------------------------------------------
-- anfragen.zeiteintrag_id verwies bisher ohne Löschregel auf
-- zeiteintraege. Das heisst NO ACTION: Der Versuch, einen Zeiteintrag zu
-- löschen, an dem eine Anfrage hängt, scheitert an der Fremdschlüssel-
-- Prüfung. deleteZeiteintrag() hat das Ergebnis nie ausgewertet und
-- trotzdem "Eintrag gelöscht" gemeldet – dieselbe Klasse stiller Fehler
-- wie bei Kunden und Projekten (siehe 0031).
--
-- Neu wie beim Rapport: Der Verweis wird beim Löschen geleert, und die
-- Anwendung öffnet die Anfrage dabei wieder.

alter table anfragen drop constraint if exists anfragen_zeiteintrag_id_fkey;

alter table anfragen
  add constraint anfragen_zeiteintrag_id_fkey
  foreign key (zeiteintrag_id) references zeiteintraege(id) on delete set null;
