// Fügt den Namen einer zugewiesenen Person als erste Zeile in eine
// Beschreibung ein – analog zur Zeiterfassung, wo der Name der/des
// Mitarbeitenden ebenfalls in der ersten Zeile steht (Workaround, weil der
// Comatic-Export keine eigene Mitarbeiter-Spalte kennt). Bei Anfragen ist
// zum Zeitpunkt der Erfassung oft noch niemand zugewiesen; sobald das
// nachträglich passiert, muss der Name ergänzt werden, ohne bereits
// vorhandenen Text zu verlieren.
//
// Prüft dafür NICHT nur gegen einen einzelnen "alten" Namen, sondern gegen
// die gesamte Namensliste aller Mitarbeitenden: war die Anfrage zwischen-
// zeitlich unzugewiesen (oder stimmte ein einzelner Vergleichswert aus
// irgendeinem Grund nicht exakt), würde ein Vergleich mit nur einem alten
// Namen den bestehenden Namen in Zeile 1 nicht erkennen und stattdessen
// eine zweite Namenszeile darüber stapeln. Mit der vollen Liste wird jede
// erkennbare Namenszeile ersetzt statt verdoppelt.
export function mitNamePraefix(
  beschreibung: string | null,
  neuerName: string,
  bekannteNamen: string[] = []
): string {
  const text = beschreibung ?? "";
  if (text === "") return `${neuerName}\n`;

  const zeilen = text.split("\n");
  if (zeilen[0] === neuerName) return text; // schon aktuell, nicht doppelt einfügen
  if (bekannteNamen.includes(zeilen[0])) {
    // Erste Zeile ist der Name einer/eines (früheren) Mitarbeitenden –
    // ersetzen statt zu stapeln.
    zeilen[0] = neuerName;
    return zeilen.join("\n");
  }
  // Erste Zeile war freier Text (schon vor der Zuweisung erfasst) – Name
  // davor als neue erste Zeile einfügen, bestehenden Text nicht überschreiben.
  return `${neuerName}\n${text}`;
}
