// Vergleich für die Sortierung in der Anwendung.
//
// Bewusst nicht in der Datenbank: Ein Teil der Spalten steht nicht am
// Rapport selbst, sondern an Kunde, Projekt oder Person. Die Datenbank
// danach sortieren zu lassen, geht bei eingebetteten Beziehungen nur
// umständlich und stillschweigend fehleranfällig – lieber eine Regel für
// alle Spalten als zwei, von denen eine gelegentlich nichts tut.
//
// Tragbar, weil die Liste eine Organisation umfasst und vollständig
// geladen wird. Sobald es eine Seitenblätterung gibt, muss die Sortierung
// mit in die Abfrage.
export function vergleiche(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0;
  // Leere Werte immer ans Ende, unabhängig von der Richtung – eine Liste,
  // die mit Strichen beginnt, hilft niemandem.
  if (a == null) return 1;
  if (b == null) return -1;

  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), "de-CH", { numeric: true });
}
