import type { Anfrage, Kunde, Projekt } from "@/lib/types";

export function AnfrageForm({
  anfrage,
  kunden,
  projekte,
  mitarbeitende,
  action,
  error,
}: {
  anfrage?: Anfrage;
  kunden: Pick<Kunde, "id" | "name" | "vorname">[];
  projekte: (Pick<Projekt, "id" | "bezeichnung"> & { kunde_id: string })[];
  mitarbeitende: { id: string; name: string }[];
  action: (formData: FormData) => void;
  error?: string;
}) {
  return (
    <form action={action} className="space-y-5 bg-white rounded-lg border p-5 max-w-2xl">
      {error && (
        <div className="rounded bg-red-50 text-red-700 text-sm px-3 py-2">{error}</div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="kunde_id">
            Kunde
          </label>
          <select
            id="kunde_id"
            name="kunde_id"
            required
            defaultValue={anfrage?.kunde_id ?? ""}
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
          <label className="block text-sm font-medium mb-1" htmlFor="projekt_id">
            Projekt (optional)
          </label>
          <select
            id="projekt_id"
            name="projekt_id"
            defaultValue={anfrage?.projekt_id ?? ""}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-arcos-steel"
          >
            <option value="">Kein Projekt</option>
            {projekte.map((p) => (
              <option key={p.id} value={p.id}>
                {p.bezeichnung}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="titel">
          Titel
        </label>
        <input
          id="titel"
          name="titel"
          required
          defaultValue={anfrage?.titel ?? ""}
          placeholder="Kurzer Betreff der Anfrage"
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
          rows={3}
          defaultValue={anfrage?.beschreibung ?? ""}
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-arcos-steel"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="kanal">
            Kanal
          </label>
          <select
            id="kanal"
            name="kanal"
            defaultValue={anfrage?.kanal ?? "sonstiges"}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-arcos-steel"
          >
            <option value="telefon">Telefon</option>
            <option value="email">E-Mail</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="brief">Brief</option>
            <option value="persoenlich">Persönlich</option>
            <option value="sonstiges">Sonstiges</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="prioritaet">
            Priorität
          </label>
          <select
            id="prioritaet"
            name="prioritaet"
            defaultValue={anfrage?.prioritaet ?? "normal"}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-arcos-steel"
          >
            <option value="tief">Tief</option>
            <option value="normal">Normal</option>
            <option value="hoch">Hoch</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="wiedervorlage_am">
            Wiedervorlage
          </label>
          <input
            id="wiedervorlage_am"
            name="wiedervorlage_am"
            type="date"
            defaultValue={anfrage?.wiedervorlage_am ?? ""}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-arcos-steel"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="zugewiesen_an">
          Zugewiesen an
        </label>
        <select
          id="zugewiesen_an"
          name="zugewiesen_an"
          defaultValue={anfrage?.zugewiesen_an ?? ""}
          className="w-full max-w-xs rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-arcos-steel"
        >
          <option value="">Nicht zugewiesen</option>
          {mitarbeitende.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          className="rounded bg-arcos-steel text-white text-sm font-medium px-4 py-2 hover:bg-arcos-navy"
        >
          Speichern
        </button>
        <a
          href="/anfragen"
          className="rounded border text-sm font-medium px-4 py-2 hover:bg-gray-50"
        >
          Abbrechen
        </a>
      </div>
    </form>
  );
}
