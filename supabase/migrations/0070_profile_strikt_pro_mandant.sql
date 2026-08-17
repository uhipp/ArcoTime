-- Profile sind strikt mandantengebunden – auch für Arcos
--
-- Bisher lautete die Regel:
--
--   organisation_id = current_organisation_id() or is_platform_admin()
--
-- Der zweite Teil war als Zugang für den Support gedacht. Tatsächlich wirkte
-- er in der GANZEN Anwendung: Ein Plattform-Admin sah fremde Mitarbeitende in
-- seiner eigenen Mitarbeitendenliste, in der Zuweisung von Anfragen, in der
-- Disposition, im Kalender. Aufgefallen ist es, weil der Admin eines
-- Kundenmandanten in der Liste der Arcos Group stand und ihm dort eine
-- Anfrage zugewiesen werden konnte.
--
-- Drei Gründe, warum das weg muss – auch ohne Rechtsverstoss:
--
-- 1) Es verleitet zu falschen Daten. Eine Anfrage, die einer Person aus einem
--    fremden Betrieb zugewiesen ist, kann diese Person nie sehen; die
--    Zuweisung zeigt ins Leere.
-- 2) Es macht die Mandantentrennung am Bildschirm unüberprüfbar. Wer immer
--    alles sieht, kann nicht erkennen, ob die Trennung greift.
-- 3) Die AVV beschreibt Zugriff für Support und Sicherung – einen bewussten
--    Vorgang, keinen Dauerzustand in jeder Auswahlliste.
--
-- Wichtig zur Einordnung: Betriebsdaten waren NIE mandantenübergreifend
-- sichtbar. kunden, projekte, anfragen, zeiteintraege, rapporte und dokumente
-- tragen diese Ausnahme nicht und haben sie nie getragen. Mit einer echten
-- Sitzung als normale Mitarbeiterin nachgemessen: Sie sieht ausschliesslich
-- die eigene Organisation.
--
-- Der Zugriff von Arcos auf fremde Profile läuft ab jetzt über den
-- Dienstschlüssel und ausschliesslich unter /plattform. Das ist der
-- Unterschied zwischen "kann jederzeit überall hineinsehen" und "greift
-- bewusst und nachvollziehbar zu".
--
-- Die Ausnahme bei organisationen bleibt: Ohne sie liesse sich unter
-- /plattform kein Mandant auflisten. Dort geht es um Vertragsdaten – Name,
-- Status, Lizenzzahl – nicht um die Betriebsdaten der Kundin.

drop policy if exists "profiles_select_own_org" on profiles;

create policy "profiles_select_own_org" on profiles for select using (
  organisation_id = current_organisation_id()
);

comment on policy "profiles_select_own_org" on profiles is
  'Profile sind ausschliesslich innerhalb der eigenen Organisation sichtbar - ohne Ausnahme für Plattform-Admins. Arcos liest fremde Profile über den Dienstschlüssel unter /plattform.';
