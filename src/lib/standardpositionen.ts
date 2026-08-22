import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

type Standardposition = {
  artikel_id: string;
  vorgabe: number;
  artikel: {
    zaehlt_als_arbeitszeit: boolean;
    rabatt_erlaubt: boolean;
    menge_aus_anreise: boolean;
    klasse_id: string | null;
  } | null;
};

// Rabattvorschlag wie im Erfassungsformular: gesperrte Leistung schlägt
// alles, danach der Klassenrabatt des Kunden, zuletzt sein Standardsatz.
//
// Bewusst dieselbe Reihenfolge wie in zeiterfassung-form.tsx. Eine
// Position, die das Büro automatisch anlegen lässt, muss denselben Preis
// ergeben wie eine von Hand erfasste – sonst hängt der Rabatt davon ab,
// auf welchem Weg die Zeile entstanden ist.
async function rabattFuer(
  supabase: Client,
  kundeId: string,
  artikel: NonNullable<Standardposition["artikel"]>
): Promise<number> {
  if (!artikel.rabatt_erlaubt) return 0;

  if (artikel.klasse_id) {
    const { data: klassenRabatt } = await supabase
      .from("kundenrabatte")
      .select("rabatt_prozent")
      .eq("kunde_id", kundeId)
      .eq("klasse_id", artikel.klasse_id)
      .maybeSingle();
    if (klassenRabatt) return Number(klassenRabatt.rabatt_prozent);
  }

  const { data: kunde } = await supabase
    .from("kunden")
    .select("standard_rabatt_prozent")
    .eq("id", kundeId)
    .maybeSingle();

  return Number(kunde?.standard_rabatt_prozent ?? 0);
}

// Legt die Standardpositionen eines neuen Rapports an (0051).
//
// Ein Fehler lässt den Rapport stehen – er ist bereits angelegt, und ihn
// deswegen abzulehnen wäre der schlechtere Tausch. Gemeldet wird er
// trotzdem: Beim ersten Test blieben die Positionen aus, und weil die
// Funktion schwieg, war nicht zu sehen, woran es lag. Eine Prüfung, die
// stillschweigend nichts tut, hat dieses Projekt schon einmal Tage
// gekostet (siehe die Abwesenheitsprüfung).
export async function legeStandardpositionenAn(
  supabase: Client,
  rapport: {
    id: string;
    // Pflicht seit 0071. Der Kunde wird daraus gelesen und nicht mehr
    // mitgegeben – er stand vorher zusätzlich am Rapport.
    projekt_id: string;
    datum: string;
    mitarbeiter_id: string;
  },
  userId: string | undefined
): Promise<{ anzahl: number; fehler?: string }> {
  // Ohne Projekt lässt sich nichts verrechnen – dieselbe Bedingung wie
  // beim Erfassen einer Position von Hand. Seit 0071 ist projekt_id Pflicht;
  // die Prüfung bleibt, weil der Aufrufer den Wert weiterhin aus einem
  // Formular bezieht.
  if (!rapport.projekt_id) return { anzahl: 0 };

  // Der Kunde des Auftrags – Grundlage für Anreise und Rabatt. Vor 0071 stand
  // er am Rapport; jetzt führt der Weg über das Projekt, und zwar nur hier
  // statt an zwei Stellen.
  // Die Anfahrt kommt aus derselben Abfrage: Sie steht seit 0080 am Auftrag
  // und nicht mehr am Kunden – der Weg wird dadurch kürzer, nicht länger.
  const { data: projekt } = await supabase
    .from("projekte")
    .select("kunde_id, anreise_km")
    .eq("id", rapport.projekt_id)
    .maybeSingle();

  const auftrag = projekt as { kunde_id: string; anreise_km: number | null } | null;
  const kundeId = auftrag?.kunde_id ?? null;

  const { data: vorlagen, error: ladeFehler } = await supabase
    .from("rapport_standardpositionen")
    .select(
      "artikel_id, vorgabe, artikel(zaehlt_als_arbeitszeit, rabatt_erlaubt, menge_aus_anreise, klasse_id)"
    )
    .eq("aktiv", true)
    .order("sortierung");

  if (ladeFehler) return { anzahl: 0, fehler: ladeFehler.message };

  const zeilen = (vorlagen ?? []) as unknown as Standardposition[];
  if (zeilen.length === 0) return { anzahl: 0 };

  const positionen = [];
  for (const zeile of zeilen) {
    const dl = zeile.artikel;
    if (!dl) continue;

    // Die Anreise des Auftrags schlägt die Vorgabe: Genau dafür ist das
    // Häkchen am Artikel da (0050). Fehlt sie am Auftrag, bleibt es bei
    // der Vorgabe.
    const menge =
      !dl.zaehlt_als_arbeitszeit && dl.menge_aus_anreise && auftrag?.anreise_km != null
        ? Number(auftrag.anreise_km)
        : Number(zeile.vorgabe);

    if (!(menge > 0)) continue;

    positionen.push({
      rapport_id: rapport.id,
      projekt_id: rapport.projekt_id,
      artikel_id: zeile.artikel_id,
      datum: rapport.datum,
      mitarbeiter_id: rapport.mitarbeiter_id,
      user_id: userId,
      rabatt_prozent: kundeId ? await rabattFuer(supabase, kundeId, dl) : 0,
      ...(dl.zaehlt_als_arbeitszeit
        ? { dauer_minuten: Math.round(menge), menge: null }
        : { menge, dauer_minuten: null }),
    });
  }

  if (positionen.length === 0) return { anzahl: 0 };

  const { error } = await supabase.from("zeiteintraege").insert(positionen);
  if (error) return { anzahl: 0, fehler: error.message };
  return { anzahl: positionen.length };
}
