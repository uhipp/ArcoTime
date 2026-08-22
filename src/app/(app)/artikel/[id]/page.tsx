import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/get-profile";
import { ArtikelForm } from "@/components/artikel-form";
import { updateArtikel, deleteArtikel } from "@/app/actions/artikel";
import { DeleteButton } from "@/components/delete-button";
import type { Artikel } from "@/lib/types";
import { PraesenzSperre } from "@/components/praesenz-sperre";
import { darf } from "@/lib/berechtigungen";

export default async function ArtikelDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();

  const { data: artikel } = await supabase
    .from("artikel")
    .select("*")
    .eq("id", id)
    .single();

  if (!artikel) notFound();

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

  const profile = await getCurrentProfile();
  const istAdmin = darf(profile, "artikel.loeschen");

  const updateAction = updateArtikel.bind(null, id);
  const deleteAction = deleteArtikel.bind(null, id);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">{artikel.bezeichnung}</h1>
        {/* Löschen bleibt beim Admin – siehe 0031. */}
        {istAdmin && (
          <DeleteButton
            action={deleteAction}
            label="Artikel löschen"
            confirmText="Artikel wirklich löschen? Geht nur, wenn keine Zeiteinträge vorhanden sind."
          />
        )}
      </div>
      <PraesenzSperre bereich="artikel" bezugId={id}>
        <ArtikelForm
          artikel={artikel as Artikel}
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
