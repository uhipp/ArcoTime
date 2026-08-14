"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { freieZeitenAm } from "@/app/actions/rapporte";

export type VerschiebeErgebnis = { fehler: string } | null;

function alsZeitstempel(datum: string, minuten: number): string {
  const h = String(Math.floor(minuten / 60)).padStart(2, "0");
  const m = String(minuten % 60).padStart(2, "0");
  return `${datum}T${h}:${m}:00`;
}

// Verschiebt einen geplanten Einsatz – aufgerufen vom Ziehen im
// Zeitraster der Disposition.
//
// Warum eine Aktion mit Rückgabewert statt einer Weiterleitung: Beim
// Ziehen soll die Seite nicht springen. Klappt es, lädt die Ansicht neu;
// klappt es nicht, erscheint eine Meldung und der Balken geht an seinen
// Platz zurück.
//
// Bewusst NICHT verschiebbar sind erfasste Zeiten und abgeschlossene
// Rapporte: Eine Tatsache über die Vergangenheit per Maus zu versetzen
// wäre Fälschung, keine Planung. Geprüft wird das hier und nicht nur in
// der Oberfläche – ein Aufruf lässt sich nachbauen.
export async function verschiebeEinsatz(
  rapportId: string,
  ziel: { datum: string; vonMinuten: number; bisMinuten: number; mitarbeiterId?: string | null }
): Promise<VerschiebeErgebnis> {
  const supabase = await createClient();

  const { data: rapport } = await supabase
    .from("rapporte")
    .select("id, status, datum, geplant_fuer")
    .eq("id", rapportId)
    .single();

  if (!rapport) return { fehler: "Rapport nicht gefunden." };
  if (rapport.status !== "offen") {
    return {
      fehler:
        "Dieser Rapport ist abgeschlossen und lässt sich nicht mehr verschieben. Für Korrekturen bitte stornieren und neu erstellen.",
    };
  }

  // In der Wochenansicht wechselt der Tag, in der Tagesansicht die Person.
  // Wer nicht mitgegeben wird, bleibt wie er war.
  const person =
    ziel.mitarbeiterId !== undefined ? ziel.mitarbeiterId : rapport.geplant_fuer;

  // Schliesstag oder ganztägige Abwesenheit: Das ist kein Hinweis, sondern
  // ein Grund, es zu lassen. Doppelbelegungen bleiben dagegen erlaubt –
  // eine Übergabe ist eine legitime Überschneidung, und die Ansicht
  // markiert sie ohnehin rot.
  if (person) {
    const { gesperrt } = await freieZeitenAm({
      mitarbeiterId: person,
      datum: ziel.datum,
      ohneRapportId: rapportId,
    });
    if (gesperrt) {
      return { fehler: `Nicht möglich: ${gesperrt}` };
    }
  }

  const { data: geaendert, error } = await supabase
    .from("rapporte")
    .update({
      datum: ziel.datum,
      geplant_fuer: person,
      geplant_von: alsZeitstempel(ziel.datum, ziel.vonMinuten),
      geplant_bis: alsZeitstempel(ziel.datum, ziel.bisMinuten),
    })
    .eq("id", rapportId)
    .select("id");

  if (error) return { fehler: error.message };
  if (!geaendert || geaendert.length === 0) {
    return { fehler: "Verschieben wurde nicht übernommen – dafür fehlen dir die Rechte." };
  }

  // Das Datum am Kopf zieht die Positionen mit (Trigger aus 0038), deshalb
  // auch die Seiten neu laden, die Zeiteinträge zeigen.
  revalidatePath("/disposition");
  revalidatePath("/kalender");
  revalidatePath(`/rapporte/${rapportId}`);
  revalidatePath("/rapporte");
  return null;
}
