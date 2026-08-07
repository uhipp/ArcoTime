"use client";

import { useEffect, useRef, useState } from "react";
import { heuteIso } from "@/lib/date-utils";
import type { Dienstleistung, Mandat, Zeiteintrag } from "@/lib/types";

function jetztAlsZeit() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function minutenZwischen(start: string, ende: string): number | null {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = ende.split(":").map(Number);
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return null;
  const diff = eh * 60 + em - (sh * 60 + sm);
  return diff > 0 ? diff : null;
}

function formatDauer(minuten: number) {
  const h = Math.floor(minuten / 60);
  const m = minuten % 60;
  return `${h}h ${String(m).padStart(2, "0")}min`;
}

export function ZeiterfassungForm({
  zeiteintrag,
  mandate,
  dienstleistungen,
  action,
  error,
}: {
  zeiteintrag?: Zeiteintrag;
  mandate: (Pick<Mandat, "id" | "bezeichnung" | "status"> & {
    kunden?: { name: string; vorname: string | null } | null;
  })[];
  dienstleistungen: Pick<Dienstleistung, "id" | "bezeichnung" | "aktiv">[];
  action: (formData: FormData) => void;
  error?: string;
}) {
  const [startZeit, setStartZeit] = useState(zeiteintrag?.start_zeit?.slice(0, 5) ?? "");
  const [endZeit, setEndZeit] = useState(zeiteintrag?.end_zeit?.slice(0, 5) ?? "");
  const [dauer, setDauer] = useState(zeiteintrag?.dauer_minuten ?? 0);
  const [timerLaeuft, setTimerLaeuft] = useState(false);
  const [timerSekunden, setTimerSekunden] = useState(0);
  const timerStart = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Live-Ticker während der Timer läuft
  useEffect(() => {
    if (!timerLaeuft) return;
    intervalRef.current = setInterval(() => {
      if (timerStart.current) {
        setTimerSekunden(Math.floor((Date.now() - timerStart.current) / 1000));
      }
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timerLaeuft]);

  function timerStarten() {
    timerStart.current = Date.now();
    setTimerSekunden(0);
    setTimerLaeuft(true);
    setStartZeit(jetztAlsZeit());
    setEndZeit("");
  }

  function timerStoppen() {
    setTimerLaeuft(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    const minuten = Math.max(1, Math.round(timerSekunden / 60));
    setDauer(minuten);
    setEndZeit(jetztAlsZeit());
  }

  function onZeitChange(neueStart: string, neueEnde: string) {
    setStartZeit(neueStart);
    setEndZeit(neueEnde);
    if (neueStart && neueEnde) {
      const m = minutenZwischen(neueStart, neueEnde);
      if (m !== null) setDauer(m);
    }
  }

  return (
    <form action={action} className="space-y-5 bg-white rounded-lg border p-5">
      {error && (
        <div className="rounded bg-red-50 text-red-700 text-sm px-3 py-2">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="mandat_id">
            Mandat
          </label>
          <select
            id="mandat_id"
            name="mandat_id"
            required
            defaultValue={zeiteintrag?.mandat_id ?? ""}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-arcos-steel"
          >
            <option value="" disabled>
              Bitte wählen…
            </option>
            {mandate.map((m) => (
              <option key={m.id} value={m.id}>
                {m.kunden?.vorname ? `${m.kunden.vorname} ` : ""}
                {m.kunden?.name} – {m.bezeichnung}
                {m.status === "inaktiv" ? " (inaktiv)" : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            className="block text-sm font-medium mb-1"
            htmlFor="dienstleistung_id"
          >
            Dienstleistung
          </label>
          <select
            id="dienstleistung_id"
            name="dienstleistung_id"
            required
            defaultValue={zeiteintrag?.dienstleistung_id ?? ""}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-arcos-steel"
          >
            <option value="" disabled>
              Bitte wählen…
            </option>
            {dienstleistungen.map((d) => (
              <option key={d.id} value={d.id}>
                {d.bezeichnung}
                {!d.aktiv ? " (inaktiv)" : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="datum">
          Datum
        </label>
        <input
          id="datum"
          name="datum"
          type="date"
          defaultValue={zeiteintrag?.datum ?? heuteIso()}
          required
          className="w-full max-w-xs rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-arcos-steel"
        />
      </div>

      <div className="rounded border border-gray-200 p-4 bg-gray-50">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium">Zeit erfassen</span>
          {!timerLaeuft ? (
            <button
              type="button"
              onClick={timerStarten}
              className="text-sm rounded bg-green-600 text-white px-3 py-1.5 hover:bg-green-700"
            >
              ▶ Timer starten
            </button>
          ) : (
            <button
              type="button"
              onClick={timerStoppen}
              className="text-sm rounded bg-red-600 text-white px-3 py-1.5 hover:bg-red-700"
            >
              ⏹ Stoppen ({String(Math.floor(timerSekunden / 60)).padStart(2, "0")}:
              {String(timerSekunden % 60).padStart(2, "0")})
            </button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1" htmlFor="start_zeit">
              Von
            </label>
            <input
              id="start_zeit"
              name="start_zeit"
              type="time"
              value={startZeit}
              onChange={(e) => onZeitChange(e.target.value, endZeit)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-arcos-steel"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1" htmlFor="end_zeit">
              Bis
            </label>
            <input
              id="end_zeit"
              name="end_zeit"
              type="time"
              value={endZeit}
              onChange={(e) => onZeitChange(startZeit, e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-arcos-steel"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1" htmlFor="dauer_minuten">
              Dauer (Minuten)
            </label>
            <input
              id="dauer_minuten"
              name="dauer_minuten"
              type="number"
              min={1}
              required
              value={dauer}
              onChange={(e) => setDauer(Number(e.target.value))}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-arcos-steel"
            />
          </div>
        </div>
        {dauer > 0 && (
          <p className="text-xs text-gray-400 mt-2">≈ {formatDauer(dauer)}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="beschreibung">
          Beschreibung
        </label>
        <textarea
          id="beschreibung"
          name="beschreibung"
          rows={2}
          defaultValue={zeiteintrag?.beschreibung ?? ""}
          placeholder="Was wurde gemacht?"
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-arcos-steel"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="rabatt_prozent">
            Rabatt (%)
          </label>
          <input
            id="rabatt_prozent"
            name="rabatt_prozent"
            type="number"
            min={0}
            max={100}
            step="0.1"
            defaultValue={zeiteintrag?.rabatt_prozent ?? 0}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-arcos-steel"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="referenz">
            Referenz (optional)
          </label>
          <input
            id="referenz"
            name="referenz"
            defaultValue={zeiteintrag?.referenz ?? ""}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-arcos-steel"
          />
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={timerLaeuft}
          className="rounded bg-arcos-steel text-white text-sm font-medium px-4 py-2 hover:bg-arcos-navy disabled:opacity-50"
        >
          Speichern
        </button>
        <a
          href="/zeiterfassung"
          className="rounded border text-sm font-medium px-4 py-2 hover:bg-gray-50"
        >
          Abbrechen
        </a>
      </div>
    </form>
  );
}
