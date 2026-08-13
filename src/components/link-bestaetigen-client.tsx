"use client";

import { useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

// Der eigentliche Token wird bewusst NICHT automatisch beim Laden der Seite
// eingelöst (das wäre wieder anfällig für automatisches Vorab-Abrufen durch
// E-Mail-Sicherheitsscanner, z.B. Microsoft Defender/Safe Links – genau das
// Problem, das diese Seite lösen soll), sondern erst durch einen echten
// Klick auf den Button (onClick, nicht useEffect). Scanner rufen Seiten ab,
// klicken aber keine Buttons.
export function LinkBestaetigenClient({
  tokenHash,
  type,
}: {
  tokenHash: string;
  type: string;
}) {
  const [status, setStatus] = useState<"bereit" | "laedt" | "fehler">("bereit");
  const [fehler, setFehler] = useState<string | null>(null);

  const istEinladung = type === "invite";
  const gueltig = Boolean(tokenHash) && (type === "invite" || type === "recovery");

  async function bestaetigen() {
    setStatus("laedt");
    setFehler(null);

    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as "invite" | "recovery",
    });

    if (error) {
      setStatus("fehler");
      setFehler(
        "Der Link ist ungültig oder abgelaufen. Bitte eine neue Einladung bzw. E-Mail anfordern."
      );
      return;
    }

    // Bewusst ein vollständiger Seitenaufbau statt router.push: Der Server
    // muss das eben gesetzte Auth-Cookie sehen.
    window.location.assign(new URL("/passwort-setzen", window.location.origin));
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-lg shadow p-8 text-center">
        <Image
          src="/arcotime-logo.png"
          alt="ArcoTime"
          width={286}
          height={197}
          className="h-16 w-auto mx-auto mb-4"
          priority
        />
        <h1 className="font-heading font-bold text-xl text-arcos-navy mb-2">
          {istEinladung ? "Willkommen bei ArcoTime" : "Passwort zurücksetzen"}
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          {istEinladung
            ? "Bitte bestätige mit einem Klick, dass du diese Einladung selbst angenommen hast."
            : "Bitte bestätige mit einem Klick, dass du dein Passwort selbst zurücksetzen möchtest."}
        </p>

        {fehler && (
          <div className="mb-4 rounded bg-red-50 text-red-700 text-sm px-3 py-2">{fehler}</div>
        )}

        {!gueltig ? (
          <p className="text-sm text-red-600">Ungültiger Link.</p>
        ) : (
          <button
            type="button"
            onClick={bestaetigen}
            disabled={status === "laedt"}
            className="w-full rounded bg-arcos-steel text-white text-sm font-medium py-2 hover:bg-arcos-navy disabled:opacity-60"
          >
            {status === "laedt"
              ? "Wird geprüft…"
              : istEinladung
              ? "Einladung bestätigen"
              : "Zurücksetzen bestätigen"}
          </button>
        )}
      </div>
    </div>
  );
}
