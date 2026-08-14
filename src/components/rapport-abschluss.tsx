"use client";

import { useActionState } from "react";
import { AbsendeKnopf } from "@/components/absende-knopf";
import type { FormularErgebnis } from "@/lib/formular-ergebnis";

// Rapport abschliessen – erste Ausbaustufe, ohne Unterschrift.
//
// Solange ein Rapport offen ist, gelten seine Positionen als Absicht und
// zählen nirgends (siehe Migration 0036). Der Abschluss ist damit kein
// Formalismus, sondern der Moment, in dem die Arbeit gültig wird. Deshalb
// steht er sichtbar auf der Seite und nicht in einem Menü.
export function RapportAbschluss({
  action,
  anzahlPositionen,
  datumInZukunft,
}: {
  action: (bisher: FormularErgebnis, formData: FormData) => Promise<FormularErgebnis>;
  anzahlPositionen: number;
  datumInZukunft: boolean;
}) {
  const [ergebnis, formAction] = useActionState(action, null);

  // Beide Fälle lehnt auch die Datenbank ab. Sie hier vorweg zu nehmen
  // erspart den Klick ins Leere und sagt, was zu tun ist.
  const grund =
    anzahlPositionen === 0
      ? "Ein Rapport ohne Positionen lässt sich nicht abschliessen – bitte zuerst die erbrachten Leistungen erfassen."
      : datumInZukunft
        ? "Dieser Rapport ist für die Zukunft geplant. Abschliessen lässt er sich erst, wenn der Einsatz stattgefunden hat."
        : null;

  return (
    <div className="bg-white rounded-lg border p-5 max-w-2xl">
      <h2 className="text-lg font-medium mb-1">Rapport abschliessen</h2>
      <p className="text-sm text-gray-500 mb-4">
        Danach ist der Rapport unveränderlich, erhält seine Nummer – und die
        Positionen zählen als erfasste Zeit: in den Auswertungen, im Export und
        in der Zeiterfassung.
      </p>

      {grund ? (
        <p className="rounded bg-gray-100 text-gray-600 text-sm px-3 py-2">{grund}</p>
      ) : (
        <form action={formAction} className="space-y-3">
          <div>
            <label
              className="block text-sm font-medium mb-1"
              htmlFor="abschluss_vermerk"
            >
              Warum liegt keine Unterschrift vor?
            </label>
            <input
              id="abschluss_vermerk"
              name="abschluss_vermerk"
              required
              placeholder="z.B. Kunde nicht mehr vor Ort"
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-arcos-steel"
            />
            <p className="text-xs text-gray-400 mt-1">
              Pflichtangabe, solange die Unterschrift auf dem Tablet noch nicht
              zur Verfügung steht. Sie bleibt am Rapport vermerkt.
            </p>
          </div>

          {ergebnis?.fehler && (
            <div className="rounded bg-red-50 text-red-700 text-sm px-3 py-2">
              {ergebnis.fehler}
            </div>
          )}

          <AbsendeKnopf
            laufttext="Wird abgeschlossen…"
            className="rounded bg-arcos-steel text-white text-sm font-medium px-4 py-2 hover:bg-arcos-navy disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Rapport abschliessen
          </AbsendeKnopf>
        </form>
      )}
    </div>
  );
}
