import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function MandatePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; kunde_id?: string }>;
}) {
  const { status, kunde_id } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("mandate")
    .select("*, kunden(id, name, vorname)")
    .order("bezeichnung", { ascending: true });

  if (status) query = query.eq("status", status);
  if (kunde_id) query = query.eq("kunde_id", kunde_id);

  const { data: mandate, error } = await query;
  const { data: kunden } = await supabase
    .from("kunden")
    .select("id, name, vorname")
    .order("name");

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Mandate</h1>
        <Link
          href="/mandate/neu"
          className="rounded bg-arcos-steel text-white text-sm font-medium px-4 py-2 hover:bg-arcos-navy"
        >
          + Neues Mandat
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

      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-2">Mandat</th>
              <th className="px-4 py-2">Kunde</th>
              <th className="px-4 py-2">Kostenstelle</th>
              <th className="px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {mandate?.map((m) => (
              <tr key={m.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-2">
                  <Link href={`/mandate/${m.id}`} className="text-arcos-steel hover:underline">
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
            {mandate?.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                  Keine Mandate gefunden.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
