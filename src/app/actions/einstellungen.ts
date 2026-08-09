"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { mitErfolg } from "@/lib/erfolg";

export async function createKlasse(formData: FormData) {
  const supabase = await createClient();
  const bezeichnung = String(formData.get("bezeichnung") ?? "").trim();
  if (!bezeichnung) return;

  await supabase.from("dienstleistungsklassen").insert({ bezeichnung });
  revalidatePath("/einstellungen");
  redirect(mitErfolg("/einstellungen", "Klasse hinzugefügt."));
}

export async function toggleKlasse(id: string, aktiv: boolean) {
  const supabase = await createClient();
  await supabase.from("dienstleistungsklassen").update({ aktiv }).eq("id", id);
  revalidatePath("/einstellungen");
  redirect(mitErfolg("/einstellungen", aktiv ? "Klasse aktiviert." : "Klasse deaktiviert."));
}

export async function createMwstCode(formData: FormData) {
  const supabase = await createClient();
  const code = String(formData.get("code") ?? "").trim();
  const bezeichnung = String(formData.get("bezeichnung") ?? "").trim();
  const satz = Number(formData.get("satz") ?? 0);
  if (!code || !bezeichnung) return;

  await supabase.from("mwst_codes").insert({ code, bezeichnung, satz });
  revalidatePath("/einstellungen");
  redirect(mitErfolg("/einstellungen", "MWSt-Code hinzugefügt."));
}

export async function toggleMwstCode(id: string, aktiv: boolean) {
  const supabase = await createClient();
  await supabase.from("mwst_codes").update({ aktiv }).eq("id", id);
  revalidatePath("/einstellungen");
  redirect(mitErfolg("/einstellungen", aktiv ? "MWSt-Code aktiviert." : "MWSt-Code deaktiviert."));
}
