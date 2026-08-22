import { ersteSchritte } from "./erste-schritte";
import { zeiterfassung } from "./zeiterfassung";
import { kunden } from "./kunden";
import { projekte } from "./projekte";
import { artikel } from "./artikel";
import { anfragen } from "./anfragen";
import { rapporte } from "./rapporte";
import { disposition } from "./disposition";
import { kalender } from "./kalender";
import { auswertungen } from "./auswertungen";
import { exportArtikel } from "./export";
import { dokumente } from "./dokumente";
import { mitarbeitende } from "./mitarbeitende";
import { einstellungen } from "./einstellungen";
import { abo } from "./abo";
import { benachrichtigungen } from "./benachrichtigungen";
import { plattform } from "./plattform";
import { aenderungen } from "./aenderungen";

export type { HilfeArtikel } from "./typen";

// Reihenfolge bestimmt die Anzeige-Reihenfolge auf der Hilfe-Übersichtsseite
// (innerhalb der jeweiligen Kategorie).
export const ALLE_HILFE_ARTIKEL = [
  ...ersteSchritte,
  ...aenderungen,
  ...zeiterfassung,
  ...anfragen,
  ...rapporte,
  ...disposition,
  ...kalender,
  ...auswertungen,
  ...kunden,
  ...projekte,
  ...artikel,
  ...dokumente,
  ...benachrichtigungen,
  ...mitarbeitende,
  ...einstellungen,
  ...abo,
  ...exportArtikel,
  ...plattform,
];
