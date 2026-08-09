"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { mitErfolg } from "@/lib/erfolg";

export async function updateMitarbeiter(id: string, formData: FormData) {
  const supabase = await createClient();

  const vorname = String(formData.get("vorname") ?? "").trim() || null;
  const nachname = String(formData.get("nachname") ?? "").trim() || null;
  const role = String(formData.get("role") ?? "mitarbeiter");

  const { error } = await supabase
    .from("profiles")
    .update({ vorname, nachname, role })
    .eq("id", id);

  if (error) {
    redirect(`/mitarbeiter?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/mitarbeiter");
  redirect(mitErfolg("/mitarbeiter", "Mitarbeitende gespeichert."));
}
