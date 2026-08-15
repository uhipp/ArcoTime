"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { heuteIso } from "@/lib/date-utils";
import { mitErfolg } from "@/lib/erfolg";
import { ladeTagesbelegung, pruefeTagesgrenze } from "@/lib/tagesbelegung";
import { normalisiereZeit } from "@/lib/zeit";
import { pruefeGegenDienstleistung } from "@/lib/zeiteintrag-pruefung";
import { oeffneAnfrageWieder } from "@/lib/anfrage-wieder-oeffnen";
import type { FormularErgebnis } from "@/lib/formular-ergebnis";
import { konfliktMeldung, STAND_FELD } from "@/lib/konflikt";
import { monatGesperrt } from "@/lib/zeitkonto";

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

// Ein Zeiteintrag kann nicht in der Zukunft liegen – die Arbeit muss
// zuerst getan sein. Geprüft wird nur das Datum, nicht die Uhrzeit: Wer um
// 16:55 den Block bis 17:00 erfasst, tut nichts Falsches, und eine
// Anwendung, die auf die Minute pocht, erzieht nur zum Schummeln.
//
// Gilt NICHT für Positionen eines Rapports: Ein Rapport wird in der Regel
// vorbereitet, seine Positionen sind Auftragsinhalt und dürfen in der
// Zukunft liegen. Dort greift die Regel beim Abschliessen (siehe
// schliesse_rapport in 0036).
function datumInZukunft(datum: string): string | null {
  if (!datum) return null;
  return datum > heuteIso()
    ? "Das Datum liegt in der Zukunft. Ein Zeiteintrag lässt sich erst erfassen, wenn die Arbeit geleistet ist."
    : null;
}

export async function createZeiteintrag(
  _bisher: FormularErgebnis,
  formData: FormData
): Promise<FormularErgebnis> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const values = zeiteintragFromForm(formData);

  const zukunft = datumInZukunft(values.datum);
  if (zukunft) {
    return { fehler: zukunft };
  }

  // Abgeschlossener Monat: Die Datenbank lehnt ohnehin ab (0059), sagt
  // aber nur "null Zeilen betroffen". Hier steht der Grund im Klartext –
  // und zwar für BEIDE Monate: den, in dem der Eintrag steht, und den,
  // in den er verschoben werden soll.
  const gesperrt = await monatGesperrt(
    supabase,
    values.mitarbeiter_id ?? "",
    values.datum
  );
  if (gesperrt) return { fehler: gesperrt };

  const fehler = await pruefeGegenDienstleistung(supabase, values);
  if (fehler) {
    return { fehler: fehler };
  }

  const grenze = await pruefeTagesgrenze({
    supabase,
    mitarbeiterId: values.mitarbeiter_id ?? userData.user?.id ?? "",
    datum: values.datum,
    neueMinuten: values.menge === null ? values.dauer_minuten : 0,
  });
  if (grenze) {
    return { fehler: grenze };
  }

  const { error } = await supabase.from("zeiteintraege").insert({
    ...mitPassenderMenge(values, values.menge === null),
    mitarbeiter_id: values.mitarbeiter_id ?? userData.user?.id,
    user_id: userData.user?.id,
  });

  if (error) {
    return { fehler: error.message };
  }

  revalidatePath("/zeiterfassung");
  redirect(mitErfolg("/zeiterfassung", "Eintrag gespeichert."));
}

export async function updateZeiteintrag(
  id: string,
  _bisher: FormularErgebnis,
  formData: FormData
): Promise<FormularErgebnis> {
  const supabase = await createClient();
  const values = zeiteintragFromForm(formData);

  const zukunft = datumInZukunft(values.datum);
  if (zukunft) {
    return { fehler: zukunft };
  }

  const fehler = await pruefeGegenDienstleistung(supabase, values);
  if (fehler) {
    return { fehler: fehler };
  }

  const grenze = await pruefeTagesgrenze({
    supabase,
    mitarbeiterId: values.mitarbeiter_id ?? "",
    datum: values.datum,
    neueMinuten: values.menge === null ? values.dauer_minuten : 0,
    ohneEintragId: id,
  });
  if (grenze) {
    return { fehler: grenze };
  }

  // Konfliktprüfung – siehe lib/konflikt.
  const stand = String(formData.get(STAND_FELD) ?? "") || null;
  let abfrage = supabase
    .from("zeiteintraege")
    .update(mitPassenderMenge(values, values.menge === null))
    .eq("id", id);
  if (stand) abfrage = abfrage.eq("updated_at", stand);

  const { data: geaendert, error } = await abfrage.select("id");
  if (error) {
    return { fehler: error.message };
  }
  if (!geaendert || geaendert.length === 0) {
    return { fehler: await konfliktMeldung(supabase, "zeiteintraege", id, stand) };
  }

  revalidatePath("/zeiterfassung");
  redirect(mitErfolg("/zeiterfassung", "Eintrag gespeichert."));
}

