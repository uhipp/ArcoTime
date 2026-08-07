import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { KundeForm } from "@/components/kunde-form";
import { updateKunde, deleteKunde } from "@/app/actions/kunden";
import { DeleteButton } from "@/components/delete-button";
import type { Kunde } from "@/lib/types";

export default async function KundeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();

  const { data: kunde } = await supabase
    .from("kunden")
    .select("*")
    .eq("id", id)
    .single();

  if (!kunde) notFound();

  const updateAction = updateKunde.bind(null, id);
  const deleteAction = deleteKunde.bind(null, id);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">
          {kunde.vorname ? `${kunde.vorname} ` : ""}
          {kunde.name}
        </h1>
        <DeleteButton
          action={deleteAction}
          label="Kunde löschen"
          confirmText="Kunde inkl. aller zugehörigen Mandate ohne Zeiteinträge wirklich löschen?"
        />
      </div>
      <KundeForm kunde={kunde as Kunde} action={updateAction} error={error} />
    </div>
  );
}
