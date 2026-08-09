import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Kunde } from "@/lib/types";

export default async function KundenPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("kunden")
    .select("*")
    .order("name", { ascending: true });

  if (q) {
    query = query.or(
      `name.ilike.%${q}%,vorname.ilike.%${q}%,ort.ilike.%${q}%,adress_schluessel.ilike.%${q}%`
    );
  }

  const { data: kunden, error } = await query;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Kunden</h1>
        <Link
          href="/kunden/neu"
          className="rounded bg-arcos-steel text-white text-sm font-medium px-4 py-2 hover:bg-arcos-navy"
        >
          + Neuer Kunde
        </Link>
      </div>

      <form className="mb-4">
        <input
          type="text"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Suche nach Name, Ort, Adress-Schlüssel…"
          className="w-full max-w-sm rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-arcos-steel"
        />
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
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Ort</th>
              <th className="px-4 py-2">E-Mail</th>
              <th className="px-4 py-2">Adress-Schlüssel</th>
            </tr>
          </thead>
          <tbody>
            {(kunden as Kunde[] | null)?.map((k) => (
              <tr key={k.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-2">
                  <Link href={`/kunden/${k.id}`} className="text-arcos-steel hover:underline">
                    {k.vorname ? `${k.vorname} ` : ""}
                    {k.name}
                  </Link>
                </td>
                <td className="px-4 py-2">{k.ort ?? "–"}</td>
                <td className="px-4 py-2">{k.email ?? "–"}</td>
                <td className="px-4 py-2">{k.adress_schluessel ?? "–"}</td>
              </tr>
            ))}
            {kunden?.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                  Keine Kunden gefunden.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
