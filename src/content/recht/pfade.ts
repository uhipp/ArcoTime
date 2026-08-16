/**
 * Nur die Pfade – bewusst ohne die Dokumente selbst, damit die Middleware
 * nicht bei jedem Aufruf die vollständigen Rechtstexte lädt.
 *
 * Kommt ein Dokument dazu, gehört sein Pfad hierher. Sonst landet es hinter
 * dem Login, und das fällt niemandem auf, der ohnehin angemeldet ist.
 */
export const RECHTS_PFADE = ["/impressum", "/datenschutz", "/agb", "/avv"] as const;
