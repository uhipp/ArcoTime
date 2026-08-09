-- =========================================================
-- Übergangslösung für den Mandantentext auf der Login-Seite: dort ist
-- noch niemand angemeldet, die Organisation ist also nicht über eine
-- Session bekannt. Da aktuell (und auf absehbare Zeit) genau EINE
-- Organisation diese Login-Seite tatsächlich nutzt, markiert dieses Flag,
-- welche Organisation dort angezeigt wird.
--
-- Das ist bewusst eine Übergangslösung, nicht die finale Mandanten-
-- verwaltung für echte SaaS-Kunden – die braucht eine eigene Subdomain
-- oder einen URL-Pfad pro Mandant (Platform-Admin-Bereich, siehe
-- docs/phase5-multi-tenancy-plan.md), damit die Login-Seite die
-- Organisation schon vor der Anmeldung kennt.
--
-- Führe diese Datei NACH 0001-0016 aus.
-- =========================================================
alter table organisationen add column if not exists zeige_auf_login boolean not null default false;

-- Höchstens eine Organisation gleichzeitig darf diese Markierung tragen.
create unique index if not exists uq_organisationen_zeige_auf_login
  on organisationen(zeige_auf_login)
  where zeige_auf_login = true;

update organisationen set zeige_auf_login = true where name = 'Arcos Group';
