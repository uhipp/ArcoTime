// Feste, kleine Farbauswahl für Auswahllisten mit optischer Kennzeichnung
// (z.B. Anfrage-Prioritäten). Bewusst als begrenzte Liste von echten
// Tailwind-Klassen statt freiem Text: Tailwind generiert CSS nur für
// Klassen, die als Literal im Quellcode vorkommen – hier in diesem Array
// UND im <option value="…">. Freier Text würde beim Rendern einfach
// wirkungslos bleiben.
export const FARBEN_OPTIONEN = [
  { wert: "bg-gray-300", label: "Grau" },
  { wert: "bg-blue-300", label: "Blau" },
  { wert: "bg-amber-400", label: "Gelb" },
  { wert: "bg-red-500", label: "Rot" },
  { wert: "bg-green-500", label: "Grün" },
  { wert: "bg-purple-400", label: "Violett" },
] as const;