export async function deleteZeiteintrag(id: string) {
  const supabase = await createClient();

  // Wie beim Rapport: Stammt der Eintrag aus einer Anfrage, war er der
  // Grund für deren "erledigt" – und muss sie beim Verschwinden wieder
  // öffnen. Zwingend vor dem Löschen, der Verweis wird dabei geleert.
  const anfrageGeoeffnet = await oeffneAnfrageWieder(supabase, "zeiteintrag_id", id);

  // Ergebnis auswerten statt zu hoffen: Bisher meldete die Aktion
  // "Eintrag gelöscht", auch wenn der Fremdschlüssel einer Anfrage das
  // Löschen verhindert hat oder RLS es verweigerte – null betroffene
  // Zeilen kommen ohne Fehler zurück.
  const { data, error } = await supabase
    .from("zeiteintraege")
    .delete()
    .eq("id", id)
    .select("id");

  if (error) {
    redirect(`/zeiterfassung/${id}?error=${encodeURIComponent(error.message)}`);
  }
  if (!data || data.length === 0) {
    redirect(
      `/zeiterfassung/${id}?error=${encodeURIComponent(
        "Eintrag wurde nicht gelöscht – entweder ist er bereits exportiert oder dir fehlen die Rechte."
      )}`
    );
  }

  revalidatePath("/zeiterfassung");
  revalidatePath("/anfragen");
  redirect(
    mitErfolg(
      "/zeiterfassung",
      anfrageGeoeffnet
        ? "Eintrag gelöscht – die zugehörige Anfrage ist wieder offen."
        : "Eintrag gelöscht."
    )
  );
}

// Startet einen Timer: legt SOFORT einen echten (unfertigen) Zeiteintrag an,
// statt den Fortschritt nur im Browser zu halten. So geht beim Verlassen
// der Seite nichts verloren.
async function starteTimer(formData: FormData): Promise<FormularErgebnis> {
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
    return { fehler: error?.message ?? "Unbekannter Fehler" };
  }

  redirect(mitErfolg(`/zeiterfassung/${neu.id}`, "Timer gestartet."));
}

// Stoppt einen laufenden Timer: Dauer wird server-seitig aus der
// gespeicherten Startzeit berechnet (nicht aus dem Browser), damit sie auch
// nach einem Neuladen/Gerätewechsel korrekt bleibt.
async function stoppeTimer(id: string, formData: FormData): Promise<FormularErgebnis> {
  const supabase = await createClient();

  const { data: bestehend } = await supabase
    .from("zeiteintraege")
    .select("timer_gestartet_um")
    .eq("id", id)
    .single();

  if (!bestehend?.timer_gestartet_um) {
    return { fehler: "Timer läuft nicht (mehr)." };
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
    return { fehler: error.message };
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

// ---------------------------------------------------------
// Eine Aktion je Formular
// ---------------------------------------------------------
// Am Erfassungsformular hängen zwei Absichten: speichern und den Timer
// starten beziehungsweise stoppen. Mit je einer eigenen Aktion am Knopf
// (formAction) liesse sich die Eingabe bei einer Ablehnung nicht bewahren –
// useActionState kennt genau eine Aktion je Formular. Deshalb schickt der
// gedrückte Knopf ein Feld "absicht" mit, und hier wird verzweigt. Das ist
// der Standardweg in HTML, seit es Formulare gibt.
//
// Fehlt das Feld – Enter in einem Textfeld löst den ersten Knopf aus, und
// der trägt keinen Wert –, gilt "speichern". Das ist das harmlose
// Verhalten: Niemand startet versehentlich einen Timer.

export async function erfasseZeiteintrag(
  bisher: FormularErgebnis,
  formData: FormData
): Promise<FormularErgebnis> {
  if (String(formData.get("absicht") ?? "") === "timer_starten") {
    return starteTimer(formData);
  }
  return createZeiteintrag(bisher, formData);
}

export async function bearbeiteZeiteintrag(
  id: string,
  bisher: FormularErgebnis,
  formData: FormData
): Promise<FormularErgebnis> {
  if (String(formData.get("absicht") ?? "") === "timer_stoppen") {
    return stoppeTimer(id, formData);
  }
  return updateZeiteintrag(id, bisher, formData);
}
