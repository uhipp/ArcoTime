import type { createClient } from "@/lib/supabase/server";

// Öffnet die Anfrage wieder, deren Nachweis gerade gelöscht wird.
//
// Eine Anfrage gilt als erledigt, weil ein Zeiteintrag oder ein Rapport
// daraus entstanden ist. Verschwindet dieser Nachweis, ist die Begründung
// für "erledigt" weg – die Anfrage muss zurück in den Zustand von vor der
// Übergabe. Ohne das steht sie als erledigt da, ohne Zeiteintrag, ohne
// Rapport und ohne Weg zurück: Die Abschlusswege bietet die Oberfläche
// nur bei einer offenen Anfrage an.
//
// Muss VOR dem Löschen aufgerufen werden. Beide Verweise stehen auf
// "on delete set null" (0034/0035) – nach dem Löschen wäre die Zuordnung
// bereits weg und die Anfrage nicht mehr auffindbar.
//
// Der vorherige Status kommt aus status_vor_abschluss, das beim
// Abschliessen gefüllt wurde. Fehlt er (Anfrage von vor dieser
// Änderung), ist "in_bearbeitung" die ehrlichste Annahme: Es wurde
// nachweislich daran gearbeitet, und "neu" wäre eine Behauptung.
export async function oeffneAnfrageWieder(
  supabase: Awaited<ReturnType<typeof createClient>>,
  feld: "rapport_id" | "zeiteintrag_id",
  wertId: string
): Promise<boolean> {
  const { data: anfrage } = await supabase
    .from("anfragen")
    .select("id, status_vor_abschluss")
    .eq(feld, wertId)
    .maybeSingle();

  if (!anfrage) return false;

  await supabase
    .from("anfragen")
    .update({
      status: anfrage.status_vor_abschluss ?? "in_bearbeitung",
      status_vor_abschluss: null,
      erledigt_am: null,
      [feld]: null,
    })
    .eq("id", anfrage.id);

  return true;
}
