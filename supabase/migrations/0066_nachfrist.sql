-- Nachfrist nach Vertragsende
--
-- AGB Ziffer 10 sagt zu: "Nach Vertragsende bleiben die Daten 30 Tage
-- ABRUFBEREIT, damit der Kunde einen Export vornehmen kann."
--
-- Eingelöst war das nicht. Meldete Stripe das Ende des Abonnements, setzte
-- der Webhook den Status auf "gekuendigt", und die Zugriffssperre warf jede
-- angemeldete Person auf die Seite "Zugriff gesperrt". Der Kunde konnte
-- genau das nicht tun, wofür ihm die 30 Tage eingeräumt sind.
--
-- Deshalb ein eigenes Datum statt eines weiteren Status: Der Status sagt,
-- WARUM nicht mehr gearbeitet werden kann; die Nachfrist sagt, BIS WANN
-- noch gelesen und exportiert werden darf. Beides zusammen ergibt den
-- Nur-Lese-Zustand. Ein zusätzlicher Statuswert hätte an jeder Stelle, die
-- heute "aktiv" prüft, eine stille Fallunterscheidung mehr bedeutet.
--
-- Läuft die Nachfrist ab, ist der Zugang zu. Gelöscht wird deshalb NICHT
-- automatisch – das entscheidet ein Mensch unter /plattform.

alter table organisationen
  add column if not exists nachfrist_bis date;

comment on column organisationen.nachfrist_bis is
  'Letzter Tag, an dem eine beendete Organisation noch lesend zugänglich ist (AGB Ziffer 10: 30 Tage für den Export). Danach ist der Zugang zu; die Löschung erfolgt von Hand.';

-- Bestehende gekündigte Organisationen bekommen die Nachfrist nachträglich,
-- damit niemand durch die Einführung schlechter dasteht als zugesagt.
update organisationen
   set nachfrist_bis = current_date + 30
 where status = 'gekuendigt'
   and nachfrist_bis is null;
