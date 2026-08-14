import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { ladeRapportDokument } from "@/lib/rapport-dokument-daten";
import { RapportPdf } from "@/lib/rapport-pdf";
import { rapportNummer } from "@/lib/types";

// Node und nicht Edge: Die PDF-Erzeugung braucht Node-Bausteine, die die
// Edge-Laufzeit nicht kennt.
export const runtime = "nodejs";

// Erzeugt das PDF eines Rapports.
//
// Die Daten kommen über dieselbe Ladefunktion wie die Druckansicht – die
// Zugriffsregeln greifen damit unverändert: Wer den Rapport nicht sehen
// darf, bekommt hier nichts.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const daten = await ladeRapportDokument(id);

  if (!daten) {
    return new NextResponse("Rapport nicht gefunden.", { status: 404 });
  }

  const buffer = await renderToBuffer(RapportPdf({ daten }));

  // Entwürfe tragen noch keine Nummer – dann den Kunden in den Dateinamen,
  // damit im Download-Ordner nicht mehrere "Arbeitsrapport.pdf" liegen.
  const bezeichnung =
    daten.rapport.jahr && daten.rapport.nummer
      ? rapportNummer(daten.rapport)
      : `Entwurf ${daten.kunde?.name ?? ""} ${daten.rapport.datum}`.trim();

  const dateiname = `Arbeitsrapport ${bezeichnung}.pdf`.replace(/[^\w\s.-]+/g, "_");

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      // inline: Der Browser zeigt es an, statt es wortlos herunterzuladen –
      // beim Prüfen eines Rapports will man es meist nur ansehen.
      "Content-Disposition": `inline; filename="${dateiname}"`,
      // Nicht zwischenspeichern: Ein Entwurf ändert sich, und ein altes
      // PDF aus dem Cache wäre schlimmer als eines, das kurz lädt.
      "Cache-Control": "no-store",
    },
  });
}
