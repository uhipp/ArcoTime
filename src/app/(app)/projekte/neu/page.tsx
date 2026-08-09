import { createClient } from "@/lib/supabase/server";
import { ProjektForm } from "@/components/projekt-form";
import { createProjekt } from "@/app/actions/projekte";

export default async function NeuesProjektPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; kunde_id?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data: kunden } = await supabase
    .from("kunden")
    .select("id, name, vorname")
    .order("name");

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Neues Projekt</h1>
      <ProjektForm kunden={kunden ?? []} action={createProjekt} error={error} />
    </div>
  );
}
