import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, getCurrentOrganisation } from "@/lib/get-profile";
import { darf } from "@/lib/berechtigungen";
import { ladeZeitkonto } from "@/lib/zeitkonto";
import { ZeitkontoPdf } from "@/lib/zeitkonto-pdf";

export const runtime = "nodejs";

// Das Zeitkonto einer Person als PDF, A4 quer – für die Personalakte und
// die Unterschrift bei der Jahresbesprechung.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const jahr =
    Number(new URL(request.url).searchParams.get("jahr")) || new Date().getFullYear();

  const [profile, organisation] = await Promise.all([
    getCurrentProfile(),
    getCurrentOrganisation(),
  ]);

  // Dieselbe Regel wie auf der Seite: die eigene Auswertung immer, fremde
  // nur mit Adminrechten.
  if (!profile) return new NextResponse("Nicht angemeldet.", { status: 401 });
  if (!darf(profile, "mitarbeitende.verwalten") && profile.id !== id) {
    return new NextResponse("Kein Zugriff.", { status: 403 });
  }
  if (!organisation?.modul_zeitkonto) {
    return new NextResponse("Das Zusatzmodul Zeitkonto ist nicht gebucht.", { status: 404 });
  }

  const supabase = await createClient();
  const { data: person } = await supabase
    .from("profiles")
    .select("name, vorname")
    .eq("id", id)
    .single();

  if (!person) return new NextResponse("Person nicht gefunden.", { status: 404 });

  const konto = await ladeZeitkonto(supabase, id, jahr);
  const name = `${person.vorname ? `${person.vorname} ` : ""}${person.name}`;

  const buffer = await renderToBuffer(
    ZeitkontoPdf({ name, jahr, konto, organisation: organisation.name })
  );

  const dateiname = `Zeitkonto ${name} ${jahr}.pdf`.replace(/[^\w\s.-]+/g, "_");

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${dateiname}"`,
    },
  });
}
