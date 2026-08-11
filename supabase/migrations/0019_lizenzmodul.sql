-- =========================================================
-- Lizenzmodul: Grundlage für Verkauf an Kunden
--
-- Baut auf dem bereits in 0006_multi_tenancy_fundament.sql angelegten
-- Fundament auf (organisationen.status/abrechnungszyklus/preis_pro_zyklus,
-- profiles.ist_platform_admin, is_platform_admin()) – dort bislang
-- ungenutzt. Das alte Feld "plan_max_gleichzeitige_nutzer" wird bewusst
-- NICHT weiterverwendet (impliziert ein Floating-Lizenz-Modell), sondern
-- bleibt unverändert stehen; neu ist "lizenzen_gebucht" (klassisches
-- Pro-Sitzplatz-Modell: Anzahl eingeladener Konten, unabhängig von
-- tatsächlicher Nutzung – passt zur Preisangabe "pro Benutzer/Monat").
--
-- Führe diese Datei NACH 0001-0018 aus.
-- =========================================================

-- ---------------------------------------------------------
-- 1) organisationen: Lizenz- & Abo-Felder
-- ---------------------------------------------------------
-- NULL = unbegrenzt (für die eigene, nicht-zahlende Arcos-Group-Organisation
-- selbst gedacht – siehe Datenupdate unten). Für echte Kunden-Organisationen
-- ist ein konkreter Wert Pflicht (im Platform-Admin-Formular erzwungen).
alter table organisationen add column if not exists lizenzen_gebucht int;
alter table organisationen add column if not exists stripe_customer_id text;
alter table organisationen add column if not exists stripe_subscription_id text;

-- Wann eine laufende Testphase endet (NULL = keine Testphase aktiv/nötig).
-- Von Platform-Admins manuell verlängerbar (siehe Anforderung).
alter table organisationen add column if not exists test_endet_am timestamptz;

-- Vom Kunden gewünschte Lizenzreduktion, die erst zum nächsten Zahltermin
-- wirksam wird (kein Downgrade mit sofortiger Wirkung, keine Rückerstattung).
alter table organisationen add column if not exists geplante_lizenzreduktion int;

-- Nächster bekannter Abrechnungs-/Zahltermin – bei Stripe-Abos aus dem
-- Webhook gespiegelt, bei Rechnung/QR-Rechnung manuell im Platform-Admin-
-- Bereich gesetzt.
alter table organisationen add column if not exists naechster_zahltermin date;

-- Freitext-Grund, WARUM eine Organisation aktuell pausiert/gekündigt ist
-- (z.B. "test_abgelaufen", "zahlung_fehlgeschlagen", "manuell_pausiert") –
-- steuert den Hinweistext, den die gesperrte Organisation beim Loginversuch
-- sieht. Bewusst kein CHECK-Constraint (nur intern verwendete Schlüssel,
-- keine Nutzereingabe).
alter table organisationen add column if not exists sperrgrund text;

comment on column organisationen.lizenzen_gebucht is
  'Anzahl bezahlter/gebuchter Benutzer-Lizenzen (Pro-Sitzplatz-Modell). Vergleichsbasis: aktive (nicht deaktivierte) profiles-Zeilen dieser Organisation. NULL = unbegrenzt.';

-- Die eigene Organisation ist keine zahlende Kundin – kein Lizenzlimit.
-- Über ist_platform_admin statt über den (später editierbaren) Namen
-- ermittelt, damit das robust bleibt, falls die Organisation umbenannt
-- wurde.
update organisationen set lizenzen_gebucht = null
where id in (select organisation_id from profiles where ist_platform_admin = true);

-- ---------------------------------------------------------
-- 2) profiles: einmalige Selbst-Deaktivierung
-- ---------------------------------------------------------
-- Ein Konto mit bereits verknüpften Datensätzen (Zeiteinträge, Anfragen,
-- Dokumente, ...) kann nicht gelöscht werden, ohne diese Historie zu
-- verlieren. Damit ein Kunde trotzdem eine Lizenz wieder freigeben kann,
-- gibt es diese einmalige Deaktivierung – das Rückgängigmachen ist
-- bewusst NICHT über RLS, sondern nur über die Server Action für
-- Platform-Admins möglich (siehe src/app/actions/plattform.ts), damit ein
-- Kunde nicht durch Deaktivieren/Reaktivieren im Kreis das Lizenzlimit
-- umgehen kann.
alter table profiles add column if not exists deaktiviert_am timestamptz;
alter table profiles add column if not exists deaktiviert_von uuid references profiles(id);

-- ---------------------------------------------------------
-- 3) Einladungs-Trigger: erlaubt Rolle direkt bei der Einladung zu setzen
-- ---------------------------------------------------------
-- Bisher wurde "role" nie aus den Einladungs-Metadaten übernommen (blieb
-- immer beim Spalten-Default "mitarbeiter"). Für das Anlegen einer neuen
-- Organisation braucht es aber ein erstes Admin-Konto, ohne dass man
-- nachträglich manuell die Rolle hochstufen müsste. Bestehendes Verhalten
-- bleibt unverändert: ladeMitarbeitendeEin() setzt "rolle_bei_einladung"
-- nie mit, daher weiterhin Default "mitarbeiter".
create or replace function handle_new_user()
returns trigger as $$
declare
  palette text[] := array['#2563EB','#DC2626','#16A34A','#D97706','#7C3AED','#DB2777','#0D9488','#57534E'];
  anzahl int;
begin
  select count(*) into anzahl
  from profiles
  where organisation_id = (new.raw_user_meta_data->>'organisation_id')::uuid;

  insert into public.profiles (id, name, vorname, nachname, email, organisation_id, farbe, role)
  values (
    new.id,
    coalesce(
      nullif(trim(coalesce(new.raw_user_meta_data->>'vorname', '') || ' ' || coalesce(new.raw_user_meta_data->>'nachname', '')), ''),
      new.raw_user_meta_data->>'name',
      new.email
    ),
    new.raw_user_meta_data->>'vorname',
    new.raw_user_meta_data->>'nachname',
    new.email,
    (new.raw_user_meta_data->>'organisation_id')::uuid,
    palette[(coalesce(anzahl, 0) % 8) + 1],
    coalesce(new.raw_user_meta_data->>'rolle_bei_einladung', 'mitarbeiter')
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$ language plpgsql security definer;
