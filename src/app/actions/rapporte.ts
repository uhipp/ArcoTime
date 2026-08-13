"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { mitErfolg } from "@/lib/erfolg";
import { heuteIso } from "@/lib/date-utils";
import { normalisiereZeit } from "@/lib/zeit";
import { pruefeGegenDienstleistung } from "@/lib/zeiteintrag-pruefung";
import { pruefeTagesgrenze } from "@/lib/tagesbelegung";
import { mitNamePraefix } from "@/lib/mitarbeiter-praefix";

// Ein Rapport klammert die Positionen eines Kundeneinsatzes zusammen.
// Positionen sind gewöhnliche Zeiteinträge mit gesetzter rapport_id –
// dadurch gelten Preisermittlung, Rabatte, Export und Auswertungen
// unverändert weiter (siehe docs/phase8-arbeitsrapport-plan.md).

// Name der ausführenden Person als erste Zeile der Beschreibung – dieselbe
// Konvention wie in Zeiterfassung und Anfragen (der Comatic-Export kennt
// keine Mitarbeiter-Spalte). Beim Rapport steht die Person im Kopf und gilt
// für alle Positionen, sie muss deshalb nicht je Zeile gewählt werden.
async function mitNamenszeile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  mitarbeiterId: string,
  beschreibung: string | null
): Promise<string | null> {
  const [{ data: person }, { data: alle }] = await Promise.all([
    supabase.from("profiles").select("name").eq("id", mitarbeiterId).single(),
    supabase.from("profiles").select("name"),
  ]);

  if (!person?.name) return beschreibung;
  return mitNamePraefix(beschreibung, person.name, (alle ?? []).map((p) => p.name));
}

function rapportFromForm(formData: FormData) {
  const str = (v: FormDataEntryValue | null) =>
    v && String(v).trim() !== "" ? String(v).trim() : null;

  return {
    kunde_id: String(formData.get("kunde_id") ?? "").trim(),
    projekt_id: str(formData.get("projekt_id")),
    datum: str(formData.get("datum")) ?? heuteIso(),
    mitarbeiter_id: str(formData.get("mitarbeiter_id")),
    bemerkung: str(formData.get("bemerkung")),
    // Planung (Zusatzmodul Disposition). Die Felder fehlen im Formular,
    // wenn das Modul nicht gebucht ist – dann bleiben sie unangetastet.
    ...planzeitenAus(formData),
  };
}

// Die Planzeiten werden im Formular als reine Uhrzeit erfasst; das Datum
// kommt vom Einsatzdatum des Rapports. Ergebnis ist ein Zeitstempel, damit
// sich der Kalender später nicht mit zwei Feldern herumschlagen muss.
function planzeitenAus(formData: FormData) {
  if (!formData.has("geplant_von_zeit")) return {};

  const datum = String(formData.get("datum") ?? "").trim() || heuteIso();
  const zeitstempel = (feld: string) => {
    const zeit = normalisiereZeit(String(formData.get(feld) ?? ""));
    return zeit ? `${datum}T${zeit}:00` : null;
  };

  const gefuerRoh = String(formData.get("geplant_fuer") ?? "").trim();

  return {
    geplant_von: zeitstempel("geplant_von_zeit"),
    geplant_bis: zeitstempel("geplant_bis_zeit"),
    geplant_fuer: gefuerRoh === "" ? null : gefuerRoh,
  };
}

export async function erstelleRapport(formData: FormData) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const werte = rapportFromForm(formData);

  if (!werte.kunde_id) {
    redirect(`/rapporte/neu?error=${encodeURIComponent("Bitte einen Kunden wählen.")}`);
  }

  const { data: neuer, error } = await supabase
    .from("rapporte")
    .insert({
      ...werte,
      mitarbeiter_id: werte.mitarbeiter_id ?? userData.user?.id,
    })
    .select("id")
    .single();

  if (error || !neuer) {
    redirect(
      `/rapporte/neu?error=${encodeURIComponent(error?.message ?? "Unbekannter Fehler.")}`
    );
  }

  revalidatePath("/rapporte");
  // Direkt auf die Detailseite: Ohne Positionen ist ein Rapport nutzlos,
  // der nächste Schritt ist immer das Erfassen der ersten Position.
  redirect(mitErfolg(`/rapporte/${neuer.id}`, "Rapport angelegt – jetzt Positionen erfassen."));
}

