import { marked } from "marked";
import { ALLE_HILFE_ARTIKEL, type HilfeArtikel } from "@/content/hilfe";

export function renderHilfeMarkdown(markdown: string): string {
  return marked.parse(markdown, { async: false }) as string;
}

/** Kurzer Klartext-Auszug für Vorschau-Karten (erster Absatz, Markdown-Zeichen entfernt). */
export function hilfeVorschau(markdown: string, maxLaenge = 150): string {
  const ersterAbsatz = markdown
    .trim()
    .split(/\n\s*\n/)
    .find((abschnitt) => !abschnitt.trim().startsWith("#")) ?? "";

  const klartext = ersterAbsatz
    .replace(/[#*_`]/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();

  return klartext.length > maxLaenge ? `${klartext.slice(0, maxLaenge).trimEnd()}…` : klartext;
}

export function alleHilfeArtikel(): HilfeArtikel[] {
  return ALLE_HILFE_ARTIKEL;
}

export function hilfeArtikelNachSlug(slug: string): HilfeArtikel | undefined {
  return ALLE_HILFE_ARTIKEL.find((a) => a.slug === slug);
}

// Präfix-Vergleich: "/anfragen" matcht auch "/anfragen/neu" und
// "/anfragen/<id>". Bei mehreren Treffern gewinnt die längste (spezifischste)
// Route – kommt aktuell nicht vor, macht die Funktion aber robust für
// spätere, feinere Unterseiten-Artikel.
export function hilfeSlugFuerRoute(pathname: string): string | null {
  let bester: { slug: string; laenge: number } | null = null;

  for (const artikel of ALLE_HILFE_ARTIKEL) {
    for (const route of artikel.routen) {
      const treffer = route === "/" ? pathname === "/" : pathname.startsWith(route);
      if (treffer && (!bester || route.length > bester.laenge)) {
        bester = { slug: artikel.slug, laenge: route.length };
      }
    }
  }

  return bester?.slug ?? null;
}

function normalisiere(text: string) {
  return text.toLowerCase();
}

export function hilfeSuchkorpus(artikel: HilfeArtikel): string {
  return normalisiere([artikel.titel, artikel.kategorie, ...artikel.stichworte, artikel.inhalt].join(" "));
}

/** Einfache Stichwortsuche über Titel, Kategorie, Stichworte und Inhalt. */
export function sucheHilfeArtikel(begriff: string): HilfeArtikel[] {
  const suchbegriff = normalisiere(begriff.trim());
  if (!suchbegriff) return ALLE_HILFE_ARTIKEL;

  return ALLE_HILFE_ARTIKEL.filter((artikel) => {
    const heuhaufen = normalisiere(
      [artikel.titel, artikel.kategorie, ...artikel.stichworte, artikel.inhalt].join(" ")
    );
    return heuhaufen.includes(suchbegriff);
  });
}
