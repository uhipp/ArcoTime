#!/usr/bin/env node
//
// Prüft die Ortsebene (0076/0077): Standardstandorte, Anfahrt, Einsatzort
// am Auftrag.
//
// Aufruf:
//   node --env-file=.env.local scripts/standorte-pruefen.mjs
//
// Warum es dieses Skript gibt, obwohl die Datenbank schon viel erzwingt:
// Eine Regel bleibt für einen Fremdschlüssel unerreichbar – "der Einsatzort
// eines Auftrags muss ein Standort SEINES Kunden sein". Keine Bedingung kann
// das ausdrücken, weil die Zugehörigkeit selbst eine Beteiligtenzeile ist.
// Genau solche Regeln müssen von außen nachgezählt werden.
//
// Nur lesend. Der Dienstschlüssel ist hier richtig, weil es um die EXISTENZ
// von Zeilen geht und nicht um Sichtbarkeit; für Sichtbarkeitsfragen umgeht
// er RLS und taugt nicht – dafür gibt es scripts/mandanten-pruefen.mjs.
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const schluessel = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !schluessel) {
  console.error("NEXT_PUBLIC_SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY nötig.");
  console.error("Aufruf: node --env-file=.env.local scripts/standorte-pruefen.mjs");
  process.exit(1);
}

const db = createClient(url, schluessel, { auth: { persistSession: false } });

// Eine Prüfung, die still nichts findet, ist schlimmer als keine: Fehlt eine
// Tabelle, bricht das Skript ab, statt "0 Beanstandungen" zu melden.
async function lies(tabelle, spalten) {
  const { data, error } = await db.from(tabelle).select(spalten);
  if (error) {
    console.error(`\n${tabelle} liess sich nicht lesen: ${error.message}`);
    console.error("Abbruch: Ohne diese Tabelle würde die Prüfung zu wenig sehen.");
    console.error("Sind die Migrationen 0076 und 0077 ausgeführt?");
    process.exit(1);
  }
  return data ?? [];
}

const organisationen = await lies("organisationen", "id, name, standorte_aktiv");
const kunden = await lies("kunden", "id, name, vorname, organisation_id, ist_kunde, anreise_km");
const standorte = await lies(
  "standorte",
  "id, bezeichnung, ort, ist_standard, aktiv, anreise_km, organisation_id"
);
const beteiligte = await lies(
  "beteiligte",
  "id, standort_id, projekt_id, rapport_id, partner_id, organisation_id, beteiligten_rollen(bezeichnung)"
);
const rollen = await lies("beteiligten_rollen", "id, bezeichnung, organisation_id");
const projekte = await lies("projekte", "id, bezeichnung, kunde_id, standort_id, organisation_id");

const nameVon = new Map(organisationen.map((o) => [o.id, o.name]));
const standortVon = new Map(standorte.map((s) => [s.id, s]));
const kundeVon = new Map(kunden.map((k) => [k.id, k]));
const beanstandungen = [];

console.log(`Organisationen: ${organisationen.length}`);
for (const o of organisationen) {
  const eigene = standorte.filter((s) => s.organisation_id === o.id);
  console.log(
    `  ${o.name}: Ortsebene ${o.standorte_aktiv ? "EIN" : "aus"} · ` +
      `${eigene.length} Standorte · ${rollen.filter((r) => r.organisation_id === o.id).length} Rollen`
  );
  // Ohne die Rolle "Kunde" lässt sich kein Standort seinem Kunden zuordnen –
  // der Trigger aus 0076 scheitert dann laut, aber besser vorher wissen.
  if (!rollen.some((r) => r.organisation_id === o.id && r.bezeichnung === "Kunde")) {
    beanstandungen.push(`${o.name}: die Beteiligtenrolle "Kunde" fehlt`);
  }
}

