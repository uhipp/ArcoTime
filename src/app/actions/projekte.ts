"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { heuteIso } from "@/lib/date-utils";
import { mitErfolg } from "@/lib/erfolg";
import { loeschHinweis } from "@/lib/loeschen";

function projektFromForm(formData: FormData) {
  const str = (v: FormDataEntryValue | null) =>
    v && String(v).trim() !== "" ? String(v).trim() : null;

  const werte: Record<string, unknown> = {
    kunde_id: String(formData.get("kunde_id")),
    bezeichnung: String(formData.get("bezeichnung") ?? "").trim(),
    status: String(formData.get("status") ?? "aktiv"),
    kostenstelle: str(formData.get("kostenstelle")),
    startdatum: str(formData.get("startdatum")) ?? heuteIso(),
    notizen: str(formData.get("notizen")),
    sichtbar_fuer_alle: formData.get("sichtbar_fuer_alle") === "on",
  };

  // Nur setzen, wenn ausgefüllt – sonst bleibt der bestehende Zähler des
  // Projekts unangetastet (nicht mit null überschreiben).
  const belegnummer = str(formData.get("naechste_belegnummer"));
  if (belegnummer !== null) {
    werte.naechste_belegnummer = Number(belegnummer);
  }

  return werte;
}

export async function createProjekt(formData: FormData) {
  const supabase = await createClient();
  const values = projektFromForm(formData);

  const { error } = await supabase.from("projekte").insert(values);
  if (error) {
    redirect(`/projekte/neu?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/projekte");
  redirect(mitErfolg("/projekte", "Projekt gespeichert."));
}

export async function updateProjekt(id: string, formData: FormData) {
  const supabase = await createClient();
  const values = projektFromForm(formData);

  const { error } = await supabase.from("projekte").update(values).eq("id", id);
  if (error) {
    redirect(`/projekte/${id}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/projekte");
  redirect(mitErfolg("/projekte", "Projekt gespeichert."));
}

export async function deleteProjekt(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projekte")
    .delete()
    .eq("id", id)
    .select("id");

  const meldung = loeschHinweis(data, error, "Projekt", "Projekte");
  if (meldung) {
    redirect(`/projekte/${id}?error=${encodeURIComponent(meldung)}`);
  }

  revalidatePath("/projekte");
  redirect(mitErfolg("/projekte", "Projekt gelöscht."));
}

// Variante für die Schnellerfassung direkt aus anderen Formularen heraus
// (z.B. beim Erfassen einer Anfrage oder eines Zeiteintrags, wenn das
// Projekt noch fehlt) – bewusst OHNE redirect(), damit die aufrufende Seite
// nicht verlassen wird. Alle anderen Felder haben passende DB-Defaults
// (Status "aktiv", Startdatum heute, nächste Belegnummer 470000).
export async function erstelleProjektSchnell(
  formData: FormData
): Promise<{
  data: { id: string; bezeichnung: string; kunde_id: string } | null;
  error: string | null;
  warnung?: { id: string; bezeichnung: string; kunde_id: string };
}> {
  const supabase = await createClient();
  const kunde_id = String(formData.get("kunde_id") ?? "").trim();
  const bezeichnung = String(formData.get("bezeichnung") ?? "").trim();
  const erzwingen = formData.get("erzwingen") === "true";

  if (!kunde_id) {
    return { data: null, error: "Bitte einen Kunden wählen." };
  }
  if (!bezeichnung) {
    return { data: null, error: "Bezeichnung ist ein Pflichtfeld." };
  }

  // Dubletten-Warnung: prüft gegen den aktuellen DB-Stand (nicht gegen eine
  // lokal im Browser gehaltene Liste), damit das auch greift, wenn ein
  // anderer Mitarbeiter das Projekt für denselben Kunden gerade eben erst
  // angelegt hat. Wird über "erzwingen" übersprungen, wenn der Nutzer die
  // Warnung bestätigt hat.
  if (!erzwingen) {
    const { data: vorhanden } = await supabase
      .from("projekte")
      .select("id, bezeichnung, kunde_id")
      .eq("kunde_id", kunde_id)
      .ilike("bezeichnung", bezeichnung)
      .limit(1)
      .maybeSingle();

    if (vorhanden) {
      return { data: null, error: null, warnung: vorhanden };
    }
  }

  const { data, error } = await supabase
    .from("projekte")
    .insert({ kunde_id, bezeichnung })
    .select("id, bezeichnung, kunde_id")
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  revalidatePath("/projekte");
  return { data, error: null };
}
