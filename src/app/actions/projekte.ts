"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { heuteIso } from "@/lib/date-utils";
import { mitErfolg } from "@/lib/erfolg";
import { loeschHinweis } from "@/lib/loeschen";
import { getCurrentUser } from "@/lib/get-profile";

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

  const { data: angelegt, error } = await supabase
    .from("projekte")
    .insert(values)
    .select("id")
    .single();
  if (error) {
    redirect(`/projekte/neu?error=${encodeURIComponent(error.message)}`);
  }

  if (angelegt) await erstellerInsTeam(supabase, angelegt.id);

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

  if (data) await erstellerInsTeam(supabase, data.id);

  if (error) {
    return { data: null, error: error.message };
  }

  revalidatePath("/projekte");
  return { data, error: null };
}

// ---------------------------------------------------------
// Projektteam
// ---------------------------------------------------------
// Die Tabelle projekt_mitarbeiter steuert, wer ein Projekt sieht, das
// NICHT für alle sichtbar ist. Sie existierte von Anfang an, wurde aber
// nie beschrieben – wer das Häkchen entfernte, verlor damit auch den
// eigenen Zugriff, weil nur noch Admins übrig blieben.

type Client = Awaited<ReturnType<typeof createClient>>;

// Wer ein Projekt anlegt, gehört zum Team. Ohne das wäre ein Projekt
// ohne "für alle sichtbar" für die erfassende Person sofort unsichtbar.
// Bewusst ohne Fehlerbehandlung nach aussen: Das Projekt ist zu diesem
// Zeitpunkt angelegt, und ein fehlgeschlagener Teameintrag darf das nicht
// rückgängig machen – ein Admin kann ihn jederzeit nachtragen.
async function erstellerInsTeam(supabase: Client, projektId: string) {
  const user = await getCurrentUser();
  if (!user) return;
  await supabase
    .from("projekt_mitarbeiter")
    .upsert({ projekt_id: projektId, user_id: user.id }, { onConflict: "projekt_id,user_id" });
}

export async function fuegeProjektMitarbeiterHinzu(projektId: string, formData: FormData) {
  const supabase = await createClient();
  const userId = String(formData.get("user_id") ?? "").trim();

  if (!userId) {
    redirect(`/projekte/${projektId}?error=${encodeURIComponent("Bitte eine Person wählen.")}`);
  }

  const { error } = await supabase
    .from("projekt_mitarbeiter")
    .upsert({ projekt_id: projektId, user_id: userId }, { onConflict: "projekt_id,user_id" });

  if (error) {
    redirect(`/projekte/${projektId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/projekte/${projektId}`);
  redirect(
    mitErfolg(`/projekte/${projektId}?fokus=neues_teammitglied`, "Zum Projektteam hinzugefügt.")
  );
}

export async function entferneProjektMitarbeiter(projektId: string, userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projekt_mitarbeiter")
    .delete()
    .eq("projekt_id", projektId)
    .eq("user_id", userId)
    .select("user_id");

  if (error) {
    redirect(`/projekte/${projektId}?error=${encodeURIComponent(error.message)}`);
  }
  if (!data || data.length === 0) {
    redirect(
      `/projekte/${projektId}?error=${encodeURIComponent(
        "Eintrag wurde nicht entfernt – dafür fehlen dir die Rechte."
      )}`
    );
  }

  revalidatePath(`/projekte/${projektId}`);
  redirect(mitErfolg(`/projekte/${projektId}`, "Aus dem Projektteam entfernt."));
}