// Genau ein Standardstandort je Kunde mit Kundenrolle.
const standardJeKunde = new Map();
for (const b of beteiligte) {
  if (b.beteiligten_rollen?.bezeichnung !== "Kunde" || !b.standort_id) continue;
  if (standortVon.get(b.standort_id)?.ist_standard) {
    standardJeKunde.set(b.partner_id, (standardJeKunde.get(b.partner_id) ?? 0) + 1);
  }
}
const echteKunden = kunden.filter((k) => k.ist_kunde);
for (const k of echteKunden) {
  const anzahl = standardJeKunde.get(k.id) ?? 0;
  if (anzahl === 0) beanstandungen.push(`Kunde "${k.name}" hat keinen Standardstandort`);
  if (anzahl > 1) beanstandungen.push(`Kunde "${k.name}" hat ${anzahl} Standardstandorte`);
}
console.log(
  `\nKunden mit Kundenrolle: ${echteKunden.length} · Standorte: ${standorte.length} ` +
    `(Standard: ${standorte.filter((s) => s.ist_standard).length})`
);

// Ein Standort ohne Beteiligtenzeile "Kunde" gehört niemandem – er taucht in
// keiner Kundenmaske auf und ist damit unerreichbar.
for (const s of standorte) {
  const hat = beteiligte.some(
    (b) => b.standort_id === s.id && b.beteiligten_rollen?.bezeichnung === "Kunde"
  );
  if (!hat) beanstandungen.push(`Standort "${s.bezeichnung}" hat keinen Kunden und ist unerreichbar`);
}

// Die Anfahrt gehört zum Ort (0077). Am Kunden ist sie überholt.
const kmAmKunden = echteKunden.filter((k) => k.anreise_km != null);
let kmFehlt = 0;
for (const k of kmAmKunden) {
  const b = beteiligte.find(
    (x) => x.partner_id === k.id && x.beteiligten_rollen?.bezeichnung === "Kunde" && x.standort_id
  );
  const s = b ? standortVon.get(b.standort_id) : null;
  if (!s || s.anreise_km == null) {
    kmFehlt++;
    beanstandungen.push(`Anfahrt von "${k.name}" (${k.anreise_km} km) fehlt am Standardstandort`);
  }
}
console.log(`Anfahrt am Kunden: ${kmAmKunden.length} Zeilen · davon ohne Ort: ${kmFehlt}`);

// Der Kern: Gehört der Einsatzort dem Kunden des Auftrags?
let fremd = 0;
for (const p of projekte) {
  if (!p.standort_id) {
    beanstandungen.push(`Auftrag "${p.bezeichnung}" hat keinen Einsatzort`);
    continue;
  }
  const passt = beteiligte.some(
    (b) =>
      b.standort_id === p.standort_id &&
      b.partner_id === p.kunde_id &&
      b.beteiligten_rollen?.bezeichnung === "Kunde"
  );
  if (!passt) {
    fremd++;
    beanstandungen.push(
      `Auftrag "${p.bezeichnung}" zeigt auf einen Standort, der nicht ${
        kundeVon.get(p.kunde_id)?.name ?? "seinem Kunden"
      } gehört`
    );
  }
}
console.log(`Aufträge: ${projekte.length} · Einsatzort fremd: ${fremd}`);

// Mandantengrenze: Alle drei Tabellen tragen organisation_id, aber ein
// Verweis über die Grenze wäre trotzdem möglich – RLS prüft die Zeile, nicht
// den Verweis.
for (const b of beteiligte) {
  const s = b.standort_id ? standortVon.get(b.standort_id) : null;
  if (s && s.organisation_id !== b.organisation_id) {
    beanstandungen.push(
      `Beteiligung ${b.id} verweist über die Mandantengrenze (${nameVon.get(b.organisation_id)})`
    );
  }
  const k = kundeVon.get(b.partner_id);
  if (k && k.organisation_id !== b.organisation_id) {
    beanstandungen.push(`Beteiligung ${b.id} zeigt auf eine Adresse eines anderen Mandanten`);
  }
}

if (beanstandungen.length === 0) {
  console.log("\nKeine Beanstandungen.");
  process.exit(0);
}
console.log(`\n${beanstandungen.length} Beanstandung(en):`);
for (const b of beanstandungen) console.log(`  - ${b}`);
process.exit(1);
