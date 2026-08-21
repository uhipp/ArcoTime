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
import { rapportNummer } from "@/lib/types";
import { formatDatumCH } from "@/lib/date-utils";
import { emailFehler } from "@/lib/email-pruefung";
import { sendeMail } from "@/lib/email";
import { ladeRapportDokument } from "@/lib/rapport-dokument-daten";
import { RapportPdf } from "@/lib/rapport-pdf";
import { renderToBuffer } from "@react-pdf/renderer";
import { legeStandardpositionenAn } from "@/lib/standardpositionen";
import { monatGesperrt } from "@/lib/zeitkonto";
import { datenbankFehlerText } from "@/lib/db-fehler";

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
    // kunde_id steht bewusst NICHT hier: Das Formular führt ein
    // Kundenfeld, aber nur als Filter für die Projektauswahl. Der Kunde
    // gehört seit 0071 zum Projekt (docs/plan-parteien-standorte.md).
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

  // geplant_fuer wird seit 0045 nicht mehr geschrieben: Wer eingeplant
  // ist, steht in rapport_beteiligte. Zwei Quellen für dieselbe Aussage
  // laufen auseinander.
  return {
    geplant_von: zeitstempel("geplant_von_zeit"),
    geplant_bis: zeitstempel("geplant_bis_zeit"),
  };
}

export async function erstelleRapport(
  _bisher: FormularErgebnis,
  formData: FormData
): Promise<FormularErgebnis> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const werte = rapportFromForm(formData);

  // Auch serverseitig: Ohne Projekt lässt sich keine Position erfassen –
  // der Rapport wäre eine Hülle, die aussieht, als könnte sie etwas. Die
  // frühere Prüfung auf einen Kunden entfällt: Er kommt mit dem Projekt.
  if (!werte.projekt_id) {
    return {
      fehler:
        "Bitte ein Projekt wählen – ohne Projekt lässt sich keine Leistung verrechnen. Neue Projekte legst du direkt im Auswahlfeld an.",
    };
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

  // Die verantwortliche Person gehört zum Einsatz – ohne sie stünde ein
  // frisch angelegter Rapport in der Disposition in keiner Spalte.
  await supabase
    .from("rapport_beteiligte")
    .upsert(
      { rapport_id: neuer.id, mitarbeiter_id: werte.mitarbeiter_id ?? userData.user?.id },
      { onConflict: "rapport_id,mitarbeiter_id" }
    );

  // Womit ein Rapport beginnt, legt die Organisation fest (0051).
  const standard = await legeStandardpositionenAn(
    supabase,
    {
      id: neuer.id,
      projekt_id: werte.projekt_id,
      datum: werte.datum,
      mitarbeiter_id: werte.mitarbeiter_id ?? userData.user?.id ?? "",
    },
    userData.user?.id
  );

  revalidatePath("/rapporte");
  // Direkt auf die Detailseite: Ohne Positionen ist ein Rapport nutzlos,
  // der nächste Schritt ist immer das Erfassen der ersten Position.
  if (standard.fehler) {
    redirect(
      `/rapporte/${neuer.id}?error=${encodeURIComponent(
        `Rapport angelegt, aber die Standardpositionen liessen sich nicht übernehmen: ${standard.fehler}`
      )}`
    );
  }

  redirect(
    mitErfolg(
      `/rapporte/${neuer.id}`,
      standard.anzahl > 0
        ? `Rapport angelegt, ${standard.anzahl} Standardposition${
            standard.anzahl > 1 ? "en" : ""
          } übernommen.`
        : "Rapport angelegt – jetzt Positionen erfassen."
    )
  );
}

