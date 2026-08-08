import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Ziel des Passwort-Reset-Links aus der E-Mail. Tauscht den PKCE-Code aus
// der URL gegen eine echte, per Cookie gespeicherte Session ein – danach
// ist der Nutzer angemeldet (Typ "Recovery") und kann auf /passwort-setzen
// ein neues Passwort vergeben.
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(new URL("/passwort-setzen", request.url));
    }

    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent("Link ist ungültig oder abgelaufen. Bitte neu anfordern.")}`,
        request.url
      )
    );
  }

  return NextResponse.redirect(
    new URL(`/login?error=${encodeURIComponent("Ungültiger Link.")}`, request.url)
  );
}
