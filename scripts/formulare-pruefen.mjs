#!/usr/bin/env node
//
// Sucht verschachtelte HTML-Formulare in den JSX-Dateien.
//
// Aufruf:
//   node scripts/formulare-pruefen.mjs
//
// Warum es das braucht: Verschachtelte <form> sind in HTML verboten, und der
// Browser meldet es nicht – der Parser wirft das innere Formular einfach weg.
// Der Knopf darin gehoert danach zum aeusseren Formular und tut etwas
// anderes als beschriftet. Am 22.08.2026 hat das zwei Fehler erzeugt, die
// beide gleich aussahen: "Wenn ich auf Person entfernen klicke passiert
// nichts" (der Knopf speicherte die Person) und eine Spaltenwahl, die
// filterte statt zu speichern. Kein Typfehler, keine Lint-Regel, keine
// Fehlermeldung im Log – nur ein Knopf, der schweigt.
//
// Die Liste der Komponenten, die selbst ein Formular mitbringen, wird NICHT
// von Hand gepflegt, sondern aus dem Code gelesen: Wer morgen eine neue
// Komponente mit <form> schreibt, ist sofort dabei.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

function alleDateien(verzeichnis, endung = ".tsx") {
  const gefunden = [];
  for (const eintrag of readdirSync(verzeichnis, { withFileTypes: true })) {
    const pfad = join(verzeichnis, eintrag.name);
    if (eintrag.isDirectory()) gefunden.push(...alleDateien(pfad, endung));
    else if (eintrag.name.endsWith(endung)) gefunden.push(pfad);
  }
  return gefunden;
}

// Kommentare weg, sonst zaehlt ein <form> im erklaerenden Text mit. Genau
// dieser Fehltreffer ist beim ersten Lauf passiert.
function ohneKommentare(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .map((z) => z.replace(/\/\/.*$/, ""))
    .join("\n");
}

const dateien = alleDateien("src");

// 1) Welche Datei bringt ein <form> mit?
const mitFormular = new Set();
for (const pfad of dateien) {
  if (/<form\b/.test(ohneKommentare(readFileSync(pfad, "utf8")))) mitFormular.add(pfad);
}

// 2) Welcher importierte Name kommt aus so einer Datei? Der Modulpfad
//    "@/components/delete-button" zeigt auf src/components/delete-button.tsx.
function dateiZuModul(modul) {
  if (!modul.startsWith("@/")) return null;
  const kandidat = `src/${modul.slice(2)}.tsx`;
  return mitFormular.has(kandidat) ? kandidat : null;
}

const treffer = [];
for (const pfad of dateien) {
  const text = ohneKommentare(readFileSync(pfad, "utf8"));

  // Importierte Komponenten, deren Datei ein Formular enthaelt.
  const verdaechtig = new Set();
  for (const m of text.matchAll(/import\s*\{([^}]*)\}\s*from\s*["']([^"']+)["']/g)) {
    if (!dateiZuModul(m[2])) continue;
    for (const name of m[1].split(",")) {
      const sauber = name.replace(/\s+as\s+\S+/, "").trim();
      if (/^[A-Z]/.test(sauber)) verdaechtig.add(sauber);
    }
  }
  if (verdaechtig.size === 0) continue;

  let tiefe = 0;
  let seit = 0;
  for (const [i, zeile] of text.split("\n").entries()) {
    const nr = i + 1;
    for (const name of verdaechtig) {
      if (new RegExp(`<${name}\\b`).test(zeile) && tiefe > 0) {
        treffer.push({ pfad, nr, name, seit });
      }
    }
    const offen = (zeile.match(/<form\b/g) ?? []).length;
    const zu = (zeile.match(/<\/form>/g) ?? []).length;
    if (offen > 0 && tiefe === 0) seit = nr;
    tiefe = Math.max(0, tiefe + offen - zu);
  }
}

console.log(
  `${dateien.length} JSX-Dateien geprüft, ${mitFormular.size} bringen ein <form> mit.`
);

if (treffer.length === 0) {
  console.log("Keine verschachtelten Formulare.");
  process.exit(0);
}

console.log(`\n${treffer.length} verschachtelte(s) Formular(e):`);
for (const t of treffer) {
  console.log(`  ${t.pfad}:${t.nr}  <${t.name}> steht im <form> ab Zeile ${t.seit}`);
}
console.log(
  "\nDer Browser wirft das innere Formular weg. Die Komponente muss neben das\n" +
    "äussere Formular, nicht hinein."
);
process.exit(1);
