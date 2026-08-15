import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/get-profile";
import { heuteIso, formatDatumCH } from "@/lib/date-utils";
import { erstelleExport } from "@/app/actions/export";
import type { ZeiteintragMitDetails, BelegExport } from "@/lib/types";
import { DatumFeld } from "@/components/datum-feld";
import { darf } from "@/lib/berechtigungen";

export default async function ExportPage({
  searchParams,
}: {
  searchParams: Promise<{
    von?: string;
    bis?: string;
    error?: string;
    erstellt?: string;
    anzahl?: string;
  }>;
}) {
  const profile = await getCurrentProfile();
  if (!darf(profile, "export.ausfuehren")) redirect("/");

  const params = await searchParams;
  const von = params.von ?? "2000-01-01";
  const bis = params.bis ?? heuteIso();

  const supabase = await createClient();

  const { data: offeneRaw, error } = await supabase
    .from("v_zeiteintraege")
    .select("*")
    // Ein vorbereiteter Rapport ist noch nicht verrechenbar – siehe 0036.
    .eq("vorlaeufig", false)
    .is("beleg_id", null)
    .is("timer_gestartet_um", null)
    .gte("datum", von)
    .lte("datum", bis)
    .order("datum", { ascending: true });

  const offene = (offeneRaw as ZeiteintragMitDetails[] | null) ?? [];

  const gruppen = new Map<
    string,
    {
      projekt_id: string;
      kunde: string;
      projekt: string;
      anzahl: number;
      stunden: number;
      betrag: number;
      minDatum: string;
      maxDatum: string;
    }
  >();
  for (const z of offene) {
    const g = gruppen.get(z.projekt_id);
    const kundeLabel = `${z.vorname ? `${z.vorname} ` : ""}${z.kunde_name}`;
    if (g) {
      g.anzahl += 1;
      g.stunden += Number(z.menge_stunden);
      g.betrag += Number(z.betrag);
      if (z.datum < g.minDatum) g.minDatum = z.datum;
      if (z.datum > g.maxDatum) g.maxDatum = z.datum;
    } else {
      gruppen.set(z.projekt_id, {
        projekt_id: z.projekt_id,
        kunde: kundeLabel,
        projekt: z.projekt_bezeichnung,
        anzahl: 1,
        stunden: Number(z.menge_stunden),
        betrag: Number(z.betrag),
        minDatum: z.datum,
        maxDatum: z.datum,
      });
    }
  }
  const gruppenListe = [...gruppen.values()].sort((a, b) => a.kunde.localeCompare(b.kunde));

  const projektIds = gruppenListe.map((g) => g.projekt_id);
  const { data: projekteInfo } =
    projektIds.length > 0
      ? await supabase.from("projekte").select("id, naechste_belegnummer").in("id", projektIds)
      : { data: [] };
  const belegnummerProProjekt = new Map(
    (projekteInfo ?? []).map((m) => [m.id, m.naechste_belegnummer])
  );

  let erstellteBelege: BelegExport[] = [];
  if (params.erstellt) {
    const ids = params.erstellt.split(",");
    const { data } = await supabase
      .from("belege_exporte")
      .select("*, projekte(bezeichnung, kunden(name, vorname))")
      .in("id", ids);
    erstellteBelege = (data as BelegExport[] | null) ?? [];
  }

  const { data: historie } = await supabase
    .from("belege_exporte")
    .select("*, projekte(bezeichnung, kunden(name, vorname))")
    .order("erstellt_am", { ascending: false })
    .limit(20);

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Export</h1>

      {params.error && (
        <div className="rounded bg-red-50 text-red-700 text-sm px-3 py-2 mb-4">
          {params.error}
        </div>
      )}

      {erstellteBelege.length > 0 && (
        <div className="rounded bg-green-50 border border-green-200 text-green-800 text-sm px-4 py-3 mb-6">
          <p className="font-medium mb-2">
            Export erfolgreich erstellt ({params.anzahl} Positionen, {erstellteBelege.length} Beleg
            {erstellteBelege.length > 1 ? "e" : ""}).
          </p>
          <ul className="mb-3 list-disc list-inside">
            {erstellteBelege.map((b) => (
              <li key={b.id}>
                Belegnummer {b.belegnummer} – {b.projekte?.kunden?.vorname ? `${b.projekte.kunden.vorname} ` : ""}
                {b.projekte?.kunden?.name} – {b.projekte?.bezeichnung} ({b.anzahl_positionen} Positionen)
              </li>
            ))}
          </ul>
          <a
            href={`/api/export/download?beleg_ids=${erstellteBelege.map((b) => b.id).join(",")}`}
            className="inline-block rounded bg-arcos-steel text-white text-sm font-medium px-4 py-2 hover:bg-arcos-navy"
          >
            Excel herunterladen
          </a>
        </div>
      )}

      <form className="bg-white rounded-lg border p-4 mb-4 flex items-end gap-3 text-sm">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Von</label>
          <DatumFeld
            name="von"
            defaultValue={von}
            className="rounded border border-gray-300 px-2 py-1.5"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Bis</label>
          <DatumFeld
            name="bis"
            defaultValue={bis}
            className="rounded border border-gray-300 px-2 py-1.5"
          />
        </div>
        <button type="submit" className="rounded border px-4 py-1.5 hover:bg-gray-50">
          Zeitraum anwenden
        </button>
      </form>

      {error && (
        <div className="rounded bg-red-50 text-red-700 text-sm px-3 py-2 mb-4">
          {error.message}
        </div>
      )}

      <p className="text-sm text-gray-500 mb-3">
        Noch nicht abgerechnete Positionen im Zeitraum {formatDatumCH(von)} – {formatDatumCH(bis)}
        , gruppiert nach Projekt. Ausgewählte Projekte erhalten je eine neue Belegnummer; alle
        zugehörigen Positionen werden als abgerechnet markiert.
      </p>

      <form action={erstelleExport}>
        <input type="hidden" name="von" value={von} />
        <input type="hidden" name="bis" value={bis} />

        <div className="bg-white rounded-lg border overflow-hidden mb-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="px-4 py-2 w-8"></th>
                <th className="px-4 py-2">Kunde / Projekt</th>
                <th className="px-4 py-2">Zeitraum</th>
                <th className="px-4 py-2">Positionen</th>
                <th className="px-4 py-2">Dauer</th>
                <th className="px-4 py-2">Betrag</th>
                <th className="px-4 py-2">Neue Belegnummer</th>
              </tr>
            </thead>
            <tbody>
              {gruppenListe.map((g) => (
                <tr key={g.projekt_id} className="border-t">
                  <td className="px-4 py-2">
                    <input
                      type="checkbox"
                      name="projekt_ids"
                      value={g.projekt_id}
                      defaultChecked
                    />
                  </td>
                  <td className="px-4 py-2">
                    {g.kunde} – {g.projekt}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    {formatDatumCH(g.minDatum)} – {formatDatumCH(g.maxDatum)}
                  </td>
                  <td className="px-4 py-2">{g.anzahl}</td>
                  <td className="px-4 py-2 whitespace-nowrap">{g.stunden.toFixed(2)} h</td>
                  <td className="px-4 py-2 whitespace-nowrap">CHF {g.betrag.toFixed(2)}</td>
                  <td className="px-4 py-2">{belegnummerProProjekt.get(g.projekt_id) ?? "–"}</td>
                </tr>
              ))}
              {gruppenListe.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-gray-400">
                    Keine offenen Positionen im gewählten Zeitraum.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {gruppenListe.length > 0 && (
          <button
            type="submit"
            className="rounded bg-arcos-steel text-white text-sm font-medium px-4 py-2 hover:bg-arcos-navy"
          >
            Export erstellen
          </button>
        )}
      </form>

      <h2 className="text-lg font-medium mt-10 mb-3">Frühere Exporte</h2>
      <div className="bg-white rounded-lg border overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-2">Erstellt am</th>
              <th className="px-4 py-2">Belegnummer</th>
              <th className="px-4 py-2">Kunde / Projekt</th>
              <th className="px-4 py-2">Zeitraum</th>
              <th className="px-4 py-2">Positionen</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {(historie as BelegExport[] | null)?.map((b) => (
              <tr key={b.id} className="border-t">
                <td className="px-4 py-2 whitespace-nowrap">
                  {new Date(b.erstellt_am).toLocaleString("de-CH")}
                </td>
                <td className="px-4 py-2">{b.belegnummer}</td>
                <td className="px-4 py-2">
                  {b.projekte?.kunden?.vorname ? `${b.projekte.kunden.vorname} ` : ""}
                  {b.projekte?.kunden?.name} – {b.projekte?.bezeichnung}
                </td>
                <td className="px-4 py-2 whitespace-nowrap">
                  {formatDatumCH(b.zeitraum_von)} – {formatDatumCH(b.zeitraum_bis)}
                </td>
                <td className="px-4 py-2">{b.anzahl_positionen}</td>
                <td className="px-4 py-2">
                  <a
                    href={`/api/export/download?beleg_ids=${b.id}`}
                    className="text-arcos-steel hover:underline"
                  >
                    Excel
                  </a>
                </td>
              </tr>
            ))}
            {(!historie || historie.length === 0) && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                  Noch keine Exporte erstellt.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
