"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { freieZeitenAm } from "@/app/actions/rapporte";

export type VerschiebeErgebnis =
  | { fehler: string }
  | { warnung: string }
  | null;

function alsUhrzeit(minuten: number): string {
  return `${String(Math.floor(minuten / 60)).padStart(2, "0")}:${String(minuten % 60).padStart(2, "0")}`;
}

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
  ziel: {
    datum: string;
    vonMinuten: number;
    bisMinuten: number;
    mitarbeiterId?: string | null;
    // Setzt der Anwender, nachdem er die Warnung gesehen hat.
    trotzdem?: boolean;
  }
): Promise<VerschiebeErgebnis> {
  const supabase = await createClient();

  const { data: rapport } = await supabase
    .from("rapporte")
    .select("id, status, datum")
    .eq("id", rapportId)
    .single();

  if (!rapport) return { fehler: "Rapport nicht gefunden." };
  if (rapport.status !== "offen") {
    return {
      fehler:
        "Dieser Rapport ist abgeschlossen und lässt sich nicht mehr verschieben. Für Korrekturen bitte stornieren und neu erstellen.",
    };
  }

  // Beteiligte des Einsatzes (0045). In der Tagesansicht kann eine Person
  // dazukommen: Wird der Balken in eine andere Spalte gezogen, tritt diese
  // Person an die Stelle der bisherigen aus derselben Spalte.
  const { data: beteiligteRoh } = await supabase
    .from("rapport_beteiligte")
    .select("mitarbeiter_id")
    .eq("rapport_id", rapportId);

  const beteiligte = (beteiligteRoh ?? []).map((b) => b.mitarbeiter_id);
  const zuPruefen =
    ziel.mitarbeiterId != null && !beteiligte.includes(ziel.mitarbeiterId)
      ? [...beteiligte, ziel.mitarbeiterId]
      : beteiligte;

  // Bei einem Team wird GEMELDET, nicht blockiert: Sonst würde eine
  // einzige Abwesenheit den ganzen Einsatz festsetzen – und die Person
  // wird ohnehin ersetzt. Die Meldung nennt, WER nicht kann.
  if (!ziel.trotzdem && zuPruefen.length > 0) {
    const hindernisse: string[] = [];
    for (const person of zuPruefen) {
      const { gesperrt, abwesend } = await freieZeitenAm({
        mitarbeiterId: person,
        datum: ziel.datum,
        ohneRapportId: rapportId,
      });

      // Halbtägige Abwesenheit: Sie sperrt den Tag nicht, kollidiert aber,
      // wenn der Termin in ihr Fenster fällt. Ohne diese Prüfung ging ein
      // Einsatz kommentarlos in eine Weiterbildung von 08:00 bis 12:00.
      const kollision = abwesend.find(
        (a) => ziel.vonMinuten < a.bisMin && ziel.bisMinuten > a.vonMin
      );

      const grund =
        gesperrt ??
        (kollision
          ? `${kollision.bezeichnung} ${alsUhrzeit(kollision.vonMin)}–${alsUhrzeit(
              kollision.bisMin
            )}`
          : null);

      if (grund) {
        const { data: p } = await supabase
          .from("profiles")
          .select("name")
          .eq("id", person)
          .maybeSingle();
        hindernisse.push(`${p?.name ?? "Eine Person"}: ${grund}`);
      }
    }

    if (hindernisse.length > 0) {
      return { warnung: hindernisse.join(" · ") };
    }
  }

  const { data: geaendert, error } = await supabase
    .from("rapporte")
    .update({
      datum: ziel.datum,
      geplant_von: alsZeitstempel(ziel.datum, ziel.vonMinuten),
      geplant_bis: alsZeitstempel(ziel.datum, ziel.bisMinuten),
    })
    .eq("id", rapportId)
    .select("id");

  if (error) return { fehler: error.message };
  if (!geaendert || geaendert.length === 0) {
    return { fehler: "Verschieben wurde nicht übernommen – dafür fehlen dir die Rechte." };
  }

  // Spaltenwechsel in der Tagesansicht: Die Person der Zielspalte kommt
  // dazu. Bewusst hinzufügen und nicht ersetzen – wer aus dem Einsatz
  // ausscheiden soll, wird im Rapport entfernt, wo auch seine Stunden
  // hängen. Ein Nebeneffekt des Ziehens wäre dafür der falsche Ort.
  if (ziel.mitarbeiterId && !beteiligte.includes(ziel.mitarbeiterId)) {
    await supabase
      .from("rapport_beteiligte")
      .upsert(
        { rapport_id: rapportId, mitarbeiter_id: ziel.mitarbeiterId },
        { onConflict: "rapport_id,mitarbeiter_id" }
      );
  }

  // Das Datum am Kopf zieht die Positionen mit (Trigger aus 0038), deshalb
  // auch die Seiten neu laden, die Zeiteinträge zeigen.
  revalidatePath("/disposition");
  revalidatePath("/kalender");
  revalidatePath(`/rapporte/${rapportId}`);
  revalidatePath("/rapporte");
  return null;
}
