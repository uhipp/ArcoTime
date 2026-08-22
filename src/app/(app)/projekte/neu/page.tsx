import { createClient } from "@/lib/supabase/server";
import { ProjektForm } from "@/components/projekt-form";
import { createProjekt } from "@/app/actions/projekte";
import { getBegriffe, neuLabel } from "@/lib/begriffe";
import { standorteAktiv } from "@/lib/standorte";

export default async function NeuesProjektPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; kunde_id?: string }>;
}) {
  const { error, kunde_id } = await searchParams;
  const begriffe = await getBegriffe();
  const supabase = await createClient();
  const [ortsebene, { data: kunden }, { data: mitarbeitende }] = await Promise.all([
    standorteAktiv(),
    supabase
      .from("kunden")
      .select("id, name, vorname")
      // Nur echte Kunden: Vertragspartner eines Auftrags. Ein Eigentümer oder Architekt
      // steht im Adressbuch, gehört aber nicht hierher (0074).
      .eq("ist_kunde", true)
      .order("name"),
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
        standorteAktiv={ortsebene}
        kundeVorgabe={kunde_id}
      />
    </div>
  );
}