export async function aktualisiereRapport(id: string, formData: FormData) {
  const supabase = await createClient();
  const werte = rapportFromForm(formData);

  const { error } = await supabase.from("rapporte").update(werte).eq("id", id);
  if (error) {
    redirect(`/rapporte/${id}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/rapporte/${id}`);
  redirect(mitErfolg(`/rapporte/${id}`, "Rapport gespeichert."));
}

export async function loescheRapport(id: string) {
  const supabase = await createClient();

  // Die Positionen zuerst lösen statt mitzulöschen: Erfasste Leistungen
  // bleiben verrechenbar, auch wenn das Dokument darüber verworfen wird.
  await supabase.from("zeiteintraege").update({ rapport_id: null }).eq("rapport_id", id);

  const { error } = await supabase.from("rapporte").delete().eq("id", id);
  if (error) {
    redirect(`/rapporte/${id}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/rapporte");
  redirect(mitErfolg("/rapporte", "Rapport gelöscht – die erfassten Leistungen bleiben bestehen."));
}

// ---------------------------------------------------------
// Positionen
// ---------------------------------------------------------
export async function fuegePositionHinzu(rapportId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  const { data: rapport } = await supabase
    .from("rapporte")
    .select("id, status, datum, projekt_id, mitarbeiter_id")
    .eq("id", rapportId)
    .single();

  if (!rapport) {
    redirect(`/rapporte?error=${encodeURIComponent("Rapport nicht gefunden.")}`);
  }
  if (rapport.status !== "offen") {
    redirect(
      `/rapporte/${rapportId}?error=${encodeURIComponent(
        "Dieser Rapport ist abgeschlossen und lässt sich nicht mehr ändern."
      )}`
    );
  }
  if (!rapport.projekt_id) {
    redirect(
      `/rapporte/${rapportId}?error=${encodeURIComponent(
        "Bitte zuerst oben ein Projekt wählen – ohne Projekt lässt sich keine Leistung verrechnen."
      )}`
    );
  }

  const str = (v: FormDataEntryValue | null) =>
    v && String(v).trim() !== "" ? String(v).trim() : null;
  const mengeRoh = str(formData.get("menge"));

  const werte = {
    projekt_id: rapport.projekt_id,
    dienstleistung_id: String(formData.get("dienstleistung_id") ?? "").trim(),
    // Datum und ausführende Person kommen vom Rapport, nicht aus dem
    // Positionsformular – sie gelten für den ganzen Einsatz.
    datum: rapport.datum,
    mitarbeiter_id: rapport.mitarbeiter_id,
    start_zeit: normalisiereZeit(str(formData.get("start_zeit"))),
    end_zeit: normalisiereZeit(str(formData.get("end_zeit"))),
    dauer_minuten: Number(formData.get("dauer_minuten") ?? 0),
    menge: mengeRoh === null ? null : Number(mengeRoh),
    beschreibung: str(formData.get("beschreibung")),
    rabatt_prozent: Number(formData.get("rabatt_prozent") ?? 0),
  };

  const fehler = await pruefeGegenDienstleistung(supabase, werte);
  if (fehler) {
    redirect(`/rapporte/${rapportId}?error=${encodeURIComponent(fehler)}`);
  }

  const istArbeitszeit = werte.menge === null;

  if (istArbeitszeit) {
    const grenze = await pruefeTagesgrenze({
      supabase,
      mitarbeiterId: rapport.mitarbeiter_id,
      datum: rapport.datum,
      neueMinuten: werte.dauer_minuten,
    });
    if (grenze) {
      redirect(`/rapporte/${rapportId}?error=${encodeURIComponent(grenze)}`);
    }
  }

  const { error } = await supabase.from("zeiteintraege").insert({
    ...werte,
    beschreibung: await mitNamenszeile(supabase, rapport.mitarbeiter_id, werte.beschreibung),
    ...(istArbeitszeit
      ? { menge: null }
      : { dauer_minuten: null, start_zeit: null, end_zeit: null }),
    rapport_id: rapportId,
    user_id: userData.user?.id,
  });

  if (error) {
    redirect(`/rapporte/${rapportId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/rapporte/${rapportId}`);
  revalidatePath("/zeiterfassung");
  // Zurück ins leere Positionsformular – siehe components/auto-fokus.tsx.
  redirect(
    mitErfolg(`/rapporte/${rapportId}?fokus=pos_dienstleistung`, "Position hinzugefügt.")
  );
}

export async function aktualisierePosition(
  rapportId: string,
  zeiteintragId: string,
  formData: FormData
) {
  const supabase = await createClient();

  const { data: rapport } = await supabase
    .from("rapporte")
    .select("status, datum, mitarbeiter_id")
    .eq("id", rapportId)
    .single();

  if (!rapport || rapport.status !== "offen") {
    redirect(
      `/rapporte/${rapportId}?error=${encodeURIComponent(
        "Dieser Rapport ist abgeschlossen und lässt sich nicht mehr ändern."
      )}`
    );
  }

  const str = (v: FormDataEntryValue | null) =>
    v && String(v).trim() !== "" ? String(v).trim() : null;
  const mengeRoh = str(formData.get("menge"));

  const werte = {
    dienstleistung_id: String(formData.get("dienstleistung_id") ?? "").trim(),
    start_zeit: normalisiereZeit(str(formData.get("start_zeit"))),
    end_zeit: normalisiereZeit(str(formData.get("end_zeit"))),
    dauer_minuten: Number(formData.get("dauer_minuten") ?? 0),
    menge: mengeRoh === null ? null : Number(mengeRoh),
    beschreibung: str(formData.get("beschreibung")),
    rabatt_prozent: Number(formData.get("rabatt_prozent") ?? 0),
  };

  const fehler = await pruefeGegenDienstleistung(supabase, werte);
  if (fehler) {
    redirect(
      `/rapporte/${rapportId}?bearbeiten=${zeiteintragId}&error=${encodeURIComponent(fehler)}`
    );
  }

  const istArbeitszeit = werte.menge === null;

  if (istArbeitszeit) {
    const grenze = await pruefeTagesgrenze({
      supabase,
      mitarbeiterId: rapport.mitarbeiter_id,
      datum: rapport.datum,
      neueMinuten: werte.dauer_minuten,
      // Die eigene bisherige Dauer nicht doppelt zählen.
      ohneEintragId: zeiteintragId,
    });
    if (grenze) {
      redirect(
        `/rapporte/${rapportId}?bearbeiten=${zeiteintragId}&error=${encodeURIComponent(grenze)}`
      );
    }
  }

  // Preis und MWSt-Satz bleiben unangetastet: Sie wurden beim Erfassen
  // eingefroren (0003 und 0021) und dürfen sich durch eine Korrektur der
  // Beschreibung oder Menge nicht ändern. Nur bei gewechselter
  // Dienstleistung ergibt der alte Preis keinen Sinn mehr – dann neu
  // ermitteln lassen, indem beide Felder geleert werden; der Trigger
  // füllt sie wieder.
  const { data: bisher } = await supabase
    .from("zeiteintraege")
    .select("dienstleistung_id")
    .eq("id", zeiteintragId)
    .single();

  const dienstleistungGewechselt =
    bisher != null && bisher.dienstleistung_id !== werte.dienstleistung_id;

  const { error } = await supabase
    .from("zeiteintraege")
    .update({
      ...werte,
      beschreibung: await mitNamenszeile(supabase, rapport.mitarbeiter_id, werte.beschreibung),
      ...(istArbeitszeit
        ? { menge: null }
        : { dauer_minuten: null, start_zeit: null, end_zeit: null }),
      ...(dienstleistungGewechselt ? { preis: null, mwst_code: null, mwst_satz: null } : {}),
    })
    .eq("id", zeiteintragId);

  if (error) {
    redirect(
      `/rapporte/${rapportId}?bearbeiten=${zeiteintragId}&error=${encodeURIComponent(error.message)}`
    );
  }

  revalidatePath(`/rapporte/${rapportId}`);
  revalidatePath("/zeiterfassung");
  redirect(mitErfolg(`/rapporte/${rapportId}`, "Position gespeichert."));
}

export async function loeschePosition(rapportId: string, zeiteintragId: string) {
  const supabase = await createClient();

  // Wirklich löschen, nicht nur vom Rapport lösen: Die Position wurde im
  // Rapport erfasst, ein Entfernen ist hier immer eine Korrektur. Der
  // Datenbank-Trigger verhindert das bei abgeschlossenen Rapporten.
  const { error } = await supabase.from("zeiteintraege").delete().eq("id", zeiteintragId);

  if (error) {
    redirect(`/rapporte/${rapportId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/rapporte/${rapportId}`);
  redirect(mitErfolg(`/rapporte/${rapportId}`, "Position entfernt."));
}

// ---------------------------------------------------------
// Freie Zeiten eines Monteurs an einem Tag
// ---------------------------------------------------------
// Für die Planung im Rapport: zeigt, was bereits verplant ist, und schlägt
// die Lücken dazwischen vor. Aktion mit Rückgabewert statt Redirect – die
// Auskunft soll beim Auswählen der Person erscheinen, nicht nach dem
// Speichern.
//
// Der Rahmen kommt aus den Einstellungen der Organisation (0030), ebenso
// Schliesstage und Abwesenheiten. Ein Vorschlag, der jemanden am 1. August
// oder mitten in dessen Ferien einplant, wäre schlimmer als gar keiner.

function alsMinuten(zeitstempel: string | null): number | null {
  if (!zeitstempel) return null;
  const [h, m] = zeitstempel.slice(11, 16).split(":").map(Number);
  return Number.isNaN(h) || Number.isNaN(m) ? null : h * 60 + m;
}

function alsUhrzeit(minuten: number): string {
  return `${String(Math.floor(minuten / 60)).padStart(2, "0")}:${String(minuten % 60).padStart(2, "0")}`;
}

export async function freieZeitenAm(argumente: {
  mitarbeiterId: string;
  datum: string;
  ohneRapportId?: string | null;
}): Promise<{
  belegt: { von: string; bis: string; titel: string }[];
  frei: { von: string; bis: string }[];
  gesperrt: string | null;
}> {
  const { mitarbeiterId, datum, ohneRapportId } = argumente;

  if (!mitarbeiterId || !datum) return { belegt: [], frei: [], gesperrt: null };

  const supabase = await createClient();

  const [{ data: organisation }, { data: schliesstage }, { data: abwesenheiten }] =
    await Promise.all([
      supabase
        .from("organisationen")
        .select("arbeitstag_von_minuten, arbeitstag_bis_minuten")
        .limit(1)
        .maybeSingle(),
      supabase
        .from("schliesstage")
        .select("bezeichnung")
        .lte("von", datum)
        .gte("bis", datum),
      supabase
        .from("abwesenheiten")
        .select("art, von_zeit, bis_zeit, abwesenheitsarten:art")
        .eq("mitarbeiter_id", mitarbeiterId)
        .lte("von", datum)
        .gte("bis", datum),
    ]);

  const tagVon = organisation?.arbeitstag_von_minuten ?? 420;
  const tagBis = organisation?.arbeitstag_bis_minuten ?? 1080;

  // Schliesstag der Organisation: kein Vorschlag, aber auch keine
  // Bevormundung – ein Noteinsatz am Feiertag lässt sich von Hand eintragen.
  if (schliesstage && schliesstage.length > 0) {
    return {
      belegt: [],
      frei: [],
      gesperrt: `Betriebsfrei: ${schliesstage.map((t) => t.bezeichnung).join(", ")}`,
    };
  }

  // Ganztägige Abwesenheit (ohne Uhrzeiten) sperrt den Tag. Halbtägige
  // Abwesenheiten zählen weiter unten wie ein belegter Block.
  const ganztags = (abwesenheiten ?? []).filter((a) => !a.von_zeit);
  if (ganztags.length > 0) {
    const { data: arten } = await supabase
      .from("abwesenheitsarten")
      .select("wert, bezeichnung, blockiert");
    const blockierend = ganztags.filter(
      (a) => arten?.find((x) => x.wert === a.art)?.blockiert !== false
    );
    if (blockierend.length > 0) {
      const bezeichnung =
        arten?.find((x) => x.wert === blockierend[0].art)?.bezeichnung ?? "Abwesend";
      return { belegt: [], frei: [], gesperrt: `Abwesend: ${bezeichnung}` };
    }
  }

  const leer = {
    belegt: [],
    frei: [{ von: alsUhrzeit(tagVon), bis: alsUhrzeit(tagBis) }],
    gesperrt: null,
  };

  const { data } = await supabase
    .from("rapporte")
    .select("id, geplant_von, geplant_bis, kunden(name, vorname)")
    .eq("geplant_fuer", mitarbeiterId)
    .eq("datum", datum)
    .neq("status", "storniert")
    .not("geplant_von", "is", null)
    .not("geplant_bis", "is", null);

  const zeilen = (data ?? []).filter((r) => r.id !== ohneRapportId);
  if (zeilen.length === 0) return leer;

  const belegt = zeilen
    .map((r) => {
      const kunde = r.kunden as { name?: string; vorname?: string | null } | null;
      return {
        vonMin: alsMinuten(r.geplant_von) ?? 0,
        bisMin: alsMinuten(r.geplant_bis) ?? 0,
        titel: `${kunde?.vorname ? `${kunde.vorname} ` : ""}${kunde?.name ?? "Einsatz"}`,
      };
    })
    .filter((b) => b.bisMin > b.vonMin)
    .sort((a, b) => a.vonMin - b.vonMin);

  // Lücken zwischen den belegten Blöcken. Überlappende Blöcke werden dabei
  // verschmolzen – sonst entstünden negative "Lücken".
  const frei: { von: string; bis: string }[] = [];
  let cursor = tagVon;

  for (const b of belegt) {
    if (b.vonMin > cursor) {
      frei.push({ von: alsUhrzeit(cursor), bis: alsUhrzeit(Math.min(b.vonMin, tagBis)) });
    }
    cursor = Math.max(cursor, b.bisMin);
  }
  if (cursor < tagBis) {
    frei.push({ von: alsUhrzeit(cursor), bis: alsUhrzeit(tagBis) });
  }

  return {
    gesperrt: null,
    belegt: belegt.map((b) => ({
      von: alsUhrzeit(b.vonMin),
      bis: alsUhrzeit(b.bisMin),
      titel: b.titel,
    })),
    // Lücken unter 15 Minuten sind als Terminvorschlag wertlos.
    frei: frei.filter((f) => {
      const [vh, vm] = f.von.split(":").map(Number);
      const [bh, bm] = f.bis.split(":").map(Number);
      return bh * 60 + bm - (vh * 60 + vm) >= 15;
    }),
  };
}
