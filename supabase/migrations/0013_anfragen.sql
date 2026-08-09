-- =========================================================
-- Phase 6: Anfragenverwaltung (Ticket-/CRM-Modul)
-- Siehe docs/phase6-anfragenverwaltung-plan.md
--
-- Teil 1: Kern-Tabelle + RLS. Kanban-Board/Erledigen-Flow folgen im Code.
-- Dokumentenablage (Teil 5) ist bewusst nicht Teil dieser Migration.
--
-- Führe diese Datei NACH 0001-0012 aus.
-- =========================================================

create table if not exists anfragen (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisationen(id),
  kunde_id uuid not null references kunden(id),
  projekt_id uuid references projekte(id),
  titel text not null,
  beschreibung text,
  kanal text not null default 'sonstiges' check (kanal in ('telefon', 'email', 'whatsapp', 'brief', 'persoenlich', 'sonstiges')),
  status text not null default 'neu' check (status in ('neu', 'in_bearbeitung', 'wiedervorlage', 'erledigt')),
  prioritaet text not null default 'normal' check (prioritaet in ('tief', 'normal', 'hoch')),
  zugewiesen_an uuid references profiles(id),
  wiedervorlage_am date,
  erledigt_am timestamptz,
  zeiteintrag_id uuid references zeiteintraege(id),
  erstellt_von uuid references profiles(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_anfragen_organisation on anfragen(organisation_id);
create index if not exists idx_anfragen_kunde on anfragen(kunde_id);
create index if not exists idx_anfragen_status on anfragen(status);
create index if not exists idx_anfragen_zugewiesen on anfragen(zugewiesen_an);

-- organisation_id automatisch & unveränderlich vom Kunden ableiten
-- (set_organisation_von_kunde() existiert schon, wird bereits für
-- "projekte" verwendet – funktioniert hier genauso, da sie generisch auf
-- new.kunde_id liest).
drop trigger if exists anfragen_set_organisation on anfragen;
create trigger anfragen_set_organisation
  before insert or update of kunde_id on anfragen
  for each row execute function set_organisation_von_kunde();

drop trigger if exists anfragen_updated_at on anfragen;
create trigger anfragen_updated_at
  before update on anfragen
  for each row execute function set_updated_at();

alter table anfragen enable row level security;

-- Lesen: alle Mitglieder der eigenen Organisation sehen alle Anfragen
-- (gemeinsames Ticket-Board, auch unzugewiesene können von jedem
-- übernommen werden).
create policy "anfragen_select" on anfragen for select using (
  organisation_id = current_organisation_id()
);

create policy "anfragen_insert" on anfragen for insert with check (
  organisation_id = current_organisation_id()
);

-- Ändern: Ersteller, zugewiesene Person, wer eine unzugewiesene Anfrage
-- übernehmen will, oder Admin.
create policy "anfragen_update" on anfragen for update using (
  organisation_id = current_organisation_id()
  and (
    erstellt_von = auth.uid()
    or zugewiesen_an = auth.uid()
    or zugewiesen_an is null
    or is_admin()
  )
);

-- Löschen bewusst nur Admin (Anfragen sind ein Verlauf, kein Papierkorb).
create policy "anfragen_delete" on anfragen for delete using (
  is_admin() and organisation_id = current_organisation_id()
);
