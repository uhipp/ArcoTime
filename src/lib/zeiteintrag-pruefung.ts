import type { createClient } from "@/lib/supabase/server";

export type ZeiteintragWerte = {
  artikel_id: string;
  dauer_minuten: number;
  menge: number | null;
  rabatt_prozent: number;
};

// Regeln, die nicht dem Browser überlassen werden dürfen: Ob nach Dauer
// oder nach Menge erfasst wird und ob ein Rabatt zulässig ist, hängt an der
// Artikel, nicht am Formular.
//
// Liegt in der lib und nicht in einer "use server"-Datei: Dort würde jeder
// Export zur Server Action, deren Argumente serialisierbar sein müssen –
// ein Supabase-Client ist das nicht. Genau daran ist die Anwendung schon
// einmal abgestürzt.
//
// Gibt eine Fehlermeldung zurück oder null.
export async function pruefeGegenArtikel(
  supabase: Awaited<ReturnType<typeof createClient>>,
  werte: ZeiteintragWerte
): Promise<string | null> {
  const { data: artikel } = await supabase
    .from("artikel")
    .select("bezeichnung, einheit, zaehlt_als_arbeitszeit, rabatt_erlaubt")
    .eq("id", werte.artikel_id)
    .single();

  if (!artikel) return "Artikel nicht gefunden.";

  if (artikel.zaehlt_als_arbeitszeit) {
    if (!werte.dauer_minuten || werte.dauer_minuten <= 0) {
      return "Bitte eine gültige Dauer angeben (mind. 1 Minute) – Von/Bis oder Dauer prüfen.";
    }
  } else if (!werte.menge || werte.menge <= 0) {
    return `Bitte eine Menge in ${artikel.einheit} angeben.`;
  }

  // 100% bleibt erlaubt: Das ist die Konvention für "nicht verrechnet",
  // die auch bei Spesen möglich bleiben muss. Gesperrt sind Teilrabatte.
  if (
    !artikel.rabatt_erlaubt &&
    werte.rabatt_prozent > 0 &&
    werte.rabatt_prozent < 100
  ) {
    return `Für "${artikel.bezeichnung}" sind keine Teilrabatte zugelassen (nur 0% oder 100%).`;
  }

  return null;
}
