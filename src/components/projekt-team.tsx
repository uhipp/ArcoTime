import {
  fuegeProjektMitarbeiterHinzu,
  entferneProjektMitarbeiter,
} from "@/app/actions/projekte";
import { DeleteButton } from "@/components/delete-button";

type Person = { id: string; name: string };

// Wer darf auf ein Projekt zugreifen, das nicht für alle sichtbar ist?
// Genau diese Frage beantwortet das Projektteam. Die zugrundeliegende
// Tabelle gab es von Anfang an, sie war nur nie pflegbar – ohne
// Oberfläche blieb ein abgeschottetes Projekt allein den Admins
// vorbehalten, sogar der erfassenden Person.
export function ProjektTeam({
  projektId,
  team,
  alle,
  sichtbarFuerAlle,
}: {
  projektId: string;
  team: Person[];
  alle: Person[];
  sichtbarFuerAlle: boolean;
}) {
  const imTeam = new Set(team.map((p) => p.id));
  const waehlbar = alle.filter((p) => !imTeam.has(p.id));

  return (
    <div>
      <h2 className="text-lg font-medium mb-1">Projektteam</h2>
      <p className="text-sm text-gray-500 mb-4 max-w-2xl">
        {sichtbarFuerAlle ? (
          <>
            Dieses Projekt ist <strong>für alle sichtbar</strong> – das Team
            spielt deshalb im Moment keine Rolle. Es greift erst, wenn du das
            Häkchen oben entfernst.
          </>
        ) : (
          <>
            Dieses Projekt ist <strong>nicht für alle sichtbar</strong>. Nur die
            hier aufgeführten Personen und Admins sehen es und können darauf
            Zeit erfassen.
          </>
        )}
      </p>

      <div className="bg-white rounded-lg border p-5 max-w-2xl">
        {team.length === 0 ? (
          <p className="text-sm text-gray-400 mb-4">
            Noch niemand zugewiesen – ausser Admins sieht das Projekt niemand.
          </p>
        ) : (
          <ul className="divide-y border rounded mb-4">
            {team.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between px-3 py-2 text-sm"
              >
                <span>{p.name}</span>
                <DeleteButton
                  action={entferneProjektMitarbeiter.bind(null, projektId, p.id)}
                  label="entfernen"
                  confirmText={`"${p.name}" aus dem Projektteam entfernen? Bereits erfasste Zeiten bleiben bestehen.`}
                />
              </li>
            ))}
          </ul>
        )}

        {waehlbar.length === 0 ? (
          <p className="text-xs text-gray-400">
            Alle Mitarbeitenden sind bereits zugewiesen.
          </p>
        ) : (
          <form
            action={fuegeProjektMitarbeiterHinzu.bind(null, projektId)}
            className="flex flex-wrap items-end gap-2"
          >
            <div className="flex-1 min-w-[12rem]">
              <label className="block text-xs text-gray-500 mb-1" htmlFor="neues_teammitglied">
                Person hinzufügen
              </label>
              <select
                id="neues_teammitglied"
                name="user_id"
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
        )}
      </div>
    </div>
  );
}
