"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { heuteIso } from "@/lib/date-utils";
import { mitErfolg } from "@/lib/erfolg";

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

  if (!values.dauer_minuten || values.dauer_minuten <= 0) {
    redirect(
      `/zeiterfassung?error=${encodeURIComponent(
        "Bitte eine gültige Dauer angeben (mind. 1 Minute) – Von/Bis oder Dauer prüfen."
      )}`
    );
  }

  const { error } = await supabase.from("zeiteintraege").insert({
    ...values,
    mitarbeiter_id: values.mitarbeiter_id ?? userData.user?.id,
    user_id: userData.user?.id,
  });

  if (error) {
    redirect(`/zeiterfassung?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/zeiterfassung");
  redirect(mitErfolg("/zeiterfassung", "Eintrag gespeichert."));
}

export async function updateZeiteintrag(id: string, formData: FormData) {
  const supabase = await createClient();
  const values = zeiteintragFromForm(formData);

  if (!values.dauer_minuten || values.dauer_minuten <= 0) {
    redirect(
      `/zeiterfassung/${id}?error=${encodeURIComponent(
        "Bitte eine gültige Dauer angeben (mind. 1 Minute) – Von/Bis oder Dauer prüfen."
      )}`
    );
  }

  const { error } = await supabase
    .from("zeiteintraege")
    .update(values)
    .eq("id", id);

  if (error) {
    redirect(`/zeiterfassung/${id}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/zeiterfassung");
  redirect(mitErfolg("/zeiterfassung", "Eintrag gespeichert."));
}

export async function deleteZeiteintrag(id: string) {
  const supabase = await createClient();
  await supabase.from("zeiteintraege").delete().eq("id", id);
  revalidatePath("/zeiterfassung");
  redirect(mitErfolg("/zeiterfassung", "Eintrag gelöscht."));
}

// Startet einen Timer: legt SOFORT einen echten (unfertigen) Zeiteintrag an,
// statt den Fortschritt nur im Browser zu halten. So geht beim Verlassen
// der Seite nichts verloren.
export async function starteTimer(formData: FormData) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const values = zeiteintragFromForm(formData);
  const mitarbeiterId = values.mitarbeiter_id ?? userData.user?.id ?? "";

  // Läuft für diese Person schon ein Timer? Dann dorthin zurückführen,
  // statt einen zweiten parallel zu starten.
  const { data: laufender } = await supabase
    .from("zeiteintraege")
    .select("id")
    .eq("mitarbeiter_id", mitarbeiterId)
    .not("timer_gestartet_um", "is", null)
    .limit(1)
    .maybeSingle();

  if (laufender) {
    redirect(
      mitErfolg(
        `/zeiterfassung/${laufender.id}`,
        "Es läuft bereits ein Timer für diese Person – hier weitermachen oder zuerst stoppen."
      )
    );
  }

  const jetzt = new Date();
  const startZeit = `${String(jetzt.getHours()).padStart(2, "0")}:${String(
    jetzt.getMinutes()
  ).padStart(2, "0")}`;

  const { data: neu, error } = await supabase
    .from("zeiteintraege")
    .insert({
      projekt_id: values.projekt_id,
      dienstleistung_id: values.dienstleistung_id,
      mitarbeiter_id: mitarbeiterId,
      user_id: userData.user?.id,
      datum: values.datum,
      start_zeit: startZeit,
      beschreibung: values.beschreibung,
      rabatt_prozent: values.rabatt_prozent,
      referenz: values.referenz,
      timer_gestartet_um: jetzt.toISOString(),
    })
    .select("id")
    .single();

  if (error || !neu) {
    redirect(`/zeiterfassung?error=${encodeURIComponent(error?.message ?? "Unbekannter Fehler")}`);
  }

  redirect(mitErfolg(`/zeiterfassung/${neu.id}`, "Timer gestartet."));
}

// Stoppt einen laufenden Timer: Dauer wird server-seitig aus der
// gespeicherten Startzeit berechnet (nicht aus dem Browser), damit sie auch
// nach einem Neuladen/Gerätewechsel korrekt bleibt.
export async function stoppeTimer(id: string, formData: FormData) {
  const supabase = await createClient();

  const { data: bestehend } = await supabase
    .from("zeiteintraege")
    .select("timer_gestartet_um")
    .eq("id", id)
    .single();

  if (!bestehend?.timer_gestartet_um) {
    redirect(`/zeiterfassung/${id}?error=${encodeURIComponent("Timer läuft nicht (mehr).")}`);
  }

  const start = new Date(bestehend.timer_gestartet_um);
  const jetzt = new Date();
  const dauerMinuten = Math.max(1, Math.round((jetzt.getTime() - start.getTime()) / 60000));
  const endZeit = `${String(jetzt.getHours()).padStart(2, "0")}:${String(
    jetzt.getMinutes()
  ).padStart(2, "0")}`;

  const beschreibung = String(formData.get("beschreibung") ?? "").trim() || null;

  const { error } = await supabase
    .from("zeiteintraege")
    .update({
      dauer_minuten: dauerMinuten,
      end_zeit: endZeit,
      timer_gestartet_um: null,
      beschreibung,
    })
    .eq("id", id);

  if (error) {
    redirect(`/zeiterfassung/${id}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/zeiterfassung");
  redirect(mitErfolg(`/zeiterfassung/${id}`, "Timer gestoppt. Bitte prüfen und speichern."));
}
