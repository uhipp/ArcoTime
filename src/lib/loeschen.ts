// Auswertung eines Löschversuchs auf Stammdaten.
//
// Zwei Fälle, die vorher beide unsichtbar blieben, weil die Aktionen das
// Ergebnis gar nicht angeschaut haben und immer "gelöscht" meldeten:
//
// 1. Die RLS-Regel verweigert das Löschen (seit 0031 dürfen das nur
//    Admins). Postgres liefert dann KEINEN Fehler, sondern null betroffene
//    Zeilen – nicht zu unterscheiden von "hat geklappt".
// 2. Ein Fremdschlüssel hängt daran, weil bereits Zeiteinträge, Rapporte
//    oder Anfragen darauf verweisen. Das war schon immer der Normalfall,
//    den auch der Bestätigungstext ankündigt ("Geht nur, wenn keine
//    Zeiteinträge vorhanden sind") – gemeldet wurde er trotzdem nie.
//
// Rückgabe: die anzuzeigende Meldung, oder null wenn wirklich gelöscht
// wurde.
export function loeschHinweis(
  geloescht: { id: string }[] | null,
  fehler: { code?: string; message: string } | null,
  bezeichnungEinzahl: string,
  bezeichnungMehrzahl: string
): string | null {
  if (fehler) {
    // 23503 = foreign_key_violation
    if (fehler.code === "23503") {
      return `${bezeichnungEinzahl} kann nicht gelöscht werden: Es hängen bereits Einträge daran. Stattdessen deaktivieren oder die Einträge zuerst umhängen.`;
    }
    return fehler.message;
  }

  if (!geloescht || geloescht.length === 0) {
    return `${bezeichnungEinzahl} wurde nicht gelöscht – dafür fehlen dir die Rechte. ${bezeichnungMehrzahl} löschen darf nur ein Admin.`;
  }

  return null;
}
