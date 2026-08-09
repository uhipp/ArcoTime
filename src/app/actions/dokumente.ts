"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Dokument, DokumentBereich } from "@/lib/types";

// Bewusst nur Dateitypen, die im Alltag tatsächlich vorkommen (siehe
// docs/phase7-dokumente-plan.md) – alles andere wird abgelehnt.
const ERLAUBTE_ENDUNGEN = [
  ".pdf",
  ".jpg",
  ".jpeg",
  ".png",
  ".heic",
  ".heif",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".eml",
  ".msg",
  ".txt",
];

const MAX_BYTES = 20 * 1024 * 1024;

function sanitizeDateiname(name: string) {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(-100);
}

// Schritt 1: Berechtigung prüfen (der Insert selbst ist der RLS-Check –
// bezug_id muss für den Anwender sichtbar/erlaubt sein) und eine signierte
// Upload-URL erzeugen. Die Datei selbst geht danach DIREKT vom Browser zu
// Supabase Storage, NICHT über diese Server Action – grössere Dateien
// würden sonst am Body-Limit von Vercel-Funktionen scheitern.
export async function bereiteDokumentUploadVor(
  bereich: DokumentBereich,
  bezugId: string,
  formData: FormData
): Promise<
  { error: string; dokumentId?: undefined; pfad?: undefined; token?: undefined } |
  { error: null; dokumentId: string; pfad: string; token: string }
> {
  const dateiname = String(formData.get("dateiname") ?? "").trim();
  const groesse = Number(formData.get("groesse") ?? 0);
  const mimeType = String(formData.get("mime_type") ?? "").trim() || null;
  const kategorieId = String(formData.get("kategorie_id") ?? "").trim() || null;
  const notiz = String(formData.get("notiz") ?? "").trim() || null;

  if (!dateiname || groesse <= 0) {
    return { error: "Keine gültige Datei ausgewählt." };
  }
  if (groesse > MAX_BYTES) {
    return {
      error: `Datei ist zu gross (max. ${Math.round(MAX_BYTES / 1024 / 1024)} MB).`,
    };
  }
  const endung = "." + (dateiname.split(".").pop() ?? "").toLowerCase();
  if (!ERLAUBTE_ENDUNGEN.includes(endung)) {
    return {
      error: `Dieser Dateityp wird nicht unterstützt (erlaubt: ${ERLAUBTE_ENDUNGEN.join(", ")}).`,
    };
  }

  const supabase = await createClient();
  const { data: zeile, error: insertError } = await supabase
    .from("dokumente")
    .insert({
      bereich,
      bezug_id: bezugId,
      dateiname,
      speicherpfad: "pending",
      mime_type: mimeType,
      groesse_bytes: groesse,
      kategorie_id: kategorieId,
      notiz,
    })
    .select("id")
    .single();

  if (insertError || !zeile) {
    return { error: insertError?.message ?? "Unbekannter Fehler." };
  }

  const pfad = `${bereich}/${bezugId}/${zeile.id}-${sanitizeDateiname(dateiname)}`;
  const admin = createAdminClient();
  const { data: signiert, error: signError } = await admin.storage
    .from("dokumente")
    .createSignedUploadUrl(pfad);

  if (signError || !signiert) {
    await supabase.from("dokumente").delete().eq("id", zeile.id);
    return { error: signError?.message ?? "Upload konnte nicht vorbereitet werden." };
  }

  await supabase.from("dokumente").update({ speicherpfad: pfad }).eq("id", zeile.id);

  return { error: null, dokumentId: zeile.id, pfad, token: signiert.token };
}

// Schritt 2: nach erfolgreichem Direkt-Upload die vollständige Zeile (inkl.
// Kategorie-Bezeichnung und Namen der hochladenden Person) für die Anzeige
// in der Liste zurückgeben, ohne dass die Seite neu geladen werden muss.
export async function bestaetigeDokumentUpload(
  dokumentId: string,
  pfad: string
): Promise<{ data: Dokument | null; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("dokumente")
    .select("*, dokument_kategorien(bezeichnung), hochgeladen:profiles!hochgeladen_von(name)")
    .eq("id", dokumentId)
    .eq("speicherpfad", pfad)
    .single();

  if (error || !data) {
    return { data: null, error: error?.message ?? "Dokument nicht gefunden." };
  }
  return { data: data as Dokument, error: null };
}

// Räumt eine begonnene, aber fehlgeschlagene Datei-Übertragung auf (die
// dokumente-Zeile ohne zugehörige Datei wieder entfernen).
export async function verwerfeDokument(dokumentId: string) {
  const supabase = await createClient();
  await supabase.from("dokumente").delete().eq("id", dokumentId);
}

// Kategorie/Notiz nachträglich ergänzen oder ändern – z.B. wenn eine
// Datei ohne Kategorie hochgeladen wurde und das später nachgeholt werden
// soll. Nutzt dieselbe Berechtigung wie das Löschen (Admin oder die
// hochladende Person).
export async function aktualisiereDokument(
  dokumentId: string,
  formData: FormData
): Promise<{ data: Dokument | null; error: string | null }> {
  const kategorieId = String(formData.get("kategorie_id") ?? "").trim() || null;
  const notiz = String(formData.get("notiz") ?? "").trim() || null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("dokumente")
    .update({ kategorie_id: kategorieId, notiz })
    .eq("id", dokumentId)
    .select("*, dokument_kategorien(bezeichnung), hochgeladen:profiles!hochgeladen_von(name)")
    .single();

  if (error || !data) {
    return { data: null, error: error?.message ?? "Aktualisieren fehlgeschlagen." };
  }
  return { data: data as Dokument, error: null };
}

export async function loescheDokument(
  dokumentId: string,
  pfad: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  // Der DELETE hier ist der eigentliche Berechtigungs-Check (RLS: Admin
  // oder hochladende Person) – erst wenn er durchgeht, wird die Datei aus
  // dem Storage entfernt.
  const { error, count } = await supabase
    .from("dokumente")
    .delete({ count: "exact" })
    .eq("id", dokumentId);

  if (error) return { error: error.message };
  if (!count) return { error: "Keine Berechtigung oder Dokument nicht gefunden." };

  const admin = createAdminClient();
  await admin.storage.from("dokumente").remove([pfad]);

  return { error: null };
}
