import type { HilfeArtikel } from "./typen";

export const aenderungen: HilfeArtikel[] = [
  {
    slug: "aenderungen",
    titel: "Was ist neu",
    kategorie: "Erste Schritte",
    stichworte: ["neuigkeiten", "changelog", "version", "release", "updates"],
    routen: ["/aenderungen"],
    inhalt: `
Auf dieser Seite siehst du alle Neuerungen und Verbesserungen von ArcoTime, neueste Version zuerst.

- **✨ Neu** – eine neue Funktion, die es vorher nicht gab.
- **🔧 Verbessert** – eine bestehende Funktion wurde überarbeitet.
- **🐛 Behoben** – ein Fehler wurde korrigiert.

Es lohnt sich, hier gelegentlich vorbeizuschauen, um keine neue Funktion zu verpassen.
`,
  },
];
