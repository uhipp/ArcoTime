"use client";

import { useActionState, useState } from "react";
import { AbsendeKnopf } from "@/components/absende-knopf";
import type { FormularErgebnis } from "@/lib/formular-ergebnis";

// Stornieren eines abgeschlossenen Rapports.
//
// Bewusst zugeklappt und unauffällig: Es ist der Ausnahmefall, nicht der
// Alltag. Ein Storno stellt ein Dokument ungültig, das der Kunde
// womöglich schon in Händen hält – dafür soll man einen Schritt tun
// müssen und nicht danebengreifen können.
export function RapportStorno({
  action,
}: {
  action: (bisher: FormularErgebnis, formData: FormData) => Promise<FormularErgebnis>;
}) {
  const [ergebnis, formAction] = useActionState(action, null);
  const [offen, setOffen] = useState(false);

  if (!offen) {
    return (
      <button
        type="button"
        onClick={() => setOffen(true)}
        className="text-sm text-gray-500 hover:text-red-600"
      >
        Rapport stornieren
      </button>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-red-200 p-5 max-w-2xl">
      <h2 className="text-lg font-medium mb-1">Rapport stornieren</h2>
      <p className="text-sm text-gray-500 mb-4">
        Der Rapport wird ungültig gestellt und behält seine Nummer. Die
        erfassten Positionen bleiben erhalten, zählen aber nicht mehr – weder
        in den Auswertungen noch im Export. Für eine Korrektur anschliessend
        einen neuen Rapport erstellen.
      </p>

      <form action={formAction} className="space-y-3">
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="storno_grund">
            Grund
          </label>
          <input
            id="storno_grund"
            name="storno_grund"
            required
            placeholder="z.B. Falscher Kunde erfasst"
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-arcos-steel"
          />
          <p className="text-xs text-gray-400 mt-1">
            Bleibt am Rapport vermerkt und ist später nachvollziehbar.
          </p>
        </div>

        {ergebnis?.fehler && (
          <div className="rounded bg-red-50 text-red-700 text-sm px-3 py-2">
            {ergebnis.fehler}
          </div>
        )}

        <div className="flex items-center gap-3">
          <AbsendeKnopf
            laufttext="Wird storniert…"
            className="rounded bg-red-600 text-white text-sm font-medium px-4 py-2 hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Jetzt stornieren
          </AbsendeKnopf>
          <button
            type="button"
            onClick={() => setOffen(false)}
            className="text-sm text-gray-500 hover:underline"
          >
            Abbrechen
          </button>
        </div>
      </form>
    </div>
  );
}
