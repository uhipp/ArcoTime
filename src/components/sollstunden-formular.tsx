"use client";

import { useState } from "react";

const MONATE = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
];

const WOCHENTAGE = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

type Schliesstag = { bezeichnung: string; von: string; bis: string };

function iso(jahr: number, monat: number, tag: number): string {
  return `${jahr}-${String(monat).padStart(2, "0")}-${String(tag).padStart(2, "0")}`;
}

function tageImMonat(jahr: number, monat: number): number {
  return new Date(jahr, monat, 0).getDate();
}

// Sollstunden je Monat – mit einem Kalenderfenster als Rechenhilfe.
//
// Die Monatszahl von Hand auszurechnen ist mühsam und fehleranfällig:
// Arbeitstage zählen, Feiertage abziehen, Brückentage berücksichtigen.
// Das Kalenderfenster nimmt die Arbeit ab und zeigt jeden Tag einzeln –
// vorbelegt, aber überall korrigierbar. Erst „Daten übernehmen“ schreibt
// die Summe in die Monatszeile; bis dahin ändert sich nichts.
export function SollstundenFormular({
  jahr,
  wochenstunden,
  schliesstage,
  werte,
}: {
  jahr: number;
  wochenstunden: number;
  // Feiertage und Betriebsferien der Organisation – sie werden im
  // Kalender mit null vorbelegt und benannt.
  schliesstage: Schliesstag[];
  werte: Record<number, number>;
}) {
  const [monatswerte, setMonatswerte] = useState<Record<number, string>>(() =>
    Object.fromEntries(
      Array.from({ length: 12 }, (_, i) => [i + 1, werte[i + 1] != null ? String(werte[i + 1]) : ""])
    )
  );
  const [offenerMonat, setOffenerMonat] = useState<number | null>(null);

  // Montag bis Freitag mit dem Fünftel der Wochenstunden. Wer einen
  // anderen Rhythmus fährt, korrigiert die einzelnen Tage – genau dafür
  // ist das Fenster da.
  const tagesanteil = wochenstunden / 5;

  const schliesstagAm = (datum: string): string | null =>
    schliesstage.find((t) => t.von <= datum && t.bis >= datum)?.bezeichnung ?? null;

  const vorbelegung = (monat: number): Record<number, string> => {
    const tage: Record<number, string> = {};
    for (let tag = 1; tag <= tageImMonat(jahr, monat); tag++) {
      const datum = iso(jahr, monat, tag);
      const wochentag = new Date(`${datum}T12:00:00`).getDay();
      const istWochenende = wochentag === 0 || wochentag === 6;
      tage[tag] =
        istWochenende || schliesstagAm(datum) ? "0" : String(Number(tagesanteil.toFixed(2)));
    }
    return tage;
  };

  const [kalender, setKalender] = useState<Record<number, string>>({});

  function oeffne(monat: number) {
    setKalender(vorbelegung(monat));
    setOffenerMonat(monat);
  }

  const kalenderSumme = Object.values(kalender).reduce(
    (s, w) => s + (Number(String(w).replace(",", ".")) || 0),
    0
  );

  function uebernehmen(monat: number) {
    setMonatswerte((bisher) => ({
      ...bisher,
      [monat]: String(Number(kalenderSumme.toFixed(2))),
    }));
    setOffenerMonat(null);
  }

  const jahresSumme = Object.values(monatswerte).reduce(
    (s, w) => s + (Number(String(w).replace(",", ".")) || 0),
    0
  );

  return (
    <>
      <div className="rounded-lg border bg-white divide-y">
        {MONATE.map((name, i) => {
          const monat = i + 1;
          const offen = offenerMonat === monat;

          return (
            <div key={monat}>
              <div className="flex flex-wrap items-center gap-3 px-4 py-2">
                <label className="flex-1 min-w-[8rem] text-sm" htmlFor={`monat_${monat}`}>
                  {name}
                </label>
                <button
                  type="button"
                  onClick={() => (offen ? setOffenerMonat(null) : oeffne(monat))}
                  className="rounded border px-3 py-1 text-xs hover:bg-gray-50"
                >
                  {offen ? "Kalender schliessen" : "Kalender"}
                </button>
                <input
                  id={`monat_${monat}`}
                  name={`monat_${monat}`}
                  type="number"
                  // "any" und nicht 0.25: Bei 8,4 Stunden am Tag ergeben
                  // sich Monatssummen wie 176,4 – der Browser lehnte sie
                  // als "kein Vielfaches von 0,25" ab. Die Pfeiltasten
                  // springen damit in Einerschritten, was hier ohnehin
                  // die sinnvollere Schrittweite ist.
                  step="any"
                  min="0"
                  value={monatswerte[monat] ?? ""}
                  onChange={(e) =>
                    setMonatswerte((bisher) => ({ ...bisher, [monat]: e.target.value }))
                  }
                  placeholder="–"
                  className="w-28 rounded border border-gray-300 px-2 py-1.5 text-sm text-right"
                />
                <span className="w-10 text-xs text-gray-400">Std.</span>
              </div>

              {offen && (
                <div className="border-t bg-gray-50 px-4 py-3">
                  <p className="mb-3 text-xs text-gray-500">
                    Vorbelegt: Montag bis Freitag mit{" "}
                    <strong>{Number(tagesanteil.toFixed(2))} Std.</strong>{" "}
                    (Wochenstunden ÷ 5), Wochenenden und Schliesstage mit null.
                    Einzelne Tage lassen sich hier ändern – etwa Brückentage
                    oder ein halber Tag am 24. Dezember.
                  </p>

                  <div className="grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-3 lg:grid-cols-4">
                    {Array.from({ length: tageImMonat(jahr, monat) }, (_, k) => {
                      const tag = k + 1;
                      const datum = iso(jahr, monat, tag);
                      const wochentag = new Date(`${datum}T12:00:00`).getDay();
                      const frei = schliesstagAm(datum);
                      const istWochenende = wochentag === 0 || wochentag === 6;

                      return (
                        <div key={tag} className="flex items-center gap-2">
                          <span
                            className={`w-16 shrink-0 font-mono text-xs ${
                              istWochenende || frei ? "text-gray-400" : "text-gray-600"
                            }`}
                            title={frei ?? undefined}
                          >
                            {WOCHENTAGE[wochentag]} {String(tag).padStart(2, "0")}.
                          </span>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            value={kalender[tag] ?? ""}
                            onChange={(e) =>
                              setKalender((bisher) => ({ ...bisher, [tag]: e.target.value }))
                            }
                            aria-label={`${tag}. ${name}`}
                            className={`w-16 rounded border px-1.5 py-1 text-xs text-right ${
                              frei ? "border-amber-300 bg-amber-50" : "border-gray-300"
                            }`}
                          />
                          {frei && (
                            <span className="truncate text-[11px] text-amber-700" title={frei}>
                              {frei}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-3 border-t pt-3">
                    <span className="text-sm">
                      Summe {name}: <strong>{kalenderSumme.toFixed(2)} Std.</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => uebernehmen(monat)}
                      className="rounded bg-arcos-steel px-4 py-2 text-sm font-medium text-white hover:bg-arcos-navy"
                    >
                      Daten übernehmen
                    </button>
                    <button
                      type="button"
                      onClick={() => setOffenerMonat(null)}
                      className="text-sm text-gray-500 hover:underline"
                    >
                      Abbrechen
                    </button>
                    <span className="text-xs text-gray-400">
                      Übernehmen schreibt die Summe in die Monatszeile – gespeichert
                      wird erst unten.
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 font-medium">
          <span className="flex-1 text-sm">Summe {jahr}</span>
          <span className="w-28 text-right text-sm">{jahresSumme.toFixed(2)}</span>
          <span className="w-10 text-xs text-gray-400">Std.</span>
        </div>
      </div>

      <p className="mt-2 text-xs text-gray-400">
        Ein leeres Feld heisst „nicht erfasst“ und nicht „null Stunden“ – der
        Monat wird dann aus der Tabelle entfernt.
      </p>
    </>
  );
}
