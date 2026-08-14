"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { mitErfolg } from "@/lib/erfolg";
import { loeschHinweis } from "@/lib/loeschen";
import type { FormularErgebnis } from "@/lib/formular-ergebnis";

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
    hausnummer: str(formData.get("hausnummer")),
    postfach: str(formData.get("postfach")),
    plz: str(formData.get("plz")),
    ort: str(formData.get("ort")),
    land: str(formData.get("land")) ?? "CH",
    email: str(formData.get("email")),
    telefon: str(formData.get("telefon")),
    waehrung: str(formData.get("waehrung")) ?? "CHF",
    zahlungskondition_tage: num(formData.get("zahlungskondition_tage")) ?? 30,
    // Nur Vorbelegung für neue Zeiteinträge – siehe kunden.standard_rabatt_prozent.
    standard_rabatt_prozent: Math.min(
      100,
      Math.max(0, num(formData.get("standard_rabatt_prozent")) ?? 0)
    ),
    notizen: str(formData.get("notizen")),
  };
}

export async function createKunde(
  _bisher: FormularErgebnis,
  formData: FormData
): Promise<FormularErgebnis> {
  const supabase = await createClient();
  const values = kundeFromForm(formData);

  const { error } = await supabase.from("kunden").insert(values);
  if (error) {
    return { fehler: error.message };
  }

  revalidatePath("/kunden");
  redirect(mitErfolg("/kunden", "Kunde gespeichert."));
}

export async function updateKunde(
  id: string,
  _bisher: FormularErgebnis,
  formData: FormData
): Promise<FormularErgebnis> {
  const supabase = await createClient();
  const values = kundeFromForm(formData);

  const { error } = await supabase.from("kunden").update(values).eq("id", id);
  if (error) {
    return { fehler: error.message };
  }

  revalidatePath("/kunden");
  redirect(mitErfolg("/kunden", "Kunde gespeichert."));
}

export async function deleteKunde(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("kunden")
    .delete()
    .eq("id", id)
    .select("id");

  const meldung = loeschHinweis(data, error, "Kunde", "Kunden");
  if (meldung) {
    redirect(`/kunden/${id}?error=${encodeURIComponent(meldung)}`);
  }

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

// ---------------------------------------------------------
// Preis- & Rabattblock auf der Kundendetailseite
// ---------------------------------------------------------
// Beide Listen sind reine Stammdaten: Sie bestimmen, was beim ERFASSEN
// eines Zeiteintrags vorgeschlagen bzw. eingefroren wird. Änderungen hier
// wirken deshalb nie auf bestehende Einträge zurück – gleiches Prinzip wie
// bei Preis (0003), MWSt-Satz (0021) und Standardrabatt (0022).

export async function setzeKundenpreis(kundeId: string, formData: FormData) {
  const supabase = await createClient();
  const dienstleistung_id = String(formData.get("dienstleistung_id") ?? "").trim();
  const preis = Number(formData.get("preis") ?? NaN);

  if (!dienstleistung_id) {
    redirect(`/kunden/${kundeId}?error=${encodeURIComponent("Bitte eine Dienstleistung wählen.")}`);
  }
  if (Number.isNaN(preis) || preis < 0) {
    redirect(`/kunden/${kundeId}?error=${encodeURIComponent("Bitte einen gültigen Preis angeben.")}`);
  }

  // ab_menge 0 = Grundpreis. Die Staffel-Spalte existiert bereits, wird
  // aber noch nicht über die Oberfläche gepflegt (siehe 0022).
  const { error } = await supabase
    .from("kundenpreise")
    .upsert(
      { kunde_id: kundeId, dienstleistung_id, ab_menge: 0, preis },
      { onConflict: "kunde_id,dienstleistung_id,ab_menge" }
    );

  if (error) {
    redirect(`/kunden/${kundeId}?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath(`/kunden/${kundeId}`);
  redirect(mitErfolg(`/kunden/${kundeId}?fokus=neuer_kundenpreis`, "Kundenpreis gespeichert."));
}

export async function loescheKundenpreis(kundeId: string, id: string) {
  const supabase = await createClient();
  await supabase.from("kundenpreise").delete().eq("id", id);
  revalidatePath(`/kunden/${kundeId}`);
  redirect(mitErfolg(`/kunden/${kundeId}`, "Kundenpreis entfernt."));
}

export async function setzeKundenrabatt(kundeId: string, formData: FormData) {
  const supabase = await createClient();
  const klasse_id = String(formData.get("klasse_id") ?? "").trim();
  const rabatt_prozent = Number(formData.get("rabatt_prozent") ?? NaN);

  if (!klasse_id) {
    redirect(`/kunden/${kundeId}?error=${encodeURIComponent("Bitte eine Klasse wählen.")}`);
  }
  if (Number.isNaN(rabatt_prozent) || rabatt_prozent < 0 || rabatt_prozent > 100) {
    redirect(
      `/kunden/${kundeId}?error=${encodeURIComponent("Rabatt muss zwischen 0 und 100% liegen.")}`
    );
  }

  const { error } = await supabase
    .from("kundenrabatte")
    .upsert({ kunde_id: kundeId, klasse_id, rabatt_prozent }, { onConflict: "kunde_id,klasse_id" });

  if (error) {
    redirect(`/kunden/${kundeId}?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath(`/kunden/${kundeId}`);
  redirect(mitErfolg(`/kunden/${kundeId}?fokus=neuer_klassenrabatt`, "Klassenrabatt gespeichert."));
}

export async function loescheKundenrabatt(kundeId: string, id: string) {
  const supabase = await createClient();
  await supabase.from("kundenrabatte").delete().eq("id", id);
  revalidatePath(`/kunden/${kundeId}`);
  redirect(mitErfolg(`/kunden/${kundeId}`, "Klassenrabatt entfernt."));
}
