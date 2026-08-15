-- =========================================================
-- 0053  Änderungsprotokoll je Organisation
-- =========================================================
--
-- Die zweite Hälfte der Antwort auf die Frage, die sich bei fremden
-- Mandanten stellt (siehe 0052): Was ist an unseren Daten passiert – und
-- durch wen?
--
-- Entscheidend ist, WO protokolliert wird. In der Anwendung
-- mitzuschreiben wäre einfacher, würde aber genau den Fall verfehlen,
-- der den Anlass gab: einen Eingriff von Arcos über den SQL-Editor. Ein
-- Trigger in der Datenbank sieht jede Änderung, gleich über welchen Weg
-- sie kommt.
--
-- Genau daran ist auch zu erkennen, wer gehandelt hat: Bei einer
-- Änderung aus der Anwendung steht auth.uid() zur Verfügung, bei einem
-- direkten Datenbankzugriff nicht. Ein leeres Feld bedeutet hier also
-- nicht "unbekannt", sondern "am Anmeldeweg vorbei" – und wird in der
-- Anzeige als Zugriff durch Arcos benannt.

create table if not exists aenderungsprotokoll (
  id bigserial primary key,
  organisation_id uuid not null references organisationen(id),
  tabelle text not null,
  datensatz_id uuid,
  -- angelegt | geaendert | geloescht
  aktion text not null,
  -- Lesbare Kurzform des Datensatzes, damit die Liste ohne Nachschlagen
  -- verständlich ist – und damit ein gelöschter Datensatz benennbar
  -- bleibt, wenn es ihn nicht mehr gibt.
  bezeichnung text,
  geaendert_am timestamptz not null default now(),
  -- Leer = direkter Datenbankzugriff, siehe oben.
  -- on delete set null: Wird ein Konto entfernt, darf das nicht am
  -- Protokoll scheitern – und der Eintrag bleibt als Vorgang bestehen.
  geaendert_von uuid references profiles(id) on delete set null default auth.uid(),
  -- Nur die tatsächlich geänderten Felder, nicht die ganze Zeile.
  vorher jsonb,
  nachher jsonb
);

create index if not exists idx_aenderungsprotokoll_org
  on aenderungsprotokoll (organisation_id, geaendert_am desc);
create index if not exists idx_aenderungsprotokoll_datensatz
  on aenderungsprotokoll (datensatz_id);

alter table aenderungsprotokoll enable row level security;

-- Nur lesen, und nur der Admin der eigenen Organisation. Bewusst KEINE
-- Regel für insert, update oder delete: Ein Protokoll, das sich ändern
-- lässt, ist keines. Geschrieben wird ausschliesslich vom Trigger unten,
-- der mit erweiterten Rechten läuft.
drop policy if exists "aenderungsprotokoll_lesen" on aenderungsprotokoll;
create policy "aenderungsprotokoll_lesen" on aenderungsprotokoll for select using (
  is_admin() and organisation_id = current_organisation_id()
);

-- ---------------------------------------------------------
-- Der Trigger
-- ---------------------------------------------------------
create or replace function protokolliere_aenderung()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_alt jsonb;
  v_neu jsonb;
  v_vorher jsonb;
  v_nachher jsonb;
  v_org uuid;
  v_id uuid;
  v_bezeichnung text;
  v_aktion text;
  -- Felder, deren Änderung nichts aussagt: Sie ändern sich bei jedem
  -- Speichern mit und würden das Protokoll unlesbar machen.
  v_ignorieren text[] := array['updated_at', 'created_at', 'geaendert_von'];
