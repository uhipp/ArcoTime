import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/get-profile";
import { ladeDokumente } from "@/lib/dokumente-laden";
import { ZeiterfassungForm } from "@/components/zeiterfassung-form";
import { DokumenteBereich } from "@/components/dokumente-bereich";
import { bearbeiteZeiteintrag, deleteZeiteintrag } from "@/app/actions/zeiteintraege";
import { DeleteButton } from "@/components/delete-button";
import type { Zeiteintrag } from "@/lib/types";
import Link from "next/link";

export default async function ZeiteintragDetailPage({
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
    { data: zeiteintrag },
    profile,
    { data: projekte },
    { data: dienstleistungen },
    { data: mitarbeitende },
    { data: kunden },
    { data: rabattsaetze },
    { data: klassenRabatte },
    { data: herkunft },
    { dokumente, kategorien },
  ] = await Promise.all([
    supabase.from("zeiteintraege").select("*").eq("id", id).single(),
    getCurrentProfile(),
    supabase
      .from("projekte")
      .select("*, kunden(name, vorname, standard_rabatt_prozent)")
      .order("bezeichnung"),
    supabase
      .from("dienstleistungen")
      .select("id, bezeichnung, beschreibung, aktiv, einheit, zaehlt_als_arbeitszeit, rabatt_erlaubt, klasse_id")
      .order("bezeichnung"),
    supabase.from("profiles").select("id, name").order("name"),
    supabase.from("kunden").select("id, name, vorname").order("name"),
    supabase.from("rabattsaetze").select("id, prozent, bezeichnung, aktiv").order("sortierung"),
    supabase.from("kundenrabatte").select("kunde_id, klasse_id, rabatt_prozent"),
    // Rückrichtung: Die Anfrage hält zeiteintrag_id, hier wird danach
    // gesucht – keine zweite Spalte, die dasselbe behauptet (siehe 0034).
    supabase.from("anfragen").select("id, titel").eq("zeiteintrag_id", id).maybeSingle(),
    ladeDokumente(supabase, "zeiteintrag", id),
  ]);

  if (!zeiteintrag) notFound();

  const istExportiert = Boolean(zeiteintrag.beleg_id);
  const updateAction = bearbeiteZeiteintrag.bind(null, id);
  const deleteAction = deleteZeiteintrag.bind(null, id);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Zeiteintrag bearbeiten</h1>
          {herkunft && (
            <p className="text-sm text-gray-500 mt-1">
              <Link
                href={`/anfragen/${herkunft.id}`}
                className="text-arcos-steel hover:underline"
                title={herkunft.titel}
              >
                Verbundene Anfrage anzeigen
              </Link>
            </p>
          )}
        </div>
        {!istExportiert && (
          <DeleteButton action={deleteAction} label="Eintrag löschen" />
        )}
      </div>

      {istExportiert && (
        <div className="rounded bg-amber-50 text-amber-800 text-sm px-3 py-2 mb-4">
          Dieser Eintrag wurde bereits exportiert und kann nicht mehr geändert
          werden.
        </div>
      )}

      {istExportiert ? (
        <div className="bg-white rounded-lg border p-5 text-sm space-y-2 max-w-2xl">
          <p>Datum: {zeiteintrag.datum}</p>
          <p>Dauer: {zeiteintrag.dauer_minuten} Minuten</p>
          <p>Beschreibung: {zeiteintrag.beschreibung ?? "–"}</p>
        </div>
      ) : (
        <ZeiterfassungForm
          zeiteintrag={zeiteintrag as Zeiteintrag}
          projekte={projekte ?? []}
          dienstleistungen={dienstleistungen ?? []}
          mitarbeitende={mitarbeitende ?? []}
          kunden={kunden ?? []}
          rabattsaetze={rabattsaetze ?? []}
          klassenRabatte={klassenRabatte ?? []}
          aktuellerUserId={profile?.id ?? ""}
          action={updateAction}
          timerMoeglich
          error={error}
        />
      )}

      <div className="max-w-2xl mt-8">
        <h2 className="text-lg font-medium mb-4">Dokumente</h2>
        <DokumenteBereich
          bereich="zeiteintrag"
          bezugId={id}
          initialDokumente={dokumente}
          kategorien={kategorien}
          aktuellerUserId={profile?.id ?? ""}
          istAdmin={profile?.role === "admin"}
        />
      </div>
    </div>
  );
}
