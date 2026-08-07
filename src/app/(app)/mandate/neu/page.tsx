import { createClient } from "@/lib/supabase/server";
import { MandatForm } from "@/components/mandat-form";
import { createMandat } from "@/app/actions/mandate";

export default async function NeuesMandatPage({
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
      <h1 className="text-2xl font-semibold mb-6">Neues Mandat</h1>
      <MandatForm kunden={kunden ?? []} action={createMandat} error={error} />
    </div>
  );
}
