"use client";

import { useState } from "react";
import { rabattLabel } from "@/lib/rabatt";
import { ZeitFeld } from "@/components/zeit-feld";
import { minutenZwischen } from "@/lib/zeit";
import type { Dienstleistung, ZeiteintragMitDetails } from "@/lib/types";

type Rabattsatz = { id: string; prozent: number; bezeichnung: string | null; aktiv: boolean };
type DienstleistungOption = Pick<
  Dienstleistung,
  "id" | "bezeichnung" | "aktiv" | "einheit" | "zaehlt_als_arbeitszeit" | "rabatt_erlaubt"
>;

// Eine Position zum Rapport hinzufügen. Bewusst schlanker als die
// Zeiterfassung: Datum, ausführende Person und Projekt kommen vom Rapport
// und gelten für den ganzen Einsatz. Kein Timer – wer einen Rapport
// schreibt, ist mit der Arbeit fertig.
export function RapportPositionForm({
  dienstleistungen,
  rabattsaetze,
  action,
  position,
  abbrechenHref,
}: {
  dienstleistungen: DienstleistungOption[];
  rabattsaetze: Rabattsatz[];
  action: (formData: FormData) => void;
  // Gesetzt beim Bearbeiten einer bestehenden Position.
  position?: ZeiteintragMitDetails;
  abbrechenHref?: string;
}) {
  const bearbeiten = position != null;

  const [dienstleistungId, setDienstleistungId] = useState(position?.dienstleistung_id ?? "");
  const [startZeit, setStartZeit] = useState(position?.start_zeit?.slice(0, 5) ?? "");
  const [endZeit, setEndZeit] = useState(position?.end_zeit?.slice(0, 5) ?? "");
  const [dauerText, setDauerText] = useState(
    position?.dauer_minuten != null ? String(position.dauer_minuten) : ""
  );
  const [mengeText, setMengeText] = useState(
    position?.menge != null ? String(position.menge) : ""
  );
  // Beim Bearbeiten gilt die gespeicherte Dauer, nicht die aus Von/Bis
  // errechnete – sie kann bewusst abweichen, etwa wegen einer Pause.
  const [dauerManuell, setDauerManuell] = useState(bearbeiten);

  const gewaehlt = dienstleistungen.find((d) => d.id === dienstleistungId);
  const istMengenartikel = gewaehlt != null && !gewaehlt.zaehlt_als_arbeitszeit;
  const einheit = gewaehlt?.einheit ?? "Stück";

  const rabattGesperrt = gewaehlt != null && !gewaehlt.rabatt_erlaubt;
  const waehlbareRabatte = rabattGesperrt
    ? rabattsaetze.filter((r) => Number(r.prozent) === 0 || Number(r.prozent) === 100)
    : rabattsaetze;

  function onZeitChange(neuStart: string, neuEnde: string) {
    setStartZeit(neuStart);
    setEndZeit(neuEnde);
    if (neuStart && neuEnde && !dauerManuell) {
      const m = minutenZwischen(neuStart, neuEnde);
      if (m !== null) setDauerText(String(m));
    }
  }

  return (
    <form action={action} className="bg-white rounded-lg border p-5 space-y-4">
      <h3 className="text-sm font-semibold">
        {bearbeiten ? "Position bearbeiten" : "Position hinzufügen"}
      </h3>

      <div>
        <label className="block text-xs text-gray-500 mb-1" htmlFor="pos_dienstleistung">
          Leistung
        </label>
        <select
          id="pos_dienstleistung"
          name="dienstleistung_id"
          required
          value={dienstleistungId}
          onChange={(e) => setDienstleistungId(e.target.value)}
          className="w-full max-w-md rounded border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="" disabled>
            Bitte wählen…
          </option>
          {dienstleistungen.map((d) => (
            <option key={d.id} value={d.id}>
              {d.bezeichnung} ({d.einheit})
            </option>
          ))}
        </select>
      </div>

      {istMengenartikel ? (
        <div className="max-w-xs">
          <label className="block text-xs text-gray-500 mb-1" htmlFor="pos_menge">
            Menge in {einheit}
          </label>
          <input
            id="pos_menge"
            name="menge"
            type="number"
            step="0.01"
            min={0}
            required
            value={mengeText}
            onChange={(e) => setMengeText(e.target.value)}
            onFocus={(e) => {
              const el = e.currentTarget;
              requestAnimationFrame(() => el.select());
            }}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1" htmlFor="pos_von">
              Von (optional)
            </label>
            <ZeitFeld
              id="pos_von"
              name="start_zeit"
              startwert={position?.start_zeit?.slice(0, 5) ?? ""}
              onZeit={(z) => onZeitChange(z ?? "", endZeit)}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1" htmlFor="pos_bis">
              Bis (optional)
            </label>
            <ZeitFeld
              id="pos_bis"
              name="end_zeit"
              startwert={position?.end_zeit?.slice(0, 5) ?? ""}
              onZeit={(z) => onZeitChange(startZeit, z ?? "")}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1" htmlFor="pos_dauer">
              Dauer (Minuten)
            </label>
            <input
              id="pos_dauer"
              name="dauer_minuten"
              type="number"
              min={0}
              value={dauerText}
              onChange={(e) => {
                setDauerText(e.target.value);
                setDauerManuell(true);
              }}
              onFocus={(e) => {
                const el = e.currentTarget;
                requestAnimationFrame(() => el.select());
              }}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
      )}

      <div>
        <label className="block text-xs text-gray-500 mb-1" htmlFor="pos_beschreibung">
          Beschreibung
        </label>
        <textarea
          id="pos_beschreibung"
          name="beschreibung"
          rows={2}
          defaultValue={position?.beschreibung ?? ""}
          placeholder="Was wurde gemacht?"
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1" htmlFor="pos_rabatt">
            Rabatt
          </label>
          <select
            id="pos_rabatt"
            name="rabatt_prozent"
            defaultValue={position?.rabatt_prozent ?? 0}
            className="rounded border border-gray-300 px-3 py-2 text-sm"
          >
            {waehlbareRabatte.map((r) => (
              <option key={r.id} value={r.prozent}>
                {r.bezeichnung ?? rabattLabel(r.prozent)}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="rounded bg-arcos-steel text-white text-sm font-medium px-4 py-2 hover:bg-arcos-navy"
        >
          {bearbeiten ? "Änderungen speichern" : "Position hinzufügen"}
        </button>
        {abbrechenHref && (
          <a
            href={abbrechenHref}
            className="rounded border text-sm font-medium px-4 py-2 hover:bg-gray-50"
          >
            Abbrechen
          </a>
        )}
      </div>

      {rabattGesperrt && (
        <p className="text-xs text-gray-400">
          Für diese Leistung sind keine Teilrabatte zugelassen.
        </p>
      )}
    </form>
  );
}
