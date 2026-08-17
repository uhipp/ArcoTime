/**
 * Prüft die Mandantentrennung – aus der Sicht echter Anmeldungen.
 *
 * Entstanden aus einem Fehler und einer untauglichen Prüfung: Der Admin
 * eines Kundenmandanten stand in der Mitarbeitendenliste der Arcos Group.
 * Nachgesehen wurde damals mit dem Dienstschlüssel – und der umgeht RLS.
 * Damit war belegt, dass die Datenzeile richtig ist, aber nichts darüber,
 * wer sie sehen darf. Genau die Frage stand zur Debatte.
 *
 * Deshalb prüft dieses Skript zwei Dinge, die man nicht verwechseln darf:
 *
 *   1) SICHTBARKEIT – mit einer echten Sitzung je Person (Magic-Link ohne
 *      Mailversand). Sieht jemand Profile aus einem fremden Betrieb?
 *   2) VERWEISE – zeigt ein Datensatz auf eine Person aus einem fremden
 *      Betrieb? Solche Verweise entstehen, wenn eine Auswahlliste zu viel
 *      anzeigt, und sind danach unsichtbar: Die zugewiesene Person kann den
 *      Datensatz nie sehen.
 *
 * Die Tabellen kommen aus exportiere_organisation() – demselben Katalog, aus
 * dem exportiert und gelöscht wird. Keine Handliste, die jemand pflegen
 * müsste und irgendwann vergisst.
 *
 * Aufruf:
 *   node --env-file=.env.local scripts/mandanten-pruefen.mjs
 *
 * Das Skript ändert nichts. Es meldet nur.
 */
import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const DIENST = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!URL || !DIENST || !ANON) {
  console.error("NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY und NEXT_PUBLIC_SUPABASE_ANON_KEY nötig.");
  process.exit(1);
}

const dienst = createClient(URL, DIENST);

const { data: orgs, error: orgFehler } = await dienst.from("organisationen").select("id, name").order("name");
if (orgFehler) {
  console.error("Organisationen nicht lesbar:", orgFehler.message);
  process.exit(1);
}
const orgName = Object.fromEntries(orgs.map((o) => [o.id, o.name]));

const { data: profile } = await dienst.from("profiles").select("id, email, organisation_id");
const gehoertZu = Object.fromEntries(profile.map((p) => [p.id, p.organisation_id]));
const mailVon = Object.fromEntries(profile.map((p) => [p.id, p.email]));

let fehler = 0;

// ---------------------------------------------------------------
console.log("1) Sichtbarkeit – je Person mit echter Anmeldung");
// ---------------------------------------------------------------
for (const person of profile) {
  if (!person.email) continue;

  const { data: link, error: linkFehler } = await dienst.auth.admin.generateLink({
    type: "magiclink",
    email: person.email,
  });
  if (linkFehler) {
    console.log(`   ${person.email.padEnd(34)} Sitzung nicht möglich – ${linkFehler.message}`);
    continue;
  }

  const alsNutzer = createClient(URL, ANON);
  const { error: sitzungsFehler } = await alsNutzer.auth.verifyOtp({
    token_hash: link.properties.hashed_token,
    type: "magiclink",
  });
  if (sitzungsFehler) {
    console.log(`   ${person.email.padEnd(34)} Anmeldung fehlgeschlagen – ${sitzungsFehler.message}`);
    continue;
  }

  const { data: sichtbar } = await alsNutzer.from("profiles").select("email, organisation_id");
  const fremd = (sichtbar ?? []).filter((x) => x.organisation_id !== person.organisation_id);

  console.log(
    `   ${person.email.padEnd(34)} ${orgName[person.organisation_id] ?? "?"}: ` +
      `${sichtbar?.length ?? 0} Profile sichtbar, ${fremd.length} davon fremd` +
      (fremd.length ? `  <<< LECK: ${fremd.map((f) => f.email).join(", ")}` : "")
  );
  if (fremd.length) fehler++;

  await alsNutzer.auth.signOut();
}

// ---------------------------------------------------------------
console.log("\n2) Verweise – zeigt ein Datensatz auf eine fremde Person?");
// ---------------------------------------------------------------
let geprueft = 0;
let uebergreifend = 0;

for (const org of orgs) {
  const { data: bestand, error } = await dienst.rpc("exportiere_organisation", {
    p_organisation: org.id,
  });
  if (error) {
    console.log(`   ${org.name}: nicht lesbar – ${error.message}`);
    fehler++;
    continue;
  }

  for (const [tabelle, zeilen] of Object.entries(bestand.daten)) {
    for (const zeile of zeilen) {
      for (const [spalte, wert] of Object.entries(zeile)) {
        if (typeof wert !== "string" || !gehoertZu[wert]) continue;
        geprueft++;
        if (gehoertZu[wert] === org.id) continue;

        // Das Änderungsprotokoll ist die eine erwartete Ausnahme: Greift
        // Arcos als Auftragsbearbeiter in einen Mandanten ein, MUSS das
        // dort festgehalten sein – mit der fremden Person als Urheberin.
        const erwartet = tabelle === "aenderungsprotokoll";
        uebergreifend += erwartet ? 0 : 1;
        console.log(
          `   ${erwartet ? "ok  " : "LECK"} ${org.name} / ${tabelle}.${spalte} → ` +
            `${mailVon[wert]} (${orgName[gehoertZu[wert]]})` +
            (erwartet ? "  – Eingriff von Arcos, gehört so protokolliert" : "")
        );
      }
    }
  }
}

console.log(`\n   ${geprueft} Verweise auf Personen geprüft.`);
if (uebergreifend) {
  console.log(`   >>> ${uebergreifend} zeigen in einen fremden Betrieb.`);
  fehler++;
} else {
  console.log("   >>> Keiner zeigt in einen fremden Betrieb.");
}

console.log(fehler === 0 ? "\nMandantentrennung in Ordnung." : `\n${fehler} Befund(e) – bitte ansehen.`);
process.exit(fehler === 0 ? 0 : 1);
