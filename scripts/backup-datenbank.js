// Einfaches DIY-Backup, solange das Projekt auf dem Supabase-Free-Plan
// läuft (kein automatisches Backup seitens Supabase). Exportiert alle
// Tabellen als JSON plus die tatsächlichen Dateien aus dem
// "dokumente"-Storage-Bucket, jeweils in einen Ordner mit Zeitstempel.
//
// Aufruf (Supabase-Zugangsdaten kommen aus .env.local, Node 20.6+ kann
// das direkt einlesen, ganz ohne zusätzliches Package):
//   node --env-file=.env.local scripts/backup-datenbank.js
// oder kurz: npm run backup
//
// Ziel-Ordner: standardmässig ./backups (lokal, per .gitignore nie im
// Git-Repo). Für eine zusätzliche Cloud-Kopie z.B. auf OneDrive:
//   BACKUP_ZIEL="/Pfad/zu/OneDrive/ArcoTime-Backups" npm run backup
// (siehe README-Hinweis im Chat für den genauen Pfad).
//
// Deckt NICHT ab: Supabase-Auth-Konten (auth.users, inkl. Logins/
// Passwörter) – das schützt allein schon die Sicherheit des eigenen
// Supabase-Kontos (2FA empfohlen). Dieses Skript sichert die
// Geschäftsdaten in den eigenen Tabellen.

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

const TABELLEN = [
  "organisationen",
  "profiles",
  "kunden",
  "projekte",
  "projekt_mitarbeiter",
  "dienstleistungsklassen",
  "mwst_codes",
  "dienstleistungen",
  "zeiteintraege",
  "belege_exporte",
  "anfragen",
  "rabattsaetze",
  "anfrage_kanaele",
  "anfrage_prioritaeten",
  "dokument_kategorien",
  "dokumente",
];

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    console.error(
      "NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY fehlen.\n" +
        "Bitte so ausführen: node --env-file=.env.local scripts/backup-datenbank.js"
    );
    process.exit(1);
  }

  const supabase = createClient(url, serviceRoleKey);

  const zeitstempel = new Date().toISOString().replace(/[:.]/g, "-");
  const zielOrdner =
    process.env.BACKUP_ZIEL
      ? path.join(process.env.BACKUP_ZIEL, zeitstempel)
      : path.join(process.cwd(), "backups", zeitstempel);

  fs.mkdirSync(zielOrdner, { recursive: true });
  console.log(`Sichere nach: ${zielOrdner}\n`);

  for (const tabelle of TABELLEN) {
    const { data, error } = await supabase.from(tabelle).select("*");
    if (error) {
      console.error(`  ${tabelle}: FEHLER – ${error.message}`);
      continue;
    }
    fs.writeFileSync(
      path.join(zielOrdner, `${tabelle}.json`),
      JSON.stringify(data, null, 2)
    );
    console.log(`  ${tabelle}: ${data.length} Zeilen`);
  }

  // Tatsächliche Dateien aus dem Storage-Bucket "dokumente" mitsichern,
  // nicht nur die Datenbank-Zeilen dazu.
  const { data: dokumente } = await supabase
    .from("dokumente")
    .select("id, speicherpfad, dateiname");

  if (dokumente && dokumente.length > 0) {
    const dateiOrdner = path.join(zielOrdner, "dokumente-dateien");
    fs.mkdirSync(dateiOrdner, { recursive: true });
    console.log(`\nSichere ${dokumente.length} Dokument(e) aus dem Storage-Bucket...`);

    for (const dokument of dokumente) {
      const { data: datei, error } = await supabase.storage
        .from("dokumente")
        .download(dokument.speicherpfad);

      if (error || !datei) {
        console.error(`  ${dokument.speicherpfad}: FEHLER – ${error?.message}`);
        continue;
      }

      const buffer = Buffer.from(await datei.arrayBuffer());
      fs.writeFileSync(
        path.join(dateiOrdner, `${dokument.id}-${dokument.dateiname}`),
        buffer
      );
    }
  }

  console.log(`\nFertig. Backup liegt in: ${zielOrdner}`);
}

main().catch((err) => {
  console.error("Unerwarteter Fehler:", err);
  process.exit(1);
});
