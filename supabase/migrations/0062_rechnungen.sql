-- Eigene Rechnungen der Arcos Group
--
-- Bisher erzeugte allein Stripe eine Rechnung. Deren Layout lässt sich
-- nicht ändern, und die kundenseitigen Mails sind deshalb abgeschaltet –
-- ein zahlender Kunde bekäme sonst gar keinen Beleg. Ab hier stellt
-- ArcoTime die Rechnung selbst.
--
-- Zwei Entscheidungen, die den Aufbau erklären:
--
-- 1) Der Nummernkreis gehört ARCOS, nicht dem Mandanten. Eine Rechnung ist
--    ein Beleg der Arcos Group an ihre Kundin; es braucht eine einzige,
--    lückenlose Reihe je Jahr über alle Kundinnen hinweg. Deshalb hier
--    kein organisation_id im Zähler – anders als beim Rapport (0026), wo
--    jede Organisation ihre eigene Reihe führt.
--
-- 2) Eine Rechnung überlebt den Mandanten. Nach Art. 958f OR sind Belege
--    zehn Jahre aufzubewahren; die Löschzusage aus AGB Ziffer 10 betrifft
--    die Betriebsdaten, nicht die Buchhaltung. Deshalb steht die Adresse
--    der Kundin als Kopie in der Zeile und der Verweis auf die
--    Organisation ist "on delete set null" – wird ein Mandant gelöscht,
--    bleibt die Rechnung als Beleg bestehen, ohne Verweis ins Leere.

-- ---------------------------------------------------------
-- 1) Nummernkreis
-- ---------------------------------------------------------
create table if not exists rechnung_nummernkreis (
  jahr int primary key,
  letzte_nummer int not null default 0
);

alter table rechnung_nummernkreis enable row level security;
-- Bewusst ohne Policy: Gelesen und geschrieben wird nur über die Funktion
-- unten. Niemand soll den Zähler von Hand verstellen.

create or replace function naechste_rechnungsnummer(p_jahr int)
returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_nummer int;
begin
  -- Atomar hochzählen, auch wenn zwei Zahlungen gleichzeitig eintreffen.
  insert into rechnung_nummernkreis (jahr, letzte_nummer)
  values (p_jahr, 1)
  on conflict (jahr)
    do update set letzte_nummer = rechnung_nummernkreis.letzte_nummer + 1
  returning letzte_nummer into v_nummer;

  return v_nummer;
end;
$$;

revoke all on function naechste_rechnungsnummer(int) from public, anon, authenticated;

-- ---------------------------------------------------------
-- 2) Rechnungen
-- ---------------------------------------------------------
create table if not exists rechnungen (
  id uuid primary key default gen_random_uuid(),

  jahr int not null,
  nummer int not null,

  -- Verweis auf den Mandanten, aber ohne ihn zu halten: siehe oben.
  organisation_id uuid references organisationen(id) on delete set null,

  -- Kopie der Empfängerangaben zum Zeitpunkt der Rechnung. Eine Rechnung
  -- muss auch dann noch lesbar sein, wenn die Kundin inzwischen umgezogen
  -- ist oder es sie nicht mehr gibt.
  empfaenger_name text not null,
  empfaenger_strasse text,
  empfaenger_plz text,
  empfaenger_ort text,
  empfaenger_land text,
  empfaenger_steuernummer text,
  empfaenger_email text,

  -- Herkunft bei Stripe. Eindeutig, damit ein wiederholt zugestelltes
  -- Webhook-Ereignis nicht eine zweite Rechnung mit neuer Nummer erzeugt.
  stripe_invoice_id text not null unique,
  stripe_customer_id text,

  -- Leistung und Zeitraum
  bezeichnung text not null,
  menge int not null default 1,
  einzelpreis numeric(10,2) not null,
  periode_von date,
  periode_bis date,

  -- Beträge. Rappengenau als numeric, nicht als Fliesskomma.
  netto numeric(10,2) not null,
  mwst_satz numeric(5,2) not null default 0,
  mwst_betrag numeric(10,2) not null default 0,
  brutto numeric(10,2) not null,
  waehrung text not null default 'CHF',

  -- Bei Kundinnen ausserhalb CH/FL: Nettorechnung mit Übergang der
  -- Steuerschuld. Steuert den Vermerk auf der Rechnung.
  reverse_charge boolean not null default false,

  ausgestellt_am timestamptz not null default now(),
  bezahlt_am timestamptz,

  pdf_pfad text,
  versendet_an text,
  versendet_am timestamptz,

  unique (jahr, nummer)
);

create index if not exists rechnungen_organisation_idx
  on rechnungen (organisation_id, ausgestellt_am desc);

alter table rechnungen enable row level security;

-- Admins sehen die Rechnungen ihrer eigenen Organisation – Grundlage für
-- die Abo-Seite. Geschrieben wird ausschliesslich serverseitig über den
-- Dienstschlüssel; eine Insert- oder Update-Policy gibt es bewusst nicht.
create policy "rechnungen lesen" on rechnungen
  for select using (
    is_platform_admin()
    or (is_admin() and organisation_id = current_organisation_id())
  );

-- ---------------------------------------------------------
-- 3) Ablage der PDF
-- ---------------------------------------------------------
-- Nicht öffentlich: Eine Rechnung enthält Adresse und Betrag der Kundin.
-- Der Zugriff läuft über den Server mit signierten, kurzlebigen Links.
insert into storage.buckets (id, name, public)
values ('rechnungen', 'rechnungen', false)
on conflict (id) do update set public = false;

comment on table rechnungen is
  'Ausgangsrechnungen der Arcos Group. Belege im Sinne von Art. 958f OR – bleiben bestehen, auch wenn der Mandant gelöscht wird.';
