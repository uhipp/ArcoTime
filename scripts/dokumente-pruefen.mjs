/**
 * Dateien und Zeilen im Bereich Dokumente gegeneinander prüfen.
 *
 * Zu jeder Datei im Speicher gehört eine Zeile in "dokumente", die sagt, wem
 * sie gehört, wo sie hängt und wer sie hochgeladen hat. Fehlt die Zeile, ist
 * die Datei verwaist: Niemand sieht sie mehr in der Anwendung, niemand kann
 * sie zuordnen – aber sie liegt da, mitsamt Inhalt.
 *
 * Genau das ist bei jeder Mandantenlöschung vor dem 18.08.2026 passiert: Die
 * Löschung räumte die Datenbank auf und liess die Dateien liegen. Dieses
 * Skript findet die Rückstände und räumt sie auf Wunsch weg. Es ist zugleich
 * die laufende Kontrolle für den umgekehrten Fall – eine Zeile, zu der es
 * keine Datei gibt (abgebrochener Upload).
 *
 * Aufruf:
 *   node --env-file=.env.local scripts/dokumente-pruefen.mjs
 *   node --env-file=.env.local scripts/dokumente-pruefen.mjs --verwaiste-entfernen
 *
 * Ohne Flag wird nur gezeigt. Verwaiste Dateien lassen sich nicht
 * wiederherstellen, deshalb steht das Entfernen hinter einem zweiten Schritt.
 */
import { createClient } from "@supabase/supabase-js";

const entfernen = process.argv.includes("--verwaiste-entfernen");

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Der Speicher kennt keine echten Ordner, nur Pfade mit Schrägstrichen –
// list() zeigt deshalb je Ebene die "Ordner" (Einträge ohne id) und die
// Dateien. Die Pfade der Dokumente haben genau drei Teile:
// bereich/bezug_id/dokument-id-dateiname (siehe bereiteDokumentUploadVor).
async function listeAlles(eimer, prefix = "", tiefe = 0) {
  const gefunden = [];
  let offset = 0;

  for (;;) {
    const { data, error } = await db.storage
      .from(eimer)
      .list(prefix, { limit: 1000, offset });

    if (error) {
      throw new Error(`${eimer}/${prefix}: ${error.message}`);
    }
    if (!data || data.length === 0) break;

    for (const eintrag of data) {
      const pfad = prefix ? `${prefix}/${eintrag.name}` : eintrag.name;
      if (eintrag.id === null) {
        // Ein "Ordner". Die Begrenzung der Tiefe ist eine Bremse gegen einen
        // Pfad, der sich unerwartet verzweigt – sie soll nie greifen.
        if (tiefe < 4) gefunden.push(...(await listeAlles(eimer, pfad, tiefe + 1)));
      } else {
        gefunden.push({ pfad, groesse: eintrag.metadata?.size ?? null });
      }
    }

    if (data.length < 1000) break;
    offset += data.length;
  }

  return gefunden;
}

// ---------------------------------------------------------------------
// Dokumente
// ---------------------------------------------------------------------
const { data: zeilen, error: ze } = await db
  .from("dokumente")
  .select(
    "id, organisation_id, bereich, bezug_id, speicherpfad, dateiname, groesse_bytes, created_at"
  );

if (ze) {
  console.error("Zeilen liessen sich nicht lesen:", ze.message);
  process.exit(1);
}

const { data: organisationen } = await db.from("organisationen").select("id, name, logo_pfad");
const nameVon = new Map((organisationen ?? []).map((o) => [o.id, o.name]));

let dateien;
try {
  dateien = await listeAlles("dokumente");
} catch (fehler) {
  // Eine Prüfung, die still nur die Hälfte anschaut, ist schlimmer als keine.
  console.error("Speicher liess sich nicht auflisten:", fehler.message);
  console.error("Abbruch: Ohne vollständige Liste ist jede Aussage hier wertlos.");
  process.exit(1);
}

const pfadeInDb = new Set(
  zeilen.filter((z) => z.speicherpfad !== "pending").map((z) => z.speicherpfad)
);
const pfadeImSpeicher = new Set(dateien.map((d) => d.pfad));

const verwaist = dateien.filter((d) => !pfadeInDb.has(d.pfad));
const ohneDatei = zeilen.filter(
  (z) => z.speicherpfad !== "pending" && !pfadeImSpeicher.has(z.speicherpfad)
);
const offeneUploads = zeilen.filter((z) => z.speicherpfad === "pending");

