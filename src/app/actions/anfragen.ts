"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { mitErfolg } from "@/lib/erfolg";
import { heuteIso } from "@/lib/date-utils";
import { mitNamePraefix } from "@/lib/mitarbeiter-praefix";
import type { AnfrageStatus } from "@/lib/types";

async function nameFuer(
  supabase: Awaited<ReturnType<typeof createClient>>,
  id: string | null
): Promise<string | null> {
  if (!id) return null;
  const { data } = await supabase.from("profiles").select("name").eq("id", id).single();
  return data?.name ?? null;
}

// Alle Namen aller Mitarbeitenden – dient mitNamePraefix() dazu, eine
// bestehende Namenszeile in der Beschreibung zuverlässig zu erkennen (auch
// wenn sie von einer anderen/früheren Zuweisung stammt) und zu ersetzen,
// statt eine zweite Zeile darüberzustapeln.
async function alleNamen(supabase: Awaited<ReturnType<typeof createClient>>): Promise<string[]> {
  const { data } = await supabase.from("profiles").select("name");
  return data?.map((p) => p.name) ?? [];
}

function anfrageFromForm(formData: FormData) {
  const str = (v: FormDataEntryValue | null) =>
    v && String(v).trim() !== "" ? String(v).trim() : null;

  return {
    kunde_id: String(formData.get("kunde_id")),
    projekt_id: str(formData.get("projekt_id")),
    titel: String(formData.get("titel") ?? "").trim(),
    beschreibung: str(formData.get("beschreibung")),
    kanal: String(formData.get("kanal") ?? "sonstiges"),
    prioritaet: String(formData.get("prioritaet") ?? "normal"),
    zugewiesen_an: str(formData.get("zugewiesen_an")),
    wiedervorlage_am: str(formData.get("wiedervorlage_am")),
  };
}

