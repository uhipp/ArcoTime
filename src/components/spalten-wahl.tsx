"use client";

import { useActionState, useState } from "react";
import { AbsendeKnopf } from "@/components/absende-knopf";
import type { SpaltenErgebnis } from "@/app/actions/spaltenwahl";

type Eintrag = { key: string; titel: string; fest?: boolean };

// Auswahl der sichtbaren Spalten einer Liste.
//
// Sie steht als unscheinbare Schaltfläche neben der Liste und nicht in
// den Einstellungen: Der Wunsch nach einer Spalte entsteht beim
// Draufschauen, nicht auf einer Konfigurationsseite.
//
// Die Auswahl gilt nur für die eigene Anmeldung. Wer eine Spalte
// ausblendet, nimmt sie also niemandem weg.
export function SpaltenWahl({
  alle,
  gewaehlt,
  action,
}: {
  alle: Eintrag[];
  gewaehlt: string[];
  action: (bisher: SpaltenErgebnis, formData: FormData) => Promise<SpaltenErgebnis>;
}) {
  const [offen, setOffen] = useState(false);
  const [ergebnis, formAction] = useActionState(action, null);

  // Nach dem Übernehmen geht das Fenster zu – die geänderte Liste steht
  // dann sichtbar da. Bei einem Fehler bleibt es offen, sonst wäre die
  // Meldung weg, bevor jemand sie liest.
  //
  // Bewusst beim Rendern und nicht in einem useEffect: Das Fenster hängt
  // allein vom Ergebnis der Aktion ab, ein Effekt würde es erst nach
  // einem sichtbaren Zwischenbild schliessen.
  const [gesehen, setGesehen] = useState(ergebnis);
  if (ergebnis !== gesehen) {
    setGesehen(ergebnis);
    if (ergebnis && "gespeichert" in ergebnis) setOffen(false);
  }

  const waehlbar = alle.filter((s) => !s.fest);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOffen((o) => !o)}
        aria-expanded={offen}
        className="rounded border bg-white px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
      >
        Spalten
      </button>

      {offen && (
        <div className="absolute right-0 z-20 mt-1 w-64 rounded-lg border bg-white p-4 shadow-lg">
          <form action={formAction}>
            <p className="mb-3 text-xs text-gray-500">
              Gilt nur für deine Ansicht.
            </p>

            <div className="mb-3 space-y-1.5">
              {alle
                .filter((s) => s.fest)
                .map((s) => (
                  <label
                    key={s.key}
                    className="flex items-center gap-2 text-sm text-gray-400"
                    title="Diese Spalte öffnet den Datensatz und bleibt deshalb sichtbar."
                  >
                    <input type="checkbox" checked disabled className="rounded" />
                    {s.titel}
                  </label>
                ))}

              {waehlbar.map((s) => (
                <label key={s.key} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="spalte"
                    value={s.key}
                    defaultChecked={gewaehlt.includes(s.key)}
                    className="rounded"
                  />
                  {s.titel}
                </label>
              ))}
            </div>

            {ergebnis && "fehler" in ergebnis && (
              <div className="mb-3 rounded bg-red-50 px-2 py-1.5 text-xs text-red-700">
                {ergebnis.fehler}
              </div>
            )}

            <div className="flex items-center justify-between gap-2">
              <AbsendeKnopf
                laufttext="…"
                className="rounded bg-arcos-steel px-3 py-1.5 text-sm font-medium text-white hover:bg-arcos-navy disabled:cursor-not-allowed disabled:opacity-60"
              >
                Übernehmen
              </AbsendeKnopf>
              <button
                type="submit"
                name="absicht"
                value="zuruecksetzen"
                className="text-xs text-gray-500 hover:underline"
              >
                Zurücksetzen
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
