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
  anreise_aus_positionen: {
    titel: "Anfahrt-Kilometer aus bisherigen Positionen übernehmen",
    erklaerung:
      "Sucht bei Kunden ohne hinterlegte Anfahrt in den bereits erfassten Anreise-Positionen nach der zuletzt verrechneten Kilometerzahl und trägt sie beim Kunden ein. Danach schlägt ArcoTime sie bei jeder neuen Position vor.",
    hinweis:
      "Übernommen wird der zuletzt verrechnete Wert. Wo unterschiedliche Distanzen erfasst wurden – etwa für verschiedene Standorte –, ist er nicht zwingend der richtige; die Vorschau zeigt jede Zeile einzeln.",
  },
} as const;

export type AufgabenSchluessel = keyof typeof AUFGABEN;

type Kandidat = { kunde_id: string; name: string; km: number };

// Kunden ohne Anfahrt-km, für die es bereits eine Anreise-Position gibt.
//
// Gelesen wird über die View: Sie führt Kunde, Leistung und Menge
// zusammen, und die Position kennt ihren Artikel ohnehin. Der
// zuletzt erfasste Wert gewinnt – wer die Distanz einmal korrigiert hat,
// hat es beim jüngsten Eintrag getan.
async function kandidaten(supabase: Client): Promise<Kandidat[]> {
  const { data: leistungen } = await supabase
    .from("artikel")
    .select("id")
    .eq("menge_aus_anreise", true);

  const ids = (leistungen ?? []).map((d) => d.id);
  if (ids.length === 0) return [];

  const { data: kunden } = await supabase
    .from("kunden")
    .select("id, name, vorname")
    .is("anreise_km", null);

  const ohneWert = kunden ?? [];
  if (ohneWert.length === 0) return [];

  const { data: positionen } = await supabase
    .from("v_zeiteintraege")
    .select("kunde_id, menge, datum")
    .in("artikel_id", ids)
    .not("menge", "is", null)
    .order("datum", { ascending: false });

  const gefunden = new Map<string, number>();
  for (const p of positionen ?? []) {
    // Die Abfrage kommt absteigend nach Datum – der erste Treffer je
    // Kunde ist damit der jüngste.
    if (!gefunden.has(p.kunde_id) && Number(p.menge) > 0) {
      gefunden.set(p.kunde_id, Number(p.menge));
    }
  }

  return ohneWert
    .filter((k) => gefunden.has(k.id))
    .map((k) => ({
      kunde_id: k.id,
      name: `${k.vorname ? `${k.vorname} ` : ""}${k.name}`,
      km: gefunden.get(k.id)!,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "de-CH"));
}

export async function vorschau(
  supabase: Client,
  aufgabe: AufgabenSchluessel
): Promise<Vorschauzeile[]> {
  if (aufgabe !== "anreise_aus_positionen") return [];

  return (await kandidaten(supabase)).map((k) => ({
    id: k.kunde_id,
    bezeichnung: k.name,
    bisher: "–",
    neu: `${k.km} km`,
  }));
}

export async function fuehreAus(
  supabase: Client,
  aufgabe: AufgabenSchluessel
): Promise<{ anzahl: number; fehler?: string }> {
  if (aufgabe !== "anreise_aus_positionen") return { anzahl: 0 };

  const zeilen = await kandidaten(supabase);
  if (zeilen.length === 0) return { anzahl: 0 };

  // Der alte Wert ist hier immer leer – festgehalten wird er trotzdem.
  // Eine Aufgabe, die ihren Rückweg nur manchmal aufzeichnet, ist eine,
  // bei der man vor dem Auslösen nachdenken muss.
  const vorher = zeilen.map((z) => ({ id: z.kunde_id, anreise_km: null }));

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
      .from("kunden")
      .update({ anreise_km: z.km })
      .eq("id", z.kunde_id);
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

  const zeilen = (lauf.vorher ?? []) as { id: string; anreise_km: number | null }[];

  for (const z of zeilen) {
    const { error } = await supabase
      .from("kunden")
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
    supabase.from("kunden").select("id", { count: "exact", head: true }).is("anreise_km", null),
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
      titel: "Kunden ohne Anfahrt-Kilometer",
      erklaerung:
        "Bei diesen Kunden schlägt ArcoTime keine Kilometer vor; sie werden bei jedem Einsatz von Hand getippt.",
      anzahl: ohneAnreise.count ?? 0,
      href: "/kunden?sort=anreise",
      linkText: "Kundenliste öffnen",
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
