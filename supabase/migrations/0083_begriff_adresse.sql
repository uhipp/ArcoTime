-- =========================================================
-- 0083  Der Begriff „Adresse"
-- =========================================================
--
-- Siehe docs/plan-ablauf-standorte.md, Abschnitt 7. Entscheidung des Nutzers
-- vom 22.08.2026:
--
--   „Warum nennen wir das Register Kunden eigentlich ,Kunden'? Müsste der
--    jetzt nicht einfach nur Adressen heissen, weil ja eben eine Adresse
--    nicht zwingend ein Kunde ist."
--
-- Richtig – und die Antwort sind ZWEI Begriffe, nicht ein anderer:
--
--   adresse   die Liste, die alles hält: Kunden, Eigentümer, Architekten,
--             Ämter. Sie ist das Adressbuch.
--   kunde     das Feld am Auftrag: wer bestellt und schuldet. Dort wäre
--             „Adresse wählen" falsch, und die Auswahl zeigt weiterhin nur
--             Zeilen mit ist_kunde.
--
-- Die Route bleibt /kunden. URLs zu ändern kostet nur kaputte Lesezeichen,
-- und dieselbe Regel steht schon in der Hilfe zu den Bezeichnungen.

insert into begriffe (organisation_id, schluessel, einzahl, mehrzahl, genus)
select o.id, 'adresse', 'Adresse', 'Adressen', 'f'
  from organisationen o
on conflict (organisation_id, schluessel) do nothing;

-- Auch in den Branchenvorlagen: Wer eine Vorlage übernimmt, soll ein
-- vollständiges Wörterverzeichnis bekommen und nicht eines mit Lücke.
insert into begriff_vorlagen (branche, schluessel, einzahl, mehrzahl, genus)
select v.branche, 'adresse', 'Adresse', 'Adressen', 'f'
  from (select distinct branche from begriff_vorlagen) v
on conflict (branche, schluessel) do nothing;

do $$
declare
  v_orgs int;
  v_mit int;
begin
  select count(*) into v_orgs from organisationen;
  select count(*) into v_mit from begriffe where schluessel = 'adresse';
  if v_mit < v_orgs then
    raise exception 'Nur % von % Organisationen haben den Begriff "adresse".', v_mit, v_orgs;
  end if;
  raise notice '% Organisationen haben den Begriff "adresse".', v_mit;
end $$;
