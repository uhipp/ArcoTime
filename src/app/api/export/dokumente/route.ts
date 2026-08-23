import { NextResponse } from "next/server";
import { heuteIso } from "@/lib/date-utils";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentOrganisation, getCurrentProfile } from "@/lib/get-profile";
import { darf } from "@/lib/berechtigungen";
import {
  erzeugeDokumentArchiv,
  sammleDokumentDateien,
  verzeichnisDateien,
} from "@/lib/dokumente-archiv";

// Die hochgeladenen Dateien als ZIP – der zweite Teil des Vollexports.
//
// Warum getrennt von /api/export/vollstaendig: Die Datenbankzeilen sind in
// Sekunden da und werden oft geholt; die Dateien können Hunderte Megabyte
// sein. In einem Download wäre jeder Blick in die Stammdaten ein
// Gigabyte-Transfer. Zusammen gehören sie trotzdem – im Archiv liegt
// deshalb "dokumente.json" mit der Zuordnung von Datei zu Dokumentzeile.
//
// Wie der Vollexport bewusst als GET und ohne jeden Schreibvorgang: Nur so
// funktioniert der Download auch in der Nachfrist nach Vertragsende, in der
// die Anwendung schreibgeschützt ist (die Sperre trennt nach HTTP-Methode).
// Ein Archiv, das erst im Speicher angelegt und dann verlinkt würde, wäre
// genau das – ein Schreibvorgang.
export const dynamic = "force-dynamic";

// Der Download läuft so lange, wie die Dateien brauchen. Voreingestellt sind
// bei Vercel 15 Sekunden – das reicht für ein paar Bilder und bricht bei
// einem Mandanten mit vollem Dokumentenordner mitten im Archiv ab.
export const maxDuration = 300;

export async function GET(request: Request) {
  const profile = await getCurrentProfile();
  if (!darf(profile, "export.ausfuehren")) {
    return NextResponse.json({ error: "Nicht berechtigt." }, { status: 403 });
  }

  // Wie beim Vollexport: Die Organisation kommt aus der Sitzung und niemals
  // aus der Adresse. Die Ausnahme für Plattform-Admins ist dieselbe – sie
  // brauchen die Sicherungskopie eines fremden Mandanten, BEVOR sie ihn
  // löschen, und die Dateien gehören dazu.
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

  // Läuft mit erhöhten Rechten, weil der Speicher-Eimer privat ist und die
  // Personal-Dokumente unter RLS nur der betroffenen Person und dem Admin
  // gehören. Die Berechtigung ist oben geprüft: Wer den Export darf, darf
  // den ganzen Bestand seines Betriebs – das ist der Sinn der Sache.
  const admin = createAdminClient();

  let dateien;
  try {
    dateien = await sammleDokumentDateien(admin, organisationId);
  } catch (fehler) {
    return NextResponse.json({ error: (fehler as Error).message }, { status: 500 });
  }

  const heute = heuteIso();
  const dateiname = `ArcoTime-Dokumente-${organisationName.replace(
    /[^\p{L}\p{N}]+/gu,
    "-"
  )}-${heute}.zip`;

  const strom = erzeugeDokumentArchiv(
    admin,
    dateien,
    verzeichnisDateien(dateien, organisationName)
  );

  return new NextResponse(strom, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${dateiname}"`,
      // Ein Zwischenspeicher hätte hier nichts als Schaden: Der Inhalt
      // ändert sich mit jedem Upload, und er gehört genau einem Mandanten.
      "Cache-Control": "no-store, private",
      // Sonst versuchen Zwischenstellen, die Länge zu bestimmen, und
      // puffern das ganze Archiv – der Download startet dann erst am Ende.
      "Content-Encoding": "identity",
      // Für die Anzeige im Browser gibt es keine Länge (das Archiv entsteht
      // beim Senden); die Anzahl Dateien lässt sich trotzdem mitgeben.
      "X-Anzahl-Dateien": String(dateien.length),
    },
  });
}
