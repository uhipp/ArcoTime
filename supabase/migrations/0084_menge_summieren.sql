-- =========================================================
-- 0084  Menge summieren – ja oder nein
-- =========================================================
--
-- Siehe docs/plan-ablauf-standorte.md, Etappe 6. Entscheidung des Nutzers vom
-- 22.08.2026:
--
--   „Eine Auswertung, die eine Zahl zeigt, die keinen Sinn macht, darf es
--    nicht geben. Also bei Klassen einen Schalter einbauen (Menge summieren
--    ja / nein)."
--
-- Der Anlass war eine Frage aus dem eigenen Gewerbe: Arbeit ist immer in
-- Stunden, aber Material ist Farbe in Liter, Pinsel in Stück und Vlies in m².
-- Summiert man das zu „60", ist die Zahl bedeutungslos, und man sieht es der
-- Zeile nicht an.
--
-- Die Klasse sagt es jetzt selbst. Damit bleibt die Klassenstruktur nach
-- SACHLOGIK gebaut – was die Rabattregel je Klasse braucht – und die
-- Auswertung zeigt nie eine sinnlose Zahl.

alter table artikelklassen
  add column if not exists menge_summieren boolean not null default true;

comment on column artikelklassen.menge_summieren is
  'Verträgt die Menge dieser Klasse eine Summe? Ein = die Auswertung zeigt '
  'Menge und Einheit ("Arbeit · 128.5 h"). Aus = nur der Betrag, in der '
  'Mengenspalte ein Strich; die einzelnen Mengen stehen weiter in den '
  'Positionen, wo sie ihre Einheit bei sich haben. Aus ist richtig, wo eine '
  'Klasse verschiedene Einheiten führt – Material in Liter, Stück und m².';

-- ---------------------------------------------------------
-- Bestand ehrlich machen
-- ---------------------------------------------------------
-- Die Vorgabe „ein" darf keine Klasse betreffen, die heute schon gemischte
-- Einheiten führt: Sonst stünde eine Regel im Schema, die die eigenen Daten
-- verletzen.
update artikelklassen k
   set menge_summieren = false
 where exists (
   select 1 from artikel a
    where a.klasse_id = k.id
    group by a.klasse_id
   having count(distinct a.einheit) > 1
 );

do $$
declare
  v_aus int;
begin
  select count(*) into v_aus from artikelklassen where not menge_summieren;
  raise notice '% Klasse(n) führen gemischte Einheiten und summieren deshalb nicht.', v_aus;
end $$;

-- ---------------------------------------------------------
-- Der Widerspruch wird abgelehnt – in beide Richtungen
-- ---------------------------------------------------------
-- Das ist die Regel aus dem Gespräch („eine Prüfregel mit sprechender
-- Fehlermeldung") in ihrer schärfsten Form. In der Datenbank und nicht im
-- Formular, damit sie auch für Import und künftige Erfassungswege gilt.

create or replace function pruefe_einheit_in_klasse()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_summiert boolean;
  v_klasse text;
  v_andere text;
begin
  if new.klasse_id is null then
    return new;
  end if;

  select menge_summieren, bezeichnung
    into v_summiert, v_klasse
    from artikelklassen where id = new.klasse_id;

  if not coalesce(v_summiert, false) then
    return new;
  end if;

  select string_agg(distinct a.einheit, ', ')
    into v_andere
    from artikel a
   where a.klasse_id = new.klasse_id
     and a.id <> new.id
     and a.einheit is distinct from new.einheit;

  if v_andere is not null then
    raise exception
      'Die Klasse "%" summiert Mengen und führt bereits %. Dieser Artikel hat %. Entweder eine andere Klasse wählen oder bei der Klasse das Summieren ausschalten.',
      v_klasse, v_andere, new.einheit;
  end if;

  return new;
end;
$$;

drop trigger if exists artikel_einheit_in_klasse on artikel;
create trigger artikel_einheit_in_klasse
  before insert or update of klasse_id, einheit on artikel
  for each row execute function pruefe_einheit_in_klasse();

create or replace function pruefe_klasse_summierbar()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_einheiten text;
  v_anzahl int;
begin
  if not new.menge_summieren then
    return new;
  end if;

  select count(distinct einheit), string_agg(distinct einheit, ', ')
    into v_anzahl, v_einheiten
    from artikel where klasse_id = new.id;

  if coalesce(v_anzahl, 0) > 1 then
    raise exception
      'Die Klasse "%" führt Artikel in verschiedenen Einheiten (%). Eine Summe darüber wäre bedeutungslos – das Summieren lässt sich hier nicht einschalten.',
      new.bezeichnung, v_einheiten;
  end if;

  return new;
end;
$$;

drop trigger if exists artikelklassen_summierbar on artikelklassen;
create trigger artikelklassen_summierbar
  before insert or update of menge_summieren on artikelklassen
  for each row execute function pruefe_klasse_summierbar();

-- ---------------------------------------------------------
-- Nachzählen statt hoffen
-- ---------------------------------------------------------
do $$
declare
  v_verletzt text;
begin
  select string_agg(k.bezeichnung, ', ')
    into v_verletzt
    from artikelklassen k
   where k.menge_summieren
     and (select count(distinct a.einheit) from artikel a where a.klasse_id = k.id) > 1;

  if v_verletzt is not null then
    raise exception 'Diese Klassen summieren, führen aber gemischte Einheiten: %', v_verletzt;
  end if;
  raise notice 'Keine Klasse summiert über verschiedene Einheiten.';
end $$;
