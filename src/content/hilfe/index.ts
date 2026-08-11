import { ersteSchritte } from "./erste-schritte";
import { zeiterfassung } from "./zeiterfassung";
import { kunden } from "./kunden";
import { projekte } from "./projekte";
import { dienstleistungen } from "./dienstleistungen";
import { anfragen } from "./anfragen";
import { kalender } from "./kalender";
import { auswertungen } from "./auswertungen";
import { exportArtikel } from "./export";
import { dokumente } from "./dokumente";
import { mitarbeitende } from "./mitarbeitende";
import { einstellungen } from "./einstellungen";
import { benachrichtigungen } from "./benachrichtigungen";
import { plattform } from "./plattform";

export type { HilfeArtikel } from "./typen";

// Reihenfolge bestimmt die Anzeige-Reihenfolge auf der Hilfe-Übersichtsseite
// (innerhalb der jeweiligen Kategorie).
export const ALLE_HILFE_ARTIKEL = [
  ...ersteSchritte,
  ...zeiterfassung,
  ...anfragen,
  ...kalender,
  ...auswertungen,
  ...kunden,
  ...projekte,
  ...dienstleistungen,
  ...dokumente,
  ...benachrichtigungen,
  ...mitarbeitende,
  ...einstellungen,
  ...exportArtikel,
  ...plattform,
];
