import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Hält die Supabase-Session in jedem Request frisch und leitet nicht
// eingeloggte Nutzer auf /login um (ausser die Login-Seite selbst).
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data } = await supabase.auth.getUser();

  // /auth/confirm muss IMMER durchgelassen werden, unabhängig vom
  // Session-Status – der Link-Austausch dort etabliert die (Recovery-)
  // Session erst bzw. überschreibt eine evtl. bestehende bewusst.
  if (request.nextUrl.pathname.startsWith("/auth/confirm")) {
    return response;
  }

  // Seiten, die ohne bestehende Session erreichbar sein müssen: Login und
  // die Passwort-vergessen-Anfrage. Bereits eingeloggte Nutzer werden von
  // hier weg auf die Übersicht geleitet.
  const oeffentlichePfade = ["/login", "/passwort-vergessen"];
  const isLoginPage = oeffentlichePfade.some((p) =>
    request.nextUrl.pathname.startsWith(p)
  );

  if (!data.user && !isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (data.user && isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return response;
}
