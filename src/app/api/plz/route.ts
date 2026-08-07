import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Nachschlagen im Schweizer PLZ-Verzeichnis.
// GET /api/plz?plz=8914        -> alle Ortschaften zu dieser PLZ
// GET /api/plz?q=Aeugst        -> alle PLZ/Orte, deren Name mit q beginnt
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const plz = searchParams.get("plz");
  const q = searchParams.get("q");

  if (plz) {
    const { data, error } = await supabase
      .from("plz_verzeichnis")
      .select("plz, ort, kanton, hauptort")
      .eq("plz", plz.trim())
      .order("hauptort", { ascending: false })
      .order("ort");

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data);
  }

  if (q && q.trim().length >= 2) {
    const { data, error } = await supabase
      .from("plz_verzeichnis")
      .select("plz, ort, kanton, hauptort")
      .ilike("ort", `${q.trim()}%`)
      .order("ort")
      .limit(15);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data);
  }

  return NextResponse.json([]);
}
