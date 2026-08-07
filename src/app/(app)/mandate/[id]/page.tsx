import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MandatForm } from "@/components/mandat-form";
import { updateMandat, deleteMandat } from "@/app/actions/mandate";
import { DeleteButton } from "@/components/delete-button";
import type { Mandat } from "@/lib/types";

export default async function MandatDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();

  const { data: mandat } = await supabase
    .from("mandate")
    .select("*")
    .eq("id", id)
    .single();

  if (!mandat) notFound();

  const { data: kunden } = await supabase
    .from("kunden")
    .select("id, name, vorname")
    .order("name");

  const updateAction = updateMandat.bind(null, id);
  const deleteAction = deleteMandat.bind(null, id);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">{mandat.bezeichnung}</h1>
        <DeleteButton
          action={deleteAction}
          label="Mandat löschen"
          confirmText="Mandat wirklich löschen? Geht nur, wenn keine Zeiteinträge vorhanden sind."
        />
      </div>
      <MandatForm
        mandat={mandat as Mandat}
        kunden={kunden ?? []}
        action={updateAction}
        error={error}
      />
    </div>
  );
}
