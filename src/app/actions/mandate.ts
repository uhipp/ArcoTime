"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { heuteIso } from "@/lib/date-utils";

function mandatFromForm(formData: FormData) {
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
  // Mandats unangetastet (nicht mit null überschreiben).
  const belegnummer = str(formData.get("naechste_belegnummer"));
  if (belegnummer !== null) {
    werte.naechste_belegnummer = Number(belegnummer);
  }

  return werte;
}

export async function createMandat(formData: FormData) {
  const supabase = await createClient();
  const values = mandatFromForm(formData);

  const { error } = await supabase.from("mandate").insert(values);
  if (error) {
    redirect(`/mandate/neu?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/mandate");
  redirect("/mandate");
}

export async function updateMandat(id: string, formData: FormData) {
  const supabase = await createClient();
  const values = mandatFromForm(formData);

  const { error } = await supabase.from("mandate").update(values).eq("id", id);
  if (error) {
    redirect(`/mandate/${id}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/mandate");
  redirect("/mandate");
}

export async function deleteMandat(id: string) {
  const supabase = await createClient();
  await supabase.from("mandate").delete().eq("id", id);
  revalidatePath("/mandate");
  redirect("/mandate");
}