export async function createAnfrage(formData: FormData) {
  const supabase = await createClient();
  const values = anfrageFromForm(formData);

  // Wird die Anfrage direkt bei der Erfassung zugewiesen, den Namen der/des
  // Mitarbeitenden schon jetzt als erste Zeile in die Beschreibung setzen –
  // gleiche Konvention wie in der Zeiterfassung (wichtig für den Export).
  if (values.zugewiesen_an) {
    const name = await nameFuer(supabase, values.zugewiesen_an);
    if (name) values.beschreibung = mitNamePraefix(values.beschreibung, name);
  }

  const { error } = await supabase.from("anfragen").insert(values);
  if (error) {
    redirect(`/anfragen/neu?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/anfragen");
  redirect(mitErfolg("/anfragen", "Anfrage erstellt."));
}

export async function updateAnfrage(id: string, formData: FormData) {
  const supabase = await createClient();
  const values = anfrageFromForm(formData);

  // Wird im Formular eine (neue) Person zugewiesen, den Namen als erste
  // Zeile in die Beschreibung einfügen – auch wenn schon vorher Text
  // erfasst wurde, bevor eine Zuweisung möglich war.
  const { data: bestehend } = await supabase
    .from("anfragen")
    .select("zugewiesen_an")
    .eq("id", id)
    .single();

  if (values.zugewiesen_an && values.zugewiesen_an !== bestehend?.zugewiesen_an) {
    const [neuerName, bekannteNamen] = await Promise.all([
      nameFuer(supabase, values.zugewiesen_an),
      alleNamen(supabase),
    ]);
    if (neuerName) {
      values.beschreibung = mitNamePraefix(values.beschreibung, neuerName, bekannteNamen);
    }
  }

  const { error } = await supabase.from("anfragen").update(values).eq("id", id);
  if (error) {
    redirect(`/anfragen/${id}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/anfragen");
  redirect(mitErfolg("/anfragen", "Anfrage gespeichert."));
}

export async function deleteAnfrage(id: string) {
  const supabase = await createClient();
  await supabase.from("anfragen").delete().eq("id", id);
  revalidatePath("/anfragen");
  redirect(mitErfolg("/anfragen", "Anfrage gelöscht."));
}

// Wird vom Kanban-Board direkt (ohne Formular/Redirect) aufgerufen, wenn
// eine Karte per Drag & Drop in eine andere Spalte verschoben wird.
export async function setzeStatus(id: string, status: AnfrageStatus) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("anfragen")
    .update({
      status,
      erledigt_am: status === "erledigt" ? new Date().toISOString() : null,
    })
    .eq("id", id);

  revalidatePath("/anfragen");
  if (error) throw new Error(error.message);
}

// Schliesst eine Anfrage ab und erzeugt dabei IMMER einen Zeiteintrag
// (Dienstleistung + Dauer) – auch wenn nicht verrechnet wird (dann mit
// Rabatt 100%). So bleibt die tatsächlich aufgewendete Zeit vollständig
// erfasst, was Soll/Ist-Stundenauswertungen je Mitarbeitendem erst möglich
// macht (nicht verrechenbare Arbeit läuft dazu über ein internes Projekt +
// eine unproduktive Dienstleistung in den Stammdaten).
export async function erledigeAnfrage(id: string, formData: FormData) {
  const supabase = await createClient();

  const projekt_id = String(formData.get("projekt_id") ?? "").trim();
  const dienstleistung_id = String(formData.get("dienstleistung_id") ?? "").trim();
  const dauer_minuten = Number(formData.get("dauer_minuten") ?? 0);
  const beschreibung = String(formData.get("beschreibung") ?? "").trim() || null;
  const mitarbeiter_id = String(formData.get("mitarbeiter_id") ?? "").trim();
  const rabatt_prozent = Number(formData.get("rabatt_prozent") ?? 0);

  if (!projekt_id || !dienstleistung_id || dauer_minuten <= 0) {
    redirect(
      `/anfragen/${id}?error=${encodeURIComponent(
        "Bitte Projekt, Dienstleistung und eine gültige Dauer angeben. Für nicht verrechenbare Arbeit bitte das interne Projekt wählen und Rabatt auf 100% setzen."
      )}`
    );
  }

  const { data: userData } = await supabase.auth.getUser();

  const { data: neuerEintrag, error: zeitError } = await supabase
    .from("zeiteintraege")
    .insert({
      projekt_id,
      dienstleistung_id,
      mitarbeiter_id: mitarbeiter_id || userData.user?.id,
      user_id: userData.user?.id,
      datum: heuteIso(),
      beschreibung,
      dauer_minuten,
      rabatt_prozent,
    })
    .select("id")
    .single();

  if (zeitError || !neuerEintrag) {
    redirect(
      `/anfragen/${id}?error=${encodeURIComponent(zeitError?.message ?? "Unbekannter Fehler")}`
    );
  }

  const { error } = await supabase
    .from("anfragen")
    .update({
      status: "erledigt",
      erledigt_am: new Date().toISOString(),
      zeiteintrag_id: neuerEintrag.id,
    })
    .eq("id", id);

  if (error) {
    redirect(`/anfragen/${id}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/anfragen");
  revalidatePath("/zeiterfassung");
  redirect(mitErfolg(`/anfragen/${id}`, "Anfrage erledigt und Zeiteintrag erstellt."));
}

// Übernimmt eine noch nicht zugewiesene Anfrage für sich selbst.
export async function uebernehmeAnfrage(id: string) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  const [{ data: bestehend }, name, bekannteNamen] = await Promise.all([
    supabase.from("anfragen").select("beschreibung, zugewiesen_an").eq("id", id).single(),
    nameFuer(supabase, userData.user?.id ?? null),
    alleNamen(supabase),
  ]);

  const beschreibung = name
    ? mitNamePraefix(bestehend?.beschreibung ?? null, name, bekannteNamen)
    : bestehend?.beschreibung ?? null;

  const { error } = await supabase
    .from("anfragen")
    .update({ zugewiesen_an: userData.user?.id, status: "in_bearbeitung", beschreibung })
    .eq("id", id);

  revalidatePath("/anfragen");
  if (error) throw new Error(error.message);
}
