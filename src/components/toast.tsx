"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

// Zeigt eine kurze Rückmeldung nach Aktionen (Speichern, Löschen, ...), die
// per ?erfolg=... in der Redirect-URL der Server Action mitgegeben wird.
// Einmal im App-Layout eingebunden, wirkt global auf allen Seiten.
export function Toast() {
  const searchParams = useSearchParams();
  const nachricht = searchParams.get("erfolg");

  if (!nachricht) return null;

  // Die eigentliche Meldung steckt in einer eigenen Komponente, die über
  // den key an die Nachricht gebunden ist. Dadurch startet sie bei jeder
  // neuen Meldung frisch mit sichtbar = true, statt den Zustand in einem
  // Effect nachzuziehen. Zwei gleiche Meldungen hintereinander sind kein
  // Problem: Zwischendurch wird ?erfolg= aus der URL entfernt, die
  // Komponente verschwindet also und wird neu aufgebaut.
  return <ToastMeldung key={nachricht} nachricht={nachricht} />;
}

function ToastMeldung({ nachricht }: { nachricht: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [sichtbar, setSichtbar] = useState(true);

  useEffect(() => {
    // URL bereinigen, damit die Meldung bei Reload/Zurück nicht erneut
    // erscheint.
    const neueParams = new URLSearchParams(searchParams.toString());
    neueParams.delete("erfolg");
    const query = neueParams.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });

    const timer = setTimeout(() => setSichtbar(false), 3500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nachricht]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-6 right-6 z-50 transition-all duration-300 ${
        sichtbar ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
      }`}
    >
      <div className="flex items-center gap-3 rounded-lg bg-green-600 text-white shadow-lg px-4 py-3 max-w-sm">
        <svg
          className="w-5 h-5 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        <span className="text-sm">{nachricht}</span>
        <button
          onClick={() => setSichtbar(false)}
          className="ml-2 text-white/80 hover:text-white"
          aria-label="Schliessen"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
