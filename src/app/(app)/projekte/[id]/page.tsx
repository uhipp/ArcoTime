import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProjektForm } from "@/components/projekt-form";
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

  const { data: projekt } = await supabase
    .from("projekte")
    .select("*")
    .eq("id", id)
    .single();

  if (!projekt) notFound();

  const { data: kunden } = await supabase
    .from("kunden")
    .select("id, name, vorname")
    .order("name");

  const updateAction = updateProjekt.bind(null, id);
  const deleteAction = deleteProjekt.bind(null, id);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">{projekt.bezeichnung}</h1>
        <DeleteButton
          action={deleteAction}
          label="Projekt löschen"
          confirmText="Projekt wirklich löschen? Geht nur, wenn keine Zeiteinträge vorhanden sind."
        />
      </div>
      <ProjektForm
        projekt={projekt as Projekt}
        kunden={kunden ?? []}
        action={updateAction}
        error={error}
      />
    </div>
  );
}
