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
import { oeffneAnfrageWieder } from "@/lib/anfrage-wieder-oeffnen";
import type { FormularErgebnis } from "@/lib/formular-ergebnis";
import { konfliktMeldung, STAND_FELD } from "@/lib/konflikt";

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

export async function erstelleRapport(
  _bisher: FormularErgebnis,
  formData: FormData
): Promise<FormularErgebnis> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const werte = rapportFromForm(formData);

  if (!werte.kunde_id) {
    return { fehler: "Bitte einen Kunden wählen." };
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
    return { fehler: error?.message ?? "Unbekannter Fehler." };
  }

  revalidatePath("/rapporte");
  // Direkt auf die Detailseite: Ohne Positionen ist ein Rapport nutzlos,
  // der nächste Schritt ist immer das Erfassen der ersten Position.
  redirect(mitErfolg(`/rapporte/${neuer.id}`, "Rapport angelegt – jetzt Positionen erfassen."));
}

export async function aktualisiereRapport(
  id: string,
  _bisher: FormularErgebnis,
  formData: FormData
): Promise<FormularErgebnis> {
  const supabase = await createClient();
  const werte = rapportFromForm(formData);

  // Konfliktprüfung – siehe lib/konflikt.
  const stand = String(formData.get(STAND_FELD) ?? "") || null;
  let abfrage = supabase
    .from("rapporte")
    .update(werte)
    .eq("id", id);
  if (stand) abfrage = abfrage.eq("updated_at", stand);

  const { data: geaendert, error } = await abfrage.select("id");
  if (error) {
    return { fehler: error.message };
  }
  if (!geaendert || geaendert.length === 0) {
    return { fehler: await konfliktMeldung(supabase, "rapporte", id, stand) };
  }

  revalidatePath(`/rapporte/${id}`);
  redirect(mitErfolg(`/rapporte/${id}`, "Rapport gespeichert."));
}

