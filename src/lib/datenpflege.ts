import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

// Eine Zeile, wie sie in der Vorschau steht: was drin ist und was daraus
// würde. Bewusst als Text – die Vorschau soll lesbar sein, nicht typsicher.
export type Vorschauzeile = {
  id: string;
  bezeichnung: string;
  bisher: string;
  neu: string;
};

// ---------------------------------------------------------
// Sammelaktionen: Altdaten umformen, mit Vorschau und Rückweg
// ---------------------------------------------------------
// Jede Aufgabe kann drei Dinge: zeigen, was sie täte; es tun und dabei
// die alten Werte aufbewahren; und sich rückgängig machen.
//
// Der Rückweg ist der eigentliche Schutz. Wer 800 Kundenadressen hat,
// kann nicht beurteilen, ob eine Heuristik für alle passt – eine
// Zustimmung vorher wäre eine Unterschrift ins Blaue.

export const AUFGABEN = {
  anreise_am_auftrag_aus_positionen: {
    titel: "Anfahrt-Kilometer aus bisherigen Positionen übernehmen",
    erklaerung:
      "Sucht bei Aufträgen ohne hinterlegte Anfahrt in den bereits erfassten Anreise-Positionen nach der zuletzt verrechneten Kilometerzahl und trägt sie am Auftrag ein. Danach schlägt ArcoTime sie bei jeder neuen Position vor.",
    hinweis:
      "Übernommen wird der zuletzt verrechnete Wert dieses Auftrags. Die Vorschau zeigt jede Zeile einzeln.",
  },
} as const;

// Der alte Schlüssel dieser Aufgabe. Sie hat bis 0080 die Anfahrt am KUNDEN
// gesetzt; die Spalte gibt es nicht mehr, also lässt sich ein solcher Lauf
// nicht mehr zurücknehmen. Statt still zu scheitern, sagt der Rückweg das.
const AUFGABE_VOR_0080 = "anreise_aus_positionen";

export type AufgabenSchluessel = keyof typeof AUFGABEN;

type Kandidat = { projekt_id: string; name: string; km: number };