export async function aktualisiereRapport(
  id: string,
  _bisher: FormularErgebnis,
  formData: FormData
): Promise<FormularErgebnis> {
  const supabase = await createClient();
  const werte = rapportFromForm(formData);

  if (!werte.projekt_id) {
    return {
      fehler:
        "Bitte ein Projekt wählen – ohne Projekt lässt sich keine Leistung verrechnen. Neue Projekte legst du direkt im Auswahlfeld an.",
    };
  }

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

  // Verantwortliche Person immer im Team führen – auch nach einem Wechsel
  // im Kopf. Die alte bleibt drin: Sie war eingeplant, und ob sie weiter
  // mitfährt, entscheidet die Disposition, nicht ein Nebeneffekt.
  if (werte.mitarbeiter_id) {
    await supabase
      .from("rapport_beteiligte")
      .upsert(
        { rapport_id: id, mitarbeiter_id: werte.mitarbeiter_id },
        { onConflict: "rapport_id,mitarbeiter_id" }
      );
  }

  revalidatePath(`/rapporte/${id}`);
  revalidatePath("/disposition");
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
    // Person der Position: gewählt aus dem Team, sonst die
    // verantwortliche Person des Rapports (0046).
    mitarbeiter_id:
      String(formData.get("mitarbeiter_id") ?? "").trim() || rapport.mitarbeiter_id,
    start_zeit: normalisiereZeit(str(formData.get("start_zeit"))),
    end_zeit: normalisiereZeit(str(formData.get("end_zeit"))),
    dauer_minuten: Number(formData.get("dauer_minuten") ?? 0),
    menge: mengeRoh === null ? null : Number(mengeRoh),
    beschreibung: str(formData.get("beschreibung")),
    rabatt_prozent: Number(formData.get("rabatt_prozent") ?? 0),
  };

  // Abgeschlossener Monat: Die Datenbank lehnt ab (0059), hier steht der
  // Grund im Klartext.
  const gesperrt = await monatGesperrt(supabase, werte.mitarbeiter_id, werte.datum);
  if (gesperrt) return { fehler: gesperrt };

  const fehler = await pruefeGegenDienstleistung(supabase, werte);
  if (fehler) {
    return { fehler };
  }

  const istArbeitszeit = werte.menge === null;

  if (istArbeitszeit) {
    // Die Tagesgrenze gilt der Person, die die Stunde leistet – nicht der
    // verantwortlichen des Rapports. Sonst zählte bei einem Team alles
    // auf die Projektleitung, und die Grenze wäre für beide falsch.
    const grenze = await pruefeTagesgrenze({
      supabase,
      mitarbeiterId: werte.mitarbeiter_id,
      datum: rapport.datum,
      neueMinuten: werte.dauer_minuten,
    });
    if (grenze) {
      return { fehler: grenze };
    }
  }

  const { error } = await supabase.from("zeiteintraege").insert({
    ...werte,
    // Namenszeile auf die Person der Position, wie beim Ändern (0046).
    // Stand hier auf rapport.mitarbeiter_id: Die Position wurde zwar auf
    // die gewählte Person gebucht, in der Beschreibung – und damit im
    // Export – stand aber die Projektleitung.
    beschreibung: await mitNamenszeile(supabase, werte.mitarbeiter_id, werte.beschreibung),
    ...(istArbeitszeit
      ? { menge: null }
      : { dauer_minuten: null, start_zeit: null, end_zeit: null }),
    rapport_id: rapportId,
    user_id: userData.user?.id,
  });

  if (error) {
    // Seit 0072 kann hier eine Bedingung der Datenbank greifen (überlappende
    // Zeiten derselben Person). Ihre Meldung im Originalton hilft niemandem.
    return { fehler: datenbankFehlerText(error) };
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

  // Abgeschlossener Monat: Die Datenbank lehnt ab (0059), hier steht der
  // Grund im Klartext. Gefragt wird nach der Person der Position – bei
  // einem Team hat jede ihr eigenes Zeitkonto.
  const { data: bisherigePerson } = await supabase
    .from("zeiteintraege")
    .select("mitarbeiter_id, datum")
    .eq("id", zeiteintragId)
    .maybeSingle();

  const gesperrt = await monatGesperrt(
    supabase,
    bisherigePerson?.mitarbeiter_id ?? rapport.mitarbeiter_id,
    bisherigePerson?.datum ?? rapport.datum
  );
  if (gesperrt) return { fehler: gesperrt };

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
    .select("dienstleistung_id, mitarbeiter_id")
    .eq("id", zeiteintragId)
    .single();

  const dienstleistungGewechselt =
    bisher != null && bisher.dienstleistung_id !== werte.dienstleistung_id;

  // Namenszeile auf die Person der Position, nicht auf die des Kopfs: Bei
  // einem Team leistet nicht die verantwortliche Person jede Stunde, und
  // im Export ist die Namenszeile die einzige Spur, wem sie gehört.
  const personDerPosition =
    (werte as { mitarbeiter_id?: string }).mitarbeiter_id ||
    bisher?.mitarbeiter_id ||
    rapport.mitarbeiter_id;

  const { data: geaendert, error } = await supabase
    .from("zeiteintraege")
    .update({
      ...werte,
      beschreibung: await mitNamenszeile(supabase, personDerPosition, werte.beschreibung),
      ...(istArbeitszeit
        ? { menge: null }
        : { dauer_minuten: null, start_zeit: null, end_zeit: null }),
      ...(dienstleistungGewechselt ? { preis: null, mwst_code: null, mwst_satz: null } : {}),
    })
    .eq("id", zeiteintragId)
    .select("id");

  if (error) {
    return { fehler: datenbankFehlerText(error) };
  }
  // Null betroffene Zeilen kommen ohne Fehler zurück, wenn RLS ablehnt.
  // Ohne diese Prüfung meldete die Seite "gespeichert", und die Korrektur
  // war weg – dieselbe stille Falle wie bei Kunden und Projekten (0031).
  if (!geaendert || geaendert.length === 0) {
    return {
      fehler:
        "Die Änderung wurde nicht übernommen. Entweder ist die Position bereits exportiert, oder dir fehlen die Rechte.",
    };
  }

  revalidatePath(`/rapporte/${rapportId}`);
  revalidatePath("/zeiterfassung");
  // Zurück ins leere Positionsformular – dieselbe Regel wie beim
  // Erfassen. Ohne den Parameter beginnt die Seite wieder oben, und wer
  // eine Position korrigiert hat, scrollt jedes Mal von Hand zurück.
  redirect(
    mitErfolg(`/rapporte/${rapportId}?fokus=pos_dienstleistung`, "Position gespeichert.")
  );
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
  redirect(
    mitErfolg(`/rapporte/${rapportId}?fokus=pos_dienstleistung`, "Position entfernt.")
  );
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
  // Halbtägige, blockierende Abwesenheiten als Zeitfenster. Sie sperren
  // nicht den ganzen Tag, kollidieren aber mit einem Termin, der in sie
  // hineinfällt – der Aufrufer entscheidet, ob ihn das betrifft.
  abwesend: { vonMin: number; bisMin: number; bezeichnung: string }[];
}> {
  const { mitarbeiterId, datum, ohneRapportId } = argumente;

  if (!mitarbeiterId || !datum) return { belegt: [], frei: [], gesperrt: null, abwesend: [] };

  const supabase = await createClient();

  const [
    { data: organisation },
    { data: schliesstage },
    { data: abwesenheiten, error: abwesenheitenFehler },
  ] = await Promise.all([
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
      // KEIN Verbund auf abwesenheitsarten: abwesenheiten.art hält den
      // Schlüssel (z.B. 'ferien'), aber es gibt keinen Fremdschlüssel
      // darauf – abwesenheitsarten.wert ist nur je Organisation
      // eindeutig. PostgREST fand die Beziehung folglich nicht, gab
      // einen Fehler zurück, und weil hier nur data gelesen wurde, sah
      // jeder Tag abwesenheitsfrei aus: Die Prüfung war seit 0030 wirkungslos.
      supabase
        .from("abwesenheiten")
        .select("art, von_zeit, bis_zeit")
        .eq("mitarbeiter_id", mitarbeiterId)
        .lte("von", datum)
        .gte("bis", datum),
    ]);

  // Eine gescheiterte Abfrage darf nicht als "keine Abwesenheit" gelten –
  // genau das hat den Fehler oben so lange verdeckt. Lieber melden und
  // die Entscheidung der Person überlassen.
  if (abwesenheitenFehler) {
    return {
      belegt: [],
      frei: [],
      gesperrt: "Abwesenheiten liessen sich nicht prüfen",
      abwesend: [],
    };
  }

  const tagVon = organisation?.arbeitstag_von_minuten ?? 420;
  const tagBis = organisation?.arbeitstag_bis_minuten ?? 1080;

  // Schliesstag der Organisation: kein Vorschlag, aber auch keine
  // Bevormundung – ein Noteinsatz am Feiertag lässt sich von Hand eintragen.
  if (schliesstage && schliesstage.length > 0) {
    return {
      belegt: [],
      frei: [],
      gesperrt: `Betriebsfrei: ${schliesstage.map((t) => t.bezeichnung).join(", ")}`,
      abwesend: [],
    };
  }

  // Arten einmal laden: Sie entscheiden, ob eine Abwesenheit die Planung
  // überhaupt blockiert (Homeoffice und Aussendienst tun es nicht).
  const { data: arten } = (abwesenheiten ?? []).length
    ? await supabase.from("abwesenheitsarten").select("wert, bezeichnung, blockiert")
    : { data: [] as { wert: string; bezeichnung: string; blockiert: boolean }[] };

  const artVon = (wert: string) => arten?.find((x) => x.wert === wert);
  const blockiert = (a: { art: string }) => artVon(a.art)?.blockiert !== false;

  // Ganztägige Abwesenheit (ohne Uhrzeiten) sperrt den Tag.
  const ganztags = (abwesenheiten ?? []).filter((a) => !a.von_zeit && blockiert(a));
  if (ganztags.length > 0) {
    const bezeichnung = artVon(ganztags[0].art)?.bezeichnung ?? "Abwesend";
    return { belegt: [], frei: [], gesperrt: `Abwesend: ${bezeichnung}`, abwesend: [] };
  }

  // Halbtägige Abwesenheiten zählen wie ein belegter Block. Der Kommentar
  // an dieser Stelle behauptete das schon, der Code tat es nie: Sie
  // standen weder in "belegt" noch verkleinerten sie "frei", und beim
  // Verschieben kam keine Meldung – eine Weiterbildung von 08:00 bis
  // 12:00 war für die Planung schlicht unsichtbar.
  const abwesend = (abwesenheiten ?? [])
    .filter((a) => a.von_zeit && blockiert(a))
    .map((a) => ({
      vonMin: Number(a.von_zeit.slice(0, 2)) * 60 + Number(a.von_zeit.slice(3, 5)),
      bisMin: a.bis_zeit
        ? Number(a.bis_zeit.slice(0, 2)) * 60 + Number(a.bis_zeit.slice(3, 5))
        : tagBis,
      bezeichnung: artVon(a.art)?.bezeichnung ?? "Abwesend",
    }))
    .filter((a) => a.bisMin > a.vonMin);

  const leer = {
    belegt: [],
    frei: [{ von: alsUhrzeit(tagVon), bis: alsUhrzeit(tagBis) }],
    gesperrt: null,
    abwesend,
  };

  // Belegung über die Beteiligten (0045): Eine Person ist belegt, sobald
  // sie an einem Einsatz teilnimmt – nicht nur, wenn sie ihn verantwortet.
  const { data } = await supabase
    .from("rapporte")
    .select(
      "id, geplant_von, geplant_bis, projekte(kunden(name, vorname)), rapport_beteiligte!inner(mitarbeiter_id)"
    )
    .eq("rapport_beteiligte.mitarbeiter_id", mitarbeiterId)
    .eq("datum", datum)
    .neq("status", "storniert")
    .not("geplant_von", "is", null)
    .not("geplant_bis", "is", null);

  const zeilen = (data ?? []).filter((r) => r.id !== ohneRapportId);
  if (zeilen.length === 0 && abwesend.length === 0) return leer;

  const belegt = [
    ...abwesend.map((a) => ({
      vonMin: a.vonMin,
      bisMin: a.bisMin,
      titel: a.bezeichnung,
    })),
    ...zeilen
    .map((r) => {
      const kunde = (r.projekte as { kunden?: { name?: string; vorname?: string | null } | null } | null)
        ?.kunden ?? null;
      return {
        vonMin: alsMinuten(r.geplant_von) ?? 0,
        bisMin: alsMinuten(r.geplant_bis) ?? 0,
        titel: `${kunde?.vorname ? `${kunde.vorname} ` : ""}${kunde?.name ?? "Einsatz"}`,
      };
    })
    .filter((b) => b.bisMin > b.vonMin),
  ].sort((a, b) => a.vonMin - b.vonMin);

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
    abwesend,
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

// Rapport mit Unterschrift des Kunden abschliessen.
//
// Der Weg, der eigentlich gemeint ist: Der Kunde bestätigt vor Ort, was
// geleistet wurde. Der Abschluss ohne Unterschrift bleibt daneben
// bestehen – er ist der Ausweg, wenn niemand Unterschriftsberechtigtes
// mehr da ist, und verlangt dafür einen Vermerk.
//
// Die Unterschrift steht als PNG-Data-URL in der Zeile des Rapports. Sie
// gehört untrennbar dazu und ist wenige Kilobyte gross; ein Objekt im
// Dateispeicher daneben könnte verwaisen oder separat gelöscht werden
// (siehe 0026).
export async function signiereRapport(
  rapportId: string,
  _bisher: FormularErgebnis,
  formData: FormData
): Promise<FormularErgebnis> {
  const supabase = await createClient();
  const unterschrift = String(formData.get("unterschrift") ?? "").trim();
  const unterzeichner = String(formData.get("unterzeichner_name") ?? "").trim();

  if (unterzeichner === "") {
    return { fehler: "Bitte den Namen der unterzeichnenden Person angeben." };
  }
  if (!unterschrift.startsWith("data:image/png")) {
    return { fehler: "Es fehlt die Unterschrift. Bitte im Feld oben unterschreiben." };
  }

  const { error } = await supabase.rpc("schliesse_rapport", {
    p_rapport_id: rapportId,
    p_status: "signiert",
    p_unterschrift: unterschrift,
    p_unterzeichner: unterzeichner,
    p_vermerk: null,
  });

  if (error) {
    return { fehler: error.message };
  }

  revalidatePath(`/rapporte/${rapportId}`);
  revalidatePath("/rapporte");
  // Ab jetzt zählen die Positionen als erfasste Zeit – siehe 0036.
  revalidatePath("/auswertungen");
  revalidatePath("/zeiterfassung");
  revalidatePath("/kalender");
  redirect(
    mitErfolg(
      `/rapporte/${rapportId}`,
      "Rapport signiert – die Positionen zählen ab jetzt als erfasste Zeit."
    )
  );
}

// Rapport als PDF an den Kunden senden.
//
// Erst nach dem Abschluss: Ein Entwurf ist noch keine Aussage über
// geleistete Arbeit, und ein Kunde, der eine geänderte Fassung nachgereicht
// bekommt, verliert das Vertrauen in beide.
//
// Das PDF wird beim Versand frisch erzeugt statt gespeichert. Ein
// abgeschlossener Rapport ist unveränderlich – die Datei wäre also immer
// dieselbe, und eine gespeicherte Kopie könnte nur veralten oder verwaisen.
export async function versendeRapport(
  rapportId: string,
  _bisher: FormularErgebnis,
  formData: FormData
): Promise<FormularErgebnis> {
  const empfaenger = String(formData.get("empfaenger") ?? "").trim();
  const nachricht = String(formData.get("nachricht") ?? "").trim();

  const adressFehler = emailFehler(empfaenger);
  if (adressFehler) return { fehler: adressFehler };

  const daten = await ladeRapportDokument(rapportId);
  if (!daten) return { fehler: "Rapport nicht gefunden." };

  if (daten.rapport.status === "offen") {
    return {
      fehler:
        "Dieser Rapport ist noch ein Entwurf. Bitte zuerst abschliessen – erst dann steht fest, was der Kunde bekommt.",
    };
  }
  if (daten.rapport.status === "storniert") {
    return { fehler: "Ein stornierter Rapport lässt sich nicht versenden." };
  }

  const nummer = rapportNummer(daten.rapport);
  let pdf: Buffer;
  try {
    pdf = await renderToBuffer(RapportPdf({ daten }));
  } catch (fehler) {
    console.error("PDF konnte nicht erzeugt werden", { rapportId, fehler });
    return { fehler: "Das PDF konnte nicht erzeugt werden. Bitte Arcos melden." };
  }

  const absenderName = daten.absender.name ?? "Ihr Dienstleister";
  const zeilen = [
    `<p>Guten Tag${daten.kunde?.name ? ` ${daten.kunde.name}` : ""},</p>`,
    nachricht
      ? `<p style="white-space:pre-line">${nachricht.replace(/[<>&]/g, "")}</p>`
      : `<p>im Anhang finden Sie den Arbeitsrapport ${nummer} vom ${formatDatumCH(daten.rapport.datum)}.</p>`,
    `<p>Freundliche Grüsse<br>${absenderName}</p>`,
  ];

  try {
    await sendeMail({
      an: empfaenger,
      // Antworten sollen bei der Firma landen, nicht im Systempostfach.
      antwortAn: daten.absender.email,
      betreff: `Arbeitsrapport ${nummer}`,
      html: zeilen.join("\n"),
      anhaenge: [
        {
          dateiname: `Arbeitsrapport ${nummer}.pdf`.replace(/[^\w\s.-]+/g, "_"),
          inhalt: pdf,
          typ: "application/pdf",
        },
      ],
    });
  } catch (fehler) {
    console.error("Rapportversand fehlgeschlagen", { rapportId, empfaenger, fehler });
    return {
      fehler:
        "Der Versand ist fehlgeschlagen. Bitte die Adresse prüfen und erneut versuchen; bleibt es dabei, liegt es am Mailserver.",
    };
  }

  const supabase = await createClient();
  await supabase
    .from("rapporte")
    .update({ versendet_an: empfaenger, versendet_am: new Date().toISOString() })
    .eq("id", rapportId);

  revalidatePath(`/rapporte/${rapportId}`);
  redirect(mitErfolg(`/rapporte/${rapportId}`, `Rapport an ${empfaenger} gesendet.`));
}

// Rapport stornieren.
//
// Der Weg für Korrekturen an einem abgeschlossenen Rapport: Er ist
// unveränderlich, also wird er ungültig gestellt und neu erstellt. Löschen
// wäre falsch – die Nummer wurde vergeben, der Kunde hat womöglich ein
// PDF, und beides muss nachvollziehbar bleiben.
//
// Die Positionen bleiben stehen und gelten ab jetzt dauerhaft als
// vorläufig (siehe 0036): Sie zählen nirgends mehr, verschwinden aber
// nicht – man muss sehen können, was ursprünglich verrechnet werden
// sollte.
//
// Bereits exportierte Positionen verhindern die Stornierung: Sie liegen in
// der Buchhaltung, und sie stillschweigend aus jeder Auswertung zu nehmen
// hiesse, eine Rechnung um ihre Grundlage zu bringen.
export async function storniereRapport(
  rapportId: string,
  _bisher: FormularErgebnis,
  formData: FormData
): Promise<FormularErgebnis> {
  const supabase = await createClient();
  const grund = String(formData.get("storno_grund") ?? "").trim();

  if (grund === "") {
    return { fehler: "Bitte einen Grund angeben – er bleibt am Rapport vermerkt." };
  }

  // Über die Datenbankfunktion, nicht per Update: Die Regel
  // rapporte_update_offen lässt Änderungen nur an offenen Rapporten zu,
  // und das soll so bleiben. Alle Prüfungen – Status, bereits exportierte
  // Positionen – stehen dort und werden nicht hier nachgebaut (0043).
  const { error } = await supabase.rpc("storniere_rapport", {
    p_rapport_id: rapportId,
    p_grund: grund,
  });

  if (error) {
    return { fehler: error.message };
  }

  revalidatePath(`/rapporte/${rapportId}`);
  revalidatePath("/rapporte");
  // Die Positionen zählen ab jetzt nicht mehr – siehe 0036.
  revalidatePath("/auswertungen");
  revalidatePath("/zeiterfassung");
  revalidatePath("/kalender");
  redirect(
    mitErfolg(
      `/rapporte/${rapportId}`,
      "Rapport storniert. Die Positionen zählen nicht mehr, bleiben aber zum Nachvollziehen erhalten."
    )
  );
}

// ---------------------------------------------------------
// Team am Rapport (0045)
// ---------------------------------------------------------
// Das Team ist reine Planung, keine Berechtigung: Wer nicht dazugehört,
// darf trotzdem Positionen erfassen – die Disposition etwa fährt nie
// selbst mit. Eingeschränkt wird später über das Berechtigungssystem.

// Alle Mitglieder einer Gruppe auf einmal zum Einsatz nehmen (0049).
//
// Der Regelfall in der Disposition ist "das Team Ost fährt hin", nicht
// drei einzelne Namen. Wer schon dabei ist, bleibt es – upsert statt
// vorher löschen, damit ein bereits von Hand ergänzter Vierter nicht
// wieder verschwindet.
export async function fuegeGruppeHinzu(rapportId: string, formData: FormData) {
  const supabase = await createClient();
  const gruppeId = String(formData.get("gruppe_id") ?? "").trim();

  if (!gruppeId) {
    redirect(`/rapporte/${rapportId}?error=${encodeURIComponent("Bitte eine Gruppe wählen.")}`);
  }

  const { data: mitglieder } = await supabase
    .from("gruppen_mitglieder")
    .select("mitarbeiter_id")
    .eq("gruppe_id", gruppeId);

  if (!mitglieder || mitglieder.length === 0) {
    redirect(
      `/rapporte/${rapportId}?error=${encodeURIComponent(
        "Diese Gruppe hat keine Mitglieder. Unter Einstellungen lassen sie sich zuteilen."
      )}`
    );
  }

  const { error } = await supabase.from("rapport_beteiligte").upsert(
    mitglieder.map((m) => ({ rapport_id: rapportId, mitarbeiter_id: m.mitarbeiter_id })),
    { onConflict: "rapport_id,mitarbeiter_id" }
  );

  if (error) {
    redirect(`/rapporte/${rapportId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/rapporte/${rapportId}`);
  revalidatePath("/disposition");
  revalidatePath("/kalender");
  redirect(
    mitErfolg(
      `/rapporte/${rapportId}?fokus=neue_gruppe_team`,
      `${mitglieder.length} Personen zum Einsatz hinzugefügt.`
    )
  );
}

export async function fuegeBeteiligtenHinzu(
  rapportId: string,
  formData: FormData
) {
  const supabase = await createClient();
  const mitarbeiterId = String(formData.get("mitarbeiter_id") ?? "").trim();

  if (!mitarbeiterId) {
    redirect(`/rapporte/${rapportId}?error=${encodeURIComponent("Bitte eine Person wählen.")}`);
  }

  const { error } = await supabase
    .from("rapport_beteiligte")
    .upsert(
      { rapport_id: rapportId, mitarbeiter_id: mitarbeiterId },
      { onConflict: "rapport_id,mitarbeiter_id" }
    );

  if (error) {
    redirect(`/rapporte/${rapportId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/rapporte/${rapportId}`);
  revalidatePath("/disposition");
  revalidatePath("/kalender");
  redirect(
    mitErfolg(`/rapporte/${rapportId}?fokus=neues_teammitglied`, "Zum Einsatz hinzugefügt.")
  );
}

export async function entferneBeteiligten(rapportId: string, mitarbeiterId: string) {
  const supabase = await createClient();

  const { data: rapport } = await supabase
    .from("rapporte")
    .select("mitarbeiter_id")
    .eq("id", rapportId)
    .single();

  // Die verantwortliche Person bleibt drin: Sie schliesst den Rapport ab
  // und trägt ihn. Wer sie wechseln will, ändert das Feld im Kopf.
  if (rapport?.mitarbeiter_id === mitarbeiterId) {
    redirect(
      `/rapporte/${rapportId}?error=${encodeURIComponent(
        "Die verantwortliche Person lässt sich nicht aus dem Einsatz entfernen. Bitte oben eine andere wählen."
      )}`
    );
  }

  const { error } = await supabase
    .from("rapport_beteiligte")
    .delete()
    .eq("rapport_id", rapportId)
    .eq("mitarbeiter_id", mitarbeiterId);

  if (error) {
    redirect(`/rapporte/${rapportId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/rapporte/${rapportId}`);
  revalidatePath("/disposition");
  revalidatePath("/kalender");
  redirect(
    mitErfolg(`/rapporte/${rapportId}?fokus=neues_teammitglied`, "Aus dem Einsatz entfernt.")
  );
}

// Person im ganzen Rapport ersetzen.
//
// Der Praxisfall: Jemand fällt aus, ein anderer übernimmt. Ohne diese
// Funktion müsste man die Teamzeile tauschen und danach jede einzelne
// Position umhängen – und würde dabei welche vergessen.
//
// Bewusst eine eigene Funktion und kein Nebeneffekt des Ziehens in der
// Disposition: Dort verschiebt man Zeit, hier wechselt man Verantwortung
// samt bereits erfasster Stunden. Zwei verschiedene Absichten.
export async function ersetzeBeteiligten(
  rapportId: string,
  _bisher: FormularErgebnis,
  formData: FormData
): Promise<FormularErgebnis> {
  const supabase = await createClient();
  const alt = String(formData.get("alt_id") ?? "").trim();
  const neu = String(formData.get("neu_id") ?? "").trim();

  if (!alt || !neu) return { fehler: "Bitte beide Personen wählen." };
  if (alt === neu) return { fehler: "Das ist dieselbe Person." };

  const { data: rapport } = await supabase
    .from("rapporte")
    .select("status, mitarbeiter_id")
    .eq("id", rapportId)
    .single();

  if (!rapport) return { fehler: "Rapport nicht gefunden." };
  if (rapport.status !== "offen") {
    return {
      fehler:
        "Dieser Rapport ist abgeschlossen. Für Korrekturen bitte stornieren und neu erstellen.",
    };
  }

  // Bereits exportierte Positionen bleiben, wo sie sind: Sie liegen in der
  // Buchhaltung, und wessen Stunden dort verrechnet wurden, ändert man
  // nicht nachträglich.
  const { data: exportiert } = await supabase
    .from("zeiteintraege")
    .select("id")
    .eq("rapport_id", rapportId)
    .eq("mitarbeiter_id", alt)
    .not("beleg_id", "is", null);

  if (exportiert && exportiert.length > 0) {
    return {
      fehler: `Nicht möglich: ${exportiert.length} ${
        exportiert.length === 1 ? "Position ist" : "Positionen sind"
      } bereits exportiert. Wessen Stunden verrechnet wurden, lässt sich nicht nachträglich ändern.`,
    };
  }

  // Erst die neue Person aufnehmen, dann die Stunden umhängen, dann die
  // alte entfernen. In dieser Reihenfolge ist der Einsatz zu keinem
  // Zeitpunkt ohne Zuständigen.
  const { error: aufnahmeFehler } = await supabase
    .from("rapport_beteiligte")
    .upsert(
      { rapport_id: rapportId, mitarbeiter_id: neu },
      { onConflict: "rapport_id,mitarbeiter_id" }
    );
  if (aufnahmeFehler) return { fehler: aufnahmeFehler.message };

  const { data: umgehaengt, error: stundenFehler } = await supabase
    .from("zeiteintraege")
    .update({ mitarbeiter_id: neu })
    .eq("rapport_id", rapportId)
    .eq("mitarbeiter_id", alt)
    .is("beleg_id", null)
    .select("id");

  if (stundenFehler) return { fehler: stundenFehler.message };

  // Die verantwortliche Person wird im Kopf geführt – wechselt sie, muss
  // auch dort der neue Name stehen, sonst schliesst der Falsche ab.
  if (rapport.mitarbeiter_id === alt) {
    await supabase.from("rapporte").update({ mitarbeiter_id: neu }).eq("id", rapportId);
  }

  await supabase
    .from("rapport_beteiligte")
    .delete()
    .eq("rapport_id", rapportId)
    .eq("mitarbeiter_id", alt);

  revalidatePath(`/rapporte/${rapportId}`);
  revalidatePath("/disposition");
  revalidatePath("/kalender");
  revalidatePath("/zeiterfassung");

  const anzahl = umgehaengt?.length ?? 0;
  redirect(
    mitErfolg(
      `/rapporte/${rapportId}?fokus=neues_teammitglied`,
      anzahl > 0
        ? `Person ersetzt, ${anzahl} ${anzahl === 1 ? "Position" : "Positionen"} umgehängt.`
        : "Person ersetzt."
    )
  );
}

// ---------------------------------------------------------
// Timer an einer Rapportposition (Phase 11, Etappe C)
// ---------------------------------------------------------
// Bisher galt: "Einen Timer gibt es hier bewusst nicht – wer einen
// Rapport schreibt, ist mit der Arbeit fertig." Die Annahme war falsch.
// Der Rapport wird auch WÄHREND des Einsatzes benutzt, aus dem Fahrzeug
// heraus: Der Monteur öffnet den Rapport des Kunden, startet die
// Fahrzeit, fährt los und stoppt bei der Ankunft.
//
// Deshalb zwei Berührungen und sonst nichts. Wer im Auto ein Formular
// ausfüllen muss, tut es während der Fahrt.

export async function starteZeitAnPosition(rapportId: string, positionId: string) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const meineId = userData.user?.id ?? "";

  const { data: rapport } = await supabase
    .from("rapporte")
    .select("status")
    .eq("id", rapportId)
    .single();

  if (rapport?.status !== "offen") {
    redirect(
      `/rapporte/${rapportId}?error=${encodeURIComponent(
        "Dieser Rapport ist abgeschlossen – daran lässt sich keine Zeit mehr messen."
      )}`
    );
  }

  // Ein Timer je Person. Zwei parallel laufende wären eine Zeit, die es
  // nicht gibt – und beim Stoppen wüsste niemand, welche gemeint ist.
  const { data: laufender } = await supabase
    .from("zeiteintraege")
    .select("id, rapport_id")
    .eq("mitarbeiter_id", meineId)
    .not("timer_gestartet_um", "is", null)
    .limit(1)
    .maybeSingle();

  if (laufender && laufender.id !== positionId) {
    redirect(
      `/rapporte/${rapportId}?error=${encodeURIComponent(
        laufender.rapport_id
          ? "Für dich läuft bereits ein Timer an einem anderen Rapport. Bitte zuerst dort stoppen."
          : "Für dich läuft bereits ein Timer in der Zeiterfassung. Bitte zuerst dort stoppen."
      )}`
    );
  }

  const jetzt = new Date();
  const startZeit = `${String(jetzt.getHours()).padStart(2, "0")}:${String(
    jetzt.getMinutes()
  ).padStart(2, "0")}`;

  const { data: geaendert } = await supabase
    .from("zeiteintraege")
    .update({ timer_gestartet_um: jetzt.toISOString(), start_zeit: startZeit, end_zeit: null })
    .eq("id", positionId)
    .is("beleg_id", null)
    .select("id");

  if (!geaendert || geaendert.length === 0) {
    redirect(
      `/rapporte/${rapportId}?error=${encodeURIComponent(
        "Der Timer liess sich nicht starten – entweder ist die Position bereits exportiert, oder dir fehlen die Rechte."
      )}`
    );
  }

  revalidatePath(`/rapporte/${rapportId}`);
  redirect(mitErfolg(`/rapporte/${rapportId}?fokus=timer_${positionId}`, "Timer gestartet."));
}

// Die Dauer wird aus der gespeicherten Startzeit gerechnet und nicht aus
// dem Browser: So stimmt sie auch, wenn das Telefon zwischendurch im
// Ruhezustand war oder der Rapport auf einem anderen Gerät geöffnet wird.
export async function stoppeZeitAnPosition(rapportId: string, positionId: string) {
  const supabase = await createClient();

  const { data: bestehend } = await supabase
    .from("zeiteintraege")
    .select("timer_gestartet_um")
    .eq("id", positionId)
    .single();

  if (!bestehend?.timer_gestartet_um) {
    redirect(
      `/rapporte/${rapportId}?error=${encodeURIComponent("Für diese Position läuft kein Timer.")}`
    );
  }

  const start = new Date(bestehend.timer_gestartet_um);
  const jetzt = new Date();
  // Mindestens eine Minute: Eine Fahrt von null Minuten gibt es nicht,
  // und die Datenbank verlangt einen Wert grösser als null.
  const dauerMinuten = Math.max(1, Math.round((jetzt.getTime() - start.getTime()) / 60000));
  const endZeit = `${String(jetzt.getHours()).padStart(2, "0")}:${String(
    jetzt.getMinutes()
  ).padStart(2, "0")}`;

  const { data: geaendert } = await supabase
    .from("zeiteintraege")
    .update({
      dauer_minuten: dauerMinuten,
      end_zeit: endZeit,
      timer_gestartet_um: null,
    })
    .eq("id", positionId)
    .select("id");

  if (!geaendert || geaendert.length === 0) {
    redirect(
      `/rapporte/${rapportId}?error=${encodeURIComponent(
        "Der Timer liess sich nicht stoppen – bitte die Position von Hand korrigieren."
      )}`
    );
  }

  revalidatePath(`/rapporte/${rapportId}`);
  revalidatePath("/zeiterfassung");
  redirect(
    mitErfolg(
      `/rapporte/${rapportId}?fokus=pos_dienstleistung`,
      `Timer gestoppt – ${dauerMinuten} Minuten übernommen.`
    )
  );
}
