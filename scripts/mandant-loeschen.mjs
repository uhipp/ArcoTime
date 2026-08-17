/**
 * Einen Mandanten vollständig löschen.
 *
 * Nötig, weil AGB Ziffer 10 und AVV Ziffer 9 zusagen, dass die Daten einer
 * Organisation 30 Tage nach Vertragsende gelöscht werden. Von Hand ist das
 * fehleranfällig: Es hängen Benutzerkonten in auth.users daran, die keine
 * Datenbankfunktion entfernen kann, und ein Protokoll, das die Löschung
 * sonst blockiert (siehe Migration 0061).
 *
 * Aufruf:
 *   node --env-file=.env.local scripts/mandant-loeschen.mjs "Name der Organisation"
 *   node --env-file=.env.local scripts/mandant-loeschen.mjs "Name" --wirklich
 *
 * Ohne --wirklich zeigt das Skript nur, was es täte. Das ist Absicht: Eine
 * Löschung ist nicht zurückzuholen, und der Name allein ist eine dünne
 * Grundlage für eine unumkehrbare Aktion.
 */
import { createClient } from "@supabase/supabase-js";

const name = process.argv[2];
const wirklich = process.argv.includes("--wirklich");

if (!name) {
  console.error('Aufruf: node --env-file=.env.local scripts/mandant-loeschen.mjs "Name" [--wirklich]');
  process.exit(1);
}

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const { data: orgs, error: oe } = await db
  .from("organisationen")
  .select("id, name, status, lizenzen_gebucht, stripe_customer_id")
  .eq("name", name);

if (oe) {
  console.error("Organisationen liessen sich nicht lesen:", oe.message);
  process.exit(1);
}
if (orgs.length !== 1) {
  console.error(`Abbruch: ${orgs.length} Organisationen mit dem Namen "${name}".`);
  process.exit(1);
}

const org = orgs[0];
console.log(`Organisation: ${org.name}`);
console.log(`  id      ${org.id}`);
console.log(`  status  ${org.status}, ${org.lizenzen_gebucht ?? "?"} Lizenz(en)`);
console.log(`  stripe  ${org.stripe_customer_id ?? "—"}`);

// Umfang zeigen, bevor etwas passiert.
//
// Die Zählung kommt aus derselben Quelle wie die Löschung (Migration 0064),
// nicht aus einer hier gepflegten Tabellenliste. Eine solche Liste hatte
// beim Löschen der zweiten Testorganisation drei Zeilen angekündigt und
// vierzehn gelöscht – ein Probelauf, der zu wenig zeigt, beruhigt falsch.
const { data: umfang, error: ue } = await db.rpc("zaehle_organisation_daten", {
  p_organisation: org.id,
});
if (ue) {
  console.error("Umfang liess sich nicht ermitteln:", ue.message);
  console.error("Abbruch: Ohne verlässliche Vorschau wird nicht gelöscht.");
  process.exit(1);
}
console.log("\nBetroffene Datensätze:");
if (!umfang.length) {
  console.log("  keine");
}
for (const zeile of umfang) {
  console.log(`  ${zeile.tabelle.padEnd(20)} ${zeile.anzahl}`);
}

const { data: konten, error: ke } = await db
  .from("profiles").select("id, email").eq("organisation_id", org.id);
if (ke) {
  console.error("Konten liessen sich nicht lesen:", ke.message);
  process.exit(1);
}
console.log("\nBenutzerkonten:", konten.map((k) => k.email).join(", ") || "keine");

if (!wirklich) {
  console.log("\nProbelauf – es wurde nichts gelöscht. Mit --wirklich ausführen.");
  process.exit(0);
}

console.log("\nLösche …");
for (const k of konten) {
  const { error } = await db.auth.admin.deleteUser(k.id);
  console.log(error ? `  ${k.email}: FEHLER ${error.message}` : `  ${k.email}: Konto entfernt`);
}

const { data: ergebnis, error: le } = await db.rpc("loesche_organisation", {
  p_organisation: org.id,
});
if (le) {
  console.error("Organisation NICHT gelöscht:", le.message);
  process.exit(1);
}
for (const zeile of ergebnis ?? []) {
  console.log(`  ${zeile.tabelle}: ${zeile.anzahl}`);
}
console.log("Fertig.");
