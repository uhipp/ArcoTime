import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/get-profile";
import { ladeDokumente } from "@/lib/dokumente-laden";
import { ProjektForm } from "@/components/projekt-form";
import { DokumenteBereich } from "@/components/dokumente-bereich";
import { updateProjekt, deleteProjekt } from "@/app/actions/projekte";
import { DeleteButton } from "@/components/delete-button";
import { ZurueckLinks } from "@/components/zurueck-links";
import { ProjektTeam } from "@/components/projekt-team";
import type { Projekt } from "@/lib/types";
import { PraesenzSperre } from "@/components/praesenz-sperre";
import { darf } from "@/lib/berechtigungen";

export default async function ProjektDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();

  const [
    profile,
    { data: projekt },
    { data: kunden },
    { data: mitarbeitende },
    { data: teamZeilen },
    { dokumente, kategorien },
  ] = await Promise.all([
    getCurrentProfile(),
    supabase.from("projekte").select("*").eq("id", id).single(),
    supabase.from("kunden").select("id, name, vorname").order("name"),
    supabase.from("profiles").select("id, name").order("name"),
    supabase
      .from("projekt_mitarbeiter")
      .select("user_id, profiles(id, name)")
      .eq("projekt_id", id),
    ladeDokumente(supabase, "projekt", id),
  ]);

  if (!projekt) notFound();

  const istAdmin = darf(profile, "projekte.loeschen");

  // PostgREST liefert die eingebettete Zeile je nach Beziehung als Objekt
  // oder Liste – beides abfangen und auf { id, name } vereinheitlichen.
  const team = ((teamZeilen ?? []) as { profiles: unknown }[])
    .flatMap((z) => (Array.isArray(z.profiles) ? z.profiles : z.profiles ? [z.profiles] : []))
    .map((p) => p as { id: string; name: string })
    .sort((a, b) => a.name.localeCompare(b.name, "de-CH"));

  const updateAction = updateProjekt.bind(null, id);
  const deleteAction = deleteProjekt.bind(null, id);

  return (
    <div className="space-y-10">
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold">{projekt.bezeichnung}</h1>
            <ZurueckLinks links={[{ href: "/projekte", text: "Zur Übersicht" }]} />
          </div>
          {/* Löschen bleibt beim Admin – siehe 0031. */}
          {istAdmin && (
            <DeleteButton
              action={deleteAction}
              label="Projekt löschen"
              confirmText="Projekt wirklich löschen? Geht nur, wenn keine Zeiteinträge vorhanden sind."
            />
          )}
        </div>
        <PraesenzSperre bereich="projekt" bezugId={id}>
          <ProjektForm
            projekt={projekt as Projekt}
            kunden={kunden ?? []}
            mitarbeitende={mitarbeitende ?? []}
            action={updateAction}
            error={error}
          />
        </PraesenzSperre>
      </div>

      <ProjektTeam
        projektId={id}
        team={team}
        alle={mitarbeitende ?? []}
        sichtbarFuerAlle={Boolean(projekt.sichtbar_fuer_alle)}
      />

      <div>
        <h2 className="text-lg font-medium mb-4">Dokumente</h2>
        <DokumenteBereich
          bereich="projekt"
          bezugId={id}
          initialDokumente={dokumente}
          kategorien={kategorien}
          aktuellerUserId={profile?.id ?? ""}
          istAdmin={istAdmin}
        />
      </div>
    </div>
  );
}