// Aufträge ohne Anfahrt-km, für die es bereits eine Anreise-Position gibt.
//
// Gelesen wird über die View: Sie führt Auftrag, Artikel und Menge zusammen.
// Der zuletzt erfasste Wert gewinnt – wer die Distanz einmal korrigiert hat,
// hat es beim jüngsten Eintrag getan.
//
// Bis 0080 lief das je Kunde, und der Hinweis musste einschränken, der Wert
// sei „bei verschiedenen Standorten nicht zwingend der richtige". Diese
// Einschränkung ist weg: Die Anfahrt gehört zum Auftrag, und der Auftrag hat
// genau einen Einsatzort.
async function kandidaten(supabase: Client): Promise<Kandidat[]> {
  const { data: leistungen } = await supabase
    .from("artikel")
    .select("id")
    .eq("menge_aus_anreise", true);

  const ids = (leistungen ?? []).map((d) => d.id);
  if (ids.length === 0) return [];

  const { data: projekte } = await supabase
    .from("projekte")
    .select("id, bezeichnung, kunden(name, vorname)")
    .is("anreise_km", null);

  const ohneWert = (projekte ?? []) as unknown as {
    id: string;
    bezeichnung: string;
    kunden?: { name: string; vorname: string | null } | null;
  }[];
  if (ohneWert.length === 0) return [];

  const { data: positionen } = await supabase
    .from("v_zeiteintraege")
    .select("projekt_id, menge, datum")
    .in("artikel_id", ids)
    .not("menge", "is", null)
    .order("datum", { ascending: false });

  const gefunden = new Map<string, number>();
  for (const p of positionen ?? []) {
    // Die Abfrage kommt absteigend nach Datum – der erste Treffer je
    // Auftrag ist damit der jüngste.
    if (!gefunden.has(p.projekt_id) && Number(p.menge) > 0) {
      gefunden.set(p.projekt_id, Number(p.menge));
    }
  }

  return ohneWert
    .filter((pr) => gefunden.has(pr.id))
    .map((pr) => {
      const kunde = Array.isArray(pr.kunden) ? pr.kunden[0] : pr.kunden;
      const kundeName = kunde
        ? `${kunde.vorname ? `${kunde.vorname} ` : ""}${kunde.name}`
        : "";
      return {
        projekt_id: pr.id,
        name: kundeName ? `${kundeName} – ${pr.bezeichnung}` : pr.bezeichnung,
        km: gefunden.get(pr.id)!,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "de-CH"));
}

export async function vorschau(
  supabase: Client,
  aufgabe: AufgabenSchluessel
): Promise<Vorschauzeile[]> {
  if (aufgabe !== "anreise_am_auftrag_aus_positionen") return [];

  return (await kandidaten(supabase)).map((k) => ({
    id: k.projekt_id,
    bezeichnung: k.name,
    bisher: "–",
    neu: `${k.km} km`,
  }));
}

export async function fuehreAus(
  supabase: Client,
  aufgabe: AufgabenSchluessel
): Promise<{ anzahl: number; fehler?: string }> {
  if (aufgabe !== "anreise_am_auftrag_aus_positionen") return { anzahl: 0 };

  const zeilen = await kandidaten(supabase);
  if (zeilen.length === 0) return { anzahl: 0 };

  // Der alte Wert ist hier immer leer – festgehalten wird er trotzdem.
  // Eine Aufgabe, die ihren Rückweg nur manchmal aufzeichnet, ist eine,
  // bei der man vor dem Auslösen nachdenken muss.
  const vorher = zeilen.map((z) => ({ id: z.projekt_id, anreise_km: null }));

  // Der Lauf wird VOR den Änderungen festgehalten, nicht danach.
  //
  // Ursprünglich stand er am Schluss – und beim ersten Einsatz scheiterte
  // genau dieses Insert (die Tabelle war der Schnittstelle noch nicht
  // bekannt). Die Kunden waren da längst geändert, ohne dass ein Rückweg
  // aufgezeichnet war. Bei einer Aufgabe, deren einziger Schutz die
  // Rückholbarkeit ist, ist das die falsche Reihenfolge: Erst die Spur,
  // dann die Tat. Scheitert das Schreiben der Spur, ist noch nichts
  // passiert; scheitert eine Änderung danach, gilt der Rückweg trotzdem
  // für alles, was geschrieben wurde.
  const { data: lauf, error: protokollFehler } = await supabase
    .from("datenpflege_laeufe")
    .insert({ aufgabe, anzahl: zeilen.length, vorher })
    .select("id")
    .single();

  if (protokollFehler || !lauf) {
    return {
      anzahl: 0,
      fehler: `Der Lauf liess sich nicht festhalten – es wurde nichts geändert. ${
        protokollFehler?.message ?? ""
      }`.trim(),
    };
  }

  for (const z of zeilen) {
    const { error } = await supabase
      .from("projekte")
      .update({ anreise_km: z.km })
      .eq("id", z.projekt_id);
    if (error) {
      return {
        anzahl: 0,
        fehler: `${error.message} – der bereits geänderte Teil lässt sich unten rückgängig machen.`,
      };
    }
  }

  return { anzahl: zeilen.length };
}

export async function macheRueckgaengig(
  supabase: Client,
  laufId: string
): Promise<{ anzahl: number; fehler?: string }> {
  const { data: lauf } = await supabase
    .from("datenpflege_laeufe")
    .select("id, aufgabe, vorher, rueckgaengig_am")
    .eq("id", laufId)
    .single();

  if (!lauf) return { anzahl: 0, fehler: "Dieser Lauf wurde nicht gefunden." };
  if (lauf.rueckgaengig_am) {
    return { anzahl: 0, fehler: "Dieser Lauf wurde bereits rückgängig gemacht." };
  }

  // Ein Lauf von vor 0080 hat die Anfahrt am KUNDEN gesetzt. Die Spalte gibt
  // es nicht mehr; ein Rückweg würde an einer unverständlichen Meldung
  // scheitern. Lieber sagen, warum es nicht geht.
  if (lauf.aufgabe === AUFGABE_VOR_0080) {
    return {
      anzahl: 0,
      fehler:
        "Dieser Lauf stammt aus der Zeit, als die Anfahrt am Kunden stand. " +
        "Seit dem Umbau gehört sie zum Auftrag, und das alte Feld gibt es " +
        "nicht mehr – der Lauf lässt sich deshalb nicht mehr zurücknehmen.",
    };
  }

  const zeilen = (lauf.vorher ?? []) as { id: string; anreise_km: number | null }[];

  for (const z of zeilen) {
    const { error } = await supabase
      .from("projekte")
      .update({ anreise_km: z.anreise_km })
      .eq("id", z.id);
    if (error) return { anzahl: 0, fehler: error.message };
  }

  // Der Lauf bleibt stehen und wird als rückgängig vermerkt. Ihn zu
  // löschen hiesse, die Spur zu verwischen – und genau die ist der Zweck
  // dieses Bereichs.
  await supabase
    .from("datenpflege_laeufe")
    .update({ rueckgaengig_am: new Date().toISOString() })
    .eq("id", laufId);

  return { anzahl: zeilen.length };
}

// ---------------------------------------------------------
// Prüfungen: Lücken zeigen, ohne etwas anzufassen
// ---------------------------------------------------------
// Sie ändern nichts und schlagen nichts vor, sie zählen nur und
// verlinken auf die Stelle, an der sich die Lücke schliessen lässt. Was
// fehlt, merkt man sonst erst, wenn es fehlt – beim Versand ohne
// E-Mail-Adresse, im Brief ohne Ort.

export type Pruefung = {
  titel: string;
  erklaerung: string;
  anzahl: number;
  href: string;
  linkText: string;
};

export async function pruefungen(supabase: Client): Promise<Pruefung[]> {
  // Vier einzelne Abfragen statt eines Helfers: Der Abfragebauer von
  // supabase-js lässt sich nicht sinnvoll durchreichen, und vier
  // ausgeschriebene Zeilen sind lesbarer als ein Helfer mit
  // unterdrückten Typfehlern.
  const [ohneOrt, ohneEmail, ohneAnreise, ohneLeitung] = await Promise.all([
    supabase
      .from("kunden")
      .select("id", { count: "exact", head: true })
      .or("plz.is.null,ort.is.null"),
    supabase.from("kunden").select("id", { count: "exact", head: true }).is("email", null),
    supabase
      .from("projekte")
      .select("id", { count: "exact", head: true })
      .is("anreise_km", null)
      .eq("status", "aktiv"),
    supabase
      .from("projekte")
      .select("id", { count: "exact", head: true })
      .is("projektleiter_id", null)
      .eq("status", "aktiv"),
  ]);

  return [
    {
      titel: "Kunden ohne PLZ oder Ort",
      erklaerung:
        "Ohne vollständige Adresse fehlt auf Rapport und PDF die Empfängerzeile, und der Brief passt nicht ins Fenstercouvert.",
      anzahl: ohneOrt.count ?? 0,
      href: "/kunden?sort=ort",
      linkText: "Kundenliste öffnen",
    },
    {
      titel: "Kunden ohne E-Mail-Adresse",
      erklaerung:
        "An diese Kunden lässt sich kein Rapport versenden – der Versand fragt die Adresse dann jedes Mal von Hand ab.",
      anzahl: ohneEmail.count ?? 0,
      href: "/kunden?sort=email",
      linkText: "Kundenliste öffnen",
    },
    {
      titel: "Aktive Aufträge ohne Anfahrt-Kilometer",
      erklaerung:
        "Bei diesen Aufträgen schlägt ArcoTime keine Kilometer vor; sie werden bei jedem Einsatz von Hand getippt.",
      anzahl: ohneAnreise.count ?? 0,
      href: "/projekte",
      linkText: "Auftragsliste öffnen",
    },
    {
      titel: "Aktive Projekte ohne Projektleitung",
      erklaerung:
        "Ohne Projektleitung schlägt ein neuer Rapport keine verantwortliche Person vor – und abschliessen darf sie nur, wer eingetragen ist.",
      anzahl: ohneLeitung.count ?? 0,
      href: "/projekte?sort=projektleitung",
      linkText: "Projektliste öffnen",
    },
  ].filter((p) => p.anzahl > 0);
}
