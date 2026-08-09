// Fügt den Namen einer zugewiesenen Person als erste Zeile in eine
// Beschreibung ein – analog zur Zeiterfassung, wo der Name der/des
// Mitarbeitenden ebenfalls in der ersten Zeile steht (Workaround, weil der
// Comatic-Export keine eigene Mitarbeiter-Spalte kennt). Bei Anfragen ist
// zum Zeitpunkt der Erfassung oft noch niemand zugewiesen; sobald das
// nachträglich passiert, muss der Name ergänzt werden, ohne bereits
// vorhandenen Text zu verlieren.
export function mitNamePraefix(
  beschreibung: string | null,
  neuerName: string,
  alterName?: string | null
): string {
  const text = beschreibung ?? "";
  if (text === "") return `${neuerName}\n`;

  const zeilen = text.split("\n");
  if (zeilen[0] === neuerName) return text; // schon aktuell, nicht doppelt einfügen
  if (alterName && zeilen[0] === alterName) {
    // Umzuweisung: alten Namen in der ersten Zeile ersetzen statt zu stapeln.
    zeilen[0] = neuerName;
    return zeilen.join("\n");
  }
  // Erste Zeile war freier Text (schon vor der Zuweisung erfasst) – Name
  // davor als neue erste Zeile einfügen, bestehenden Text nicht überschreiben.
  return `${neuerName}\n${text}`;
}
