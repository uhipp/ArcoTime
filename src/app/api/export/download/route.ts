import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { createClient } from "@/lib/supabase/server";
import { heuteIso } from "@/lib/date-utils";
import type { ZeiteintragMitDetails } from "@/lib/types";
import { darf } from "@/lib/berechtigungen";

// Exakte Spaltenreihenfolge/-namen aus der Comatic-Musterdatei
// (Zeile 1 der Vorlage, ohne Spalte A / Zeile 2, die nur der Erklärung dienten).
const SPALTEN = [
  "Adress-Schlüssel",
  "Anrede",
  "Vorname",
  "Name",
  "Zuhanden/Adresse 1",
  "Adresse2",
  "Postfach/Adresse3",
  "PLZ",
  "Ort",
  "Land",
  "E-Mail",
  "Telefon",
  "Datum",
  "Belegnummer",
  "Währung",
  "Referenz",
  "Menge",
  "Bezeichnung",
  "Beschreibung",
  "Konto",
  "Kostenstelle",
  "Betrag/Position",
  "Rabatt in Prozent",
  "MWSt",
  "Kondition",
];

// Datum als reines Kalenderdatum in UTC bauen, damit ExcelJS beim Umrechnen
// in die Excel-Seriennummer nicht durch die Serverzeitzone einen Tag verschiebt.
function datumZuUTC(iso: string) {
  const [j, m, t] = iso.split("-").map(Number);
  return new Date(Date.UTC(j, m - 1, t));
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }
  const { data: profil } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .single();
  if (!darf(profil, "export.ausfuehren")) {
    return NextResponse.json({ error: "Nur für Admins." }, { status: 403 });
  }

  const belegIdsParam = request.nextUrl.searchParams.get("beleg_ids");
  if (!belegIdsParam) {
    return NextResponse.json({ error: "beleg_ids fehlt." }, { status: 400 });
  }
  const belegIds = belegIdsParam.split(",").filter(Boolean);

  const { data: belege, error: belegeError } = await supabase
    .from("belege_exporte")
    .select("id, belegnummer")
    .in("id", belegIds);

  if (belegeError) {
    return NextResponse.json({ error: belegeError.message }, { status: 400 });
  }
  const belegnummerVon = new Map((belege ?? []).map((b) => [b.id, b.belegnummer]));

  const { data: zeilenRaw, error } = await supabase
    .from("v_zeiteintraege")
    .select("*")
    .in("beleg_id", belegIds)
    .order("datum", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  const zeilen = (zeilenRaw as ZeiteintragMitDetails[] | null) ?? [];

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Export");
  sheet.addRow(SPALTEN);

  for (const z of zeilen) {
    sheet.addRow([
      z.adress_schluessel ?? null,
      z.anrede ?? null,
      z.vorname ?? null,
      z.kunde_name,
      z.adresse_zusatz ?? null,
      z.strasse ?? null,
      z.postfach ?? null,
      z.plz ?? null,
      z.ort ?? null,
      z.land,
      z.email ?? null,
      z.telefon ?? null,
      datumZuUTC(z.datum),
      z.beleg_id ? belegnummerVon.get(z.beleg_id) ?? null : null,
      z.waehrung,
      z.referenz ?? null,
      // Verrechnete Menge: Stunden bei Arbeitszeit, sonst Stück/km. Bewusst
      // NICHT menge_stunden – das ist seit den Mengenartikeln ausschliesslich
      // Arbeitszeit und bei Spesen leer.
      z.menge_verrechnet,
      z.artikel_bezeichnung,
      z.beschreibung ?? null,
      z.konto ?? null,
      z.kostenstelle ?? null,
      z.betrag,
      z.rabatt_prozent,
      z.mwst_code ?? null,
      z.zahlungskondition_tage,
    ]);
  }

  // Datumsspalte als Datum formatieren (sonst zeigt Excel eine Zahl)
  sheet.getColumn(13).numFmt = "dd.mm.yyyy";

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="Export_${heuteIso()}.xlsx"`,
    },
  });
}
