import { createClient } from "@/lib/supabase/server";
import { DienstleistungForm } from "@/components/dienstleistung-form";
import { createDienstleistung } from "@/app/actions/dienstleistungen";

export default async function NeueDienstleistungPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();

  const [{ data: klassen }, { data: mwstCodes }] = await Promise.all([
    supabase
      .from("dienstleistungsklassen")
      .select("id, bezeichnung")
      .eq("aktiv", true)
      .order("sortierung"),
    supabase
      .from("mwst_codes")
      .select("id, code, bezeichnung")
      .eq("aktiv", true)
      .order("code"),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Neue Dienstleistung</h1>
      <DienstleistungForm
        klassen={klassen ?? []}
        mwstCodes={mwstCodes ?? []}
        action={createDienstleistung}
        error={error}
      />
    </div>
  );
}
