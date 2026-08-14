import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SortierKopf } from "@/components/sortier-kopf";
import { vergleiche } from "@/lib/sortierung";

type ProjektZeile = {
  id: string;
  bezeichnung: string;
  kostenstelle: string | null;
  status: string;
  kunden?: { name: string; vorname: string | null } | null;
};

const SORTIERWERT: Record<string, (p: ProjektZeile) => unknown> = {
  projekt: (p) => p.bezeichnung,
  kunde: (p) => [p.kunden?.vorname, p.kunden?.name].filter(Boolean).join(" ") || null,
  kostenstelle: (p) => p.kostenstelle,
  status: (p) => p.status,
};

export default async function ProjektePage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    kunde_id?: string;
    sort?: string;
    richtung?: string;
  }>;
}) {
  const params = await searchParams;
  const { status, kunde_id, sort, richtung } = params;
  const supabase = await createClient();

  let query = supabase
    .from("projekte")
    .select("*, kunden(id, name, vorname)")
    .order("bezeichnung", { ascending: true });

  if (status) query = query.eq("status", status);
  if (kunde_id) query = query.eq("kunde_id", kunde_id);

  const { data, error } = await query;
  const projekte = (data as ProjektZeile[] | null) ?? [];

  const werteVon = sort ? SORTIERWERT[sort] : undefined;
  if (werteVon) {
    const richtungsfaktor = richtung === "ab" ? -1 : 1;
    projekte.sort((a, b) => richtungsfaktor * vergleiche(werteVon(a), werteVon(b)));
  }
  const { data: kunden } = await supabase
    .from("kunden")
    .select("id, name, vorname")
    .order("name");

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Projekte</h1>
        <Link
          href="/projekte/neu"
          className="rounded bg-arcos-steel text-white text-sm font-medium px-4 py-2 hover:bg-arcos-navy"
        >
          + Neues Projekt
        </Link>
      </div>

      <form className="flex gap-3 mb-4">
        <select
          name="kunde_id"
          defaultValue={kunde_id ?? ""}
          className="rounded border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">Alle Kunden</option>
          {kunden?.map((k) => (
            <option key={k.id} value={k.id}>
              {k.vorname ? `${k.vorname} ` : ""}
              {k.name}
            </option>
          ))}
        </select>
        <select
          name="status"
          defaultValue={status ?? ""}
          className="rounded border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">Alle Status</option>
          <option value="aktiv">Aktiv</option>
          <option value="inaktiv">Inaktiv</option>
        </select>
        {/* Filtern darf die Sortierung nicht verwerfen. */}
        {sort && <input type="hidden" name="sort" value={sort} />}
        {richtung && <input type="hidden" name="richtung" value={richtung} />}
        <button
          type="submit"
          className="rounded border text-sm px-4 py-2 hover:bg-gray-50"
        >
          Filtern
        </button>
      </form>

      {error && (
        <div className="rounded bg-red-50 text-red-700 text-sm px-3 py-2 mb-4">
          {error.message}
        </div>
      )}

      <div className="bg-white rounded-lg border overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <SortierKopf spalte="projekt" basis="/projekte" params={params}>
                Projekt
              </SortierKopf>
              <SortierKopf spalte="kunde" basis="/projekte" params={params}>
                Kunde
              </SortierKopf>
              <SortierKopf spalte="kostenstelle" basis="/projekte" params={params}>
                Kostenstelle
              </SortierKopf>
              <SortierKopf spalte="status" basis="/projekte" params={params}>
                Status
              </SortierKopf>
            </tr>
          </thead>
          <tbody>
            {projekte.map((m) => (
              <tr key={m.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-2">
                  <Link href={`/projekte/${m.id}`} className="text-arcos-steel hover:underline">
                    {m.bezeichnung}
                  </Link>
                </td>
                <td className="px-4 py-2">
                  {m.kunden?.vorname ? `${m.kunden.vorname} ` : ""}
                  {m.kunden?.name}
                </td>
                <td className="px-4 py-2">{m.kostenstelle ?? "–"}</td>
                <td className="px-4 py-2">
                  <span
                    className={`inline-block rounded px-2 py-0.5 text-xs ${
                      m.status === "aktiv"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {m.status}
                  </span>
                </td>
              </tr>
            ))}
            {projekte?.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                  Keine Projekte gefunden.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
