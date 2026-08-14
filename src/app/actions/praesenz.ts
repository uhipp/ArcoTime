"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/get-profile";

// Nach dieser Zeit ohne Lebenszeichen gilt eine Anwesenheit als beendet.
// Grosszügiger als der Takt der Meldungen (30 Sekunden), damit ein
// kurzer Aussetzer im Netz niemanden vorzeitig verdrängt – und kurz
// genug, dass ein zugeklappter Laptop den Datensatz nicht lange blockiert.
const VERFALL_SEKUNDEN = 120;

export type Anwesende = { name: string; seit: string }[];

// Meldet die eigene Anwesenheit an einem Datensatz und liefert zurück,
// wer sonst noch daran arbeitet.
//
// Beides in einem Aufruf, weil es ohnehin im selben Takt passiert – ein
// zweiter Aufruf nur zum Nachsehen wäre doppelte Last ohne Gewinn.
export async function meldePraesenz(
  bereich: string,
  bezugId: string
): Promise<Anwesende> {
  const user = await getCurrentUser();
  if (!user) return [];

  const supabase = await createClient();

  await supabase
    .from("bearbeitungen")
    .upsert(
      {
        bereich,
        bezug_id: bezugId,
        mitarbeiter_id: user.id,
        zuletzt_gesehen: new Date().toISOString(),
      },
      { onConflict: "bereich,bezug_id,mitarbeiter_id" }
    );

  const grenze = new Date(Date.now() - VERFALL_SEKUNDEN * 1000).toISOString();

  const { data } = await supabase
    .from("bearbeitungen")
    .select("zuletzt_gesehen, profiles!mitarbeiter_id(name)")
    .eq("bereich", bereich)
    .eq("bezug_id", bezugId)
    .neq("mitarbeiter_id", user.id)
    .gt("zuletzt_gesehen", grenze);

  return ((data ?? []) as { zuletzt_gesehen: string; profiles: unknown }[])
    .map((z) => {
      const p = Array.isArray(z.profiles) ? z.profiles[0] : z.profiles;
      return { name: (p as { name?: string } | null)?.name ?? "Jemand", seit: z.zuletzt_gesehen };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "de-CH"));
}

// Beim Verlassen der Seite aufräumen. Bewusst "so gut es geht": Der
// Browser garantiert keinen Aufruf beim Schliessen oder Zuklappen –
// genau deshalb läuft eine Anwesenheit ohnehin von selbst ab. Das hier
// beschleunigt nur den Normalfall.
export async function beendePraesenz(bereich: string, bezugId: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  const supabase = await createClient();
  await supabase
    .from("bearbeitungen")
    .delete()
    .eq("bereich", bereich)
    .eq("bezug_id", bezugId)
    .eq("mitarbeiter_id", user.id);

  // Gelegenheit zum Aufräumen: abgelaufene Einträge anderer, die niemand
  // sonst löschen kann (RLS erlaubt nur den eigenen).
  await supabase.rpc("raeume_bearbeitungen");
}
