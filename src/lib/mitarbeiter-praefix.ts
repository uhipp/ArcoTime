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
// Ein <textarea> schickt seinen Inhalt laut HTML-Standard mit CRLF zurück.
// Wer danach an "\n" zerlegt, hat in jeder Zeile einen Wagenrücklauf am
// Ende – und ein Vergleich mit einem Namen schlägt dann immer fehl. Genau
// daran hat sich die Namenszeile bei jedem Speichern erneut gestapelt,
// statt ersetzt zu werden. Deshalb wird hier zuerst vereinheitlicht, und
// der zurückgegebene Text trägt durchgehend "\n".
function nurZeilenumbrueche(text: string): string {
  return text.replace(/\r\n?/g, "\n");
}

export function mitNamePraefix(
  beschreibung: string | null,
  neuerName: string,
  bekannteNamen: string[] = []
): string {
  const text = nurZeilenumbrueche(beschreibung ?? "");
  if (text === "") return `${neuerName}\n`;

  const zeilen = text.split("\n");

  // Aufräumen, was der Fehler oben hinterlassen hat: mehrere Namenszeilen
  // übereinander. Alle bis auf die letzte fallen weg, damit sich ein
  // bestehender Datensatz beim nächsten Speichern von selbst repariert.
  while (
    zeilen.length > 1 &&
    (bekannteNamen.includes(zeilen[0]) || zeilen[0] === neuerName) &&
    (bekannteNamen.includes(zeilen[1]) || zeilen[1] === neuerName)
  ) {
    zeilen.shift();
  }

  if (zeilen[0] === neuerName) return zeilen.join("\n"); // schon aktuell
  if (bekannteNamen.includes(zeilen[0])) {
    // Erste Zeile ist der Name einer/eines (früheren) Mitarbeitenden –
    // ersetzen statt zu stapeln.
    zeilen[0] = neuerName;
    return zeilen.join("\n");
  }
  // Erste Zeile war freier Text (schon vor der Zuweisung erfasst) – Name
  // davor als neue erste Zeile einfügen, bestehenden Text nicht überschreiben.
  return `${neuerName}\n${zeilen.join("\n")}`;
}

// Gegenstück zu mitNamePraefix(): schneidet eine führende Namenszeile weg.
// Nötig überall dort, wo der reine Sachtext gebraucht wird – z.B. wenn beim
// Erledigen "Titel – Beschreibung" zusammengesetzt wird. Ohne das Abschneiden
// landete der Name mitten in dieser Zeile ("Titel – Peter Huber"), und der
// anschliessende Präfix-Aufruf würde ihn ein zweites Mal darübersetzen.
export function ohneNamenszeile(
  beschreibung: string | null,
  bekannteNamen: string[] = []
): string {
  const text = nurZeilenumbrueche(beschreibung ?? "");
  if (text === "") return "";

  // Solange schneiden, wie oben Namenszeilen stehen – auch mehrere.
  const zeilen = text.split("\n");
  while (zeilen.length > 0 && bekannteNamen.includes(zeilen[0])) {
    zeilen.shift();
  }
  return zeilen.join("\n").trimStart();
}
