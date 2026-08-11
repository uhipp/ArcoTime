export type HilfeArtikel = {
  /** Eindeutiger Bezeichner, wird als URL-Segment genutzt (/hilfe/[slug]). */
  slug: string;
  titel: string;
  kategorie: string;
  /** Zusätzliche Suchbegriffe, die nicht wörtlich im Titel/Inhalt stehen. */
  stichworte: string[];
  /**
   * App-Routen, für die dieser Artikel der passende Kontext-Hilfe-Artikel
   * ist (Präfix-Vergleich – "/anfragen" matcht auch "/anfragen/neu" und
   * "/anfragen/<id>"). Leer = kein eigener Seitenkontext (z.B. Artikel, die
   * mehrere Module übergreifend erklären).
   */
  routen: string[];
  /** Markdown-Inhalt. Bilder als ![Alt](/hilfe-bilder/dateiname.png). */
  inhalt: string;
};
