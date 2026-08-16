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
const tabellen = [
  "profiles", "zeiteintraege", "rapporte", "kunden", "projekte", "anfragen",
  "dienstleistungen", "abwesenheiten", "dokumente", "aenderungsprotokoll",
];
console.log("\nBetroffene Datensätze:");
for (const t of tabellen) {
  const { count, error } = await db
    .from(t)
    .select("id", { count: "exact", head: true })
    .eq("organisation_id", org.id);
  if (error) {
    console.log(`  ${t.padEnd(20)} Prüfung fehlgeschlagen – ${error.message}`);
    continue;
  }
  if (count) console.log(`  ${t.padEnd(20)} ${count}`);
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
