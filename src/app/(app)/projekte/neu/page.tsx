import { createClient } from "@/lib/supabase/server";
import { ProjektForm } from "@/components/projekt-form";
import { createProjekt } from "@/app/actions/projekte";
import { getBegriffe, neuLabel } from "@/lib/begriffe";

export default async function NeuesProjektPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; kunde_id?: string }>;
}) {
  const { error } = await searchParams;
  const begriffe = await getBegriffe();
  const supabase = await createClient();
  const [{ data: kunden }, { data: mitarbeitende }] = await Promise.all([
    supabase.from("kunden").select("id, name, vorname").order("name"),
    supabase.from("profiles").select("id, name").is("deaktiviert_am", null).order("name"),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">{neuLabel(begriffe, "projekt")}</h1>
      <ProjektForm
        kunden={kunden ?? []}
        mitarbeitende={mitarbeitende ?? []}
        action={createProjekt}
        error={error}
      />
    </div>
  );
}
