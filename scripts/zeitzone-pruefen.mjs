#!/usr/bin/env node
// Prüft, dass keine Uhrzeit und kein Kalendertag aus der Serverzeit entsteht.
//
// Aufruf:  node scripts/zeitzone-pruefen.mjs [git-ref]
//
// Hintergrund: Der Server läuft auf UTC, die Betriebe in UTC+1/+2. Am
// 23.08.2026 hat der Timer zwei Stunden zu wenig eingetragen, weil
// `new Date().getHours()` serverseitig die UTC-Stunde liefert. Der Fehler
// ist unsichtbar – nichts schlägt fehl, die Zahl ist nur falsch. Genau
// dafür ist eine Prüfung da.
//
// Ausgenommen sind date-utils.ts selbst – dort steht die Umrechnung – und
// Komponenten mit "use client", weil dort die Zeitzone des Browsers gilt und
// die beim Anwender stimmt. Einzelne Zeilen lassen sich mit dem Kommentar
// `zeitzone-ok: <Grund>` freigeben; der Grund ist Pflicht, damit die Freigabe
// nachvollziehbar bleibt.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { execSync } from "node:child_process";
import { join, relative } from "node:path";

const WURZEL = new URL("..", import.meta.url).pathname;
const QUELLE = join(WURZEL, "src");
const AUSNAHMEN = ["src/lib/date-utils.ts"];

// Was gesucht wird, und was stattdessen zu nehmen ist.
const MUSTER = [
  {
    regex: /\.get(Hours|Minutes)\s*\(/g,
    grund: "liest die Stunde/Minute der Serverzeit",
    statt: "jetztUhrzeit() oder uhrzeitAus() aus date-utils",
  },
  {
    regex: /toISOString\(\)\s*\.\s*slice\(\s*0\s*,\s*10\s*\)/g,
    grund: "liefert den UTC-Kalendertag",
    statt: "heuteIso() oder tagAus() aus date-utils",
  },
  {
    regex: /toISOString\(\)\s*\.\s*split\(\s*"T"\s*\)/g,
    grund: "liefert den UTC-Kalendertag",
    statt: "heuteIso() oder tagAus() aus date-utils",
  },
  {
    regex: /\.slice\(\s*11\s*,\s*16\s*\)/g,
    grund: "schneidet die UTC-Stunde aus einer ISO-Zeichenkette",
    statt: "uhrzeitAus() aus date-utils",
  },
];

function dateien(ordner) {
  const gefunden = [];
  for (const name of readdirSync(ordner)) {
    const pfad = join(ordner, name);
    if (statSync(pfad).isDirectory()) gefunden.push(...dateien(pfad));
    else if (/\.tsx?$/.test(name)) gefunden.push(pfad);
  }
  return gefunden;
}

// Freigabe für die Fälle, die richtig sind, aber wie der Fehler aussehen –
// vor allem der Mittagsanker `${datum}T12:00:00`. Bewusst ein Kommentar und
// keine Heuristik über die Nachbarzeilen: Wer die Zeile freigibt, sagt es,
// und der nächste Leser sieht warum.
//
//   // zeitzone-ok: Mittagsanker, kippt bei keinem Offset
const FREIGABE = /zeitzone-ok:/;

const ref = process.argv[2];
let treffer = 0;
let geprueft = 0;

for (const pfad of dateien(QUELLE)) {
  const rel = relative(WURZEL, pfad);
  if (AUSNAHMEN.includes(rel)) continue;

  let inhalt;
  if (ref) {
    try {
      inhalt = execSync(`git show ${ref}:${rel}`, { cwd: WURZEL, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    } catch {
      continue; // Datei gab es in diesem Stand noch nicht
    }
  } else {
    inhalt = readFileSync(pfad, "utf8");
  }

  const zeilen = inhalt.split("\n");
  // Client-Komponenten laufen im Browser des Anwenders; dort ist die lokale
  // Zeit die richtige.
  if (/^\s*["']use client["']/.test(zeilen[0] ?? "")) continue;
  geprueft++;

  zeilen.forEach((zeile, i) => {
    const vorzeile = zeilen[i - 1] ?? "";
    if (FREIGABE.test(zeile) || FREIGABE.test(vorzeile)) return;
    for (const m of MUSTER) {
      m.regex.lastIndex = 0;
      if (m.regex.test(zeile)) {
        treffer++;
        console.log(`${rel}:${i + 1}  ${m.grund}`);
        console.log(`   ${zeile.trim()}`);
        console.log(`   -> ${m.statt}\n`);
      }
    }
  });
}

console.log(`${geprueft} Serverdateien geprüft, ${treffer} Fundstelle(n).`);
process.exit(treffer > 0 ? 1 : 0);
