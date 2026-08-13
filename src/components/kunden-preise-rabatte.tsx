import {
  setzeKundenpreis,
  loescheKundenpreis,
  setzeKundenrabatt,
  loescheKundenrabatt,
} from "@/app/actions/kunden";

type DienstleistungOption = {
  id: string;
  bezeichnung: string;
  einheit: string;
  preis: number;
};

type KlasseOption = { id: string; bezeichnung: string };

type PreisZeile = {
  id: string;
  preis: number;
  dienstleistung_id: string;
  dienstleistungen: { id: string; bezeichnung: string; einheit: string } | null;
};

type RabattZeile = {
  id: string;
  rabatt_prozent: number;
  klasse_id: string;
  dienstleistungsklassen: { id: string; bezeichnung: string } | null;
};

// Preis- und Rabattvereinbarungen eines Kunden. Beides sind reine
// Stammdaten für die Erfassung: Der Preis wird beim Anlegen eines
// Zeiteintrags eingefroren, der Rabatt nur vorgeschlagen. Änderungen hier
// verändern also nie bestehende Einträge.
export function KundenPreiseRabatte({
  kundeId,
  dienstleistungen,
  klassen,
  preise,
  rabatte,
  standardRabatt,
}: {
  kundeId: string;
  dienstleistungen: DienstleistungOption[];
  klassen: KlasseOption[];
  preise: PreisZeile[];
  rabatte: RabattZeile[];
  standardRabatt: number;
}) {
  const preisAction = setzeKundenpreis.bind(null, kundeId);
  const rabattAction = setzeKundenrabatt.bind(null, kundeId);

  return (
    <div>
      <h2 className="text-lg font-medium mb-1">Preise & Rabatte</h2>
      <p className="text-sm text-gray-500 mb-4 max-w-2xl">
        Gilt nur für <strong>neu erfasste</strong> Zeiteinträge. Bestehende
        behalten Preis und Rabatt, die beim Erfassen galten – eine Änderung
        hier rechnet nichts rückwirkend um.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ----------------------------------------------------------- */}
        {/* Abweichende Preise                                          */}
        {/* ----------------------------------------------------------- */}
        <section className="bg-white rounded-lg border p-5">
          <h3 className="text-sm font-semibold mb-1">Abweichende Preise</h3>
          <p className="text-xs text-gray-500 mb-4">
            Überschreibt den Katalogpreis der Dienstleistung für diesen Kunden.
          </p>

          {preise.length === 0 ? (
            <p className="text-sm text-gray-400 mb-4">
              Keine abweichenden Preise – es gilt überall der Katalogpreis.
            </p>
          ) : (
            <ul className="divide-y border rounded mb-4">
              {preise.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between px-3 py-2 text-sm"
                >
                  <span>
                    {p.dienstleistungen?.bezeichnung ?? "Unbekannt"}
                    <span className="text-gray-400">
                      {" "}
                      / {p.dienstleistungen?.einheit ?? "–"}
                    </span>
                  </span>
                  <span className="flex items-center gap-3">
                    <strong>CHF {Number(p.preis).toFixed(2)}</strong>
                    <form action={loescheKundenpreis.bind(null, kundeId, p.id)}>
                      <button
                        type="submit"
                        className="text-xs text-gray-400 hover:text-red-600"
                      >
                        entfernen
                      </button>
                    </form>
                  </span>
                </li>
              ))}
            </ul>
          )}

          <form action={preisAction} className="flex flex-wrap items-end gap-2">
            <div className="flex-1 min-w-[10rem]">
              <label className="block text-xs text-gray-500 mb-1">Dienstleistung</label>
              <select
                id="neuer_kundenpreis"
                name="dienstleistung_id"
                required
                defaultValue=""
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
              >
                <option value="" disabled>
                  Bitte wählen…
                </option>
                {dienstleistungen.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.bezeichnung} (Katalog CHF {Number(d.preis).toFixed(2)})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Preis</label>
              <input
                name="preis"
                type="number"
                step="0.05"
                min={0}
                required
                className="w-28 rounded border border-gray-300 px-2 py-1.5 text-sm"
              />
            </div>
            <button
              type="submit"
              className="rounded bg-arcos-steel text-white text-sm font-medium px-3 py-1.5 hover:bg-arcos-navy"
            >
              Übernehmen
            </button>
          </form>
        </section>

        {/* ----------------------------------------------------------- */}
        {/* Rabatt je Klasse                                            */}
        {/* ----------------------------------------------------------- */}
        <section className="bg-white rounded-lg border p-5">
          <h3 className="text-sm font-semibold mb-1">Rabatt je Dienstleistungsklasse</h3>
          <p className="text-xs text-gray-500 mb-4">
            Gilt für alle Dienstleistungen der Klasse – auch für später neu
            angelegte. Hat Vorrang vor dem Standardrabatt von{" "}
            {standardRabatt.toFixed(0)}%.
          </p>

          {rabatte.length === 0 ? (
            <p className="text-sm text-gray-400 mb-4">
              Keine Klassenrabatte – es gilt der Standardrabatt.
            </p>
          ) : (
            <ul className="divide-y border rounded mb-4">
              {rabatte.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between px-3 py-2 text-sm"
                >
                  <span>{r.dienstleistungsklassen?.bezeichnung ?? "Unbekannt"}</span>
                  <span className="flex items-center gap-3">
                    <strong>{Number(r.rabatt_prozent)}%</strong>
                    <form action={loescheKundenrabatt.bind(null, kundeId, r.id)}>
                      <button
                        type="submit"
                        className="text-xs text-gray-400 hover:text-red-600"
                      >
                        entfernen
                      </button>
                    </form>
                  </span>
                </li>
              ))}
            </ul>
          )}

          <form action={rabattAction} className="flex flex-wrap items-end gap-2">
            <div className="flex-1 min-w-[10rem]">
              <label className="block text-xs text-gray-500 mb-1">Klasse</label>
              <select
                id="neuer_klassenrabatt"
                name="klasse_id"
                required
                defaultValue=""
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
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
              <label className="block text-xs text-gray-500 mb-1">Rabatt %</label>
              <input
                name="rabatt_prozent"
                type="number"
                step="0.5"
                min={0}
                max={100}
                required
                className="w-24 rounded border border-gray-300 px-2 py-1.5 text-sm"
              />
            </div>
            <button
              type="submit"
              className="rounded bg-arcos-steel text-white text-sm font-medium px-3 py-1.5 hover:bg-arcos-navy"
            >
              Übernehmen
            </button>
          </form>

          <p className="text-xs text-gray-400 mt-3">
            Bei Dienstleistungen ohne Rabatterlaubnis (z.B. Reisespesen) greift
            weder dieser noch der Standardrabatt.
          </p>
        </section>
      </div>
    </div>
  );
}
