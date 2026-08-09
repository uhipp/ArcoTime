import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/get-profile";
import {
  heuteIso,
  label,
  verschieben,
  monatsRaster,
  zeitraumFuer,
} from "@/lib/date-utils";
import type { ZeiteintragMitDetails } from "@/lib/types";

type SearchParams = {
  datum?: string;
  kunde_id?: string;
  projekt_id?: string;
  klasse_id?: string;
  mitarbeiter_id?: string;
};

function baueQuery(params: SearchParams, overrides: Partial<SearchParams>) {
  const merged = { ...params, ...overrides };
  const qs = new URLSearchParams();
  Object.entries(merged).forEach(([k, v]) => {
    if (v) qs.set(k, v);
  });
  return `/kalender?${qs.toString()}`;
}

const WOCHENTAGE = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

export default async function KalenderPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const bezugsdatum = params.datum ?? heuteIso();
  const heute = heuteIso();
  const [monatVon, monatBis] = zeitraumFuer("monat", bezugsdatum);
  const wochen = monatsRaster(bezugsdatum);
  const rasterVon = wochen[0][0];
  const rasterBis = wochen[wochen.length - 1][6];

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
    .gte("datum", rasterVon)
    .lte("datum", rasterBis);

  if (params.kunde_id) query = query.eq("kunde_id", params.kunde_id);
  if (params.projekt_id) query = query.eq("projekt_id", params.projekt_id);
  if (params.klasse_id) query = query.eq("klasse_id", params.klasse_id);
  if (params.mitarbeiter_id) query = query.eq("mitarbeiter_id", params.mitarbeiter_id);

  const { data } = await query;
  const zeilen = (data as ZeiteintragMitDetails[] | null) ?? [];

  const proTag = new Map<string, { stunden: number; betrag: number; anzahl: number }>();
  for (const z of zeilen) {
    const eintrag = proTag.get(z.datum) ?? { stunden: 0, betrag: 0, anzahl: 0 };
    eintrag.stunden += Number(z.menge_stunden);
    eintrag.betrag += Number(z.betrag);
    eintrag.anzahl += 1;
    proTag.set(z.datum, eintrag);
  }

  const monatStunden = [...proTag.entries()]
    .filter(([datum]) => datum >= monatVon && datum <= monatBis)
    .reduce((s, [, v]) => s + v.stunden, 0);

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Kalenderübersicht</h1>

      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-2 text-sm">
          <Link
            href={baueQuery(params, { datum: verschieben("monat", bezugsdatum, -1) })}
            className="rounded border px-3 py-1.5 hover:bg-gray-50"
          >
            ← Zurück
          </Link>
          <span className="font-medium min-w-[10rem] text-center">
            {label("monat", monatVon, monatBis)}
          </span>
          <Link
            href={baueQuery(params, { datum: verschieben("monat", bezugsdatum, 1) })}
            className="rounded border px-3 py-1.5 hover:bg-gray-50"
          >
            Weiter →
          </Link>
          <Link
            href={baueQuery(params, { datum: heuteIso() })}
            className="rounded border px-3 py-1.5 hover:bg-gray-50"
          >
            Heute
          </Link>
        </div>
        <div className="text-sm text-gray-500">
          Total {label("monat", monatVon, monatBis)}: <strong>{monatStunden.toFixed(2)} h</strong>
        </div>
      </div>

      <form className="bg-white rounded-lg border p-4 mb-6 flex flex-wrap items-end gap-3 text-sm">
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
        <button type="submit" className="rounded border px-4 py-1.5 hover:bg-gray-50">
          Filtern
        </button>
      </form>

      <div className="bg-white rounded-lg border overflow-hidden overflow-x-auto">
        <div className="grid grid-cols-7 text-xs text-gray-500 border-b">
          {WOCHENTAGE.map((tag) => (
            <div key={tag} className="px-2 py-2 text-center font-medium">
              {tag}
            </div>
          ))}
        </div>
        {wochen.map((woche, wi) => (
          <div key={wi} className="grid grid-cols-7 border-b last:border-b-0">
            {woche.map((tagIso) => {
              const imMonat = tagIso >= monatVon && tagIso <= monatBis;
              const werte = proTag.get(tagIso);
              const istHeute = tagIso === heute;
              const tagNr = Number(tagIso.slice(8, 10));

              return (
                <Link
                  key={tagIso}
                  href={`/auswertungen?ansicht=tag&datum=${tagIso}`}
                  className={`border-r last:border-r-0 px-2 py-2 min-h-[5.5rem] flex flex-col hover:bg-arcos-steel/5 ${
                    imMonat ? "" : "bg-gray-50 text-gray-400"
                  }`}
                >
                  <span
                    className={`text-xs mb-1 ${
                      istHeute
                        ? "inline-flex items-center justify-center w-5 h-5 rounded-full bg-arcos-steel text-white"
                        : ""
                    }`}
                  >
                    {tagNr}
                  </span>
                  {werte && (
                    <span className="text-xs">
                      <span className="block font-medium text-arcos-navy">
                        {werte.stunden.toFixed(2)} h
                      </span>
                      <span className="block text-gray-400">
                        CHF {werte.betrag.toFixed(0)}
                      </span>
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </div>
      {!isAdmin && (
        <p className="text-xs text-gray-400 mt-3">
          Du siehst hier nur deine eigenen Zeiteinträge.
        </p>
      )}
    </div>
  );
}
