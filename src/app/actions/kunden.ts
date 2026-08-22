"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { mitErfolg } from "@/lib/erfolg";
import { loeschHinweis } from "@/lib/loeschen";
import type { FormularErgebnis } from "@/lib/formular-ergebnis";
import { konfliktMeldung, STAND_FELD } from "@/lib/konflikt";

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
    // Ohne Häkchen bleibt der Eintrag ein Geschäftspartner ohne Kundenrolle
    // (0074) – Eigentümer, Architekt, Behörde.
    ist_kunde: formData.get("ist_kunde") === "on",
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

  // Konfliktprüfung: Das Update greift nur, wenn der Datensatz seit dem
  // Öffnen des Formulars unverändert ist. Sonst betrifft es null Zeilen
  // und wir melden, statt zu überschreiben (siehe lib/konflikt).
  const stand = String(formData.get(STAND_FELD) ?? "") || null;
  let abfrage = supabase.from("kunden").update(values).eq("id", id);
  if (stand) abfrage = abfrage.eq("updated_at", stand);

  const { data: geaendert, error } = await abfrage.select("id");
  if (error) {
    return { fehler: error.message };
  }
  if (!geaendert || geaendert.length === 0) {
    return { fehler: await konfliktMeldung(supabase, "kunden", id, stand) };
  }

  revalidatePath("/kunden");
  revalidatePath(`/kunden/${id}`);
  // Auf dem Kunden bleiben. Die Liste steht links in derselben Maske – wer
  // eine Adresse korrigiert, will danach nicht suchen, wo er war.
  redirect(mitErfolg(`/kunden/${id}?reiter=adresse`, "Adresse gespeichert."));
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
  const artikel_id = String(formData.get("artikel_id") ?? "").trim();
  const preis = Number(formData.get("preis") ?? NaN);

  if (!artikel_id) {
    redirect(`/kunden/${kundeId}?reiter=konditionen&error=${encodeURIComponent("Bitte einen Artikel wählen.")}`);
  }
  if (Number.isNaN(preis) || preis < 0) {
    redirect(`/kunden/${kundeId}?reiter=konditionen&error=${encodeURIComponent("Bitte einen gültigen Preis angeben.")}`);
  }

  // ab_menge 0 = Grundpreis. Die Staffel-Spalte existiert bereits, wird
  // aber noch nicht über die Oberfläche gepflegt (siehe 0022).
  const { error } = await supabase
    .from("kundenpreise")
    .upsert(
      { kunde_id: kundeId, artikel_id, ab_menge: 0, preis },
      { onConflict: "kunde_id,artikel_id,ab_menge" }
    );

  if (error) {
    redirect(`/kunden/${kundeId}?reiter=konditionen&error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath(`/kunden/${kundeId}`);
  redirect(mitErfolg(
      `/kunden/${kundeId}?reiter=konditionen&fokus=neuer_kundenpreis`,
      "Kundenpreis gespeichert."
    ));
}

export async function loescheKundenpreis(kundeId: string, id: string) {
  const supabase = await createClient();
  await supabase.from("kundenpreise").delete().eq("id", id);
  revalidatePath(`/kunden/${kundeId}`);
  redirect(mitErfolg(`/kunden/${kundeId}?reiter=konditionen`, "Kundenpreis entfernt."));
}

export async function setzeKundenrabatt(kundeId: string, formData: FormData) {
  const supabase = await createClient();
  const klasse_id = String(formData.get("klasse_id") ?? "").trim();
  const rabatt_prozent = Number(formData.get("rabatt_prozent") ?? NaN);

  if (!klasse_id) {
    redirect(`/kunden/${kundeId}?reiter=konditionen&error=${encodeURIComponent("Bitte eine Klasse wählen.")}`);
  }
  if (Number.isNaN(rabatt_prozent) || rabatt_prozent < 0 || rabatt_prozent > 100) {
    redirect(
      `/kunden/${kundeId}?reiter=konditionen&error=${encodeURIComponent("Rabatt muss zwischen 0 und 100% liegen.")}`
    );
  }

  const { error } = await supabase
    .from("kundenrabatte")
    .upsert({ kunde_id: kundeId, klasse_id, rabatt_prozent }, { onConflict: "kunde_id,klasse_id" });

  if (error) {
    redirect(`/kunden/${kundeId}?reiter=konditionen&error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath(`/kunden/${kundeId}`);
  redirect(mitErfolg(
      `/kunden/${kundeId}?reiter=konditionen&fokus=neuer_klassenrabatt`,
      "Klassenrabatt gespeichert."
    ));
}

export async function loescheKundenrabatt(kundeId: string, id: string) {
  const supabase = await createClient();
  await supabase.from("kundenrabatte").delete().eq("id", id);
  revalidatePath(`/kunden/${kundeId}`);
  redirect(mitErfolg(`/kunden/${kundeId}?reiter=konditionen`, "Klassenrabatt entfernt."));
}

// ---------------------------------------------------------------------
// Ansprechpersonen und Kontaktkanäle (0074)
// ---------------------------------------------------------------------
//
// Sobald ein Kunde grösser ist, gibt es dort mehrere Personen, die für den
// Betrieb wichtig sind – die Sachbearbeiterin der Verwaltung, der Hauswart,
// die Filialleitung. Bis 0074 standen sie in einer Notiz.
//
// Nach dem Speichern zurück ins leere Formular (fokus=…), wie überall in
// ArcoTime: Wer eine Person erfasst, erfasst meistens gleich die nächste.

export async function speichereAnsprechperson(kundeId: string, formData: FormData) {
  const supabase = await createClient();
  const str = (v: FormDataEntryValue | null) =>
    v && String(v).trim() !== "" ? String(v).trim() : null;

  const id = str(formData.get("id"));
  const name = str(formData.get("name"));
  if (!name) {
    redirect(
      `/kunden/${kundeId}?reiter=personen&error=${encodeURIComponent("Der Name ist ein Pflichtfeld.")}`
    );
  }

  const werte = {
    kunde_id: kundeId,
    anrede: str(formData.get("anrede")),
    vorname: str(formData.get("vorname")),
    name,
    funktion: str(formData.get("funktion")),
    notiz: str(formData.get("notiz")),
    ist_standard: formData.get("ist_standard") === "on",
    aktiv: formData.get("aktiv") !== "off",
  };

  // Nur eine Standardperson je Kunde: Zwei "Standard" sind keine Vorgabe,
  // sondern eine Frage. Das Zurücksetzen läuft vor dem Speichern, damit die
  // neue Wahl nicht gleich wieder mitzurückgesetzt wird.
  if (werte.ist_standard) {
    let abfrage = supabase
      .from("ansprechpersonen")
      .update({ ist_standard: false })
      .eq("kunde_id", kundeId);
    if (id) abfrage = abfrage.neq("id", id);
    await abfrage;
  }

  const { error } = id
    ? await supabase.from("ansprechpersonen").update(werte).eq("id", id)
    : await supabase.from("ansprechpersonen").insert(werte);

  if (error) {
    redirect(`/kunden/${kundeId}?reiter=personen&error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/kunden/${kundeId}`);
  redirect(
    mitErfolg(
      `/kunden/${kundeId}?reiter=personen&fokus=neue_ansprechperson`,
      id ? "Ansprechperson gespeichert." : "Ansprechperson erfasst."
    )
  );
}

export async function loescheAnsprechperson(kundeId: string, id: string) {
  const supabase = await createClient();
  // Die Kontakte der Person gehen mit (on delete cascade in 0074) – sie
  // gehören ihr und niemandem sonst.
  const { error } = await supabase.from("ansprechpersonen").delete().eq("id", id);
  if (error) {
    redirect(`/kunden/${kundeId}?reiter=personen&error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath(`/kunden/${kundeId}`);
  redirect(mitErfolg(`/kunden/${kundeId}?reiter=personen`, "Ansprechperson entfernt."));
}

// Ein Kontakt hängt entweder am Kunden oder an einer Person – genau an einem
// von beiden, das erzwingt die Bedingung in 0074. Welches von beiden, sagt
// das Formular.
export async function speichereKontakt(kundeId: string, formData: FormData) {
  const supabase = await createClient();
  const str = (v: FormDataEntryValue | null) =>
    v && String(v).trim() !== "" ? String(v).trim() : null;

  const artId = str(formData.get("art_id"));
  const wert = str(formData.get("wert"));
  const ansprechpersonId = str(formData.get("ansprechperson_id"));
  const herkunft = ansprechpersonId ? "personen" : "adresse";

  if (!artId) {
    redirect(
      `/kunden/${kundeId}?reiter=${herkunft}&error=${encodeURIComponent("Bitte eine Kontaktart wählen.")}`
    );
  }
  if (!wert) {
    redirect(
      `/kunden/${kundeId}?reiter=${herkunft}&error=${encodeURIComponent("Bitte einen Wert angeben.")}`
    );
  }

  const { error } = await supabase.from("kontakte").insert({
    // Genau ein Bezug: Person, wenn eine gewählt ist, sonst der Kunde.
    kunde_id: ansprechpersonId ? null : kundeId,
    ansprechperson_id: ansprechpersonId,
    art_id: artId,
    wert,
    bemerkung: str(formData.get("bemerkung")),
  });

  if (error) {
    redirect(`/kunden/${kundeId}?reiter=${herkunft}&error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/kunden/${kundeId}`);
  // Der Kontakt des Betriebs steht im Reiter „Adresse", der einer Person im
  // Reiter „Ansprechpersonen" – zurück muss es dorthin, wo das Formular stand.
  redirect(
    mitErfolg(`/kunden/${kundeId}?reiter=${herkunft}&fokus=neuer_kontakt`, "Kontakt erfasst.")
  );
}

// Den Reiter gibt die aufrufende Liste mit: Sie weiss, ob die Zeile am
// Betrieb oder an einer Person hängt, und eine zusätzliche Abfrage nur, um
// das Ziel der Weiterleitung zu bestimmen, wäre Verschwendung.
export async function loescheKontakt(
  kundeId: string,
  id: string,
  reiter: "adresse" | "personen" = "personen"
) {
  const supabase = await createClient();
  const { error } = await supabase.from("kontakte").delete().eq("id", id);
  if (error) {
    redirect(`/kunden/${kundeId}?reiter=${reiter}&error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath(`/kunden/${kundeId}`);
  redirect(mitErfolg(`/kunden/${kundeId}?reiter=${reiter}`, "Kontakt entfernt."));
}
