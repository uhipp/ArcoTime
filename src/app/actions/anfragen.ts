"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { mitErfolg } from "@/lib/erfolg";
import { heuteIso } from "@/lib/date-utils";
import { mitNamePraefix, ohneNamenszeile } from "@/lib/mitarbeiter-praefix";
import { benachrichtigeZuweisung } from "@/lib/anfrage-benachrichtigung";
import { pruefeTagesgrenze } from "@/lib/tagesbelegung";
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

  const { data: neue, error } = await supabase
    .from("anfragen")
    .insert(values)
    .select("id")
    .single();
  if (error || !neue) {
    redirect(`/anfragen/neu?error=${encodeURIComponent(error?.message ?? "Unbekannter Fehler.")}`);
  }

  if (values.zugewiesen_an) {
    const { data: userData } = await supabase.auth.getUser();
    await benachrichtigeZuweisung({
      supabase,
      anfrageId: neue.id,
      titel: values.titel,
      zugewiesenAnId: values.zugewiesen_an,
      zugewiesenVonId: userData.user?.id ?? null,
    });
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

  const zuweisungGeaendert =
    values.zugewiesen_an && values.zugewiesen_an !== bestehend?.zugewiesen_an;

  if (zuweisungGeaendert) {
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

  if (zuweisungGeaendert && values.zugewiesen_an) {
    const { data: userData } = await supabase.auth.getUser();
    await benachrichtigeZuweisung({
      supabase,
      anfrageId: id,
      titel: values.titel,
      zugewiesenAnId: values.zugewiesen_an,
      zugewiesenVonId: userData.user?.id ?? null,
    });
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

  // Die Zeiteintrags-Felder tragen bewusst das Präfix "zeit_": Sie stecken im
  // selben Formular wie die Anfrage selbst (nur so gehen Änderungen an Titel
  // und Beschreibung beim Erledigen nicht verloren), und ohne Präfix würden
  // sich projekt_id und beschreibung der beiden Bereiche gegenseitig
  // überschreiben.
  const projekt_id = String(formData.get("zeit_projekt_id") ?? "").trim();
  const dienstleistung_id = String(formData.get("zeit_dienstleistung_id") ?? "").trim();
  const dauer_minuten = Number(formData.get("zeit_dauer_minuten") ?? 0);
  const zeitText = String(formData.get("zeit_beschreibung") ?? "").trim();
  const mitarbeiter_id = String(formData.get("zeit_mitarbeiter_id") ?? "").trim();
  const rabatt_prozent = Number(formData.get("zeit_rabatt_prozent") ?? 0);

  if (!projekt_id || !dienstleistung_id || dauer_minuten <= 0) {
    redirect(
      `/anfragen/${id}?error=${encodeURIComponent(
        "Bitte Projekt, Dienstleistung und eine gültige Dauer angeben. Für nicht verrechenbare Arbeit bitte das interne Projekt wählen und Rabatt auf 100% setzen."
      )}`
    );
  }

  // Rabattsperre der Dienstleistung gilt auch hier – sonst liesse sich ein
  // gesperrter Teilrabatt über den Umweg "Anfrage erledigen" doch vergeben.
  // 100% bleibt zulässig (= nicht verrechnet), siehe 0022.
  const { data: dienstleistung } = await supabase
    .from("dienstleistungen")
    .select("bezeichnung, rabatt_erlaubt")
    .eq("id", dienstleistung_id)
    .single();

  if (
    dienstleistung &&
    !dienstleistung.rabatt_erlaubt &&
    rabatt_prozent > 0 &&
    rabatt_prozent < 100
  ) {
    redirect(
      `/anfragen/${id}?error=${encodeURIComponent(
        `Für "${dienstleistung.bezeichnung}" sind keine Teilrabatte zugelassen (nur 0% oder 100%).`
      )}`
    );
  }

  const { data: userData } = await supabase.auth.getUser();
  const ausfuehrendeId = mitarbeiter_id || userData.user?.id || null;

  // Tagesgrenze gilt auch hier – sonst liesse sich sie über das Erledigen
  // von Anfragen umgehen, genau wie zuvor die Rabattsperre. Uhrzeiten gibt
  // es auf diesem Weg keine, geprüft wird also nur die Tagessumme.
  if (ausfuehrendeId) {
    const grenze = await pruefeTagesgrenze({
      supabase,
      mitarbeiterId: ausfuehrendeId,
      datum: heuteIso(),
      neueMinuten: dauer_minuten,
    });
    if (grenze) {
      redirect(`/anfragen/${id}?error=${encodeURIComponent(grenze)}`);
    }
  }

  // Name der ausführenden Person als erste Zeile erzwingen – dieselbe
  // Konvention wie in Zeiterfassung und updateAnfrage (der Comatic-Export
  // kennt keine Mitarbeiter-Spalte). Bisher war das Erledigen die einzige
  // Stelle, die den Text ungeprüft durchgereicht hat.
  const [ausfuehrendeName, bekannteNamen] = await Promise.all([
    nameFuer(supabase, ausfuehrendeId),
    alleNamen(supabase),
  ]);
  const beschreibung = ausfuehrendeName
    ? mitNamePraefix(zeitText || null, ausfuehrendeName, bekannteNamen)
    : zeitText || null;

  const { data: neuerEintrag, error: zeitError } = await supabase
    .from("zeiteintraege")
    .insert({
      projekt_id,
      dienstleistung_id,
      mitarbeiter_id: ausfuehrendeId,
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

  // Die Anfrage-Felder kommen aus demselben Formular und werden hier
  // mitgespeichert – sonst gingen Änderungen an Titel/Beschreibung/Zuweisung
  // verloren, die jemand direkt vor dem Erledigen noch vorgenommen hat.
  // Fehlt "titel", stammt der Aufruf nicht von der Detailseite; dann bleiben
  // die Stammdaten der Anfrage unangetastet.
  const kommtVonDetailseite = formData.get("titel") !== null;
  let anfrageWerte: Record<string, unknown> = {};

  if (kommtVonDetailseite) {
    const werte = anfrageFromForm(formData);

    // Eine erledigte Anfrage ohne zuständige Person ist ein Loch in der
    // Nachvollziehbarkeit: Am Zeiteintrag steht dann zwar, wer gearbeitet
    // hat, an der Anfrage selbst aber niemand. Wer erledigt, übernimmt
    // deshalb automatisch die Zuständigkeit – bewusst kein Pflichtfeld, denn
    // solange die Anfrage offen ist, darf sie unzugewiesen bleiben.
    if (!werte.zugewiesen_an) werte.zugewiesen_an = ausfuehrendeId;

    // Namenszeile in der Beschreibung nachziehen, gleiche Konvention wie in
    // createAnfrage/updateAnfrage. Massgeblich ist die zuständige Person –
    // sie kann von der ausführenden abweichen, wenn im Erledigen-Block
    // jemand anderes ausgewählt wurde.
    const zustaendigName =
      werte.zugewiesen_an === ausfuehrendeId
        ? ausfuehrendeName
        : await nameFuer(supabase, werte.zugewiesen_an);
    if (zustaendigName) {
      werte.beschreibung = mitNamePraefix(werte.beschreibung, zustaendigName, bekannteNamen);
    }

    anfrageWerte = werte;
  }

  const { error } = await supabase
    .from("anfragen")
    .update({
      ...anfrageWerte,
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

// ---------------------------------------------------------
// Weitere Abschlusswege
// ---------------------------------------------------------
// Bis hierher liess sich eine Anfrage nur über einen Zeiteintrag
// abschliessen. Mit den Rapporten war der Ablauf nicht mehr durchgängig:
// Wer den Einsatz als Rapport dokumentiert, hätte die zugehörige Anfrage
// nur von Hand nachziehen können. Und manche Anfrage erledigt sich ohne
// jede Leistung – eine Rückfrage, ein Irrläufer.
//
// Beide Wege teilen sich die Nachbearbeitung der Anfrage-Felder: Sie
// stehen im selben Formular (siehe erledigeAnfrage), müssen also
// mitgespeichert werden, sonst gehen Änderungen direkt vor dem Abschluss
// verloren.
async function anfrageFelderFuerAbschluss(
  supabase: Awaited<ReturnType<typeof createClient>>,
  formData: FormData,
  ausfuehrendeId: string | null
): Promise<Record<string, unknown>> {
  // Fehlt "titel", stammt der Aufruf nicht von der Detailseite; dann
  // bleiben die Stammdaten der Anfrage unangetastet.
  if (formData.get("titel") === null) return {};

  const werte = anfrageFromForm(formData);

  // Wer abschliesst, übernimmt die Zuständigkeit – eine erledigte Anfrage
  // ohne zuständige Person ist ein Loch in der Nachvollziehbarkeit.
  if (!werte.zugewiesen_an) werte.zugewiesen_an = ausfuehrendeId;

  const bekannteNamen = await alleNamen(supabase);
  const zustaendigName = await nameFuer(supabase, werte.zugewiesen_an);
  if (zustaendigName) {
    werte.beschreibung = mitNamePraefix(werte.beschreibung, zustaendigName, bekannteNamen);
  }
  return werte;
}

// Abschluss ohne Nachweis: kein Zeiteintrag, kein Rapport. Steht allen
// offen, nicht nur Admins – wer eine Anfrage bearbeiten darf, darf sie
// auch als erledigt kennzeichnen. Das Löschen bleibt davon unberührt und
// weiterhin dem Admin vorbehalten (RLS anfragen_delete, siehe 0013).
export async function erledigeAnfrageOhneNachweis(id: string, formData: FormData) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const werte = await anfrageFelderFuerAbschluss(supabase, formData, userData.user?.id ?? null);

  const { error } = await supabase
    .from("anfragen")
    .update({ ...werte, status: "erledigt", erledigt_am: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    redirect(`/anfragen/${id}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/anfragen");
  redirect(mitErfolg(`/anfragen/${id}`, "Anfrage erledigt."));
}

// Abschluss über einen Rapport: legt den Rapport als Entwurf an und
// übernimmt die Beschreibung der Anfrage als Bemerkung. Die Positionen
// erfasst man anschliessend im Rapport selbst, deshalb führt der Weg
// direkt dorthin.
export async function erledigeAnfrageMitRapport(id: string, formData: FormData) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  // Bewusst aus dem Formular und nicht aus der Datenbank: Kunde, Projekt
  // und Beschreibung können unmittelbar vor dem Klick geändert worden
  // sein, und dann gehört der neue Stand in den Rapport.
  const kunde_id = String(formData.get("kunde_id") ?? "").trim();
  const projekt_id = String(formData.get("projekt_id") ?? "").trim();
  const titel = String(formData.get("titel") ?? "").trim();
  const zugewiesen = String(formData.get("zugewiesen_an") ?? "").trim();

  if (!kunde_id) {
    redirect(
      `/anfragen/${id}?error=${encodeURIComponent(
        "Für einen Rapport braucht es einen Kunden. Bitte oben einen auswählen."
      )}`
    );
  }

  // Die Namenszeile gehört nicht in die Bemerkung: Der Rapport führt die
  // ausführende Person als eigenes Feld, sie stünde dort doppelt.
  const bekannteNamen = await alleNamen(supabase);
  const sachtext = ohneNamenszeile(String(formData.get("beschreibung") ?? ""), bekannteNamen);
  const bemerkung = [titel, sachtext].filter((t) => t !== "").join("\n") || null;

  const mitarbeiter_id = zugewiesen || userData.user?.id;

  const { data: rapport, error: rapportError } = await supabase
    .from("rapporte")
    .insert({
      kunde_id,
      projekt_id: projekt_id || null,
      mitarbeiter_id,
      datum: heuteIso(),
      bemerkung,
    })
    .select("id")
    .single();

  if (rapportError || !rapport) {
    redirect(
      `/anfragen/${id}?error=${encodeURIComponent(
        rapportError?.message ?? "Rapport konnte nicht angelegt werden."
      )}`
    );
  }

  const werte = await anfrageFelderFuerAbschluss(supabase, formData, mitarbeiter_id ?? null);

  const { error } = await supabase
    .from("anfragen")
    .update({ ...werte, status: "erledigt", erledigt_am: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    redirect(`/anfragen/${id}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/anfragen");
  revalidatePath("/rapporte");
  redirect(
    mitErfolg(`/rapporte/${rapport.id}`, "Anfrage erledigt – jetzt Positionen erfassen.")
  );
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
