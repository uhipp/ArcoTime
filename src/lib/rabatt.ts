// Fallback-Beschriftung, falls für einen Rabattsatz keine eigene
// Bezeichnung in den Einstellungen hinterlegt ist. Die eigentliche Liste
// der angebotenen Sätze ist NICHT mehr fix im Code, sondern kommt aus der
// Tabelle "rabattsaetze" (siehe Einstellungen) – 100% steht weiterhin für
// nicht verrechnete/interne Zeit.
export function rabattLabel(prozent: number) {
  return prozent === 100 ? "100% (nicht verrechnet)" : `${prozent}%`;
}
