import type { Kunde, Mandat } from "@/lib/types";

export function MandatForm({
  mandat,
  kunden,
  action,
  error,
}: {
  mandat?: Mandat;
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
          defaultValue={mandat?.kunde_id ?? ""}
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
          defaultValue={mandat?.bezeichnung ?? ""}
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
            defaultValue={mandat?.status ?? "aktiv"}
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
            defaultValue={mandat?.startdatum ?? new Date().toISOString().slice(0, 10)}
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
          defaultValue={mandat?.kostenstelle ?? ""}
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-arcos-steel"
        />
        <p className="text-xs text-gray-400 mt-1">
          Wird bei jedem Zeiteintrag dieses Mandats automatisch in den Export
          übernommen.
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="sichtbar_fuer_alle"
          defaultChecked={mandat?.sichtbar_fuer_alle ?? true}
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
          defaultValue={mandat?.notizen ?? ""}
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
          href="/mandate"
          className="rounded border text-sm font-medium px-4 py-2 hover:bg-gray-50"
        >
          Abbrechen
        </a>
      </div>
    </form>
  );
}