// Kleine Dateien in Megabyte anzuzeigen ("0.0 MB") sagt nichts – dann liest
// man über einen 16-KB-Rückstand hinweg, den es genauso wegzuräumen gilt.
const mb = (bytes) => {
  const b = Number(bytes ?? 0);
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${Math.round(b / 1024)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
};

console.log("Bereich Dokumente");
console.log(`  Zeilen in der Datenbank   ${zeilen.length}`);
console.log(`  Dateien im Speicher       ${dateien.length} (${mb(
  dateien.reduce((s, d) => s + Number(d.groesse ?? 0), 0)
)})`);

console.log("\nJe Organisation:");
const jeOrg = new Map();
for (const z of zeilen) {
  const eintrag = jeOrg.get(z.organisation_id) ?? { anzahl: 0, bytes: 0 };
  eintrag.anzahl += 1;
  eintrag.bytes += Number(z.groesse_bytes ?? 0);
  jeOrg.set(z.organisation_id, eintrag);
}
if (jeOrg.size === 0) console.log("  keine");
for (const [orgId, e] of [...jeOrg.entries()].sort()) {
  const name = nameVon.get(orgId) ?? "GELÖSCHTE ORGANISATION";
  console.log(`  ${name.padEnd(28)} ${String(e.anzahl).padStart(4)} Dateien  ${mb(e.bytes)}`);
}

console.log(
  `\nVerwaiste Dateien (Datei ohne Zeile): ${verwaist.length}` +
    `${verwaist.length ? ` (${mb(verwaist.reduce((s, d) => s + Number(d.groesse ?? 0), 0))})` : ""}`
);
for (const d of verwaist.slice(0, 40)) {
  console.log(`  ${d.pfad}  ${mb(d.groesse)}`);
}
if (verwaist.length > 40) console.log(`  … und ${verwaist.length - 40} weitere`);

console.log(`\nZeilen ohne Datei: ${ohneDatei.length}`);
for (const z of ohneDatei.slice(0, 40)) {
  console.log(`  ${nameVon.get(z.organisation_id) ?? "?"} · ${z.dateiname} · ${z.speicherpfad}`);
}
if (ohneDatei.length > 40) console.log(`  … und ${ohneDatei.length - 40} weitere`);

console.log(`\nAbgebrochene Uploads (Speicherpfad "pending"): ${offeneUploads.length}`);

// Dateien an einer Zeile, die es nicht mehr gibt. bezug_id trägt keinen
// Fremdschlüssel – die Ablage ist polymorph –, also nimmt das Löschen einer
// Anfrage oder eines Rapports ihre Dokumente nicht mit. In der Anwendung
// sieht sie danach niemand mehr; im Export landen sie unter "Ohne Zuordnung",
// und beim Löschen des Mandanten gehen sie mit.
const TABELLE_ZU_BEREICH = {
  kunde: "kunden",
  projekt: "projekte",
  mitarbeitende: "profiles",
  anfrage: "anfragen",
  zeiteintrag: "zeiteintraege",
  rapport: "rapporte",
};

const ohneBezug = [];
for (const [bereich, tabelle] of Object.entries(TABELLE_ZU_BEREICH)) {
  const ids = [
    ...new Set(zeilen.filter((z) => z.bereich === bereich).map((z) => z.bezug_id)),
  ];
  if (ids.length === 0) continue;
  const { data: vorhanden, error } = await db.from(tabelle).select("id").in("id", ids);
  if (error) {
    console.error(`Bezug in ${tabelle} nicht prüfbar:`, error.message);
    process.exit(1);
  }
  const bekannt = new Set((vorhanden ?? []).map((v) => v.id));
  ohneBezug.push(
    ...zeilen.filter((z) => z.bereich === bereich && !bekannt.has(z.bezug_id))
  );
}

// Ein Bereich, den dieses Skript nicht kennt, wäre eine stille Lücke – lieber
// laut, bevor jemand die Ausgabe für vollständig hält.
const unbekannteBereiche = [
  ...new Set(zeilen.map((z) => z.bereich).filter((b) => !(b in TABELLE_ZU_BEREICH))),
];
if (unbekannteBereiche.length > 0) {
  console.error(`\nUnbekannte Bereiche: ${unbekannteBereiche.join(", ")}`);
  console.error("Abbruch: Dieses Skript kennt sie nicht und würde zu wenig prüfen.");
  process.exit(1);
}

console.log(`\nDateien ohne Bezug (Anfrage/Rapport/… gelöscht): ${ohneBezug.length}`);
for (const z of ohneBezug.slice(0, 20)) {
  console.log(`  ${nameVon.get(z.organisation_id) ?? "?"} · ${z.bereich} · ${z.dateiname}`);
}

// ---------------------------------------------------------------------
// Logos
// ---------------------------------------------------------------------
let logoDateien = [];
try {
  logoDateien = await listeAlles("logos");
} catch (fehler) {
  console.error("\nLogo-Eimer liess sich nicht auflisten:", fehler.message);
  process.exit(1);
}

const gueltigeLogos = new Set(
  (organisationen ?? []).filter((o) => o.logo_pfad).map((o) => o.logo_pfad)
);
const verwaisteLogos = logoDateien.filter((d) => !gueltigeLogos.has(d.pfad));

console.log(`\nLogos: ${logoDateien.length} Dateien, davon ${verwaisteLogos.length} verwaist`);
for (const d of verwaisteLogos.slice(0, 20)) {
  const orgId = d.pfad.split("/")[0];
  console.log(`  ${d.pfad}  (${nameVon.get(orgId) ?? "GELÖSCHTE ORGANISATION"})`);
}

// ---------------------------------------------------------------------
// Aufräumen
// ---------------------------------------------------------------------
if (!entfernen) {
  if (verwaist.length + verwaisteLogos.length > 0) {
    console.log(
      "\nProbelauf – es wurde nichts entfernt." +
        "\nMit --verwaiste-entfernen werden die verwaisten Dateien gelöscht."
    );
  } else {
    console.log("\nNichts aufzuräumen.");
  }
  process.exit(0);
}

console.log("\nEntferne verwaiste Dateien …");
for (const [eimer, liste] of [
  ["dokumente", verwaist],
  ["logos", verwaisteLogos],
]) {
  for (let i = 0; i < liste.length; i += 100) {
    const block = liste.slice(i, i + 100).map((d) => d.pfad);
    const { data, error } = await db.storage.from(eimer).remove(block);
    if (error) {
      console.error(`  ${eimer}: FEHLER ${error.message}`);
      process.exit(1);
    }
    console.log(`  ${eimer}: ${data?.length ?? 0} Datei(en) entfernt`);
  }
}
console.log("Fertig.");
