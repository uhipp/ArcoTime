-- Fremdschlüssel auf gekuendigt_von wieder entfernen
--
-- Migration 0065 hat organisationen.gekuendigt_von als Fremdschlüssel auf
-- profiles(id) angelegt. Damit gab es ZWEI Beziehungen zwischen profiles und
-- organisationen:
--
--   profiles.organisation_id     -> organisationen(id)   "gehört zu"
--   organisationen.gekuendigt_von -> profiles(id)        "gekündigt von"
--
-- Die Datenschnittstelle (PostgREST) leitet eingebettete Abfragen aus den
-- Fremdschlüsseln ab. Bei zwei möglichen Wegen weigert sie sich und
-- antwortet mit einem Fehler statt mit Daten:
--
--   "Could not embed because more than one relationship was found"
--
-- Betroffen war damit JEDE Abfrage der Form profiles(..., organisationen(...))
-- – und das ist unter anderem die, die den Namen der Organisation in den
-- Seitenkopf schreibt und die Einstellungsseite füllt. Der Name verschwand
-- überall, und das Speichern meldete "Organisation nicht gefunden".
--
-- Die Spalte bleibt, der Fremdschlüssel geht. Es ist dieselbe Überlegung wie
-- beim Änderungsprotokoll in 0061: Ein Vermerk hält fest, WER etwas getan
-- hat. Er braucht dafür keine erzwungene Beziehung – und er soll auch dann
-- lesbar bleiben, wenn es das Konto der Person nicht mehr gibt.
--
-- Lehre für neue Spalten: Ein Fremdschlüssel zwischen zwei Tabellen, die
-- bereits verbunden sind, ist keine harmlose Ergänzung. Er verändert, wie
-- die Schnittstelle die bestehende Verbindung sieht.

alter table organisationen
  drop constraint if exists organisationen_gekuendigt_von_fkey;

comment on column organisationen.gekuendigt_von is
  'Profil-ID der Person, welche die Kündigung ausgelöst hat. Bewusst OHNE Fremdschlüssel: Eine zweite Beziehung zwischen organisationen und profiles macht eingebettete Abfragen mehrdeutig (siehe 0069), und der Vermerk soll das Konto überleben.';
