-- =========================================================
-- 0042  Absenderangaben und Logo der Organisation
-- =========================================================
--
-- Die Druckansicht eines Rapports zeigt bisher nur den Namen der
-- Organisation. Auf einem Dokument, das beim Kunden bleibt, gehört der
-- Absender vollständig hin – Adresse, Telefon, Mail – und das Logo.
--
-- Die Angaben gehören zur Organisation, nicht in eine Vorlage: Sie
-- erscheinen später auch im PDF und im Begleitmail, und dreimal dasselbe
-- zu pflegen wäre dreimal Gelegenheit, es auseinanderlaufen zu lassen.

alter table organisationen add column if not exists strasse text;
alter table organisationen add column if not exists hausnummer text;
alter table organisationen add column if not exists plz text;
alter table organisationen add column if not exists ort text;
alter table organisationen add column if not exists telefon text;
alter table organisationen add column if not exists email text;
alter table organisationen add column if not exists webseite text;
alter table organisationen add column if not exists logo_pfad text;

-- ---------------------------------------------------------
-- Ablage für Logos
-- ---------------------------------------------------------
-- Bewusst ÖFFENTLICH lesbar, anders als der Dokumentenspeicher: Ein
-- Firmenlogo steht auf jeder Webseite und jedem Briefkopf, es ist kein
-- Geheimnis. Der Gewinn ist handfest – eine dauerhafte Adresse
-- funktioniert im PDF und im Mailanhang ohne signierte Verweise, die
-- nach einer Stunde ablaufen und dann ein kaputtes Bild hinterlassen.
--
-- Hochladen und Löschen bleiben trotzdem geschützt: Das läuft über den
-- Dienstschlüssel im Server, nicht über den Browser.
insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do update set public = true;
