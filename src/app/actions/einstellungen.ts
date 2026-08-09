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

// ---------------------------------------------------------
// Rabattsätze (Auswahlliste für Zeiterfassung & Anfrage-Erledigung)
// ---------------------------------------------------------
export async function createRabattsatz(formData: FormData) {
  const supabase = await createClient();
  const prozent = Number(formData.get("prozent") ?? NaN);
  const bezeichnung = String(formData.get("bezeichnung") ?? "").trim() || null;
  if (Number.isNaN(prozent) || prozent < 0 || prozent > 100) {
    redirect(
      `/einstellungen?error=${encodeURIComponent("Rabatt muss zwischen 0 und 100% liegen.")}`
    );
  }

  const { error } = await supabase.from("rabattsaetze").insert({ prozent, bezeichnung });
  if (error) {
    redirect(`/einstellungen?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath("/einstellungen");
  redirect(mitErfolg("/einstellungen", "Rabattsatz hinzugefügt."));
}

export async function toggleRabattsatz(id: string, aktiv: boolean) {
  const supabase = await createClient();
  await supabase.from("rabattsaetze").update({ aktiv }).eq("id", id);
  revalidatePath("/einstellungen");
  redirect(mitErfolg("/einstellungen", aktiv ? "Rabattsatz aktiviert." : "Rabattsatz deaktiviert."));
}

// ---------------------------------------------------------
// Anfrage-Kanäle (Auswahlliste für Anfragen)
// ---------------------------------------------------------
export async function createAnfrageKanal(formData: FormData) {
  const supabase = await createClient();
  const bezeichnung = String(formData.get("bezeichnung") ?? "").trim();
  const symbol = String(formData.get("symbol") ?? "").trim() || "•";
  if (!bezeichnung) return;

  // Interner Wert wird aus der Bezeichnung abgeleitet (z.B. für Filter/Export),
  // ist für Anwendende aber nicht relevant – sie sehen nur die Bezeichnung.
  const wert = bezeichnung
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  const { error } = await supabase
    .from("anfrage_kanaele")
    .insert({ wert: wert || bezeichnung, bezeichnung, symbol });
  if (error) {
    redirect(`/einstellungen?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath("/einstellungen");
  redirect(mitErfolg("/einstellungen", "Kanal hinzugefügt."));
}

export async function toggleAnfrageKanal(id: string, aktiv: boolean) {
  const supabase = await createClient();
  await supabase.from("anfrage_kanaele").update({ aktiv }).eq("id", id);
  revalidatePath("/einstellungen");
  redirect(mitErfolg("/einstellungen", aktiv ? "Kanal aktiviert." : "Kanal deaktiviert."));
}

// ---------------------------------------------------------
// Anfrage-Prioritäten (Auswahlliste für Anfragen)
// ---------------------------------------------------------
export async function createAnfragePrioritaet(formData: FormData) {
  const supabase = await createClient();
  const bezeichnung = String(formData.get("bezeichnung") ?? "").trim();
  const farbe = String(formData.get("farbe") ?? "").trim() || "bg-gray-300";
  if (!bezeichnung) return;

  const wert = bezeichnung
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  const { error } = await supabase
    .from("anfrage_prioritaeten")
    .insert({ wert: wert || bezeichnung, bezeichnung, farbe });
  if (error) {
    redirect(`/einstellungen?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath("/einstellungen");
  redirect(mitErfolg("/einstellungen", "Priorität hinzugefügt."));
}

export async function toggleAnfragePrioritaet(id: string, aktiv: boolean) {
  const supabase = await createClient();
  await supabase.from("anfrage_prioritaeten").update({ aktiv }).eq("id", id);
  revalidatePath("/einstellungen");
  redirect(mitErfolg("/einstellungen", aktiv ? "Priorität aktiviert." : "Priorität deaktiviert."));
}
