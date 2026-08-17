import { NextRequest, NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// Ziel der Links aus den Auth-Mails. Zwei Verfahren treffen hier ein:
//
//   ?code=…        PKCE, wie ihn Supabase beim Passwort-Zurücksetzen erzeugt.
//   ?token_hash=…  Einmal-Token, wie ihn generateLink() liefert.
//
// Das zweite ist der Weg für Einladungen, die ArcoTime SELBST versendet
// (siehe lib/einladung.ts). Der Gewinn liegt in der Adresse: So steht im
// Mail ein Link auf arcotime.ch statt auf die Supabase-Adresse des
// Projekts. Wer eine Einladung zu einer Zeiterfassung bekommt und einen
// fremden Hostnamen sieht, klickt zu Recht nicht.
//
// Beide Wege enden am selben Ort: Die Person ist angemeldet und setzt auf
// /passwort-setzen ihr Passwort.
function zumLogin(request: NextRequest, meldung: string) {
  return NextResponse.redirect(
    new URL(`/login?error=${encodeURIComponent(meldung)}`, request.url)
  );
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const typ = request.nextUrl.searchParams.get("type") as EmailOtpType | null;

  const supabase = await createClient();

  if (tokenHash && typ) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: typ });
    if (!error) {
      return NextResponse.redirect(new URL("/passwort-setzen", request.url));
    }
    return zumLogin(
      request,
      "Link ist ungültig oder abgelaufen. Bitte fordere eine neue Einladung an."
    );
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL("/passwort-setzen", request.url));
    }
    return zumLogin(request, "Link ist ungültig oder abgelaufen. Bitte neu anfordern.");
  }

  return zumLogin(request, "Ungültiger Link.");
}
