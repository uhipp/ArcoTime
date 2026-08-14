import { createClient } from "@/lib/supabase/server";
import type { DokumentBereich, Dokument } from "@/lib/types";

// Gemeinsamer Ladehelfer für die Dokumente-Sektion, die identisch auf
// sechs verschiedenen Detailseiten eingebunden wird (Kunde, Projekt,
// Mitarbeitende, Anfrage, Zeiteintrag, Rapport).
export async function ladeDokumente(
  supabase: Awaited<ReturnType<typeof createClient>>,
  bereich: DokumentBereich,
  bezugId: string
) {
  const [{ data: dokumente }, { data: kategorien }] = await Promise.all([
    supabase
      .from("dokumente")
      .select("*, dokument_kategorien(bezeichnung), hochgeladen:profiles!hochgeladen_von(name)")
      .eq("bereich", bereich)
      .eq("bezug_id", bezugId)
      .order("created_at", { ascending: false }),
    supabase.from("dokument_kategorien").select("id, bezeichnung, aktiv").order("sortierung"),
  ]);

  return {
    dokumente: (dokumente as Dokument[] | null) ?? [],
    kategorien: kategorien ?? [],
  };
}
