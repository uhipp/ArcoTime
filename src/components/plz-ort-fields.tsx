"use client";

import { useEffect, useRef, useState } from "react";

type PlzTreffer = { plz: string; ort: string; kanton: string | null; hauptort: boolean };

export function PlzOrtFields({
  defaultPlz,
  defaultOrt,
}: {
  defaultPlz?: string | null;
  defaultOrt?: string | null;
}) {
  const [plz, setPlz] = useState(defaultPlz ?? "");
  const [ort, setOrt] = useState(defaultOrt ?? "");
  const [plzAuswahlRoh, setPlzAuswahl] = useState<PlzTreffer[]>([]);
  const [ortAuswahlRoh, setOrtAuswahl] = useState<PlzTreffer[]>([]);

  // Ob eine Vorschlagsliste überhaupt gilt, wird beim Rendern abgeleitet
  // statt im Effect zurückgesetzt: Sobald die Eingabe nicht mehr zur Liste
  // passt, ist sie sofort weg – ohne zusätzlichen Renderdurchgang und ohne
  // dass kurz Vorschläge zu einer alten Eingabe stehen bleiben.
  const plzVollstaendig = /^\d{4}$/.test(plz);
  const ortLangGenug = ort.trim().length >= 2;
  const plzAuswahl = plzVollstaendig ? plzAuswahlRoh : [];
  const ortAuswahl = ortLangGenug ? ortAuswahlRoh : [];

  // Merkt sich, welches Feld zuletzt von Hand geändert wurde – damit sich
  // die beiden Auto-Fill-Richtungen (PLZ→Ort und Ort→PLZ) nicht gegenseitig
  // in eine Endlosschleife schicken.
  const zuletztBearbeitet = useRef<"plz" | "ort" | null>(null);
  const plzDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ortDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // PLZ eingegeben -> Ort nachschlagen
  useEffect(() => {
    if (zuletztBearbeitet.current !== "plz") return;
    if (plzDebounce.current) clearTimeout(plzDebounce.current);

    if (!plzVollstaendig) return;

    plzDebounce.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/plz?plz=${plz}`);
        const treffer: PlzTreffer[] = await res.json();
        if (!Array.isArray(treffer)) return;

        if (treffer.length === 1) {
          setOrt(treffer[0].ort);
          setPlzAuswahl([]);
        } else if (treffer.length > 1) {
          setPlzAuswahl(treffer);
        } else {
          setPlzAuswahl([]);
        }
      } catch {
        // Netzwerkfehler: Ort einfach manuell erfassen lassen.
      }
    }, 300);

    return () => {
      if (plzDebounce.current) clearTimeout(plzDebounce.current);
    };
  }, [plz, plzVollstaendig]);

  // Ort eingegeben -> PLZ nachschlagen
  useEffect(() => {
    if (zuletztBearbeitet.current !== "ort") return;
    if (ortDebounce.current) clearTimeout(ortDebounce.current);

    if (!ortLangGenug) return;

    ortDebounce.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/plz?q=${encodeURIComponent(ort.trim())}`);
        const treffer: PlzTreffer[] = await res.json();
        if (!Array.isArray(treffer)) return;

        if (treffer.length === 1) {
          setPlz(treffer[0].plz);
          setOrtAuswahl([]);
        } else if (treffer.length > 1) {
          setOrtAuswahl(treffer);
        } else {
          setOrtAuswahl([]);
        }
      } catch {
        // Netzwerkfehler: PLZ einfach manuell erfassen lassen.
      }
    }, 300);

    return () => {
      if (ortDebounce.current) clearTimeout(ortDebounce.current);
    };
  }, [ort, ortLangGenug]);

  return (
    <>
      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="plz">
          PLZ
        </label>
        <input
          id="plz"
          name="plz"
          value={plz}
          onChange={(e) => {
            zuletztBearbeitet.current = "plz";
            setOrtAuswahl([]);
            setPlz(e.target.value);
          }}
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-arcos-steel"
        />
        {plzAuswahl.length > 0 && (
          <div className="mt-1 rounded border border-gray-200 bg-white shadow-sm text-sm overflow-hidden">
            <p className="px-3 py-1 text-xs text-gray-400 bg-gray-50">
              Mehrere Ortschaften zu PLZ {plz} – bitte wählen:
            </p>
            {plzAuswahl.map((t) => (
              <button
                key={`${t.plz}-${t.ort}`}
                type="button"
                onClick={() => {
                  zuletztBearbeitet.current = null;
                  setOrt(t.ort);
                  setPlzAuswahl([]);
                }}
                className="block w-full text-left px-3 py-1.5 hover:bg-arcos-steel/10"
              >
                {t.ort} {t.kanton ? `(${t.kanton})` : ""}
              </button>
            ))}
          </div>
        )}
      </div>
      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="ort">
          Ort
        </label>
        <input
          id="ort"
          name="ort"
          value={ort}
          onChange={(e) => {
            zuletztBearbeitet.current = "ort";
            setPlzAuswahl([]);
            setOrt(e.target.value);
          }}
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-arcos-steel"
        />
        {ortAuswahl.length > 0 && (
          <div className="mt-1 rounded border border-gray-200 bg-white shadow-sm text-sm overflow-hidden">
            <p className="px-3 py-1 text-xs text-gray-400 bg-gray-50">
              Mehrere Treffer zu &quot;{ort}&quot; – bitte wählen:
            </p>
            {ortAuswahl.map((t) => (
              <button
                key={`${t.plz}-${t.ort}`}
                type="button"
                onClick={() => {
                  zuletztBearbeitet.current = null;
                  setOrt(t.ort);
                  setPlz(t.plz);
                  setOrtAuswahl([]);
                }}
                className="block w-full text-left px-3 py-1.5 hover:bg-arcos-steel/10"
              >
                {t.plz} {t.ort} {t.kanton ? `(${t.kanton})` : ""}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
