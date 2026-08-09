import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/get-profile";
import {
  heuteIso,
  label,
  verschieben,
  zeitraumFuer,
  formatDatumCH,
  type Ansicht,
} from "@/lib/date-utils";
import type { ZeiteintragMitDetails } from "@/lib/types";

type SearchParams = {
  ansicht?: string;
  datum?: string;
  kunde_id?: string;
  projekt_id?: string;
  klasse_id?: string;
  mitarbeiter_id?: string;
  gruppieren?: string;
};

function baueQuery(params: SearchParams, overrides: Partial<SearchParams>) {
  const merged = { ...params, ...overrides };
  const qs = new URLSearchParams();
  Object.entries(merged).forEach(([k, v]) => {
    if (v) qs.set(k, v);
  });
  return `/auswertungen?${qs.toString()}`;
}

export default async function AuswertungenPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const ansicht: Ansicht =
    params.ansicht === "tag" || params.ansicht === "monat" ? (params.ansicht as Ansicht) : "woche";
  const bezugsdatum = params.datum ?? heuteIso();
  const [von, bis] = zeitraumFuer(ansicht, bezugsdatum);
  const gruppieren = params.gruppieren === "projekt";

  const profile = await getCurrentProfile();
  const isAdmin = profile?.role === "admin";
  const supabase = await createClient();

  const [{ data: kunden }, { data: projekte }, { data: klassen }, { data: mitarbeitende }] =
    await Promise.all([
      supabase.from("kunden").select("id, name, vorname").order("name"),
      supabase.from("projekte").select("*, kunden(name, vorname)").order("bezeichnung"),
      supabase.from("dienstleistungsklassen").select("id, bezeichnung").order("sortierung"),
      isAdmin
        ? supabase.from("profiles").select("id, name").order("name")
        : Promise.resolve({ data: null }),
    ]);

  let query = supabase
    .from("v_zeiteintraege")
    .select("*")
    .gte("datum", von)
    .lte("datum", bis)
    .order("datum", { ascending: true })
    .order("start_zeit", { ascending: true });

  if (params.kunde_id) query = query.eq("kunde_id", params.kunde_id);
  if (params.projekt_id) query = query.eq("projekt_id", params.projekt_id);
  if (params.klasse_id) query = query.eq("klasse_id", params.klasse_id);
  if (params.mitarbeiter_id) query = query.eq("mitarbeiter_id", params.mitarbeiter_id);

  const { data, error } = await query;
  const zeilen = (data as ZeiteintragMitDetails[] | null) ?? [];

  const summeStunden = zeilen.reduce((s, z) => s + Number(z.menge_stunden), 0);
  const summeBetrag = zeilen.reduce((s, z) => s + Number(z.betrag), 0);

  // Gruppierung nach Kunde/Projekt (Client-seitig aggregiert, Datensatz pro
  // Periode ist klein genug für eine einfache JS-Aggregation).
  const gruppen = new Map<
    string,
    { kunde: string; projekt: string; stunden: number; betrag: number; anzahl: number }
  >();
  for (const z of zeilen) {
    const key = z.projekt_id;
    const bestehend = gruppen.get(key);
    const kundeLabel = `${z.vorname ? `${z.vorname} ` : ""}${z.kunde_name}`;
    if (bestehend) {
      bestehend.stunden += Number(z.menge_stunden);
      bestehend.betrag += Number(z.betrag);
      bestehend.anzahl += 1;
    } else {
      gruppen.set(key, {
        kunde: kundeLabel,
        projekt: z.projekt_bezeichnung,
        stunden: Number(z.menge_stunden),
        betrag: Number(z.betrag),
        anzahl: 1,
      });
    }
  }
  const gruppenListe = [...gruppen.values()].sort((a, b) => b.betrag - a.betrag);

  const ansichten: { key: Ansicht; titel: string }[] = [
    { key: "tag", titel: "Tag" },
    { key: "woche", titel: "Woche" },
    { key: "monat", titel: "Monat" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Auswertungen</h1>

      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex rounded border overflow-hidden text-sm">
          {ansichten.map((a) => (
            <Link
              key={a.key}
              href={baueQuery(params, { ansicht: a.key, datum: heuteIso() })}
              className={`px-4 py-1.5 ${
                ansicht === a.key
                  ? "bg-arcos-steel text-white"
                  : "bg-white hover:bg-gray-50"
              }`}
            >
              {a.titel}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2 text-sm">
          <Link
            href={baueQuery(params, { ansicht, datum: verschieben(ansicht, bezugsdatum, -1) })}
            className="rounded border px-3 py-1.5 hover:bg-gray-50"
          >
            ← Zurück
          </Link>
          <span className="font-medium min-w-[10rem] text-center">
            {label(ansicht, von, bis)}
          </span>
          <Link
            href={baueQuery(params, { ansicht, datum: verschieben(ansicht, bezugsdatum, 1) })}
            className="rounded border px-3 py-1.5 hover:bg-gray-50"
          >
            Weiter →
          </Link>
          <Link
            href={baueQuery(params, { ansicht, datum: heuteIso() })}
            className="rounded border px-3 py-1.5 hover:bg-gray-50"
          >
            Heute
          </Link>
        </div>
      </div>

      <form className="bg-white rounded-lg border p-4 mb-6 flex flex-wrap items-end gap-3 text-sm">
        <input type="hidden" name="ansicht" value={ansicht} />
        <input type="hidden" name="datum" value={bezugsdatum} />
        <div>
          <label className="block text-xs text-gray-500 mb-1">Kunde</label>
          <select
            name="kunde_id"
            defaultValue={params.kunde_id ?? ""}
            className="rounded border border-gray-300 px-2 py-1.5 min-w-[10rem]"
          >
            <option value="">Alle</option>
            {kunden?.map((k) => (
              <option key={k.id} value={k.id}>
                {k.vorname ? `${k.vorname} ` : ""}
                {k.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Projekt</label>
          <select
            name="projekt_id"
            defaultValue={params.projekt_id ?? ""}
            className="rounded border border-gray-300 px-2 py-1.5 min-w-[12rem]"
          >
            <option value="">Alle</option>
            {projekte?.map((m) => (
              <option key={m.id} value={m.id}>
                {m.kunden?.vorname ? `${m.kunden.vorname} ` : ""}
                {m.kunden?.name} – {m.bezeichnung}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Klasse</label>
          <select
            name="klasse_id"
            defaultValue={params.klasse_id ?? ""}
            className="rounded border border-gray-300 px-2 py-1.5 min-w-[9rem]"
          >
            <option value="">Alle</option>
            {klassen?.map((k) => (
              <option key={k.id} value={k.id}>
                {k.bezeichnung}
              </option>
            ))}
          </select>
        </div>
        {isAdmin && (
          <div>
            <label className="block text-xs text-gray-500 mb-1">Mitarbeitende</label>
            <select
              name="mitarbeiter_id"
              defaultValue={params.mitarbeiter_id ?? ""}
              className="rounded border border-gray-300 px-2 py-1.5 min-w-[10rem]"
            >
              <option value="">Alle</option>
              {mitarbeitende?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <input type="hidden" name="gruppieren" value={params.gruppieren ?? ""} />
        <button type="submit" className="rounded border px-4 py-1.5 hover:bg-gray-50">
          Filtern
        </button>
        {(params.kunde_id || params.projekt_id || params.klasse_id || params.mitarbeiter_id) && (
          <Link
            href={baueQuery(
              { ansicht, datum: bezugsdatum },
              { kunde_id: "", projekt_id: "", klasse_id: "", mitarbeiter_id: "" }
            )}
            className="text-gray-500 hover:underline"
          >
            Filter zurücksetzen
          </Link>
        )}
      </form>

      <div className="flex gap-2 mb-4 text-sm">
        <Link
          href={baueQuery(params, { gruppieren: "" })}
          className={`px-3 py-1.5 rounded border ${
            !gruppieren ? "bg-gray-100 font-medium" : "hover:bg-gray-50"
          }`}
        >
          Alle Positionen
        </Link>
        <Link
          href={baueQuery(params, { gruppieren: "projekt" })}
          className={`px-3 py-1.5 rounded border ${
            gruppieren ? "bg-gray-100 font-medium" : "hover:bg-gray-50"
          }`}
        >
          Gruppiert nach Projekt
        </Link>
      </div>

      {error && (
        <div className="rounded bg-red-50 text-red-700 text-sm px-3 py-2 mb-4">
          {error.message}
        </div>
      )}

      {!gruppieren ? (
        <div className="bg-white rounded-lg border overflow-hidden mb-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="px-4 py-2">Datum</th>
                {isAdmin && <th className="px-4 py-2">Mitarbeitende</th>}
                <th className="px-4 py-2">Kunde / Projekt</th>
                <th className="px-4 py-2">Dienstleistung</th>
                <th className="px-4 py-2">Klasse</th>
                <th className="px-4 py-2">Dauer</th>
                <th className="px-4 py-2">Betrag</th>
                {isAdmin && <th className="px-4 py-2"></th>}
              </tr>
            </thead>
            <tbody>
              {zeilen.map((z) => {
                const laeuft = Boolean(z.timer_gestartet_um);
                return (
                  <tr
                    key={z.id}
                    className={`border-t ${laeuft ? "bg-red-50 hover:bg-red-100" : "hover:bg-gray-50"}`}
                  >
                    <td className="px-4 py-2 whitespace-nowrap">{formatDatumCH(z.datum)}</td>
                    {isAdmin && <td className="px-4 py-2">{z.mitarbeiter_name}</td>}
                    <td className="px-4 py-2">
                      {z.vorname ? `${z.vorname} ` : ""}
                      {z.kunde_name} – {z.projekt_bezeichnung}
                    </td>
                    <td className="px-4 py-2">{z.dienstleistung_bezeichnung}</td>
                    <td className="px-4 py-2">{z.klasse_bezeichnung ?? "–"}</td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      {laeuft ? (
                        <span className="font-medium text-red-700">⏱ Timer aktiv</span>
                      ) : (
                        `${z.menge_stunden} h`
                      )}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      {laeuft ? "–" : `CHF ${Number(z.betrag).toFixed(2)}`}
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-2 text-right whitespace-nowrap">
                        {z.beleg_id ? (
                          <span className="text-xs text-gray-400">exportiert</span>
                        ) : (
                          <Link
                            href={`/zeiterfassung/${z.id}`}
                            className={
                              laeuft
                                ? "font-medium text-red-700 hover:underline"
                                : "text-arcos-steel hover:underline"
                            }
                          >
                            {laeuft ? "Stoppen" : "Bearbeiten"}
                          </Link>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
              {zeilen.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 8 : 6} className="px-4 py-6 text-center text-gray-400">
                    Keine Einträge im gewählten Zeitraum.
                  </td>
                </tr>
              )}
            </tbody>
            {zeilen.length > 0 && (
              <tfoot>
                <tr className="border-t bg-gray-50 font-medium">
                  <td className="px-4 py-2" colSpan={isAdmin ? 5 : 4}>
                    Summe
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">{summeStunden.toFixed(2)} h</td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    CHF {summeBetrag.toFixed(2)}
                  </td>
                  {isAdmin && <td></td>}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden mb-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="px-4 py-2">Kunde</th>
                <th className="px-4 py-2">Projekt</th>
                <th className="px-4 py-2">Positionen</th>
                <th className="px-4 py-2">Dauer</th>
                <th className="px-4 py-2">Betrag</th>
              </tr>
            </thead>
            <tbody>
              {gruppenListe.map((g, i) => (
                <tr key={i} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2">{g.kunde}</td>
                  <td className="px-4 py-2">{g.projekt}</td>
                  <td className="px-4 py-2">{g.anzahl}</td>
                  <td className="px-4 py-2 whitespace-nowrap">{g.stunden.toFixed(2)} h</td>
                  <td className="px-4 py-2 whitespace-nowrap">CHF {g.betrag.toFixed(2)}</td>
                </tr>
              ))}
              {gruppenListe.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                    Keine Einträge im gewählten Zeitraum.
                  </td>
                </tr>
              )}
            </tbody>
            {gruppenListe.length > 0 && (
              <tfoot>
                <tr className="border-t bg-gray-50 font-medium">
                  <td className="px-4 py-2" colSpan={3}>
                    Summe
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">{summeStunden.toFixed(2)} h</td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    CHF {summeBetrag.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
      {!isAdmin && (
        <p className="text-xs text-gray-400">
          Du siehst hier nur deine eigenen Zeiteinträge.
        </p>
      )}
    </div>
  );
}
