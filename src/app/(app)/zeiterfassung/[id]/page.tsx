import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ZeiterfassungForm } from "@/components/zeiterfassung-form";
import { updateZeiteintrag, deleteZeiteintrag } from "@/app/actions/zeiteintraege";
import { DeleteButton } from "@/components/delete-button";
import type { Zeiteintrag } from "@/lib/types";

export default async function ZeiteintragDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();

  const { data: zeiteintrag } = await supabase
    .from("zeiteintraege")
    .select("*")
    .eq("id", id)
    .single();

  if (!zeiteintrag) notFound();

  const [{ data: mandate }, { data: dienstleistungen }] = await Promise.all([
    supabase
      .from("mandate")
      .select("*, kunden(name, vorname)")
      .order("bezeichnung"),
    supabase
      .from("dienstleistungen")
      .select("id, bezeichnung, aktiv")
      .order("bezeichnung"),
  ]);

  const istExportiert = Boolean(zeiteintrag.beleg_id);
  const updateAction = updateZeiteintrag.bind(null, id);
  const deleteAction = deleteZeiteintrag.bind(null, id);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Zeiteintrag bearbeiten</h1>
        {!istExportiert && (
          <DeleteButton action={deleteAction} label="Eintrag löschen" />
        )}
      </div>

      {istExportiert && (
        <div className="rounded bg-amber-50 text-amber-800 text-sm px-3 py-2 mb-4">
          Dieser Eintrag wurde bereits exportiert und kann nicht mehr geändert
          werden.
        </div>
      )}

      {istExportiert ? (
        <div className="bg-white rounded-lg border p-5 text-sm space-y-2 max-w-2xl">
          <p>Datum: {zeiteintrag.datum}</p>
          <p>Dauer: {zeiteintrag.dauer_minuten} Minuten</p>
          <p>Beschreibung: {zeiteintrag.beschreibung ?? "–"}</p>
        </div>
      ) : (
        <ZeiterfassungForm
          zeiteintrag={zeiteintrag as Zeiteintrag}
          mandate={mandate ?? []}
          dienstleistungen={dienstleistungen ?? []}
          action={updateAction}
          error={error}
        />
      )}
    </div>
  );
}
