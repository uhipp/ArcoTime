"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { heuteIso } from "@/lib/date-utils";
import { mitErfolg } from "@/lib/erfolg";

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
  await supabase.from("projekte").delete().eq("id", id);
  revalidatePath("/projekte");
  redirect(mitErfolg("/projekte", "Projekt gelöscht."));
}
