import { heuteIso } from "@/lib/date-utils";
import type { Kunde, Projekt } from "@/lib/types";

export function ProjektForm({
  projekt,
  kunden,
  action,
  error,
}: {
  projekt?: Projekt;
  kunden: Pick<Kunde, "id" | "name" | "vorname">[];
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
        <label className="block text-sm font-medium mb-1" htmlFor="kunde_id">
          Kunde
        </label>
        <select
          id="kunde_id"
          name="kunde_id"
          required
          defaultValue={projekt?.kunde_id ?? ""}
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-arcos-steel"
        >
          <option value="" disabled>
            Bitte wählen…
          </option>
          {kunden.map((k) => (
            <option key={k.id} value={k.id}>
              {k.vorname ? `${k.vorname} ` : ""}
              {k.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="bezeichnung">
          Bezeichnung
        </label>
        <input
          id="bezeichnung"
          name="bezeichnung"
          required
          defaultValue={projekt?.bezeichnung ?? ""}
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-arcos-steel"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="status">
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={projekt?.status ?? "aktiv"}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-arcos-steel"
          >
            <option value="aktiv">Aktiv</option>
            <option value="inaktiv">Inaktiv</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="startdatum">
            Startdatum
          </label>
          <input
            id="startdatum"
            name="startdatum"
            type="date"
            defaultValue={projekt?.startdatum ?? heuteIso()}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-arcos-steel"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="kostenstelle">
          Kostenstelle
        </label>
        <input
          id="kostenstelle"
          name="kostenstelle"
          defaultValue={projekt?.kostenstelle ?? ""}
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-arcos-steel"
        />
        <p className="text-xs text-gray-400 mt-1">
          Wird bei jedem Zeiteintrag dieses Projekts automatisch in den Export
          übernommen.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="naechste_belegnummer">
          Nächste Belegnummer
        </label>
        <input
          id="naechste_belegnummer"
          name="naechste_belegnummer"
          type="number"
          placeholder="470000"
          defaultValue={projekt?.naechste_belegnummer ?? ""}
          className="w-full max-w-xs rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-arcos-steel"
        />
        <p className="text-xs text-gray-400 mt-1">
          Wird beim nächsten Export für dieses Projekt vergeben und danach
          automatisch um 1 erhöht. Nur ändern, wenn du z.B. an eine bestehende
          Nummerierung im Buchhaltungssystem anschliessen willst.
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="sichtbar_fuer_alle"
          defaultChecked={projekt?.sichtbar_fuer_alle ?? true}
        />
        Für alle Mitarbeitenden sichtbar
      </label>

      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="notizen">
          Notizen
        </label>
        <textarea
          id="notizen"
          name="notizen"
          rows={3}
          defaultValue={projekt?.notizen ?? ""}
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-arcos-steel"
        />
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          className="rounded bg-arcos-steel text-white text-sm font-medium px-4 py-2 hover:bg-arcos-navy"
        >
          Speichern
        </button>
        <a
          href="/projekte"
          className="rounded border text-sm font-medium px-4 py-2 hover:bg-gray-50"
        >
          Abbrechen
        </a>
      </div>
    </form>
  );
}
