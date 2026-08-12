import releasesJson from "@/content/releases.json";

export type ReleaseEintragTyp = "neu" | "verbessert" | "fix";

export type ReleaseEintrag = {
  typ: ReleaseEintragTyp;
  text: string;
};

export type Release = {
  version: string;
  datum: string;
  titel: string;
  eintraege: ReleaseEintrag[];
};

// Neueste Version zuerst – so wird releases.json gepflegt (neuen Eintrag
// oben anfügen), daher hier keine zusätzliche Sortierung nötig.
export function alleReleases(): Release[] {
  return releasesJson as Release[];
}

export const RELEASE_TYP_LABEL: Record<ReleaseEintragTyp, string> = {
  neu: "✨ Neu",
  verbessert: "🔧 Verbessert",
  fix: "🐛 Behoben",
};
