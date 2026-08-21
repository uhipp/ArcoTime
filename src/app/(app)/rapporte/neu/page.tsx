import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, getCurrentOrganisation } from "@/lib/get-profile";
import { erstelleRapport } from "@/app/actions/rapporte";
import { RapportKopfForm } from "@/components/rapport-kopf-form";
import { DispoTagesspalte } from "@/components/dispo-tagesspalte";
import { heuteIso } from "@/lib/date-utils";
import { getBegriffe, neuLabel } from "@/lib/begriffe";

export default async function NeuerRapportPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; datum?: string; mitarbeiter?: string; tag?: string }>;
}) {
  const { error, datum, mitarbeiter, tag } = await searchParams;
  const begriffe = await getBegriffe();
  const supabase = await createClient();
  const profile = await getCurrentProfile();
  const organisation = await getCurrentOrganisation();

  const [{ data: kunden }, { data: projekte }, { data: mitarbeitende }] = await Promise.all([
    supabase.from("kunden").select("id, name, vorname").order("name"),
    supabase.from("projekte").select("id, bezeichnung, kunde_id, projektleiter_id").order("bezeichnung"),
    supabase.from("profiles").select("id, name").is("deaktiviert_am", null).order("name"),
  ]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-semibold">{neuLabel(begriffe, "rapport")}</h1>
      </div>
      <div className="flex flex-col md:flex-row gap-6 items-start">
        <div className="flex-1 min-w-0">
      <RapportKopfForm
        kunden={kunden ?? []}
        projekte={projekte ?? []}
        mitarbeitende={mitarbeitende ?? []}
        aktuellerUserId={mitarbeiter ?? profile?.id ?? ""}
        vorgabeDatum={datum}
        mitDisposition={organisation?.modul_disposition ?? false}
        action={erstelleRapport}
        error={error}
        absendeText="Rapport anlegen"
      />
        </div>
        {organisation?.modul_disposition && (
          <DispoTagesspalte tag={tag ?? datum ?? heuteIso()} basisPfad="/rapporte/neu" />
        )}
      </div>
    </div>
  );
}
