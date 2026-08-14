import type { createClient } from "@/lib/supabase/server";

// Name des Feldes, über das ein Formular seinen Stand mitschickt.
export const STAND_FELD = "stand";

// Prüft nach einem Update, ob jemand anders zwischenzeitlich gespeichert
// hat – und wenn ja, wer.
//
// Der Ablauf: Das Formular merkt sich beim Öffnen updated_at des
// Datensatzes und schickt ihn beim Speichern mit. Das Update läuft als
// "where id = ? and updated_at = ?". Passt der Stand nicht mehr, betrifft
// es null Zeilen – und statt zu überschreiben wird gemeldet.
//
// Warum nicht optimistisch weiterspeichern und den Konflikt hinnehmen:
// Weil der Verlust unsichtbar wäre. Eine Meldung kostet einen Moment,
// eine verlorene halbe Stunde Arbeit kostet mehr.
//
// Aufzurufen NUR, wenn das Update null Zeilen betroffen hat. Der Fall hat
// zwei Ursachen, die sich für den Anwender ganz verschieden anfühlen:
// zwischenzeitlich geändert – oder fehlende Rechte.
export async function konfliktMeldung(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tabelle: string,
  id: string,
  stand: string | null
): Promise<string> {
  const { data } = await supabase
    .from(tabelle)
    .select("updated_at, geaendert:profiles!geaendert_von(name)")
    .eq("id", id)
    .maybeSingle();

  if (!data) {
    return "Der Datensatz wurde inzwischen gelöscht oder ist für dich nicht mehr sichtbar.";
  }

  // Stand unverändert: Dann lag es nicht am Konflikt, sondern an den
  // Rechten – die RLS-Regel liefert bei einem verweigerten Update
  // ebenfalls null Zeilen, ganz ohne Fehler.
  if (stand && String(data.updated_at) === stand) {
    return "Die Änderung wurde nicht übernommen – dafür fehlen dir die Rechte.";
  }

  const eingebettet = (data as { geaendert?: unknown }).geaendert;
  const person = Array.isArray(eingebettet) ? eingebettet[0] : eingebettet;
  const name = (person as { name?: string } | null | undefined)?.name;

  const wann = data.updated_at
    ? new Date(String(data.updated_at)).toLocaleTimeString("de-CH", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    `Dieser Datensatz wurde zwischenzeitlich ${name ? `von ${name} ` : ""}geändert` +
    `${wann ? ` (${wann} Uhr)` : ""}. Deine Eingaben wurden NICHT gespeichert. ` +
    "Bitte die Seite neu laden, die Änderung ansehen und deine Anpassung erneut vornehmen."
  );
}
