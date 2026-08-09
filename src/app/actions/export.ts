"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function erstelleExport(formData: FormData) {
  const supabase = await createClient();

  const von = String(formData.get("von"));
  const bis = String(formData.get("bis"));
  const projektIds = formData.getAll("projekt_ids").map(String);

  if (projektIds.length === 0) {
    redirect(
      `/export?von=${von}&bis=${bis}&error=${encodeURIComponent(
        "Bitte mindestens ein Projekt auswählen."
      )}`
    );
  }

  const belegIds: string[] = [];
  let gesamtAnzahl = 0;

  for (const projektId of projektIds) {
    const { data, error } = await supabase.rpc("erstelle_export", {
      p_projekt_id: projektId,
      p_von: von,
      p_bis: bis,
    });

    if (error) {
      redirect(`/export?von=${von}&bis=${bis}&error=${encodeURIComponent(error.message)}`);
    }

    const ergebnis = data?.[0];
    if (ergebnis?.neuer_beleg_id) {
      belegIds.push(ergebnis.neuer_beleg_id);
      gesamtAnzahl += ergebnis.anzahl ?? 0;
    }
  }

  revalidatePath("/export");

  if (belegIds.length === 0) {
    redirect(
      `/export?von=${von}&bis=${bis}&error=${encodeURIComponent(
        "Keine offenen Positionen für die gewählten Projekte im Zeitraum."
      )}`
    );
  }

  redirect(
    `/export?erstellt=${belegIds.join(",")}&anzahl=${gesamtAnzahl}`
  );
}
