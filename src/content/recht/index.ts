import { impressum } from "./impressum";
import { datenschutz } from "./datenschutz";
import { agb } from "./agb";
import { avv } from "./avv";
import type { RechtsDokument } from "./typen";

export type { RechtsDokument };
export { FIRMA } from "./typen";

/** Reihenfolge wie im Fussbereich. */
export const RECHTS_DOKUMENTE: RechtsDokument[] = [impressum, datenschutz, agb, avv];

export function rechtsDokument(slug: string): RechtsDokument | undefined {
  return RECHTS_DOKUMENTE.find((d) => d.slug === slug);
}

/**
 * Fassung der AGB und des AVV, der bei der Registrierung zugestimmt wird.
 * Wird mit der Zustimmung gespeichert, damit später nachvollziehbar bleibt,
 * welchem Text eine Organisation zugestimmt hat.
 */
export const VERTRAGSFASSUNG = `AGB ${agb.version} / AVV ${avv.version} (${agb.stand})`;
