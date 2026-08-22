import { createClient } from "@/lib/supabase/server";
import { ArtikelForm } from "@/components/artikel-form";
import { createArtikel } from "@/app/actions/artikel";
import { getBegriffe, neuLabel } from "@/lib/begriffe";

export default async function NeuerArtikelPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const begriffe = await getBegriffe();

  const [{ data: klassen }, { data: mwstCodes }, { data: einheiten }] = await Promise.all([
    supabase
      .from("artikelklassen")
      .select("id, bezeichnung")
      .eq("aktiv", true)
      .order("sortierung"),
    supabase
      .from("mwst_codes")
      .select("id, code, bezeichnung")
      .eq("aktiv", true)
      .order("code"),
    supabase
      .from("einheiten")
      .select("id, bezeichnung, aktiv")
      .eq("aktiv", true)
      .order("sortierung"),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">{neuLabel(begriffe, "artikel")}</h1>
      <ArtikelForm
        klassen={klassen ?? []}
        mwstCodes={mwstCodes ?? []}
        einheiten={einheiten ?? []}
        action={createArtikel}
        error={error}
      />
    </div>
  );
}
