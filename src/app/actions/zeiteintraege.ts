"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { heuteIso } from "@/lib/date-utils";
import { mitErfolg } from "@/lib/erfolg";
import { ladeTagesbelegung, pruefeTagesgrenze } from "@/lib/tagesbelegung";
import { normalisiereZeit } from "@/lib/zeit";
import { pruefeGegenDienstleistung } from "@/lib/zeiteintrag-pruefung";

function zeiteintragFromForm(formData: FormData) {
  const str = (v: FormDataEntryValue | null) =>
    v && String(v).trim() !== "" ? String(v).trim() : null;

  const mengeRoh = str(formData.get("menge"));

  return {
    projekt_id: String(formData.get("projekt_id")),
    dienstleistung_id: String(formData.get("dienstleistung_id")),
    mitarbeiter_id: str(formData.get("mitarbeiter_id")),
    datum: str(formData.get("datum")) ?? heuteIso(),
    // Das Zeitfeld ist ein Textfeld (siehe lib/zeit.ts) – der Browser
    // liefert also auch "1030" oder "10.30". Postgres will HH:MM.
    start_zeit: normalisiereZeit(str(formData.get("start_zeit"))),
    end_zeit: normalisiereZeit(str(formData.get("end_zeit"))),
    dauer_minuten: Number(formData.get("dauer_minuten") ?? 0),
    // Nur bei Mengenartikeln gesetzt – das Feld existiert im Formular sonst
    // gar nicht.
    menge: mengeRoh === null ? null : Number(mengeRoh),
    beschreibung: str(formData.get("beschreibung")),
    rabatt_prozent: Number(formData.get("rabatt_prozent") ?? 0),
    referenz: str(formData.get("referenz")),
  };
}

// Genau eine der beiden Mengengrössen darf gesetzt sein – der
// Datenbank-Check verlangt das ebenfalls.
function mitPassenderMenge(
  werte: ReturnType<typeof zeiteintragFromForm>,
  istArbeitszeit: boolean
) {
  return istArbeitszeit
    ? { ...werte, menge: null }
    : { ...werte, dauer_minuten: null, start_zeit: null, end_zeit: null };
}

export async function createZeiteintrag(formData: FormData) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const values = zeiteintragFromForm(formData);

  const fehler = await pruefeGegenDienstleistung(supabase, values);
  if (fehler) {
    redirect(`/zeiterfassung?error=${encodeURIComponent(fehler)}`);
  }

  const grenze = await pruefeTagesgrenze({
    supabase,
    mitarbeiterId: values.mitarbeiter_id ?? userData.user?.id ?? "",
    datum: values.datum,
    neueMinuten: values.menge === null ? values.dauer_minuten : 0,
  });
  if (grenze) {
    redirect(`/zeiterfassung?error=${encodeURIComponent(grenze)}`);
  }

  const { error } = await supabase.from("zeiteintraege").insert({
    ...mitPassenderMenge(values, values.menge === null),
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

  const fehler = await pruefeGegenDienstleistung(supabase, values);
  if (fehler) {
    redirect(`/zeiterfassung/${id}?error=${encodeURIComponent(fehler)}`);
  }

  const grenze = await pruefeTagesgrenze({
    supabase,
    mitarbeiterId: values.mitarbeiter_id ?? "",
    datum: values.datum,
    neueMinuten: values.menge === null ? values.dauer_minuten : 0,
    ohneEintragId: id,
  });
  if (grenze) {
    redirect(`/zeiterfassung/${id}?error=${encodeURIComponent(grenze)}`);
  }

  const { error } = await supabase
    .from("zeiteintraege")
    .update(mitPassenderMenge(values, values.menge === null))
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

// Liefert dem Erfassungsformular, was diese Person an diesem Tag schon
// gebucht hat. Bewusst eine Aktion MIT Rückgabewert statt eines Redirects:
// Der Hinweis soll beim Tippen erscheinen, nicht erst nach dem Speichern –
// gewollte Überschneidungen kosten so keinen zusätzlichen Klick.
export async function holeTagesbelegung(argumente: {
  mitarbeiterId: string;
  datum: string;
  startZeit?: string | null;
  endZeit?: string | null;
  ohneEintragId?: string | null;
}) {
  const supabase = await createClient();
  return ladeTagesbelegung({ supabase, ...argumente });
}
