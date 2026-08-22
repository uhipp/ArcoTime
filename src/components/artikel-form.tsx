"use client";

import type { Artikel, Artikelklasse, MwstCode } from "@/lib/types";
import Link from "next/link";
import { useActionState } from "react";
import type { FormularErgebnis } from "@/lib/formular-ergebnis";
import { AbsendeKnopf } from "@/components/absende-knopf";
import { STAND_FELD } from "@/lib/konflikt";

export function ArtikelForm({
  artikel,
  klassen,
  mwstCodes,
  einheiten,
  action,
  error,
}: {
  artikel?: Artikel;
  klassen: Pick<Artikelklasse, "id" | "bezeichnung">[];
  mwstCodes: Pick<MwstCode, "id" | "code" | "bezeichnung">[];
  einheiten: { id: string; bezeichnung: string; aktiv: boolean }[];
  action: (bisher: FormularErgebnis, formData: FormData) => Promise<FormularErgebnis>;
  error?: string;
}) {

  // Fehler kommt aus der Aktion zurueck statt per Weiterleitung –
  // so bleibt die Eingabe stehen (siehe lib/formular-ergebnis).
  const [ergebnis, formAction] = useActionState(action, null);
  const meldung = ergebnis?.fehler ?? error;
  return (
    <form action={formAction} className="space-y-6 max-w-2xl">
      {/* Stand beim Öffnen. Beim Speichern wird geprüft, ob der
          Datensatz seither unverändert ist – siehe lib/konflikt. */}
      {artikel?.updated_at && (
        <input type="hidden" name={STAND_FELD} value={String(artikel.updated_at)} />
      )}
      {meldung && (
        <div className="rounded bg-red-50 text-red-700 text-sm px-3 py-2">
          {meldung}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="bezeichnung">
          Bezeichnung
        </label>
        <input
          id="bezeichnung"
          name="bezeichnung"
          required
          defaultValue={artikel?.bezeichnung ?? ""}
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-arcos-steel"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="beschreibung">
          Beschreibung
        </label>
        <textarea
          id="beschreibung"
          name="beschreibung"
          rows={2}
          defaultValue={artikel?.beschreibung ?? ""}
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-arcos-steel"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="klasse_id">
            Klasse
          </label>
          <select
            id="klasse_id"
            name="klasse_id"
            required
            defaultValue={artikel?.klasse_id ?? ""}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-arcos-steel"
          >
            <option value="" disabled>
              Bitte wählen…
            </option>
            {klassen.map((k) => (
              <option key={k.id} value={k.id}>
                {k.bezeichnung}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="einheit">
            Einheit
          </label>
          {/* Auswahl aus der unter Einstellungen gepflegten Liste. Ein
              bereits gespeicherter Wert, der dort inzwischen fehlt (z.B.
              deaktiviert), bleibt als Option erhalten – sonst würde er beim
              nächsten Speichern still überschrieben. */}
          <select
            id="einheit"
            name="einheit"
            defaultValue={artikel?.einheit ?? einheiten[0]?.bezeichnung ?? "Stunde"}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-arcos-steel"
          >
            {einheiten.map((e) => (
              <option key={e.id} value={e.bezeichnung}>
                {e.bezeichnung}
                {!e.aktiv ? " (inaktiv)" : ""}
              </option>
            ))}
            {artikel?.einheit &&
              !einheiten.some((e) => e.bezeichnung === artikel.einheit) && (
                <option value={artikel.einheit}>
                  {artikel.einheit} (nicht mehr in der Liste)
                </option>
              )}
          </select>
          <p className="text-xs text-gray-400 mt-1">
            Neue Einheiten legst du unter Einstellungen an.
          </p>
        </div>
      </div>

      <div className="space-y-3 rounded border border-gray-200 bg-gray-50 p-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="zaehlt_als_arbeitszeit"
            defaultChecked={artikel?.zaehlt_als_arbeitszeit ?? true}
            className="mt-0.5"
          />
          <span>
            <span className="block text-sm font-medium">Zählt als Arbeitszeit</span>
            <span className="block text-xs text-gray-500 mt-0.5">
              Angehakt: Erfassung über Von/Bis bzw. Dauer, fliesst in
              Stundenauswertungen ein. Nicht angehakt: Erfassung über eine
              Menge (Kilometer, Spesen, Kleinmaterial) – wird verrechnet,
              erscheint aber in keiner Stundenauswertung.
            </span>
          </span>
        </label>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="rabatt_erlaubt"
            defaultChecked={artikel?.rabatt_erlaubt ?? true}
            className="mt-0.5"
          />
          <span>
            <span className="block text-sm font-medium">Rabatt zulässig</span>
            <span className="block text-xs text-gray-500 mt-0.5">
              Nicht angehakt: Teilrabatte sind gesperrt (z.B. Reisespesen).
              100% bleibt möglich, damit die Position weiterhin als nicht
              verrechnet gebucht werden kann.
            </span>
          </span>
        </label>

        {/* Bewusst ein Häkchen an beliebigen Leistungen statt einer fest
            verdrahteten Position "Reise-km": Die eine Organisation nennt
            es Wegpauschale, die andere Kilometergeld, manche haben
            mehrere Sätze für verschiedene Fahrzeuge. */}
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="menge_aus_anreise"
            defaultChecked={artikel?.menge_aus_anreise ?? false}
            className="mt-0.5"
          />
          <span>
            <span className="block text-sm font-medium">Anreise zum Kunden</span>
            <span className="block text-xs text-gray-500 mt-0.5">
              Angehakt: Beim Erfassen wird die beim Kunden hinterlegte
              Anfahrt in Kilometern als Menge vorgeschlagen – überschreibbar
              und danach am Eintrag eingefroren. Mehrere Leistungen dürfen
              das tragen, etwa für verschiedene Fahrzeuge.
            </span>
          </span>
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="preis">
          Preis (CHF)
        </label>
        <input
          id="preis"
          name="preis"
          type="number"
          step="0.05"
          min="0"
          required
          defaultValue={artikel?.preis ?? ""}
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-arcos-steel"
        />
      </div>

      <h2 className="text-sm font-semibold text-gray-500">Buchhaltung</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="konto">
            Konto
          </label>
          <input
            id="konto"
            name="konto"
            defaultValue={artikel?.konto ?? ""}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-arcos-steel"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="mwst_code_id">
            MWSt-Code
          </label>
          <select
            id="mwst_code_id"
            name="mwst_code_id"
            defaultValue={artikel?.mwst_code_id ?? ""}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-arcos-steel"
          >
            <option value="">Keiner</option>
            {mwstCodes.map((m) => (
              <option key={m.id} value={m.id}>
                {m.code} – {m.bezeichnung}
              </option>
            ))}
          </select>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="aktiv"
          defaultChecked={artikel?.aktiv ?? true}
        />
        Aktiv (in Auswahllisten sichtbar)
      </label>

      <div className="flex gap-3">
        <AbsendeKnopf
          laufttext="Wird gespeichert…"
          className="rounded bg-arcos-steel text-white text-sm font-medium px-4 py-2 hover:bg-arcos-navy disabled:opacity-60 disabled:cursor-not-allowed"
        >
          Speichern
        </AbsendeKnopf>
        <Link
          href="/artikel"
          className="rounded border text-sm font-medium px-4 py-2 hover:bg-gray-50"
        >
          Abbrechen
        </Link>
      </div>
    </form>
  );
}
