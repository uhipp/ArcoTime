-- Rechnungsadresse der Organisation
--
-- Bisher kannte ArcoTime von einer Kundin nur den Firmennamen. Für eine
-- MWST-konforme Rechnung braucht es die Adresse, und für die steuerliche
-- Behandlung das Sitzland: Ein Kunde in der Schweiz zahlt 8,1 % MWST, ein
-- Unternehmen in der EU erhält eine Nettorechnung mit Übergang der
-- Steuerschuld (Reverse Charge) – dafür ist zusätzlich seine USt-IdNr.
-- nötig.
--
-- Die Felder sind bewusst nullable: Bestehende Organisationen wurden ohne
-- Adresse angelegt, und ein NOT NULL würde die Migration daran scheitern
-- lassen. Erhoben wird die Adresse ab sofort bei der Registrierung.

alter table organisationen
  add column if not exists strasse text,
  add column if not exists plz text,
  add column if not exists ort text,
  -- ISO-Ländercode, wie ihn auch Stripe verwendet (CH, LI, DE, AT …).
  add column if not exists land text default 'CH',
  -- Schweizer UID (CHE-…) oder ausländische USt-IdNr. Bei EU-Kunden die
  -- Grundlage für die Steuerschuldumkehr; wird bei der Registrierung von
  -- Stripe geprüft.
  add column if not exists steuernummer text;

comment on column organisationen.land is
  'ISO-Ländercode des Sitzes. Steuert die MWST-Behandlung: CH/LI mit Schweizer MWST, übrige Länder als Leistung im Ausland.';
comment on column organisationen.steuernummer is
  'UID bzw. USt-IdNr. der Organisation. Bei Kunden ausserhalb CH/LI Voraussetzung für Reverse Charge.';
