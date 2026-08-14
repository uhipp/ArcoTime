import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/get-profile";
import { ladeDokumente } from "@/lib/dokumente-laden";
import { ProjektForm } from "@/components/projekt-form";
import { DokumenteBereich } from "@/components/dokumente-bereich";
import { updateProjekt, deleteProjekt } from "@/app/actions/projekte";
import { DeleteButton } from "@/components/delete-button";
import type { Projekt } from "@/lib/types";

export default async function ProjektDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();

  const [
    profile,
    { data: projekt },
    { data: kunden },
    { dokumente, kategorien },
  ] = await Promise.all([
    getCurrentProfile(),
    supabase.from("projekte").select("*").eq("id", id).single(),
    supabase.from("kunden").select("id, name, vorname").order("name"),
    ladeDokumente(supabase, "projekt", id),
  ]);

  if (!projekt) notFound();

  const istAdmin = profile?.role === "admin";

  const updateAction = updateProjekt.bind(null, id);
  const deleteAction = deleteProjekt.bind(null, id);

  return (
    <div className="space-y-10">
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">{projekt.bezeichnung}</h1>
          {/* Löschen bleibt beim Admin – siehe 0031. */}
          {istAdmin && (
            <DeleteButton
              action={deleteAction}
              label="Projekt löschen"
              confirmText="Projekt wirklich löschen? Geht nur, wenn keine Zeiteinträge vorhanden sind."
            />
          )}
        </div>
        <ProjektForm
          projekt={projekt as Projekt}
          kunden={kunden ?? []}
          action={updateAction}
          error={error}
        />
      </div>

      <div>
        <h2 className="text-lg font-medium mb-4">Dokumente</h2>
        <DokumenteBereich
          bereich="projekt"
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
