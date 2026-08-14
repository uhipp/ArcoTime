import { fuegeBeteiligtenHinzu, entferneBeteiligten } from "@/app/actions/rapporte";
import { DeleteButton } from "@/components/delete-button";

type Person = { id: string; name: string };

// Beteiligte eines Einsatzes.
//
// Ein Auftrag wird oft von mehreren Personen zusammen erledigt – ein
// Projektleiter mit zwei Monteuren. In der Disposition erscheint der
// Einsatz dadurch in jeder ihrer Spalten, bleibt aber EIN Balken:
// Verschieben bewegt ihn für alle.
//
// Das Team ist reine Planung, keine Berechtigung. Wer nicht dazugehört,
// darf trotzdem Positionen erfassen – die Disposition etwa fährt nie
// selbst mit.
export function RapportTeam({
  rapportId,
  beteiligte,
  alle,
  verantwortlichId,
  bearbeitbar,
}: {
  rapportId: string;
  beteiligte: Person[];
  alle: Person[];
  verantwortlichId: string | null;
  bearbeitbar: boolean;
}) {
  const drin = new Set(beteiligte.map((p) => p.id));
  const waehlbar = alle.filter((p) => !drin.has(p.id));

  return (
    <div className="bg-white rounded-lg border p-5 max-w-2xl">
      <h2 className="text-lg font-medium mb-1">Beteiligte</h2>
      <p className="text-sm text-gray-500 mb-4">
        Wer bei diesem Einsatz dabei ist. In der Disposition erscheint er in
        jeder ihrer Spalten – verschoben wird er trotzdem als Ganzes.
      </p>

      {beteiligte.length === 0 ? (
        <p className="text-sm text-gray-400 mb-4">
          Niemand eingeplant – der Einsatz erscheint in der Disposition unter
          „Nicht zugeteilt“.
        </p>
      ) : (
        <ul className="divide-y border rounded mb-4">
          {beteiligte.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between px-3 py-2 text-sm"
            >
              <span>
                {p.name}
                {p.id === verantwortlichId && (
                  <span className="text-gray-400"> · verantwortlich</span>
                )}
              </span>
              {bearbeitbar && p.id !== verantwortlichId && (
                <DeleteButton
                  action={entferneBeteiligten.bind(null, rapportId, p.id)}
                  label="entfernen"
                  confirmText={`"${p.name}" aus diesem Einsatz entfernen? Bereits erfasste Positionen bleiben bestehen.`}
                />
              )}
            </li>
          ))}
        </ul>
      )}

      {bearbeitbar &&
        (waehlbar.length === 0 ? (
          <p className="text-xs text-gray-400">Alle Mitarbeitenden sind bereits dabei.</p>
        ) : (
          <form
            action={fuegeBeteiligtenHinzu.bind(null, rapportId)}
            className="flex flex-wrap items-end gap-2"
          >
            <div className="flex-1 min-w-[12rem]">
              <label
                className="block text-xs text-gray-500 mb-1"
                htmlFor="neues_teammitglied"
              >
                Person hinzufügen
              </label>
              <select
                id="neues_teammitglied"
                name="mitarbeiter_id"
                required
                defaultValue=""
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
              >
                <option value="" disabled>
                  Bitte wählen…
                </option>
                {waehlbar.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="rounded bg-arcos-steel text-white text-sm font-medium px-3 py-1.5 hover:bg-arcos-navy"
            >
              Hinzufügen
            </button>
          </form>
        ))}
    </div>
  );
}
