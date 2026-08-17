import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { RechnungPdf } from "@/lib/rechnung-pdf";
import { landName, type RechnungsDaten } from "@/lib/rechnung-daten";

// Musterrechnung zum Anschauen – ausschliesslich für die Entwicklung.
//
// Ohne sie liesse sich das Layout nur prüfen, indem man eine echte Zahlung
// auslöst. Das ist der Grund für diese Route; deshalb antwortet sie in
// Produktion auch nicht.
export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse("Nicht verfügbar.", { status: 404 });
  }

  const variante = new URL(request.url).searchParams.get("variante");
  const reverseCharge = variante === "eu";

  const daten: RechnungsDaten = {
    nummer: "2026-0001",
    ausgestelltAm: "2026-08-17",
    bezahltAm: "2026-08-17",
    empfaenger: reverseCharge
      ? {
          name: "Muster Handwerk GmbH",
          strasse: "Industriestrasse 12",
          plz: "79539",
          ort: "Lörrach",
          land: "DE",
          landName: landName("DE"),
          steuernummer: "DE123456789",
        }
      : {
          name: "Beispiel Treuhand GmbH",
          strasse: "Bahnhofstrasse 4",
          plz: "4410",
          ort: "Liestal",
          land: "CH",
          landName: landName("CH"),
          steuernummer: "CHE-987.654.321 MWST",
        },
    position: {
      bezeichnung: "ArcoTime Lizenz",
      zeitraum: "Leistungszeitraum 17.08.2026 bis 17.09.2026",
      menge: 12,
      einzelpreis: 13,
    },
    summen: reverseCharge
      ? { netto: 156, mwstSatz: 0, mwstBetrag: 0, brutto: 156, waehrung: "CHF" }
      : { netto: 156, mwstSatz: 8.1, mwstBetrag: 12.64, brutto: 168.64, waehrung: "CHF" },
    reverseCharge,
    logoAdresse: `${new URL(request.url).origin}/arcos-group-logo.png`,
  };

  const pdf = await renderToBuffer(RechnungPdf({ daten }));
  return new NextResponse(new Uint8Array(pdf), {
    headers: { "Content-Type": "application/pdf" },
  });
}
