import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Liest die dokumente-Zeile über den normalen (RLS-geprüften) Client –
// nicht sichtbar/nicht vorhanden ergibt für Anwendende ohne Berechtigung
// exakt dasselbe 404, es wird nichts über die Existenz verraten. Erst
// danach wird über den Service-Role-Client eine kurzlebige signierte URL
// erzeugt; der Download läuft direkt vom Browser zu Supabase Storage,
// nicht über diese Route (kein Body-Limit-Problem bei grossen Dateien).
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: dokument } = await supabase
    .from("dokumente")
    .select("speicherpfad, dateiname")
    .eq("id", id)
    .single();

  if (!dokument) {
    return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
  }

  // PDF/Bilder kann der Browser selbst anzeigen – dafür darf die URL
  // KEIN "download" erzwingen (sonst landet die Datei nur im lokalen
  // Downloads-Ordner statt in einem neuen Tab). Alles andere (Office,
  // E-Mail-Dateien, …) kann der Browser nicht anzeigen, dafür bleibt der
  // erzwungene Download mit dem ursprünglichen Dateinamen sinnvoll.
  const endung = "." + (dokument.dateiname.split(".").pop() ?? "").toLowerCase();
  const vorschaufaehig = [".pdf", ".jpg", ".jpeg", ".png", ".heic", ".heif"].includes(endung);

  const admin = createAdminClient();
  const { data: signiert, error } = await admin.storage
    .from("dokumente")
    .createSignedUrl(
      dokument.speicherpfad,
      60,
      vorschaufaehig ? {} : { download: dokument.dateiname }
    );

  if (error || !signiert) {
    return NextResponse.json({ error: "Datei nicht verfügbar." }, { status: 404 });
  }

  return NextResponse.redirect(signiert.signedUrl);
}
