import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ZeiterfassungForm } from "@/components/zeiterfassung-form";
import { createZeiteintrag } from "@/app/actions/zeiteintraege";
import type { ZeiteintragMitDetails } from "@/lib/types";

function montagDieserWoche(bezug = new Date()) {
  const d = new Date(bezug);
  const tag = d.getDay(); // 0 = Sonntag
  const diff = tag === 0 ? -6 : 1 - tag;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function sonntagDieserWoche(bezug = new Date()) {
  const montag = new Date(montagDieserWoche(bezug));
  montag.setDate(montag.getDate() + 6);
  return montag.toISOString().slice(0, 10);
}

export default async function ZeiterfassungPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; von?: string; bis?: string }>;
}) {
  const { error, von, bis } = await searchParams;
  const vonDatum = von ?? montagDieserWoche();
  const bisDatum = bis ?? sonntagDieserWoche();

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  const [{ data: mandate }, { data: dienstleistungen }, { data: eintraege, error: listError }] =
    await Promise.all([
      supabase
        .from("mandate")
        .select("*, kunden(name, vorname)")
        .order("bezeichnung"),
      supabase
        .from("dienstleistungen")
        .select("id, bezeichnung, aktiv")
        .order("bezeichnung"),
      supabase
        .from("v_zeiteintraege")
        .select("*")
        .eq("user_id", userData.user?.id ?? "")
        .gte("datum", vonDatum)
        .lte("datum", bisDatum)
        .order("datum", { ascending: false })
        .order("start_zeit", { ascending: false }),
    ]);

  const zeilen = (eintraege as ZeiteintragMitDetails[] | null) ?? [];
  const summeStunden = zeilen.reduce((s, z) => s + Number(z.menge_stunden), 0);
  const summeBetrag = zeilen.reduce((s, z) => s + Number(z.betrag), 0);

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Zeiterfassung</h1>

      <div className="mb-8">
        <ZeiterfassungForm
          mandate={mandate ?? []}
          dienstleistungen={dienstleistungen ?? []}
          action={createZeiteintrag}
          error={error}
        />
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium">Meine Einträge</h2>
        <form className="flex items-center gap-2 text-sm">
          <input
            type="date"
            name="von"
            defaultValue={vonDatum}
            className="rounded border border-gray-300 px-2 py-1.5"
          />
          <span className="text-gray-400">bis</span>
          <input
            type="date"
            name="bis"
            defaultValue={bisDatum}
            className="rounded border border-gray-300 px-2 py-1.5"
          />
          <button type="submit" className="rounded border px-3 py-1.5 hover:bg-gray-50">
            Filtern
          </button>
        </form>
      </div>

      {listError && (
        <div className="rounded bg-red-50 text-red-700 text-sm px-3 py-2 mb-4">
          {listError.message}
        </div>
      )}

      <div className="bg-white rounded-lg border overflow-hidden mb-3">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-2">Datum</th>
              <th className="px-4 py-2">Kunde / Mandat</th>
              <th className="px-4 py-2">Dienstleistung</th>
              <th className="px-4 py-2">Dauer</th>
              <th className="px-4 py-2">Betrag</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {zeilen.map((z) => (
              <tr key={z.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-2 whitespace-nowrap">
                  {new Date(z.datum).toLocaleDateString("de-CH")}
                </td>
                <td className="px-4 py-2">
                  {z.vorname ? `${z.vorname} ` : ""}
                  {z.kunde_name} – {z.mandat_bezeichnung}
                </td>
                <td className="px-4 py-2">{z.dienstleistung_bezeichnung}</td>
                <td className="px-4 py-2 whitespace-nowrap">{z.menge_stunden} h</td>
                <td className="px-4 py-2 whitespace-nowrap">
                  CHF {Number(z.betrag).toFixed(2)}
                </td>
                <td className="px-4 py-2 text-right">
                  {z.beleg_id ? (
                    <span className="text-xs text-gray-400">exportiert</span>
                  ) : (
                    <Link href={`/zeiterfassung/${z.id}`} className="text-arcos-steel hover:underline">
                      Bearbeiten
                    </Link>
                  )}
                </td>
              </tr>
            ))}
            {zeilen.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                  Keine Einträge im gewählten Zeitraum.
                </td>
              </tr>
            )}
          </tbody>
          {zeilen.length > 0 && (
            <tfoot>
              <tr className="border-t bg-gray-50 font-medium">
                <td className="px-4 py-2" colSpan={3}>
                  Summe
                </td>
                <td className="px-4 py-2 whitespace-nowrap">
                  {summeStunden.toFixed(2)} h
                </td>
                <td className="px-4 py-2 whitespace-nowrap">
                  CHF {summeBetrag.toFixed(2)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      <p className="text-xs text-gray-400">
        Ausführlichere Tages-/Wochen-/Monatsauswertungen mit Filtern über alle
        Mitarbeitenden folgen in Phase 3.
      </p>
    </div>
  );
}
