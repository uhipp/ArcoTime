"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { mitErfolg } from "@/lib/erfolg";

function kundeFromForm(formData: FormData) {
  const num = (v: FormDataEntryValue | null) =>
    v && String(v).trim() !== "" ? Number(v) : null;
  const str = (v: FormDataEntryValue | null) =>
    v && String(v).trim() !== "" ? String(v).trim() : null;

  return {
    adress_schluessel: str(formData.get("adress_schluessel")),
    anrede: str(formData.get("anrede")),
    vorname: str(formData.get("vorname")),
    name: String(formData.get("name") ?? "").trim(),
    adresse_zusatz: str(formData.get("adresse_zusatz")),
    strasse: str(formData.get("strasse")),
    postfach: str(formData.get("postfach")),
    plz: str(formData.get("plz")),
    ort: str(formData.get("ort")),
    land: str(formData.get("land")) ?? "CH",
    email: str(formData.get("email")),
    telefon: str(formData.get("telefon")),
    waehrung: str(formData.get("waehrung")) ?? "CHF",
    zahlungskondition_tage: num(formData.get("zahlungskondition_tage")) ?? 30,
    notizen: str(formData.get("notizen")),
  };
}

export async function createKunde(formData: FormData) {
  const supabase = await createClient();
  const values = kundeFromForm(formData);

  const { error } = await supabase.from("kunden").insert(values);
  if (error) {
    redirect(`/kunden/neu?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/kunden");
  redirect(mitErfolg("/kunden", "Kunde gespeichert."));
}

export async function updateKunde(id: string, formData: FormData) {
  const supabase = await createClient();
  const values = kundeFromForm(formData);

  const { error } = await supabase.from("kunden").update(values).eq("id", id);
  if (error) {
    redirect(`/kunden/${id}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/kunden");
  redirect(mitErfolg("/kunden", "Kunde gespeichert."));
}

export async function deleteKunde(id: string) {
  const supabase = await createClient();
  await supabase.from("kunden").delete().eq("id", id);
  revalidatePath("/kunden");
  redirect(mitErfolg("/kunden", "Kunde gelöscht."));
}
