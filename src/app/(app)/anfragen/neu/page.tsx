import { createClient } from "@/lib/supabase/server";
import { AnfrageForm } from "@/components/anfrage-form";
import { createAnfrage } from "@/app/actions/anfragen";
import { getBegriffe, neuLabel } from "@/lib/begriffe";

export default async function NeueAnfragePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const begriffe = await getBegriffe();
  const supabase = await createClient();

  const [
    { data: kunden },
    { data: projekte },
    { data: mitarbeitende },
    { data: kanaele },
    { data: prioritaeten },
  ] = await Promise.all([
    supabase
      .from("kunden")
      .select("id, name, vorname")
      // Nur echte Kunden: Auftraggeber einer Anfrage. Ein Eigentümer oder Architekt
      // steht im Adressbuch, gehört aber nicht hierher (0074).
      .eq("ist_kunde", true)
      .order("name"),
    supabase.from("projekte").select("id, bezeichnung, kunde_id").order("bezeichnung"),
    supabase.from("profiles").select("id, name").order("name"),
    supabase.from("anfrage_kanaele").select("*").order("sortierung"),
    supabase.from("anfrage_prioritaeten").select("*").order("sortierung"),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">{neuLabel(begriffe, "anfrage")}</h1>
      <AnfrageForm
        kunden={kunden ?? []}
        projekte={projekte ?? []}
        mitarbeitende={mitarbeitende ?? []}
        kanaele={kanaele ?? []}
        prioritaeten={prioritaeten ?? []}
        action={createAnfrage}
        error={error}
      />
    </div>
  );
}
