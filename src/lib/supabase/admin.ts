import { createClient } from "@supabase/supabase-js";

// ACHTUNG: Nutzt den Service-Role-Key – umgeht sämtliche Row-Level-Security.
// Ausschliesslich in Server Actions/Route Handlers verwenden, NIE in einer
// Client Component importieren. Der Schlüssel selbst steht nur in der
// serverseitigen Umgebungsvariable SUPABASE_SERVICE_ROLE_KEY (kein
// NEXT_PUBLIC_-Präfix -> landet nie im Browser-Bundle).
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY fehlt. Bitte in den Umgebungsvariablen ergänzen (siehe .env.local.example)."
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
