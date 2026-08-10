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

// Variante für die Schnellerfassung direkt aus anderen Formularen heraus
// (z.B. beim Erfassen einer Anfrage, wenn der Kunde noch fehlt) – bewusst
// OHNE redirect(), damit die aufrufende Seite nicht verlassen wird. Nutzt
// dieselbe Feldzuordnung/Defaults wie die reguläre Kundenerfassung, damit
// die Stammdaten konsistent bleiben; Adresse & Rechnungsangaben können
// später unter "Kunden" ergänzt werden.
export async function erstelleKundeSchnell(
  formData: FormData
): Promise<{
  data: { id: string; name: string; vorname: string | null } | null;
  error: string | null;
  warnung?: { id: string; name: string; vorname: string | null };
}> {
  const supabase = await createClient();
  const values = kundeFromForm(formData);
  const erzwingen = formData.get("erzwingen") === "true";

  if (!values.name) {
    return { data: null, error: "Name ist ein Pflichtfeld." };
  }

  // Dubletten-Warnung: prüft gegen den aktuellen DB-Stand (nicht gegen eine
  // lokal im Browser gehaltene Liste), damit das auch greift, wenn ein
  // anderer Mitarbeiter den Kunden gerade eben erst angelegt hat. Wird über
  // "erzwingen" übersprungen, wenn der Nutzer die Warnung bestätigt hat.
  if (!erzwingen) {
    const { data: vorhanden } = await supabase
      .from("kunden")
      .select("id, name, vorname")
      .ilike("name", values.name)
      .limit(1)
      .maybeSingle();

    if (vorhanden) {
      return { data: null, error: null, warnung: vorhanden };
    }
  }

  const { data, error } = await supabase
    .from("kunden")
    .insert(values)
    .select("id, name, vorname")
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  revalidatePath("/kunden");
  return { data, error: null };
}
