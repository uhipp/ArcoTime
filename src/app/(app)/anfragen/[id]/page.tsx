import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/get-profile";
import { AnfrageForm } from "@/components/anfrage-form";
import { DeleteButton } from "@/components/delete-button";
import {
  updateAnfrage,
  deleteAnfrage,
  erledigeAnfrage,
} from "@/app/actions/anfragen";
import type { Anfrage } from "@/lib/types";

export default async function AnfrageDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();
  const profile = await getCurrentProfile();

  const { data: anfrage } = await supabase
    .from("anfragen")
    .select("*, kunden(id, name, vorname)")
    .eq("id", id)
    .single();

  if (!anfrage) notFound();

  const [
    { data: kunden },
    { data: projekte },
    { data: mitarbeitende },
    { data: dienstleistungen },
  ] = await Promise.all([
    supabase.from("kunden").select("id, name, vorname").order("name"),
    supabase.from("projekte").select("id, bezeichnung, kunde_id").order("bezeichnung"),
    supabase.from("profiles").select("id, name").order("name"),
    supabase.from("dienstleistungen").select("id, bezeichnung, aktiv").eq("aktiv", true).order("bezeichnung"),
  ]);

  const updateAction = updateAnfrage.bind(null, id);
  const deleteAction = deleteAnfrage.bind(null, id);
  const erledigenAction = erledigeAnfrage.bind(null, id);

  const bereitsVerrechnet = Boolean(anfrage.zeiteintrag_id);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Anfrage bearbeiten</h1>
        {profile?.role === "admin" && (
          <DeleteButton action={deleteAction} label="Anfrage löschen" />
        )}
      </div>

      {anfrage.status === "erledigt" && (
        <div className="rounded bg-green-50 text-green-800 text-sm px-3 py-2">
          Erledigt am{" "}
          {anfrage.erledigt_am ? new Date(anfrage.erledigt_am).toLocaleString("de-CH") : "–"}
          {bereitsVerrechnet && " · verrechnet"}
        </div>
      )}

      <AnfrageForm
        anfrage={anfrage as Anfrage}
        kunden={kunden ?? []}
        projekte={projekte ?? []}
        mitarbeitende={mitarbeitende ?? []}
        action={updateAction}
        error={error}
      />

      {!bereitsVerrechnet && (
        <div className="bg-white rounded-lg border p-5 max-w-2xl">
          <h2 className="text-lg font-medium mb-1">
            {anfrage.status === "erledigt" ? "Nachträglich verrechnen" : "Anfrage erledigen"}
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Erzeugt beim Abschluss direkt einen Zeiteintrag, damit nichts vergessen wird.
          </p>
          <form action={erledigenAction} className="space-y-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="nicht_verrechnen" />
              Nicht verrechnen
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Projekt</label>
                <select
                  name="projekt_id"
                  defaultValue={anfrage.projekt_id ?? ""}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">Bitte wählen…</option>
                  {projekte
                    ?.filter((p) => p.kunde_id === anfrage.kunde_id)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.bezeichnung}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Dienstleistung</label>
                <select
                  name="dienstleistung_id"
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">Bitte wählen…</option>
                  {dienstleistungen?.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.bezeichnung}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Dauer (Minuten)</label>
                <input
                  name="dauer_minuten"
                  type="number"
                  min={1}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Mitarbeitende</label>
                <select
                  name="mitarbeiter_id"
                  defaultValue={anfrage.zugewiesen_an ?? ""}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">Ich</option>
                  {mitarbeitende?.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Beschreibung</label>
              <textarea
                name="beschreibung"
                rows={2}
                defaultValue={`${anfrage.titel}${anfrage.beschreibung ? " – " + anfrage.beschreibung : ""}`}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              className="rounded bg-arcos-steel text-white text-sm font-medium px-4 py-2 hover:bg-arcos-navy"
            >
              {anfrage.status === "erledigt" ? "Verrechnen" : "Erledigen"}
            </button>
          </form>
        </div>
      )}

      {bereitsVerrechnet && (
        <p className="text-sm text-gray-500">
          <Link href={`/zeiterfassung/${anfrage.zeiteintrag_id}`} className="text-arcos-steel hover:underline">
            Zugehörigen Zeiteintrag ansehen
          </Link>
        </p>
      )}
    </div>
  );
}
