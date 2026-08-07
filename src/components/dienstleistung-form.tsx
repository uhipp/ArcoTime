import type { Dienstleistung, Dienstleistungsklasse, MwstCode } from "@/lib/types";

export function DienstleistungForm({
  dienstleistung,
  klassen,
  mwstCodes,
  action,
  error,
}: {
  dienstleistung?: Dienstleistung;
  klassen: Pick<Dienstleistungsklasse, "id" | "bezeichnung">[];
  mwstCodes: Pick<MwstCode, "id" | "code" | "bezeichnung">[];
  action: (formData: FormData) => void;
  error?: string;
}) {
  return (
    <form action={action} className="space-y-6 max-w-2xl">
      {error && (
        <div className="rounded bg-red-50 text-red-700 text-sm px-3 py-2">
          {error}
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
          defaultValue={dienstleistung?.bezeichnung ?? ""}
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          defaultValue={dienstleistung?.beschreibung ?? ""}
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="klasse_id">
            Klasse
          </label>
          <select
            id="klasse_id"
            name="klasse_id"
            required
            defaultValue={dienstleistung?.klasse_id ?? ""}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          <select
            id="einheit"
            name="einheit"
            defaultValue={dienstleistung?.einheit ?? "Stunde"}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="Stunde">Stunde</option>
            <option value="Pauschale">Pauschale</option>
          </select>
        </div>
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
          defaultValue={dienstleistung?.preis ?? ""}
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <h2 className="text-sm font-semibold text-gray-500">Buchhaltung</h2>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="konto">
            Konto
          </label>
          <input
            id="konto"
            name="konto"
            defaultValue={dienstleistung?.konto ?? ""}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="mwst_code_id">
            MWSt-Code
          </label>
          <select
            id="mwst_code_id"
            name="mwst_code_id"
            defaultValue={dienstleistung?.mwst_code_id ?? ""}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          defaultChecked={dienstleistung?.aktiv ?? true}
        />
        Aktiv (in Auswahllisten sichtbar)
      </label>

      <div className="flex gap-3">
        <button
          type="submit"
          className="rounded bg-blue-600 text-white text-sm font-medium px-4 py-2 hover:bg-blue-700"
        >
          Speichern
        </button>
        <a
          href="/dienstleistungen"
          className="rounded border text-sm font-medium px-4 py-2 hover:bg-gray-50"
        >
          Abbrechen
        </a>
      </div>
    </form>
  );
}
