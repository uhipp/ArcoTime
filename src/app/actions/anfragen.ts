"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { mitErfolg } from "@/lib/erfolg";
import { heuteIso } from "@/lib/date-utils";
import { mitNamePraefix, ohneNamenszeile } from "@/lib/mitarbeiter-praefix";
import { benachrichtigeZuweisung } from "@/lib/anfrage-benachrichtigung";
import { pruefeTagesgrenze } from "@/lib/tagesbelegung";
import type { AnfrageStatus } from "@/lib/types";
import type { FormularErgebnis } from "@/lib/formular-ergebnis";

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

export async function createAnfrage(
  _bisher: FormularErgebnis,
  formData: FormData
): Promise<FormularErgebnis> {
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
    return { fehler: error?.message ?? "Unbekannter Fehler." };
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

export async function updateAnfrage(
  id: string,
  _bisher: FormularErgebnis,
  formData: FormData
): Promise<FormularErgebnis> {
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
    return { fehler: error.message };
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
async function erledigeAnfrage(
  id: string,
  _bisher: FormularErgebnis,
  formData: FormData
): Promise<FormularErgebnis> {
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
    return { fehler: "Bitte Projekt, Dienstleistung und eine gültige Dauer angeben. Für nicht verrechenbare Arbeit bitte das interne Projekt wählen und Rabatt auf 100% setzen." };
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
    return { fehler: `Für "${dienstleistung.bezeichnung}" sind keine Teilrabatte zugelassen (nur 0% oder 100%).` };
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
      return { fehler: grenze };
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
    return { fehler: zeitError?.message ?? "Unbekannter Fehler" };
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
    return { fehler: error.message };
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
  ausfuehrendeId: string | null,
  anfrageId?: string
): Promise<Record<string, unknown>> {
  const werte: Record<string, unknown> =
    // Fehlt "titel", stammt der Aufruf nicht von der Detailseite; dann
    // bleiben die Stammdaten der Anfrage unangetastet.
    formData.get("titel") === null ? {} : anfrageFromForm(formData);

  // Den Status vor dem Abschluss festhalten, damit die Anfrage dorthin
  // zurückkehren kann, falls Zeiteintrag oder Rapport später gelöscht
  // werden (siehe 0035). Nur beim ERSTEN Abschluss setzen – wer eine
  // bereits erledigte Anfrage nachträglich verrechnet, soll den alten
  // Merkposten nicht mit "erledigt" überschreiben.
  if (anfrageId) {
    const { data: bisher } = await supabase
      .from("anfragen")
      .select("status, status_vor_abschluss")
      .eq("id", anfrageId)
      .single();

    if (bisher && bisher.status !== "erledigt") {
      werte.status_vor_abschluss = bisher.status;
    } else if (bisher?.status_vor_abschluss) {
      werte.status_vor_abschluss = bisher.status_vor_abschluss;
    }
  }

  if (formData.get("titel") === null) return werte;

  // Wer abschliesst, übernimmt die Zuständigkeit – eine erledigte Anfrage
  // ohne zuständige Person ist ein Loch in der Nachvollziehbarkeit.
  if (!werte.zugewiesen_an) werte.zugewiesen_an = ausfuehrendeId;

  const bekannteNamen = await alleNamen(supabase);
  const zustaendigName = await nameFuer(supabase, (werte.zugewiesen_an as string | null) ?? null);
  if (zustaendigName) {
    werte.beschreibung = mitNamePraefix(
      (werte.beschreibung as string | null) ?? null,
      zustaendigName,
      bekannteNamen
    );
  }
  return werte;
}

// Kopiert ausgewählte Dokumente der Anfrage an den neuen Rapport.
//
// Bewusst eine echte Kopie im Storage und nicht dieselbe Datei unter zwei
// Einträgen: loescheDokument() entfernt zum Datensatz immer auch das
// Storage-Objekt. Zwei Zeilen auf denselben Pfad hätten bedeutet, dass das
// Löschen in der Anfrage dem Monteur den Plan aus dem Rapport zieht.
// Fachlich passt die Kopie ohnehin besser: Der Rapport hält fest, was dem
// Monteur mitgegeben wurde, auch wenn die Anfrage später überarbeitet wird.
//
// Ein Fehlschlag bleibt folgenlos für den Abschluss: Der Rapport steht zu
// diesem Zeitpunkt, und ein nicht kopierter Plan lässt sich von Hand
// nachladen – ihn deswegen wieder zu verwerfen wäre der schlechtere Tausch.
// Zurückgegeben wird, wie viele tatsächlich übernommen wurden.
async function uebernehmeDokumente(
  supabase: Awaited<ReturnType<typeof createClient>>,
  dokumentIds: string[],
  rapportId: string
): Promise<number> {
  if (dokumentIds.length === 0) return 0;

  const { data: quellen } = await supabase
    .from("dokumente")
    .select("id, dateiname, speicherpfad, mime_type, groesse_bytes, kategorie_id, notiz")
    .in("id", dokumentIds);

  if (!quellen || quellen.length === 0) return 0;

  const admin = createAdminClient();
  let uebernommen = 0;

  for (const q of quellen) {
    const { data: zeile, error } = await supabase
      .from("dokumente")
      .insert({
        bereich: "rapport",
        bezug_id: rapportId,
        dateiname: q.dateiname,
        speicherpfad: "pending",
        mime_type: q.mime_type,
        groesse_bytes: q.groesse_bytes,
        kategorie_id: q.kategorie_id,
        notiz: q.notiz,
      })
      .select("id")
      .single();

    if (error || !zeile) continue;

    const zielPfad = `rapport/${rapportId}/${zeile.id}-${q.dateiname.replace(/[^\w.-]+/g, "_")}`;
    const { error: kopierFehler } = await admin.storage
      .from("dokumente")
      .copy(q.speicherpfad, zielPfad);

    if (kopierFehler) {
      // Ohne Datei ist die Zeile wertlos – wieder entfernen, sonst steht
      // im Rapport ein Dokument, das sich nicht öffnen lässt.
      await supabase.from("dokumente").delete().eq("id", zeile.id);
      continue;
    }

    await supabase.from("dokumente").update({ speicherpfad: zielPfad }).eq("id", zeile.id);
    uebernommen += 1;
  }

  return uebernommen;
}

// Abschluss ohne Nachweis: kein Zeiteintrag, kein Rapport. Steht allen
// offen, nicht nur Admins – wer eine Anfrage bearbeiten darf, darf sie
// auch als erledigt kennzeichnen. Das Löschen bleibt davon unberührt und
// weiterhin dem Admin vorbehalten (RLS anfragen_delete, siehe 0013).
async function erledigeAnfrageOhneNachweis(
  id: string,
  _bisher: FormularErgebnis,
  formData: FormData
): Promise<FormularErgebnis> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const werte = await anfrageFelderFuerAbschluss(supabase, formData, userData.user?.id ?? null, id);

  const { error } = await supabase
    .from("anfragen")
    .update({ ...werte, status: "erledigt", erledigt_am: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return { fehler: error.message };
  }

  revalidatePath("/anfragen");
  redirect(mitErfolg(`/anfragen/${id}`, "Anfrage erledigt."));
}

// Abschluss über einen Rapport: legt den Rapport als Entwurf an und
// übernimmt die Beschreibung der Anfrage als Bemerkung. Die Positionen
// erfasst man anschliessend im Rapport selbst, deshalb führt der Weg
// direkt dorthin.
async function erledigeAnfrageMitRapport(
  id: string,
  _bisher: FormularErgebnis,
  formData: FormData
): Promise<FormularErgebnis> {
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
    return { fehler: "Für einen Rapport braucht es einen Kunden. Bitte oben einen auswählen." };
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
    return { fehler: rapportError?.message ?? "Rapport konnte nicht angelegt werden." };
  }

  const uebernommen = await uebernehmeDokumente(
    supabase,
    formData.getAll("uebernehmen_dokument").map(String),
    rapport.id
  );

  const werte = await anfrageFelderFuerAbschluss(supabase, formData, mitarbeiter_id ?? null, id);

  const { error } = await supabase
    .from("anfragen")
    .update({
      ...werte,
      status: "erledigt",
      erledigt_am: new Date().toISOString(),
      rapport_id: rapport.id,
    })
    .eq("id", id);

  if (error) {
    return { fehler: error.message };
  }

  revalidatePath("/anfragen");
  revalidatePath("/rapporte");
  const dokumentHinweis =
    uebernommen > 0
      ? ` ${uebernommen} ${uebernommen === 1 ? "Dokument" : "Dokumente"} übernommen.`
      : "";
  redirect(
    mitErfolg(
      `/rapporte/${rapport.id}`,
      `Anfrage erledigt – jetzt Positionen erfassen.${dokumentHinweis}`
    )
  );
}

// Ein Formular, vier Absichten.
//
// Die Detailseite hat oben das Anfrageformular und darunter die
// Abschlusswege – alles in EINEM Formular, damit Änderungen an Titel und
// Beschreibung beim Abschliessen nicht verloren gehen (das war Bug0003).
// Bis hierher hing an jedem Knopf eine eigene Aktion über formAction.
//
// Das ging nicht mehr zusammen mit dem Bewahren der Eingabe:
// useActionState kennt genau eine Aktion je Formular. Deshalb verzweigt
// jetzt eine Aktion über das Feld "absicht", das der gedrückte Knopf
// mitschickt – der Standardweg in HTML, seit es Formulare gibt.
//
// Fehlt das Feld (Enter in einem Textfeld löst den ersten Knopf aus, und
// der trägt keinen Wert), gilt "speichern". Das ist das harmlose Verhalten.
export async function bearbeiteAnfrage(
  id: string,
  bisher: FormularErgebnis,
  formData: FormData
): Promise<FormularErgebnis> {
  const absicht = String(formData.get("absicht") ?? "speichern");

  switch (absicht) {
    case "zeiteintrag":
      return erledigeAnfrage(id, bisher, formData);
    case "rapport":
      return erledigeAnfrageMitRapport(id, bisher, formData);
    case "ohne_nachweis":
      return erledigeAnfrageOhneNachweis(id, bisher, formData);
    default:
      return updateAnfrage(id, bisher, formData);
  }
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
