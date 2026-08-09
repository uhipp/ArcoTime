import { createAdminClient } from "@/lib/supabase/admin";

// Übergangslösung, siehe Migration 0017: auf der Login-Seite ist noch
// niemand angemeldet, die Organisation also nicht über eine Session
// bekannt. Lädt deshalb über den Service-Role-Client (kein RLS-Kontext
// nötig) die eine Organisation, die als "auf der Login-Seite anzeigen"
// markiert ist – funktioniert nur sauber für genau einen echten Mandanten.
// Für echte Mehr-Mandanten-Logins braucht es später eine Subdomain/URL
// pro Mandant statt dieser Lösung.
export async function getLoginMandantName(): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("organisationen")
    .select("name")
    .eq("zeige_auf_login", true)
    .maybeSingle();

  return data?.name ?? null;
}
