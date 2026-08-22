-- =========================================================
-- 0081  Keine Dokumente am Standort
-- =========================================================
--
-- Nachtrag zu 0079. Der Standort ist eine Postadresse und trägt nichts
-- weiter – das war die Entscheidung vom 22.08.2026, und sie gilt auch für
-- eine Ablage.
--
-- 0076 hatte den Dokumentbereich „standort" eingeführt, und ich habe ihn in
-- 0079 stehen gelassen mit dem Argument, der Grundriss überlebe das Vorhaben,
-- in dem er entstanden ist. Das war ein praktisches Argument gegen eine
-- bereits getroffene Regel, und die Regel hat den besseren Grund: Ein Betrieb
-- OHNE Ortsebene hätte keinen Weg zu dieser Ablage. Damit könnte Variante A
-- etwas, das Variante B nicht kann – genau die Ungleichheit, die der Umbau
-- beseitigen sollte.
--
-- Dokumente hängen also am Kunden oder am Auftrag. Beide Wege sind da.

-- Nachgezählt am 23.08.2026: keine Zeile nutzt den Bereich. Sollte doch eine
-- auftauchen, bricht die Migration ab statt sie stillschweigend zu
-- verlieren – die Datei läge danach im Speicher ohne Zeile, und das ist der
-- eine Fehler, der sich nicht mehr heilen lässt.
do $$
declare
  v_anzahl int;
begin
  select count(*) into v_anzahl from dokumente where bereich = 'standort';
  if v_anzahl > 0 then
    raise exception
      'Es hängen % Dokument(e) an einer Adresse. Sie sind vorher auf den Kunden oder den Auftrag umzuhängen – sonst bleibt die Datei ohne Zeile im Speicher liegen.',
      v_anzahl;
  end if;
end $$;

alter table dokumente drop constraint if exists dokumente_bereich_check;
alter table dokumente add constraint dokumente_bereich_check
  check (bereich in ('kunde', 'projekt', 'mitarbeitende', 'anfrage',
                     'zeiteintrag', 'rapport'));
