import type { createClient } from "@/lib/supabase/server";

export type TagesEintrag = {
  id: string;
  start_zeit: string | null;
  end_zeit: string | null;
  dauer_minuten: number | null;
  bezeichnung: string;
};

export type Tagesbelegung = {
  summeMinuten: number;
  eintraege: TagesEintrag[];
  ueberschneidungen: TagesEintrag[];
  warnungAbMinuten: number | null;
  sperreAbMinuten: number | null;
};

function alsMinuten(zeit: string | null): number | null {
  if (!zeit) return null;
  const [h, m] = zeit.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

// Liest, was eine Person an einem Tag bereits erfasst hat, und markiert
// Überschneidungen mit einem geplanten Zeitfenster.
//
// Bewusst NUR Arbeitszeit: Mengenartikel (km, Spesen) haben weder Uhrzeit
// noch Dauer und dürfen die Tagessumme nicht aufblähen. Ein laufender
// Timer zählt ebenfalls nicht mit – seine Dauer steht erst beim Stoppen
// fest.
export async function ladeTagesbelegung({
  supabase,
  mitarbeiterId,
  datum,
  startZeit,
  endZeit,
  ohneEintragId,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  mitarbeiterId: string;
  datum: string;
  startZeit?: string | null;
  endZeit?: string | null;
  ohneEintragId?: string | null;
}): Promise<Tagesbelegung> {
  const [{ data: organisation }, { data: zeilen }] = await Promise.all([
    supabase
      .from("organisationen")
      .select("warnung_ab_minuten_pro_tag, sperre_ab_minuten_pro_tag")
      .limit(1)
      .maybeSingle(),
    supabase
      .from("v_zeiteintraege")
      .select("id, start_zeit, end_zeit, dauer_minuten, dienstleistung_bezeichnung, kunde_name")
      .eq("mitarbeiter_id", mitarbeiterId)
      .eq("datum", datum)
      .not("dauer_minuten", "is", null)
      .is("timer_gestartet_um", null),
  ]);

  const eintraege: TagesEintrag[] = (zeilen ?? [])
    .filter((z) => z.id !== ohneEintragId)
    .map((z) => ({
      id: z.id,
      start_zeit: z.start_zeit ? String(z.start_zeit).slice(0, 5) : null,
      end_zeit: z.end_zeit ? String(z.end_zeit).slice(0, 5) : null,
      dauer_minuten: z.dauer_minuten,
      bezeichnung: `${z.dienstleistung_bezeichnung} (${z.kunde_name})`,
    }));

  const summeMinuten = eintraege.reduce((s, e) => s + Number(e.dauer_minuten ?? 0), 0);

  // Überschneidung nur bestimmbar, wenn beide Seiten Uhrzeiten haben.
  // Einträge, die nur eine Dauer tragen, zählen in die Summe, aber nicht
  // hier – sie liegen zeitlich nirgends fest.
  const neuVon = alsMinuten(startZeit ?? null);
  const neuBis = alsMinuten(endZeit ?? null);

  const ueberschneidungen =
    neuVon != null && neuBis != null && neuBis > neuVon
      ? eintraege.filter((e) => {
          const von = alsMinuten(e.start_zeit);
          const bis = alsMinuten(e.end_zeit);
          if (von == null || bis == null) return false;
          // Berührung an den Rändern ist keine Überschneidung:
          // 09:00–11:00 und 11:00–12:00 gehen nahtlos ineinander über.
          return von < neuBis && bis > neuVon;
        })
      : [];

  return {
    summeMinuten,
    eintraege,
    ueberschneidungen,
    warnungAbMinuten: organisation?.warnung_ab_minuten_pro_tag ?? null,
    sperreAbMinuten: organisation?.sperre_ab_minuten_pro_tag ?? null,
  };
}

export function stundenLabel(minuten: number): string {
  return (minuten / 60).toFixed(2).replace(/\.00$/, "") + " h";
}

// Harte Tagesgrenze. Anders als die Überschneidungswarnung ist das eine
// Sperre: Eine Tagessumme über der eingestellten Schwelle (Standard 24h)
// ist keine Ermessensfrage, sondern praktisch immer ein Tippfehler –
// 4800 statt 480 Minuten. Ohne diese Prüfung wären Soll/Ist-Auswertungen
// pro Mitarbeitendem wertlos.
//
// Gibt eine Fehlermeldung zurück oder null.
export async function pruefeTagesgrenze({
  supabase,
  mitarbeiterId,
  datum,
  neueMinuten,
  ohneEintragId,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  mitarbeiterId: string;
  datum: string;
  neueMinuten: number;
  ohneEintragId?: string | null;
}): Promise<string | null> {
  if (!mitarbeiterId || !neueMinuten) return null;

  const belegung = await ladeTagesbelegung({
    supabase,
    mitarbeiterId,
    datum,
    ohneEintragId,
  });

  if (belegung.sperreAbMinuten == null) return null;

  const gesamt = belegung.summeMinuten + neueMinuten;
  if (gesamt <= belegung.sperreAbMinuten) return null;

  return (
    `Tagesgrenze überschritten: An diesem Tag wären damit ${stundenLabel(gesamt)} erfasst, ` +
    `erlaubt sind ${stundenLabel(belegung.sperreAbMinuten)}. ` +
    `Bitte die Dauer prüfen – die Grenze lässt sich unter Einstellungen anpassen.`
  );
}
