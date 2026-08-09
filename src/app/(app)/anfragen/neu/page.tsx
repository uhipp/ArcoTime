import { createClient } from "@/lib/supabase/server";
import { AnfrageForm } from "@/components/anfrage-form";
import { createAnfrage } from "@/app/actions/anfragen";

export default async function NeueAnfragePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();

  const [{ data: kunden }, { data: projekte }, { data: mitarbeitende }] = await Promise.all([
    supabase.from("kunden").select("id, name, vorname").order("name"),
    supabase.from("projekte").select("id, bezeichnung, kunde_id").order("bezeichnung"),
    supabase.from("profiles").select("id, name").order("name"),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Neue Anfrage</h1>
      <AnfrageForm
        kunden={kunden ?? []}
        projekte={projekte ?? []}
        mitarbeitende={mitarbeitende ?? []}
        action={createAnfrage}
        error={error}
      />
    </div>
  );
}
