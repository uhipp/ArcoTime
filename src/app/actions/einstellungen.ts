"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { mitErfolg } from "@/lib/erfolg";
import { getCurrentOrganisation } from "@/lib/get-profile";

// Gemeinsamer Nenner aller Auswahllisten: bearbeiten, speichern, zurück auf
// die Einstellungsseite. Die Listen unterscheiden sich nur in ihren Feldern,
// nicht im Ablauf – ohne diesen Helfer stünde derselbe Fünfzeiler fünfmal da.
async function speichereListeneintrag(
  tabelle: string,
  id: string,
  werte: Record<string, unknown>,
  erfolgsmeldung: string
) {
  const supabase = await createClient();
  const { error } = await supabase.from(tabelle).update(werte).eq("id", id);
  if (error) {
    redirect(`/einstellungen?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath("/einstellungen");
  redirect(mitErfolg("/einstellungen", erfolgsmeldung));
}

// Sortierung aus dem Formular lesen. Leer oder unsinnig -> unverändert
// lassen, statt still auf 0 zu setzen.
function sortierungAus(formData: FormData): number | undefined {
  const roh = String(formData.get("sortierung") ?? "").trim();
  if (roh === "") return undefined;
  const zahl = Number(roh);
  return Number.isFinite(zahl) ? zahl : undefined;
}

// Nächster freier Sortierwert: höchster vorhandener + 10.
//
// Der Spaltendefault 0 wäre falsch – ein neuer Eintrag landete damit ganz
// oben, vor allen bestehenden. Erwartet wird aber, dass er hinten
// angehängt wird. Der Abstand von 10 lässt Platz, um später etwas
// dazwischenzuschieben, ohne die ganze Liste neu zu nummerieren.
async function naechsteSortierung(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tabelle: string
): Promise<number> {
  const { data } = await supabase
    .from(tabelle)
    .select("sortierung")
    .order("sortierung", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (Number(data?.sortierung) || 0) + 10;
}

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

  // Schwellen für die Tagesarbeitszeit. Leeres Feld = Schwelle aus.
  const alsMinuten = (feld: string): number | null => {
    const roh = String(formData.get(feld) ?? "").trim();
    if (roh === "") return null;
    const stunden = Number(roh);
    if (!Number.isFinite(stunden) || stunden <= 0) return null;
    return Math.round(stunden * 60);
  };

  const { error } = await supabase
    .from("organisationen")
    .update({
      name,
      zeige_auf_login: zeigeAufLogin,
      warnung_ab_minuten_pro_tag: alsMinuten("warnung_ab_stunden"),
      sperre_ab_minuten_pro_tag: alsMinuten("sperre_ab_stunden"),
    })
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

  await supabase.from("dienstleistungsklassen").insert({
    bezeichnung,
    sortierung: await naechsteSortierung(supabase, "dienstleistungsklassen"),
  });
  revalidatePath("/einstellungen");
  redirect(mitErfolg("/einstellungen", "Klasse hinzugefügt."));
}

export async function updateKlasse(id: string, formData: FormData) {
  const bezeichnung = String(formData.get("bezeichnung") ?? "").trim();
  if (!bezeichnung) {
    redirect(`/einstellungen?error=${encodeURIComponent("Die Bezeichnung darf nicht leer sein.")}`);
  }
  await speichereListeneintrag(
    "dienstleistungsklassen",
    id,
    { bezeichnung, sortierung: sortierungAus(formData) },
    "Klasse gespeichert."
  );
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
// Rückwirkungsfrei: Seit 0021_zeiteintraege_mwst_snapshot.sql frieren
// Zeiteinträge Code und Satz beim Erfassen ein (analog zum Preis aus 0003).
// Eine Änderung hier wirkt deshalb nur auf künftige Einträge – bestehende
// behalten den Satz, der beim Erfassen galt.
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
// Einheiten (Auswahlliste für den Dienstleistungskatalog)
// ---------------------------------------------------------
export async function createEinheit(formData: FormData) {
  const supabase = await createClient();
  const bezeichnung = String(formData.get("bezeichnung") ?? "").trim();
  if (!bezeichnung) return;

  const { error } = await supabase.from("einheiten").insert({
    bezeichnung,
    sortierung: await naechsteSortierung(supabase, "einheiten"),
  });
  if (error) {
    redirect(`/einstellungen?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath("/einstellungen");
  redirect(mitErfolg("/einstellungen", "Einheit hinzugefügt."));
}

// Umbenennen ist gefahrlos: dienstleistungen.einheit speichert den Text,
// nicht eine Referenz. Bestehende Dienstleistungen behalten also ihren
// bisherigen Wert – er taucht dann nur nicht mehr in der Auswahl auf.
export async function updateEinheit(id: string, formData: FormData) {
  const bezeichnung = String(formData.get("bezeichnung") ?? "").trim();
  if (!bezeichnung) {
    redirect(`/einstellungen?error=${encodeURIComponent("Die Bezeichnung darf nicht leer sein.")}`);
  }
  await speichereListeneintrag(
    "einheiten",
    id,
    { bezeichnung, sortierung: sortierungAus(formData) },
    "Einheit gespeichert."
  );
}

export async function toggleEinheit(id: string, aktiv: boolean) {
  const supabase = await createClient();
  await supabase.from("einheiten").update({ aktiv }).eq("id", id);
  revalidatePath("/einstellungen");
  redirect(mitErfolg("/einstellungen", aktiv ? "Einheit aktiviert." : "Einheit deaktiviert."));
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

  const { error } = await supabase.from("rabattsaetze").insert({
    prozent,
    bezeichnung,
    sortierung: await naechsteSortierung(supabase, "rabattsaetze"),
  });
  if (error) {
    redirect(`/einstellungen?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath("/einstellungen");
  redirect(mitErfolg("/einstellungen", "Rabattsatz hinzugefügt."));
}

export async function updateRabattsatz(id: string, formData: FormData) {
  const prozent = Number(formData.get("prozent") ?? NaN);
  const bezeichnung = String(formData.get("bezeichnung") ?? "").trim() || null;
  if (Number.isNaN(prozent) || prozent < 0 || prozent > 100) {
    redirect(
      `/einstellungen?error=${encodeURIComponent("Rabatt muss zwischen 0 und 100% liegen.")}`
    );
  }
  await speichereListeneintrag(
    "rabattsaetze",
    id,
    { prozent, bezeichnung, sortierung: sortierungAus(formData) },
    "Rabattsatz gespeichert."
  );
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
    .insert({
      wert: wert || bezeichnung,
      bezeichnung,
      symbol,
      sortierung: await naechsteSortierung(supabase, "anfrage_kanaele"),
    });
  if (error) {
    redirect(`/einstellungen?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath("/einstellungen");
  redirect(mitErfolg("/einstellungen", "Kanal hinzugefügt."));
}

// Bezeichnung und Symbol sind frei änderbar, der interne "wert" bewusst
// NICHT: Er steht als Fremdschlüssel-Ersatz in anfragen.kanal. Würde er hier
// mitgeändert, verlören alle bestehenden Anfragen ihren Kanal. Dasselbe gilt
// für Prioritäten (anfragen.prioritaet).
export async function updateAnfrageKanal(id: string, formData: FormData) {
  const bezeichnung = String(formData.get("bezeichnung") ?? "").trim();
  const symbol = String(formData.get("symbol") ?? "").trim() || "•";
  if (!bezeichnung) {
    redirect(`/einstellungen?error=${encodeURIComponent("Die Bezeichnung darf nicht leer sein.")}`);
  }
  await speichereListeneintrag(
    "anfrage_kanaele",
    id,
    { bezeichnung, symbol, sortierung: sortierungAus(formData) },
    "Kanal gespeichert."
  );
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
    .insert({
      wert: wert || bezeichnung,
      bezeichnung,
      farbe,
      sortierung: await naechsteSortierung(supabase, "anfrage_prioritaeten"),
    });
  if (error) {
    redirect(`/einstellungen?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath("/einstellungen");
  redirect(mitErfolg("/einstellungen", "Priorität hinzugefügt."));
}

export async function updateAnfragePrioritaet(id: string, formData: FormData) {
  const bezeichnung = String(formData.get("bezeichnung") ?? "").trim();
  const farbe = String(formData.get("farbe") ?? "").trim() || "bg-gray-300";
  if (!bezeichnung) {
    redirect(`/einstellungen?error=${encodeURIComponent("Die Bezeichnung darf nicht leer sein.")}`);
  }
  await speichereListeneintrag(
    "anfrage_prioritaeten",
    id,
    { bezeichnung, farbe, sortierung: sortierungAus(formData) },
    "Priorität gespeichert."
  );
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

  const { error } = await supabase.from("dokument_kategorien").insert({
    bezeichnung,
    sortierung: await naechsteSortierung(supabase, "dokument_kategorien"),
  });
  if (error) {
    redirect(`/einstellungen?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath("/einstellungen");
  redirect(mitErfolg("/einstellungen", "Kategorie hinzugefügt."));
}

export async function updateDokumentKategorie(id: string, formData: FormData) {
  const bezeichnung = String(formData.get("bezeichnung") ?? "").trim();
  if (!bezeichnung) {
    redirect(`/einstellungen?error=${encodeURIComponent("Die Bezeichnung darf nicht leer sein.")}`);
  }
  await speichereListeneintrag(
    "dokument_kategorien",
    id,
    { bezeichnung, sortierung: sortierungAus(formData) },
    "Kategorie gespeichert."
  );
}

export async function toggleDokumentKategorie(id: string, aktiv: boolean) {
  const supabase = await createClient();
  await supabase.from("dokument_kategorien").update({ aktiv }).eq("id", id);
  revalidatePath("/einstellungen");
  redirect(mitErfolg("/einstellungen", aktiv ? "Kategorie aktiviert." : "Kategorie deaktiviert."));
}
