import { createAdminClient } from "@/lib/supabase/admin";
import { heuteIso, formatDatumCH } from "@/lib/date-utils";
import { sendeMail } from "@/lib/email";

type Zeile = {
  id: string;
  datum: string;
  jahr: number | null;
  nummer: number | null;
  mitarbeiter_id: string;
  kunden: { name: string; vorname: string | null } | null;
  projekte: { bezeichnung: string } | null;
};

// Tägliche Erinnerung an offene Rapporte vergangener Tage.
//
// Ein Rapport, der offen bleibt, zählt nirgends: nicht in den
// Auswertungen, nicht im Export, nicht in der Zeiterfassung (siehe
// vorläufige Positionen). Er ist also nicht bloss unordentlich, sondern
// unverrechnete Arbeit – und genau das fällt niemandem auf, weil an der
// Stelle schlicht nichts steht.
//
// Erinnert wird die Person aus "Ausgeführt von". Sie ist es, die den
// Rapport abschliessen darf, und sie weiss als Einzige, ob noch etwas
// fehlt.
//
// Nur Rapporte VOR dem heutigen Tag. Ein Einsatz von heute ist
// möglicherweise noch im Gang; ihn abends um sieben anzumahnen wäre
// Lärm, und Lärm hört man nach zwei Wochen nicht mehr.
export async function erinnereAnOffeneRapporte(appUrl: string) {
  const supabase = createAdminClient();
  const heute = heuteIso();

  const { data, error } = await supabase
    .from("rapporte")
    .select(
      "id, datum, jahr, nummer, mitarbeiter_id, kunden(name, vorname), projekte(bezeichnung)"
    )
    .eq("status", "offen")
    .lt("datum", heute)
    .order("datum", { ascending: true });

  if (error) return { fehler: error.message, versendet: 0, offen: 0 };

  const zeilen = (data ?? []) as unknown as Zeile[];
  if (zeilen.length === 0) return { versendet: 0, offen: 0, ohneEmail: [] as string[] };

  const ids = [...new Set(zeilen.map((z) => z.mitarbeiter_id).filter(Boolean))];
  const { data: personen } = await supabase
    .from("profiles")
    .select("id, name, email, deaktiviert_am")
    .in("id", ids);

  let versendet = 0;
  const ohneEmail: string[] = [];

  for (const person of personen ?? []) {
    // Deaktivierte Konten bekommen keine Post mehr. Ihre offenen Rapporte
    // bleiben trotzdem stehen – dort hilft nur, die verantwortliche
    // Person zu wechseln, und das ist eine Entscheidung des Büros.
    if (person.deaktiviert_am) continue;

    const eigene = zeilen.filter((z) => z.mitarbeiter_id === person.id);
    if (eigene.length === 0) continue;

    if (!person.email) {
      ohneEmail.push(person.name);
      continue;
    }

    const zeilenHtml = eigene
      .map((z) => {
        const kunde = z.kunden
          ? `${z.kunden.vorname ? `${z.kunden.vorname} ` : ""}${z.kunden.name}`
          : "Ohne Kunde";
        const projekt = z.projekte ? ` · ${z.projekte.bezeichnung}` : "";
        // Je länger ein Rapport liegt, desto dringender – das steht in der
        // Mail und nicht nur im Datum, damit man es beim Überfliegen sieht.
        const tage = Math.round(
          (new Date(`${heute}T12:00:00`).getTime() - new Date(`${z.datum}T12:00:00`).getTime()) /
            86400000
        );
        return `
          <tr style="border-bottom:1px solid #e5e7eb;">
            <td style="padding:8px 12px;">
              <a href="${appUrl}/rapporte/${z.id}" style="color:#1D3557;text-decoration:none;font-weight:600;">${kunde}</a>
              <div style="color:#6b7280;font-size:13px;">${projekt.replace(" · ", "")}</div>
            </td>
            <td style="padding:8px 12px;white-space:nowrap;color:${tage > 1 ? "#b91c1c" : "#6b7280"};font-weight:${tage > 1 ? "600" : "400"};">
              ${formatDatumCH(z.datum)}${tage > 1 ? ` (seit ${tage} Tagen)` : ""}
            </td>
          </tr>`;
      })
      .join("");

    const mehrzahl = eigene.length > 1;
    const html = `
      <div style="font-family:sans-serif;color:#111827;">
        <p>Hallo ${person.name},</p>
        <p>${mehrzahl ? `${eigene.length} deiner Arbeitsrapporte sind` : "Einer deiner Arbeitsrapporte ist"} noch offen:</p>
        <table style="width:100%;border-collapse:collapse;margin:12px 0;">${zeilenHtml}</table>
        <p style="color:#6b7280;font-size:13px;">
          Solange ein Rapport offen ist, zählen seine Positionen weder in den
          Auswertungen noch im Export – die Arbeit ist also erfasst, aber noch
          nicht verrechenbar.
        </p>
        <p><a href="${appUrl}/rapporte?status=offen" style="color:#457B9D;">Offene Rapporte öffnen</a></p>
      </div>`;

    await sendeMail({
      an: person.email,
      betreff: mehrzahl
        ? `${eigene.length} offene Arbeitsrapporte in ArcoTime`
        : "Ein offener Arbeitsrapport in ArcoTime",
      html,
    });
    versendet += 1;
  }

  return { versendet, offen: zeilen.length, ohneEmail };
}
