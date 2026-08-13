import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDatumCH } from "@/lib/date-utils";
import { rapportNummer, type Rapport, type RapportStatus } from "@/lib/types";

const STATUS_STIL: Record<RapportStatus, string> = {
  offen: "bg-amber-100 text-amber-800",
  signiert: "bg-green-100 text-green-800",
  abgeschlossen: "bg-blue-100 text-blue-800",
  storniert: "bg-gray-200 text-gray-600",
};

const STATUS_TEXT: Record<RapportStatus, string> = {
  offen: "Entwurf",
  signiert: "Signiert",
  abgeschlossen: "Abgeschlossen",
  storniert: "Storniert",
};

export default async function RapportePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; status?: string }>;
}) {
  const { error, status } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("rapporte")
    .select("*, kunden(id, name, vorname, email), projekte(id, bezeichnung), profiles!rapporte_mitarbeiter_id_fkey(id, name)")
    .order("datum", { ascending: false })
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);

  const { data } = await query;
  const rapporte = (data as Rapport[] | null) ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-semibold">Arbeitsrapporte</h1>
        <Link
          href="/rapporte/neu"
          className="rounded bg-arcos-steel text-white text-sm font-medium px-4 py-2 hover:bg-arcos-navy"
        >
          + Neuer Rapport
        </Link>
      </div>

      {error && (
        <div className="rounded bg-red-50 text-red-700 text-sm px-3 py-2 mb-4">{error}</div>
      )}

      <div className="flex gap-2 mb-4 text-sm">
        <Link
          href="/rapporte"
          className={`rounded border px-3 py-1.5 ${!status ? "bg-arcos-steel text-white" : "bg-white hover:bg-gray-50"}`}
        >
          Alle
        </Link>
        {(["offen", "signiert", "abgeschlossen", "storniert"] as RapportStatus[]).map((s) => (
          <Link
            key={s}
            href={`/rapporte?status=${s}`}
            className={`rounded border px-3 py-1.5 ${status === s ? "bg-arcos-steel text-white" : "bg-white hover:bg-gray-50"}`}
          >
            {STATUS_TEXT[s]}
          </Link>
        ))}
      </div>

      {rapporte.length === 0 ? (
        <p className="text-sm text-gray-500 bg-white rounded-lg border p-6">
          Noch keine Rapporte erfasst. Ein Rapport fasst die Positionen eines
          Kundeneinsatzes zusammen – Anfahrt, Arbeitszeit und Material.
        </p>
      ) : (
        <div className="bg-white rounded-lg border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="px-4 py-2">Nummer</th>
                <th className="px-4 py-2">Datum</th>
                <th className="px-4 py-2">Kunde</th>
                <th className="px-4 py-2">Projekt</th>
                <th className="px-4 py-2">Ausgeführt von</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rapporte.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 whitespace-nowrap">
                    <Link href={`/rapporte/${r.id}`} className="text-arcos-steel hover:underline">
                      {rapportNummer(r)}
                    </Link>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">{formatDatumCH(r.datum)}</td>
                  <td className="px-4 py-2">
                    {r.kunden?.vorname ? `${r.kunden.vorname} ` : ""}
                    {r.kunden?.name ?? "–"}
                  </td>
                  <td className="px-4 py-2">{r.projekte?.bezeichnung ?? "–"}</td>
                  <td className="px-4 py-2">{r.profiles?.name ?? "–"}</td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <span className={`rounded px-2 py-0.5 text-xs ${STATUS_STIL[r.status]}`}>
                      {STATUS_TEXT[r.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
