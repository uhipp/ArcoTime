import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, getCurrentOrganisation } from "@/lib/get-profile";
import { darf } from "@/lib/berechtigungen";
import { ladeZeitkonto } from "@/lib/zeitkonto";
import { AbschlussUebersichtPdf } from "@/lib/zeitkonto-pdf";

export const runtime = "nodejs";

// Die Übersicht über alle Mitarbeitenden für einen Monat, A4 quer – das
// Blatt für die Betriebsleitung und für die Lohnbuchhaltung.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const heute = new Date();
  const vormonat = new Date(heute.getFullYear(), heute.getMonth() - 1, 1);
  const jahr = Number(url.searchParams.get("jahr")) || vormonat.getFullYear();
  const monat = Number(url.searchParams.get("monat")) || vormonat.getMonth() + 1;

  const [profile, organisation] = await Promise.all([
    getCurrentProfile(),
    getCurrentOrganisation(),
  ]);

  if (!darf(profile, "einstellungen.verwalten")) {
    return new NextResponse("Kein Zugriff.", { status: 403 });
  }
  if (!organisation?.modul_zeitkonto) {
    return new NextResponse("Das Zusatzmodul Zeitkonto ist nicht gebucht.", { status: 404 });
  }

  const supabase = await createClient();
  const letzterTag = new Date(jahr, monat, 0).getDate();
  const monatVon = `${jahr}-${String(monat).padStart(2, "0")}-01`;
  const monatBis = `${jahr}-${String(monat).padStart(2, "0")}-${letzterTag}`;

  const [{ data: personen }, { data: abschluesse }, { data: offene }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, name, vorname")
      .is("deaktiviert_am", null)
      .order("name"),
    supabase
      .from("monatsabschluesse")
      .select("mitarbeiter_id, soll_stunden, ist_stunden, saldo_ende, ferien_rest_tage")
      .eq("jahr", jahr)
      .eq("monat", monat),
    supabase
      .from("rapporte")
      .select("mitarbeiter_id")
      .eq("status", "offen")
      .gte("datum", monatVon)
      .lte("datum", monatBis),
  ]);

  const abschlussVon = new Map((abschluesse ?? []).map((a) => [a.mitarbeiter_id, a]));
  const offeneJePerson = new Map<string, number>();
  for (const r of offene ?? []) {
    offeneJePerson.set(r.mitarbeiter_id, (offeneJePerson.get(r.mitarbeiter_id) ?? 0) + 1);
  }

  const zeilen = [];
  for (const p of personen ?? []) {
    const abschluss = abschlussVon.get(p.id);
    const konto = await ladeZeitkonto(supabase, p.id, jahr);
    const zeile = konto.zeilen.find((z) => z.monat === monat);
    zeilen.push({
      name: `${p.vorname ? `${p.vorname} ` : ""}${p.name}`,
      soll: abschluss ? Number(abschluss.soll_stunden) : (zeile?.soll ?? 0),
      ist: abschluss ? Number(abschluss.ist_stunden) : (zeile?.ist ?? 0),
      saldo: abschluss ? Number(abschluss.saldo_ende) : (zeile?.saldo ?? 0),
      ferienRest: abschluss ? Number(abschluss.ferien_rest_tage) : konto.ferienRest,
      abgeschlossen: Boolean(abschluss),
      offeneRapporte: offeneJePerson.get(p.id) ?? 0,
    });
  }

  const buffer = await renderToBuffer(
    AbschlussUebersichtPdf({ jahr, monat, organisation: organisation.name, zeilen })
  );

  const dateiname = `Zeitkonten ${jahr}-${String(monat).padStart(2, "0")}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${dateiname}"`,
    },
  });
}
