import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/get-profile";
import { ladeDokumente } from "@/lib/dokumente-laden";
import { KundeForm } from "@/components/kunde-form";
import { KundenPreiseRabatte } from "@/components/kunden-preise-rabatte";
import { DokumenteBereich } from "@/components/dokumente-bereich";
import { updateKunde, deleteKunde } from "@/app/actions/kunden";
import { DeleteButton } from "@/components/delete-button";
import { OptionalesDatumFeld } from "@/components/optionales-datum-feld";
import type { Kunde, ZeiteintragMitDetails } from "@/lib/types";
import { mengeLabel } from "@/lib/menge";

type SearchParams = { error?: string; von?: string; bis?: string; projekt_id?: string };

export default async function KundeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { id } = await params;
  const { error, von, bis, projekt_id } = await searchParams;
  const supabase = await createClient();

  // Anfragen- und Zeiterfassungs-Query hängen nicht vom Kunde-Datensatz
  // selbst ab (nur von der id aus der URL) und können daher parallel dazu
  // abgeschickt werden statt nacheinander.
  let anfragenQuery = supabase
    .from("anfragen")
    .select("*, projekte(id, bezeichnung)")
    .eq("kunde_id", id)
    .order("created_at", { ascending: false });
  if (von) anfragenQuery = anfragenQuery.gte("created_at", von);
  if (bis) anfragenQuery = anfragenQuery.lte("created_at", `${bis}T23:59:59`);
  if (projekt_id) anfragenQuery = anfragenQuery.eq("projekt_id", projekt_id);

  let zeitQuery = supabase
    .from("v_zeiteintraege")
    .select("*")
    .eq("kunde_id", id)
    .order("datum", { ascending: false })
    .order("start_zeit", { ascending: false });
  if (von) zeitQuery = zeitQuery.gte("datum", von);
  if (bis) zeitQuery = zeitQuery.lte("datum", bis);
  if (projekt_id) zeitQuery = zeitQuery.eq("projekt_id", projekt_id);

  const [
    profile,
    { data: kunde },
    { data: projekte },
    { data: anfragen },
    { data: zeiteintraege },
    { dokumente, kategorien },
    { data: alleDienstleistungen },
    { data: alleKlassen },
    { data: kundenpreise },
    { data: kundenrabatte },
  ] = await Promise.all([
    getCurrentProfile(),
    supabase.from("kunden").select("*").eq("id", id).single(),
    supabase.from("projekte").select("id, bezeichnung").eq("kunde_id", id).order("bezeichnung"),
    anfragenQuery,
    zeitQuery,
    ladeDokumente(supabase, "kunde", id),
    supabase
      .from("dienstleistungen")
      .select("id, bezeichnung, einheit, preis")
      .eq("aktiv", true)
      .order("bezeichnung"),
    supabase.from("dienstleistungsklassen").select("id, bezeichnung").order("sortierung"),
    supabase
      .from("kundenpreise")
      .select("id, preis, dienstleistung_id, dienstleistungen(id, bezeichnung, einheit)")
      .eq("kunde_id", id),
    supabase
      .from("kundenrabatte")
      .select("id, rabatt_prozent, klasse_id, dienstleistungsklassen(id, bezeichnung)")
      .eq("kunde_id", id),
  ]);

  if (!kunde) notFound();

  const istAdmin = profile?.role === "admin";

  const updateAction = updateKunde.bind(null, id);
  const deleteAction = deleteKunde.bind(null, id);
  const zeilen = (zeiteintraege as ZeiteintragMitDetails[] | null) ?? [];
  const summeStunden = zeilen.reduce((s, z) => s + Number(z.menge_stunden), 0);

  return (
    <div className="space-y-10">
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">
            {kunde.vorname ? `${kunde.vorname} ` : ""}
            {kunde.name}
          </h1>
          {/* Löschen bleibt beim Admin (RLS seit 0031): Ein Kunde hängt an
              bestehenden Zeiteinträgen und Rapporten. Erfassen und
              Bearbeiten darf jeder. */}
          {istAdmin && (
            <DeleteButton
              action={deleteAction}
              label="Kunde löschen"
              confirmText="Kunde inkl. aller zugehörigen Projekte ohne Zeiteinträge wirklich löschen?"
            />
          )}
        </div>
        <KundeForm kunde={kunde as Kunde} action={updateAction} error={error} />
      </div>

      {istAdmin && (
        <KundenPreiseRabatte
          kundeId={id}
          dienstleistungen={alleDienstleistungen ?? []}
          klassen={alleKlassen ?? []}
          preise={(kundenpreise ?? []) as never[]}
          rabatte={(kundenrabatte ?? []) as never[]}
          standardRabatt={Number(kunde.standard_rabatt_prozent ?? 0)}
        />
      )}

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium">Historie</h2>
          <form className="flex flex-wrap items-center gap-2 text-sm">
            <OptionalesDatumFeld name="von" defaultValue={von} />
            <span className="text-gray-400">bis</span>
            <OptionalesDatumFeld name="bis" defaultValue={bis} />
            <select
              name="projekt_id"
              defaultValue={projekt_id ?? ""}
              className="rounded border border-gray-300 px-2 py-1.5"
            >
              <option value="">Alle Projekte</option>
              {projekte?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.bezeichnung}
                </option>
              ))}
            </select>
            <button type="submit" className="rounded border px-3 py-1.5 hover:bg-gray-50">
              Filtern
            </button>
            {(von || bis || projekt_id) && (
              <Link href={`/kunden/${id}`} className="text-xs text-gray-400 hover:text-gray-600">
                Filter zurücksetzen
              </Link>
            )}
          </form>
        </div>

        <div className="space-y-8">
          <div>
            <h3 className="text-sm font-semibold text-gray-500 mb-2">
              Anfragen ({anfragen?.length ?? 0})
            </h3>
            <div className="bg-white rounded-lg border overflow-hidden overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-gray-500">
                  <tr>
                    <th className="px-4 py-2">Datum</th>
                    <th className="px-4 py-2">Titel</th>
                    <th className="px-4 py-2">Projekt</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {anfragen?.map((a) => (
                    <tr key={a.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-2 whitespace-nowrap">
                        {new Date(a.created_at).toLocaleDateString("de-CH")}
                      </td>
                      <td className="px-4 py-2">{a.titel}</td>
                      <td className="px-4 py-2">{a.projekte?.bezeichnung ?? "–"}</td>
                      <td className="px-4 py-2">{a.status}</td>
                      <td className="px-4 py-2 text-right">
                        <Link
                          href={`/anfragen/${a.id}`}
                          className="text-arcos-steel hover:underline"
                        >
                          Öffnen
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {(!anfragen || anfragen.length === 0) && (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                        Keine Anfragen im gewählten Zeitraum.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-500 mb-2">
              Zeiterfassung ({zeilen.length}
              {zeilen.length > 0 ? ` – ${summeStunden.toFixed(2)} h` : ""})
            </h3>
            <div className="bg-white rounded-lg border overflow-hidden overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-gray-500">
                  <tr>
                    <th className="px-4 py-2">Datum</th>
                    <th className="px-4 py-2">Projekt</th>
                    <th className="px-4 py-2">Dienstleistung</th>
                    <th className="px-4 py-2">Mitarbeitende</th>
                    <th className="px-4 py-2">Dauer</th>
                    <th className="px-4 py-2"></th>
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
                        <td className="px-4 py-2 whitespace-nowrap">
                          {new Date(z.datum).toLocaleDateString("de-CH")}
                        </td>
                        <td className="px-4 py-2">{z.projekt_bezeichnung}</td>
                        <td className="px-4 py-2">{z.dienstleistung_bezeichnung}</td>
                        <td className="px-4 py-2">{z.mitarbeiter_name}</td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          {laeuft ? (
                            <span className="font-medium text-red-700">⏱ Timer aktiv</span>
                          ) : (
                            mengeLabel(z)
                          )}
                        </td>
                        <td className="px-4 py-2 text-right">
                          {z.beleg_id ? (
                            <span className="text-xs text-gray-400">exportiert</span>
                          ) : (
                            <Link
                              href={`/zeiterfassung/${z.id}`}
                              className="text-arcos-steel hover:underline"
                            >
                              Öffnen
                            </Link>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {zeilen.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                        Keine Zeiteinträge im gewählten Zeitraum.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-medium mb-4">Dokumente</h2>
        <DokumenteBereich
          bereich="kunde"
          bezugId={id}
          initialDokumente={dokumente}
          kategorien={kategorien}
          aktuellerUserId={profile?.id ?? ""}
          istAdmin={istAdmin}
        />
      </div>
    </div>
  );
}