begin
  v_alt := case when tg_op = 'INSERT' then '{}'::jsonb else to_jsonb(old) end;
  v_neu := case when tg_op = 'DELETE' then '{}'::jsonb else to_jsonb(new) end;

  v_aktion := case tg_op
    when 'INSERT' then 'angelegt'
    when 'UPDATE' then 'geaendert'
    else 'geloescht'
  end;

  -- Die Organisation steht in fast jeder Tabelle in einer eigenen
  -- Spalte; bei organisationen selbst ist es die id.
  v_org := coalesce(
    (v_neu->>'organisation_id')::uuid,
    (v_alt->>'organisation_id')::uuid,
    case when tg_table_name = 'organisationen'
      then coalesce((v_neu->>'id')::uuid, (v_alt->>'id')::uuid)
    end
  );

  -- Ohne Organisation lässt sich die Zeile niemandem zeigen. Das darf
  -- die eigentliche Änderung aber nicht verhindern.
  if v_org is null then
    return coalesce(new, old);
  end if;

  v_id := coalesce((v_neu->>'id')::uuid, (v_alt->>'id')::uuid);

  v_bezeichnung := coalesce(
    v_neu->>'bezeichnung', v_alt->>'bezeichnung',
    v_neu->>'titel', v_alt->>'titel',
    nullif(trim(concat_ws(' ', coalesce(v_neu->>'vorname', v_alt->>'vorname'),
                               coalesce(v_neu->>'name', v_alt->>'name'))), ''),
    v_neu->>'beschreibung', v_alt->>'beschreibung'
  );

  -- Nur die geänderten Felder. Bei einem Update, das nichts verändert
  -- hat, entsteht gar kein Eintrag – ein zweiter Klick auf "speichern"
  -- ist keine Änderung.
  select jsonb_object_agg(key, value) into v_vorher
  from jsonb_each(v_alt)
  where key <> all(v_ignorieren)
    and v_neu->key is distinct from value;

  select jsonb_object_agg(key, value) into v_nachher
  from jsonb_each(v_neu)
  where key <> all(v_ignorieren)
    and v_alt->key is distinct from value;

  if tg_op = 'UPDATE' and v_vorher is null and v_nachher is null then
    return new;
  end if;

  insert into public.aenderungsprotokoll (
    organisation_id, tabelle, datensatz_id, aktion, bezeichnung, vorher, nachher
  ) values (
    v_org, tg_table_name, v_id, v_aktion, left(v_bezeichnung, 200), v_vorher, v_nachher
  );

  return coalesce(new, old);
end;
$$;

-- ---------------------------------------------------------
-- Wo protokolliert wird
-- ---------------------------------------------------------
-- Stammdaten, Belege und Konten. Nicht dabei sind Tabellen, die den
-- Betrieb der Anwendung selbst betreffen: Präsenzmeldungen,
-- Spaltenauswahl, das Protokoll selbst – dort entstünde Rauschen ohne
-- Aussage über die Daten der Organisation.
do $$
declare
  t text;
  tabellen text[] := array[
    'kunden', 'projekte', 'dienstleistungen', 'zeiteintraege', 'rapporte',
    'rapport_beteiligte', 'rapport_standardpositionen', 'anfragen', 'dokumente',
    'profiles', 'organisationen', 'kundenpreise', 'kundenrabatte',
    'dienstleistungsklassen', 'einheiten', 'mwst_codes', 'rabattsaetze',
    'abwesenheiten', 'abwesenheitsarten', 'schliesstage', 'gruppen',
    'gruppen_mitglieder', 'anfrage_kanaele', 'anfrage_prioritaeten',
    'dokument_kategorien', 'belege_exporte'
  ];
begin
  foreach t in array tabellen loop
    if to_regclass('public.' || t) is not null then
      execute format('drop trigger if exists %I on public.%I', t || '_protokoll', t);
      execute format(
        'create trigger %I after insert or update or delete on public.%I
           for each row execute function protokolliere_aenderung()',
        t || '_protokoll', t
      );
    end if;
  end loop;
end;
$$;

-- Dieselbe Überlegung für die Läufe aus 0052: Ohne "on delete set null"
-- liesse sich ein Konto nicht mehr entfernen, sobald es einmal eine
-- Sammelaktion ausgelöst hat.
alter table datenpflege_laeufe
  drop constraint if exists datenpflege_laeufe_ausgefuehrt_von_fkey;
alter table datenpflege_laeufe
  add constraint datenpflege_laeufe_ausgefuehrt_von_fkey
  foreign key (ausgefuehrt_von) references profiles(id) on delete set null;

alter table datenpflege_laeufe
  drop constraint if exists datenpflege_laeufe_rueckgaengig_von_fkey;
alter table datenpflege_laeufe
  add constraint datenpflege_laeufe_rueckgaengig_von_fkey
  foreign key (rueckgaengig_von) references profiles(id) on delete set null;