export async function loescheRapport(id: string) {
  const supabase = await createClient();

  // Die Positionen gehen mit. Wer einen Rapport löscht, tut das, weil der
  // Einsatz nicht stattfindet oder etwas schiefgelaufen ist – dann wurde
  // die Leistung auch nicht erbracht, und sie darf nicht als
  // verrechenbarer Zeiteintrag zurückbleiben. (Bis zu dieser Änderung
  // wurden die Positionen nur gelöst; das hat verrechenbare Arbeit
  // erfunden, die es nie gab.)
  const { data: positionen } = await supabase
    .from("zeiteintraege")
    .select("id, beleg_id")
    .eq("rapport_id", id);

  // Ausnahme: Was bereits exportiert ist, liegt in der Buchhaltung. Solche
  // Positionen wegzulöschen hiesse, eine Rechnung nachträglich um ihre
  // Grundlage zu bringen. Dann lieber gar nicht löschen und den Weg über
  // eine Stornierung gehen – ein halb geleerter Rapport wäre der
  // schlechteste Zustand von allen.
  const exportiert = (positionen ?? []).filter((p) => p.beleg_id).length;
  if (exportiert > 0) {
    redirect(
      `/rapporte/${id}?error=${encodeURIComponent(
        `Dieser Rapport lässt sich nicht löschen: ${exportiert} ${
          exportiert === 1 ? "Position ist" : "Positionen sind"
        } bereits exportiert und damit in der Buchhaltung. Bitte den Rapport stornieren.`
      )}`
    );
  }

  const { error: positionenFehler } = await supabase
    .from("zeiteintraege")
    .delete()
    .eq("rapport_id", id);

  if (positionenFehler) {
    redirect(`/rapporte/${id}?error=${encodeURIComponent(positionenFehler.message)}`);
  }

  // Vor dem Löschen: Stammt der Rapport aus einer Anfrage, war ER der
  // Grund für deren "erledigt". Fällt er weg, muss die Anfrage zurück –
  // sonst steht sie ohne Nachweis und ohne Weg zurück da (siehe 0035).
  // Zwingend vorher, denn der Verweis wird beim Löschen geleert.
  const anfrageGeoeffnet = await oeffneAnfrageWieder(supabase, "rapport_id", id);

  const { error } = await supabase.from("rapporte").delete().eq("id", id);
  if (error) {
    redirect(`/rapporte/${id}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/rapporte");
  revalidatePath("/anfragen");
  redirect(
    mitErfolg(
      "/rapporte",
      [
        `Rapport gelöscht${
          positionen && positionen.length > 0
            ? ` – samt ${positionen.length} ${
                positionen.length === 1 ? "Position" : "Positionen"
              }`
            : ""
        }.`,
        anfrageGeoeffnet ? "Die zugehörige Anfrage ist wieder offen." : "",
      ]
        .filter(Boolean)
        .join(" ")
    )
  );
}

// ---------------------------------------------------------
// Positionen
// ---------------------------------------------------------
export async function fuegePositionHinzu(
  rapportId: string,
  _bisher: FormularErgebnis,
  formData: FormData
): Promise<FormularErgebnis> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  const { data: rapport } = await supabase
    .from("rapporte")
    .select("id, status, datum, projekt_id, mitarbeiter_id")
    .eq("id", rapportId)
    .single();

  if (!rapport) {
    return { fehler: "Rapport nicht gefunden." };
  }
  if (rapport.status !== "offen") {
    return { fehler: "Dieser Rapport ist abgeschlossen und lässt sich nicht mehr ändern." };
  }
  if (!rapport.projekt_id) {
    return { fehler: "Bitte zuerst oben ein Projekt wählen – ohne Projekt lässt sich keine Leistung verrechnen." };
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
    return { fehler };
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
      return { fehler: grenze };
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
    return { fehler: error.message };
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
  _bisher: FormularErgebnis,
  formData: FormData
): Promise<FormularErgebnis> {
  const supabase = await createClient();

  const { data: rapport } = await supabase
    .from("rapporte")
    .select("status, datum, mitarbeiter_id")
    .eq("id", rapportId)
    .single();

  if (!rapport || rapport.status !== "offen") {
    return { fehler: "Dieser Rapport ist abgeschlossen und lässt sich nicht mehr ändern." };
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
    return { fehler };
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
      return { fehler: grenze };
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
    return { fehler: error.message };
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

// ---------------------------------------------------------
// Abschliessen
// ---------------------------------------------------------
// Erste Ausbaustufe: Abschluss OHNE Unterschrift. Der Kunde ist oft nicht
// mehr vor Ort oder nicht unterschriftsberechtigt, und dann darf der
// Rapport nicht tagelang offen liegen – er zählt sonst nirgends. Verlangt
// wird dafür ein Vermerk, warum keine Unterschrift vorliegt; das ist die
// Gegenleistung für die Abkürzung und macht den Fall später nachvollziehbar.
//
// Die eigentliche Arbeit macht schliesse_rapport() in der Datenbank:
// Nummer atomar vergeben, Status setzen, Datum in der Zukunft ablehnen,
// Rapport ohne Positionen ablehnen. Alles, was schiefgehen kann, kommt von
// dort als Ausnahme zurück – hier wird sie nur weitergereicht, statt sie
// nachzubauen und damit zweimal zu pflegen.
export async function schliesseRapportAb(
  rapportId: string,
  _bisher: FormularErgebnis,
  formData: FormData
): Promise<FormularErgebnis> {
  const supabase = await createClient();
  const vermerk = String(formData.get("abschluss_vermerk") ?? "").trim();

  if (vermerk === "") {
    return {
      fehler:
        "Bitte kurz festhalten, warum keine Unterschrift vorliegt – zum Beispiel „Kunde nicht vor Ort“.",
    };
  }

  const { error } = await supabase.rpc("schliesse_rapport", {
    p_rapport_id: rapportId,
    p_status: "abgeschlossen",
    p_unterschrift: null,
    p_unterzeichner: null,
    p_vermerk: vermerk,
  });

  if (error) {
    return { fehler: error.message };
  }

  revalidatePath(`/rapporte/${rapportId}`);
  revalidatePath("/rapporte");
  // Auswertungen, Export und Zeiterfassung zeigen die Positionen ab jetzt:
  // Sie sind nicht mehr vorläufig (siehe 0036).
  revalidatePath("/auswertungen");
  revalidatePath("/zeiterfassung");
  revalidatePath("/kalender");
  redirect(
    mitErfolg(
      `/rapporte/${rapportId}`,
      "Rapport abgeschlossen – die Positionen zählen ab jetzt als erfasste Zeit."
    )
  );
}
