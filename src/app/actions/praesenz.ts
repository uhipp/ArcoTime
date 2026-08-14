"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/get-profile";

// Nach dieser Zeit ohne Lebenszeichen gilt eine Anwesenheit als beendet.
// Grosszügiger als der Takt der Meldungen (30 Sekunden), damit ein kurzer
// Aussetzer im Netz niemanden verdrängt – und kurz genug, dass ein
// zugeklappter Laptop den Datensatz nicht lange blockiert.
const VERFALL_SEKUNDEN = 120;

export type Praesenz = {
  andere: { name: string; seit: string }[];
  // Darf ich speichern? Nur die früheste aktive Anwesenheit darf das.
  darfSpeichern: boolean;
};

// Meldet die eigene Anwesenheit und liefert zurück, wer sonst noch am
// selben Datensatz arbeitet – und ob ich speichern darf.
//
// Die Reihenfolge entscheidet: Wer zuerst geöffnet hat, behält das Recht
// zu speichern. Ohne diese Regel sperren sich zwei Personen gegenseitig
// und niemand kommt mehr durch (der Fehler aus 0040).
//
// Beides in einem Aufruf, weil es ohnehin im selben Takt passiert.
export async function meldePraesenz(bereich: string, bezugId: string): Promise<Praesenz> {
  const user = await getCurrentUser();
  if (!user) return { andere: [], darfSpeichern: true };

  const supabase = await createClient();
  const jetzt = new Date();
  const grenze = new Date(jetzt.getTime() - VERFALL_SEKUNDEN * 1000).toISOString();

  // Läuft schon eine eigene, noch gültige Anwesenheit? Dann bleibt ihr
  // Beginn stehen. War sie abgelaufen – Laptop zu, Verbindung weg –, gilt
  // das als neues Öffnen und der Beginn wird zurückgesetzt. Sonst würde
  // ein Eintrag von gestern den Datensatz für immer beanspruchen.
  const { data: eigene } = await supabase
    .from("bearbeitungen")
    .select("begonnen_am, zuletzt_gesehen")
    .eq("bereich", bereich)
    .eq("bezug_id", bezugId)
    .eq("mitarbeiter_id", user.id)
    .maybeSingle();

  const nochGueltig = eigene != null && String(eigene.zuletzt_gesehen) > grenze;

  await supabase.from("bearbeitungen").upsert(
    {
      bereich,
      bezug_id: bezugId,
      mitarbeiter_id: user.id,
      zuletzt_gesehen: jetzt.toISOString(),
      // Nur mitschicken, wenn er neu gesetzt werden soll – ein
      // mitgeschicktes Feld überschreibt beim Upsert den alten Wert.
      ...(nochGueltig ? {} : { begonnen_am: jetzt.toISOString() }),
    },
    { onConflict: "bereich,bezug_id,mitarbeiter_id" }
  );

  const meinBeginn = nochGueltig ? String(eigene!.begonnen_am) : jetzt.toISOString();

  const { data } = await supabase
    .from("bearbeitungen")
    .select("mitarbeiter_id, begonnen_am, profiles!mitarbeiter_id(name)")
    .eq("bereich", bereich)
    .eq("bezug_id", bezugId)
    .neq("mitarbeiter_id", user.id)
    .gt("zuletzt_gesehen", grenze);

  const andere = ((data ?? []) as {
    mitarbeiter_id: string;
    begonnen_am: string;
    profiles: unknown;
  }[]).map((z) => {
    const p = Array.isArray(z.profiles) ? z.profiles[0] : z.profiles;
    return {
      id: z.mitarbeiter_id,
      name: (p as { name?: string } | null)?.name ?? "Jemand",
      seit: String(z.begonnen_am),
    };
  });

  // Wer früher da war, hat Vorrang. Bei exakt gleicher Zeit entscheidet
  // die Kennung – irgendetwas muss entscheiden, und Hauptsache es ist auf
  // beiden Seiten dasselbe Ergebnis.
  const frueher = andere.some(
    (a) => a.seit < meinBeginn || (a.seit === meinBeginn && a.id < user.id)
  );

  return {
    andere: andere
      .map(({ name, seit }) => ({ name, seit }))
      .sort((a, b) => a.name.localeCompare(b.name, "de-CH")),
    darfSpeichern: !frueher,
  };
}

// Beim Verlassen der Seite aufräumen. Bewusst "so gut es geht": Der
// Browser garantiert keinen Aufruf beim Schliessen oder Zuklappen – genau
// deshalb läuft eine Anwesenheit ohnehin von selbst ab. Das hier
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
