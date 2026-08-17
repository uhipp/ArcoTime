import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Rechnungs-PDF herunterladen.
//
// Nach demselben Muster wie /api/dokumente/[id]: Die Zeile wird über den
// normalen, RLS-geprüften Client gelesen – wer die Rechnung nicht sehen darf,
// bekommt dasselbe 404 wie bei einer nicht existierenden. Erst danach
// erzeugt der Dienstschlüssel eine kurzlebige signierte Adresse.
//
// Der Ablagebereich ist privat, und das muss er bleiben: Auf einer Rechnung
// stehen Adresse und Betrag einer Kundin. Ein erratbarer Pfad wäre hier
// dasselbe wie gar kein Schutz.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: rechnung } = await supabase
    .from("rechnungen")
    .select("jahr, nummer, pdf_pfad")
    .eq("id", id)
    .single();

  if (!rechnung?.pdf_pfad) {
    return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
  }

  const admin = createAdminClient();
  const { data: signiert, error } = await admin.storage
    .from("rechnungen")
    .createSignedUrl(rechnung.pdf_pfad, 60);

  if (error || !signiert) {
    return NextResponse.json({ error: "Datei nicht verfügbar." }, { status: 404 });
  }

  // Ohne "download": Eine Rechnung will man meistens zuerst anschauen, und
  // der Browser kann PDF. Speichern kann man sie von dort aus immer noch.
  return NextResponse.redirect(signiert.signedUrl);
}
