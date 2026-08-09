"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { heuteIso } from "@/lib/date-utils";

function zeiteintragFromForm(formData: FormData) {
  const str = (v: FormDataEntryValue | null) =>
    v && String(v).trim() !== "" ? String(v).trim() : null;

  return {
    projekt_id: String(formData.get("projekt_id")),
    dienstleistung_id: String(formData.get("dienstleistung_id")),
    mitarbeiter_id: str(formData.get("mitarbeiter_id")),
    datum: str(formData.get("datum")) ?? heuteIso(),
    start_zeit: str(formData.get("start_zeit")),
    end_zeit: str(formData.get("end_zeit")),
    dauer_minuten: Number(formData.get("dauer_minuten") ?? 0),
    beschreibung: str(formData.get("beschreibung")),
    rabatt_prozent: Number(formData.get("rabatt_prozent") ?? 0),
    referenz: str(formData.get("referenz")),
  };
}

export async function createZeiteintrag(formData: FormData) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const values = zeiteintragFromForm(formData);

  const { error } = await supabase.from("zeiteintraege").insert({
    ...values,
    mitarbeiter_id: values.mitarbeiter_id ?? userData.user?.id,
    user_id: userData.user?.id,
  });

  if (error) {
    redirect(`/zeiterfassung?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/zeiterfassung");
  redirect("/zeiterfassung");
}

export async function updateZeiteintrag(id: string, formData: FormData) {
  const supabase = await createClient();
  const values = zeiteintragFromForm(formData);

  const { error } = await supabase
    .from("zeiteintraege")
    .update(values)
    .eq("id", id);

  if (error) {
    redirect(`/zeiterfassung/${id}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/zeiterfassung");
  redirect("/zeiterfassung");
}

export async function deleteZeiteintrag(id: string) {
  const supabase = await createClient();
  await supabase.from("zeiteintraege").delete().eq("id", id);
  revalidatePath("/zeiterfassung");
  redirect("/zeiterfassung");
}
