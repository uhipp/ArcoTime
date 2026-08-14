"use client";

import { useActionState, useState } from "react";
import { AbsendeKnopf } from "@/components/absende-knopf";
import { UnterschriftFeld } from "@/components/unterschrift-feld";
import type { FormularErgebnis } from "@/lib/formular-ergebnis";

type Aktion = (bisher: FormularErgebnis, formData: FormData) => Promise<FormularErgebnis>;

// Rapport abschliessen – mit Unterschrift des Kunden oder ohne.
//
// Solange ein Rapport offen ist, gelten seine Positionen als Absicht und
// zählen nirgends (siehe Migration 0036). Der Abschluss ist damit kein
// Formalismus, sondern der Moment, in dem die Arbeit gültig wird. Deshalb
// steht er sichtbar auf der Seite und nicht in einem Menü.
//
// Die Unterschrift ist der gemeinte Weg und steht deshalb voran. Der
// Abschluss ohne Unterschrift ist der Ausweg für den häufigsten
// Praxisfall – niemand Unterschriftsberechtigtes mehr vor Ort – und
// verlangt dafür einen Vermerk. Er liegt eine Ebene tiefer, damit er
// nicht zur bequemen Gewohnheit wird.
export function RapportAbschluss({
  signierenAction,
  ohneUnterschriftAction,
  anzahlPositionen,
  datumInZukunft,
  darfAbschliessen,
  verantwortlichName,
}: {
  signierenAction: Aktion;
  ohneUnterschriftAction: Aktion;
  anzahlPositionen: number;
  datumInZukunft: boolean;
  // Abschliessen darf die verantwortliche Person – oder ein Admin, damit
  // ein Einsatz nicht feststeckt, wenn sie krank ist (0047).
  darfAbschliessen: boolean;
  verantwortlichName: string | null;
}) {
  const [signErgebnis, signFormAction] = useActionState(signierenAction, null);
  const [ohneErgebnis, ohneFormAction] = useActionState(ohneUnterschriftAction, null);
  const [ohneOffen, setOhneOffen] = useState(false);

  // Beide Fälle lehnt auch die Datenbank ab. Sie hier vorweg zu nehmen
  // erspart den Klick ins Leere und sagt, was zu tun ist.
  const grund = !darfAbschliessen
    ? `Diesen Rapport schliesst ${
        verantwortlichName ? `${verantwortlichName} ` : "die verantwortliche Person "
      }ab. Wer das ändern will, trägt oben eine andere verantwortliche Person ein.`
    : anzahlPositionen === 0
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
        <>
          <form action={signFormAction} className="space-y-3">
            <div>
              <label
                className="block text-sm font-medium mb-1"
                htmlFor="unterzeichner_name"
              >
                Unterschrift des Kunden
              </label>
              <input
                id="unterzeichner_name"
                name="unterzeichner_name"
                required
                placeholder="Name der unterzeichnenden Person"
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-arcos-steel"
              />
              <UnterschriftFeld name="unterschrift" />
            </div>

            {signErgebnis?.fehler && (
              <div className="rounded bg-red-50 text-red-700 text-sm px-3 py-2">
                {signErgebnis.fehler}
              </div>
            )}

            <AbsendeKnopf
              laufttext="Wird abgeschlossen…"
              className="rounded bg-arcos-steel text-white text-sm font-medium px-4 py-2 hover:bg-arcos-navy disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Signieren und abschliessen
            </AbsendeKnopf>
          </form>

          <div className="border-t mt-5 pt-4">
            {!ohneOffen ? (
              <button
                type="button"
                onClick={() => setOhneOffen(true)}
                className="text-sm text-arcos-steel hover:underline"
              >
                Ohne Unterschrift abschliessen
              </button>
            ) : (
              <form action={ohneFormAction} className="space-y-3">
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
                    Bleibt am Rapport vermerkt und ist später nachvollziehbar.
                  </p>
                </div>

                {ohneErgebnis?.fehler && (
                  <div className="rounded bg-red-50 text-red-700 text-sm px-3 py-2">
                    {ohneErgebnis.fehler}
                  </div>
                )}

                <AbsendeKnopf
                  laufttext="Wird abgeschlossen…"
                  className="rounded border text-sm font-medium px-4 py-2 hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Ohne Unterschrift abschliessen
                </AbsendeKnopf>
              </form>
            )}
          </div>
        </>
      )}
    </div>
  );
}
