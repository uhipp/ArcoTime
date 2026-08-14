"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type SpaltenErgebnis = { fehler: string } | { gespeichert: true } | null;

// Speichert, welche Spalten eine Person in einer Liste sehen will.
//
// Die Aktion gibt ein Ergebnis zurück, statt weiterzuleiten: Die Liste
// steht oft mit Suchbegriff, Filter und Sortierung in der Adresse, und
// die soll eine Spaltenauswahl nicht verwerfen. revalidatePath lädt
// dieselbe Ansicht mit den neuen Spalten neu.
export async function speichereSpaltenwahl(
  liste: string,
  pfad: string,
  _bisher: SpaltenErgebnis,
  formData: FormData
): Promise<SpaltenErgebnis> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { fehler: "Nicht angemeldet." };

  // „Zurücksetzen" löscht die Zeile, statt die Standardspalten
  // hineinzuschreiben. Damit folgt die Ansicht künftigen Änderungen am
  // Standard weiter – eine eingefrorene Kopie täte das nicht.
  if (String(formData.get("absicht") ?? "") === "zuruecksetzen") {
    const { error } = await supabase
      .from("spaltenwahl")
      .delete()
      .eq("user_id", user.id)
      .eq("liste", liste);
    if (error) return { fehler: error.message };
    revalidatePath(pfad);
    return { gespeichert: true };
  }

  const spalten = formData.getAll("spalte").map(String).filter(Boolean);

  const { error } = await supabase.from("spaltenwahl").upsert(
    {
      user_id: user.id,
      liste,
      spalten,
      geaendert_am: new Date().toISOString(),
    },
    { onConflict: "user_id,liste" }
  );

  if (error) return { fehler: error.message };

  revalidatePath(pfad);
  return { gespeichert: true };
}
