import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/get-profile";
import { DienstleistungForm } from "@/components/dienstleistung-form";
import { updateDienstleistung, deleteDienstleistung } from "@/app/actions/dienstleistungen";
import { DeleteButton } from "@/components/delete-button";
import type { Dienstleistung } from "@/lib/types";
import { PraesenzSperre } from "@/components/praesenz-sperre";
import { darf } from "@/lib/berechtigungen";

export default async function DienstleistungDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();

  const { data: dienstleistung } = await supabase
    .from("dienstleistungen")
    .select("*")
    .eq("id", id)
    .single();

  if (!dienstleistung) notFound();

  const [{ data: klassen }, { data: mwstCodes }, { data: einheiten }] = await Promise.all([
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
    supabase
      .from("einheiten")
      .select("id, bezeichnung, aktiv")
      .eq("aktiv", true)
      .order("sortierung"),
  ]);

  const profile = await getCurrentProfile();
  const istAdmin = darf(profile, "dienstleistungen.loeschen");

  const updateAction = updateDienstleistung.bind(null, id);
  const deleteAction = deleteDienstleistung.bind(null, id);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">{dienstleistung.bezeichnung}</h1>
        {/* Löschen bleibt beim Admin – siehe 0031. */}
        {istAdmin && (
          <DeleteButton
            action={deleteAction}
            label="Dienstleistung löschen"
            confirmText="Dienstleistung wirklich löschen? Geht nur, wenn keine Zeiteinträge vorhanden sind."
          />
        )}
      </div>
      <PraesenzSperre bereich="dienstleistung" bezugId={id}>
        <DienstleistungForm
          dienstleistung={dienstleistung as Dienstleistung}
          klassen={klassen ?? []}
          mwstCodes={mwstCodes ?? []}
          einheiten={einheiten ?? []}
          action={updateAction}
          error={error}
        />
      </PraesenzSperre>
    </div>
  );
}
