"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { mitErfolg } from "@/lib/erfolg";
import { getCurrentOrganisation } from "@/lib/get-profile";

// ---------------------------------------------------------
// Organisation (Mandant) – Titel, der im Header statt eines fixen
// Kunden-Logos angezeigt wird.
// ---------------------------------------------------------
export async function updateOrganisation(formData: FormData) {
  const supabase = await createClient();
  const name = String(formData.get("name") ?? "").trim();
  const zeigeAufLogin = formData.get("zeige_auf_login") === "on";
  if (!name) {
    redirect(`/einstellungen?error=${encodeURIComponent("Bitte einen Namen angeben.")}`);
  }

  const organisation = await getCurrentOrganisation();
  if (!organisation) {
    redirect(`/einstellungen?error=${encodeURIComponent("Organisation nicht gefunden.")}`);
  }

  const { error } = await supabase
    .from("organisationen")
    .update({ name, zeige_auf_login: zeigeAufLogin })
    .eq("id", organisation.id);

  if (error) {
    // Verletzt den "höchstens eine Organisation"-Unique-Index (0017), wenn
    // bereits eine andere Organisation als Login-Anzeige markiert ist.
    const meldung = error.code === "23505"
      ? "Es kann nur eine Organisation gleichzeitig auf der Login-Seite angezeigt werden. Bitte zuerst bei der anderen Organisation deaktivieren."
      : error.message;
    redirect(`/einstellungen?error=${encodeURIComponent(meldung)}`);
  }

  revalidatePath("/", "layout");
  revalidatePath("/login");
  redirect(mitErfolg("/einstellungen", "Name gespeichert."));
}

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

// Korrigiert Code, Bezeichnung oder Satz eines bestehenden MWSt-Codes.
//
// ACHTUNG bei echten Steuersatzänderungen: Zeiteinträge speichern zwar den
// Preis als Snapshot (siehe 0003_zeiteintraege_preis_snapshot.sql), den
// MWSt-Code aber nur als Referenz über die Dienstleistung. Wird der Satz
// hier geändert, gilt der neue Wert deshalb rückwirkend auch für alte
// Einträge und Exporte. Für eine gesetzliche Satzänderung gehört ein NEUER
// Code angelegt und der alte deaktiviert – dieses Formular ist zum
// Korrigieren von Tippfehlern gedacht.
export async function updateMwstCode(id: string, formData: FormData) {
  const supabase = await createClient();
  const code = String(formData.get("code") ?? "").trim();
  const bezeichnung = String(formData.get("bezeichnung") ?? "").trim();
  const satz = Number(formData.get("satz") ?? NaN);

  if (!code || !bezeichnung) {
    redirect(
      `/einstellungen?error=${encodeURIComponent("Code und Bezeichnung dürfen nicht leer sein.")}`
    );
  }
  if (Number.isNaN(satz) || satz < 0 || satz > 100) {
    redirect(
      `/einstellungen?error=${encodeURIComponent("Der MWSt-Satz muss zwischen 0 und 100% liegen.")}`
    );
  }

  const { error } = await supabase
    .from("mwst_codes")
    .update({ code, bezeichnung, satz })
    .eq("id", id);
  if (error) {
    redirect(`/einstellungen?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/einstellungen");
  redirect(mitErfolg("/einstellungen", `MWSt-Code ${code} gespeichert.`));
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

// ---------------------------------------------------------
// Dokument-Kategorien (Auswahlliste für die Dokumentenablage)
// ---------------------------------------------------------
export async function createDokumentKategorie(formData: FormData) {
  const supabase = await createClient();
  const bezeichnung = String(formData.get("bezeichnung") ?? "").trim();
  if (!bezeichnung) return;

  const { error } = await supabase.from("dokument_kategorien").insert({ bezeichnung });
  if (error) {
    redirect(`/einstellungen?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath("/einstellungen");
  redirect(mitErfolg("/einstellungen", "Kategorie hinzugefügt."));
}

export async function toggleDokumentKategorie(id: string, aktiv: boolean) {
  const supabase = await createClient();
  await supabase.from("dokument_kategorien").update({ aktiv }).eq("id", id);
  revalidatePath("/einstellungen");
  redirect(mitErfolg("/einstellungen", aktiv ? "Kategorie aktiviert." : "Kategorie deaktiviert."));
}
