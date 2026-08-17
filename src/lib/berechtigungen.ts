import type { Rolle } from "@/lib/types";

// Wer darf was – an genau einer Stelle.
//
// Heute ist jedes Recht hier eine Adminsache, und die Funktion tut nicht
// mehr, als die Rolle zu prüfen. Der Wert liegt nicht darin, WAS sie tut,
// sondern darin, dass es eine einzige Stelle gibt: Als die Rechte über
// zwanzig Dateien verteilt als `role === "admin"` standen, hätte ein
// konfigurierbares Berechtigungssystem zwanzig Umbauten bedeutet – und
// jeder davon wäre eine Gelegenheit gewesen, ein Loch zu hinterlassen.
//
// Die Datenbank hat diese Naht mit is_admin() längst; die Anwendung
// hatte sie nicht.
//
// WICHTIG: Diese Funktion ist die Naht für die Oberfläche, nicht die
// Sicherheitsgrenze. Die liegt in den RLS-Regeln der Datenbank. Was hier
// ausgeblendet wird, ist bequem; was dort verboten ist, ist verboten.
// Ein Recht ohne Entsprechung in der Datenbank ist ein Loch.
export type Recht =
  // Löschen von Stammdaten. Erfassen und Bearbeiten darf jede und jeder
  // im Betrieb – die Regel aus 0031.
  | "kunden.loeschen"
  | "projekte.loeschen"
  | "dienstleistungen.loeschen"
  | "anfragen.loeschen"
  | "dokumente.loeschen"
  // Fremde Rapporte abschliessen. Der Regelfall ist die verantwortliche
  // Person; der Admin ist der Ausweg, wenn sie krank ist (0047).
  | "rapporte.abschliessen.fremde"
  // Bereiche, die dem Betrieb als Ganzem gehören.
  | "mitarbeitende.verwalten"
  | "einstellungen.verwalten"
  | "datenpflege.verwalten"
  | "protokoll.lesen"
  // Abonnement, Rechnungen und Kündigung. Eigenes Recht und nicht unter
  // einstellungen.verwalten: Das hier ist der Vertrag mit Arcos, nicht die
  // Konfiguration des Betriebs – wer Auswahllisten pflegt, muss nicht
  // kündigen dürfen.
  | "abo.verwalten"
  | "export.ausfuehren"
  // Auswertungen und Kalender über alle Personen statt nur die eigenen.
  | "auswertungen.alle"
  | "kalender.alle";

type MitRolle = { role: Rolle } | null | undefined;

export function darf(profil: MitRolle, recht: Recht): boolean {
  // Das Recht wird heute nicht ausgewertet – es steht im Aufruf, damit
  // dieser schon jetzt sagt, WORUM es geht. Wenn die Rechte später aus
  // einer Tabelle kommen, ändert sich diese Funktion und sonst nichts.
  void recht;
  return profil?.role === "admin";
}
