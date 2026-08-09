"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Fängt Links im "alten" Format ab, die Supabase für admin-erzeugte Links
// (z.B. Mitarbeitenden-Einladung) verwendet: Zugangsdaten stehen im
// #-Teil der URL (access_token/refresh_token), statt im von /auth/confirm
// erwarteten ?code=-Format. Der #-Teil wird nie an den Server gesendet,
// daher muss das hier im Browser per JavaScript gelesen werden.
export function HashSessionHandler() {
  const [prueft, setPrueft] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    const istRelevant =
      hash.includes("access_token") &&
      (hash.includes("type=invite") || hash.includes("type=recovery"));

    if (!istRelevant) return;

    setPrueft(true);

    const params = new URLSearchParams(hash.slice(1));
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");

    if (!access_token || !refresh_token) {
      setPrueft(false);
      return;
    }

    const supabase = createClient();
    supabase.auth.setSession({ access_token, refresh_token }).then(({ error }) => {
      if (error) {
        setPrueft(false);
        return;
      }
      window.location.href = "/passwort-setzen";
    });
  }, []);

  if (!prueft) return null;

  return (
    <div className="fixed inset-0 bg-white/90 flex items-center justify-center z-50 text-sm text-gray-500">
      Anmeldung wird verarbeitet…
    </div>
  );
}
