import { NextResponse } from "next/server";
import { heuteIso } from "@/lib/date-utils";
import ExcelJS from "exceljs";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentOrganisation, getCurrentProfile } from "@/lib/get-profile";
import { darf } from "@/lib/berechtigungen";

// Vollständiger Datenexport (AGB Ziffer 10).
//
// Bewusst als GET-Route und ohne jeden Schreibvorgang: Nur so funktioniert
// der Export auch in der Nachfrist nach Vertragsende, in der die Anwendung
// schreibgeschützt ist. Genau dann wird er am dringendsten gebraucht.
//
// Zwei Formate, weil zwei verschiedene Leute den Export brauchen:
//
//   json  – vollständig und verlustfrei, mit Datentypen und Schlüsseln.
//           Das ist die Fassung, aus der sich ein Mandant wiederherstellen
//           lässt. Für Menschen schwer lesbar.
//   xlsx  – eine Tabelle je Datenbereich, zum Anschauen und Weiterarbeiten.
//           Excel macht aus manchem Wert etwas Eigenes; zum Zurückspielen
//           taugt diese Fassung deshalb NICHT.
//
// Die Organisation kommt aus der Sitzung und niemals aus der Adresse – ein
// Parameter wäre hier die Einladung, fremde Mandanten abzuziehen.
export async function GET(request: Request) {
  const profile = await getCurrentProfile();
  if (!darf(profile, "export.ausfuehren")) {
    return NextResponse.json({ error: "Nicht berechtigt." }, { status: 403 });
  }

  // Der Regelfall: die eigene Organisation aus der Sitzung. Ein Parameter
  // aus der Adresse wäre hier die Einladung, fremde Mandanten abzuziehen.
  //
  // Ausnahme für Plattform-Admins (Arcos selbst): Sie brauchen die
  // Sicherungskopie eines fremden Mandanten, BEVOR sie ihn löschen. Ohne
  // diese Möglichkeit wäre die Löschung unter /plattform ein Sprung ohne
  // Netz. Der Zugriff ist derselbe, den sie über die Datenbank ohnehin
  // haben – neu ist nur, dass er hier stattfindet und nicht im Terminal.
  const gewuenschte = new URL(request.url).searchParams.get("organisation");
  const eigene = await getCurrentOrganisation();

  let organisationId = eigene?.id;
  let organisationName = eigene?.name ?? "Organisation";

  if (gewuenschte && gewuenschte !== eigene?.id) {
    if (!profile?.ist_platform_admin) {
      return NextResponse.json({ error: "Nicht berechtigt." }, { status: 403 });
    }
    const { data: fremde } = await createAdminClient()
      .from("organisationen")
      .select("id, name")
      .eq("id", gewuenschte)
      .single();
    if (!fremde) {
      return NextResponse.json({ error: "Organisation nicht gefunden." }, { status: 404 });
    }
    organisationId = fremde.id;
    organisationName = fremde.name;
  }

  if (!organisationId) {
    return NextResponse.json({ error: "Keine Organisation." }, { status: 404 });
  }

  // Die Leseberechtigung ist oben geprüft; die Funktion selbst läuft mit
  // erhöhten Rechten, weil sie über den Systemkatalog geht.
  const admin = createAdminClient();
  const { data: export_, error } = await admin.rpc("exportiere_organisation", {
    p_organisation: organisationId,
  });

  if (error || !export_) {
    return NextResponse.json(
      { error: `Export nicht möglich: ${error?.message ?? "keine Daten"}` },
      { status: 500 }
    );
  }

  const heute = heuteIso();
  const dateiname = `ArcoTime-Export-${organisationName.replace(/[^\p{L}\p{N}]+/gu, "-")}-${heute}`;

  const format = new URL(request.url).searchParams.get("format");
  if (format !== "xlsx") {
    return new NextResponse(JSON.stringify(export_, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${dateiname}.json"`,
      },
    });
  }

  const daten = (export_ as { daten: Record<string, Record<string, unknown>[]> }).daten;
  const mappe = new ExcelJS.Workbook();
  mappe.creator = "ArcoTime";

  for (const [tabelle, zeilen] of Object.entries(daten)) {
    if (!zeilen.length) continue;

    // Excel erlaubt höchstens 31 Zeichen im Blattnamen und keine der
    // Zeichen : \ / ? * [ ] – ein zu langer Name lässt die Datei sonst
    // gar nicht erst öffnen.
    const blatt = mappe.addWorksheet(tabelle.slice(0, 31));
    const spalten = Object.keys(zeilen[0]);
    blatt.columns = spalten.map((s) => ({ header: s, key: s, width: 20 }));
    blatt.getRow(1).font = { bold: true };

    for (const zeile of zeilen) {
      blatt.addRow(
        Object.fromEntries(
          spalten.map((s) => {
            const wert = zeile[s];
            // Verschachtelte Werte (jsonb-Spalten) haben in einer Zelle
            // nichts verloren – als Text bleiben sie wenigstens lesbar.
            return [s, wert !== null && typeof wert === "object" ? JSON.stringify(wert) : wert];
          })
        )
      );
    }
  }

  if (mappe.worksheets.length === 0) {
    mappe.addWorksheet("Hinweis").addRow(["Für diese Organisation sind keine Daten erfasst."]);
  }

  const puffer = await mappe.xlsx.writeBuffer();
  return new NextResponse(new Uint8Array(puffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${dateiname}.xlsx"`,
    },
  });
}
