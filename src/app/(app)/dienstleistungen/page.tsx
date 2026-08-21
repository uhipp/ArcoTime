import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { begriff, getBegriffe, neuLabel } from "@/lib/begriffe";

export default async function DienstleistungenPage() {
  const supabase = await createClient();
  // Wie dieser Betrieb den Bereich nennt (0073).
  const begriffe = await getBegriffe();

  const { data: dienstleistungen, error } = await supabase
    .from("dienstleistungen")
    .select("*, dienstleistungsklassen(id, bezeichnung), mwst_codes(id, code)")
    .order("bezeichnung");

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">{begriff(begriffe, "dienstleistung", "mehrzahl")}</h1>
        <Link
          href="/dienstleistungen/neu"
          className="rounded bg-arcos-steel text-white text-sm font-medium px-4 py-2 hover:bg-arcos-navy"
        >
          + {neuLabel(begriffe, "dienstleistung")}
        </Link>
      </div>

      {error && (
        <div className="rounded bg-red-50 text-red-700 text-sm px-3 py-2 mb-4">
          {error.message}
        </div>
      )}

      <div className="bg-white rounded-lg border overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-2">Bezeichnung</th>
              <th className="px-4 py-2">Klasse</th>
              <th className="px-4 py-2">Preis</th>
              <th className="px-4 py-2">Konto</th>
              <th className="px-4 py-2">MWSt</th>
              <th className="px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {dienstleistungen?.map((d) => (
              <tr key={d.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-2">
                  <Link
                    href={`/dienstleistungen/${d.id}`}
                    className="text-arcos-steel hover:underline"
                  >
                    {d.bezeichnung}
                  </Link>
                </td>
                <td className="px-4 py-2">{d.dienstleistungsklassen?.bezeichnung ?? "–"}</td>
                <td className="px-4 py-2">
                  CHF {Number(d.preis).toFixed(2)} / {d.einheit}
                </td>
                <td className="px-4 py-2">{d.konto ?? "–"}</td>
                <td className="px-4 py-2">{d.mwst_codes?.code ?? "–"}</td>
                <td className="px-4 py-2">
                  <span
                    className={`inline-block rounded px-2 py-0.5 text-xs ${
                      d.aktiv
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {d.aktiv ? "aktiv" : "inaktiv"}
                  </span>
                </td>
              </tr>
            ))}
            {dienstleistungen?.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                  Keine Dienstleistungen gefunden.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
