"use client";

import { useActionState, useState } from "react";
import { fuegeBeteiligtenHinzu, entferneBeteiligten, fuegeGruppeHinzu } from "@/app/actions/rapporte";
import { AbsendeKnopf } from "@/components/absende-knopf";
import type { FormularErgebnis } from "@/lib/formular-ergebnis";
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
  gruppen,
  verantwortlichId,
  bearbeitbar,
  ersetzenAction,
}: {
  rapportId: string;
  beteiligte: Person[];
  alle: Person[];
  // Gruppen aus den Einstellungen (0049) – der Regelfall ist "das Team
  // Ost fährt hin", nicht drei einzeln gewählte Namen.
  gruppen: { id: string; bezeichnung: string }[];
  verantwortlichId: string | null;
  bearbeitbar: boolean;
  ersetzenAction: (bisher: FormularErgebnis, formData: FormData) => Promise<FormularErgebnis>;
}) {
  const drin = new Set(beteiligte.map((p) => p.id));
  const waehlbar = alle.filter((p) => !drin.has(p.id));
  const [ersetzenOffen, setErsetzenOffen] = useState(false);
  const [ergebnis, formAction] = useActionState(ersetzenAction, null);

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

      {bearbeitbar && gruppen.length > 0 && (
        <form
          action={fuegeGruppeHinzu.bind(null, rapportId)}
          className="mt-3 flex flex-wrap items-end gap-2"
        >
          <div className="flex-1 min-w-[12rem]">
            <label className="block text-xs text-gray-500 mb-1" htmlFor="neue_gruppe_team">
              Ganze Gruppe hinzufügen
            </label>
            <select
              id="neue_gruppe_team"
              name="gruppe_id"
              required
              defaultValue=""
              className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
            >
              <option value="" disabled>
                Bitte wählen…
              </option>
              {gruppen.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.bezeichnung}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="rounded border text-sm font-medium px-3 py-1.5 hover:bg-gray-50"
          >
            Hinzufügen
          </button>
        </form>
      )}

      {/* Personentausch: Fällt jemand aus, übernimmt ein anderer – samt
          der bereits erfassten Stunden. Ohne das müsste man die Teamzeile
          tauschen und jede Position einzeln umhängen, und würde dabei
          welche vergessen. */}
      {bearbeitbar && beteiligte.length > 0 && waehlbar.length > 0 && (
        <div className="border-t mt-5 pt-4">
          {!ersetzenOffen ? (
            <button
              type="button"
              onClick={() => setErsetzenOffen(true)}
              className="text-sm text-arcos-steel hover:underline"
            >
              Person ersetzen
            </button>
          ) : (
            <form action={formAction} className="space-y-3">
              <p className="text-sm text-gray-500">
                Die neue Person übernimmt alle noch nicht exportierten
                Stundenpositionen der bisherigen.
              </p>
              <div className="flex flex-wrap items-end gap-2">
                <div className="flex-1 min-w-[10rem]">
                  <label className="block text-xs text-gray-500 mb-1" htmlFor="alt_id">
                    Bisher
                  </label>
                  <select
                    id="alt_id"
                    name="alt_id"
                    required
                    defaultValue=""
                    className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                  >
                    <option value="" disabled>
                      Bitte wählen…
                    </option>
                    {beteiligte.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-1 min-w-[10rem]">
                  <label className="block text-xs text-gray-500 mb-1" htmlFor="neu_id">
                    Neu
                  </label>
                  <select
                    id="neu_id"
                    name="neu_id"
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
              </div>

              {ergebnis?.fehler && (
                <div className="rounded bg-red-50 text-red-700 text-sm px-3 py-2">
                  {ergebnis.fehler}
                </div>
              )}

              <div className="flex items-center gap-3">
                <AbsendeKnopf
                  laufttext="Wird getauscht…"
                  className="rounded bg-arcos-steel text-white text-sm font-medium px-3 py-1.5 hover:bg-arcos-navy disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Ersetzen
                </AbsendeKnopf>
                <button
                  type="button"
                  onClick={() => setErsetzenOffen(false)}
                  className="text-sm text-gray-500 hover:underline"
                >
                  Abbrechen
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
