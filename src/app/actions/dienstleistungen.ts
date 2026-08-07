"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function dienstleistungFromForm(formData: FormData) {
  const str = (v: FormDataEntryValue | null) =>
    v && String(v).trim() !== "" ? String(v).trim() : null;

  return {
    bezeichnung: String(formData.get("bezeichnung") ?? "").trim(),
    beschreibung: str(formData.get("beschreibung")),
    klasse_id: String(formData.get("klasse_id")),
    preis: Number(formData.get("preis") ?? 0),
    einheit: String(formData.get("einheit") ?? "Stunde"),
    konto: str(formData.get("konto")),
    mwst_code_id: str(formData.get("mwst_code_id")),
    aktiv: formData.get("aktiv") === "on",
  };
}

export async function createDienstleistung(formData: FormData) {
  const supabase = await createClient();
  const values = dienstleistungFromForm(formData);

  const { error } = await supabase.from("dienstleistungen").insert(values);
  if (error) {
    redirect(`/dienstleistungen/neu?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dienstleistungen");
  redirect("/dienstleistungen");
}

export async function updateDienstleistung(id: string, formData: FormData) {
  const supabase = await createClient();
  const values = dienstleistungFromForm(formData);

  const { error } = await supabase
    .from("dienstleistungen")
    .update(values)
    .eq("id", id);
  if (error) {
    redirect(`/dienstleistungen/${id}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dienstleistungen");
  redirect("/dienstleistungen");
}

export async function deleteDienstleistung(id: string) {
  const supabase = await createClient();
  await supabase.from("dienstleistungen").delete().eq("id", id);
  revalidatePath("/dienstleistungen");
  redirect("/dienstleistungen");
}
