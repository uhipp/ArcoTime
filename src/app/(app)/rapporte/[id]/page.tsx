import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, getCurrentOrganisation } from "@/lib/get-profile";
import { formatDatumCH } from "@/lib/date-utils";
import { mengeLabel } from "@/lib/menge";
import { DeleteButton } from "@/components/delete-button";
import { RapportKopfForm } from "@/components/rapport-kopf-form";
import { DispoTagesspalte } from "@/components/dispo-tagesspalte";
import { DokumenteBereich } from "@/components/dokumente-bereich";
import { ladeDokumente } from "@/lib/dokumente-laden";
import { RapportPositionForm } from "@/components/rapport-position-form";
import {
  aktualisiereRapport,
  loescheRapport,
  fuegePositionHinzu,
  aktualisierePosition,
  loeschePosition,
} from "@/app/actions/rapporte";
import { rapportNummer, type Rapport, type ZeiteintragMitDetails } from "@/lib/types";

export default async function RapportDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; bearbeiten?: string; tag?: string }>;
}) {
  const { id } = await params;
  const { error, bearbeiten, tag } = await searchParams;
  const supabase = await createClient();

  const [
    profile,
    organisation,
    { data: rapportRoh },
    { data: positionenRoh },
    { data: kunden },
    { data: projekte },
    { data: mitarbeitende },
    { data: dienstleistungen },
    { data: rabattsaetze },
    { data: herkunft },
    { dokumente, kategorien },
  ] = await Promise.all([
    getCurrentProfile(),
    getCurrentOrganisation(),
    supabase
      .from("rapporte")
      .select("*, kunden(id, name, vorname, email), projekte(id, bezeichnung), profiles!rapporte_mitarbeiter_id_fkey(id, name)")
      .eq("id", id)
      .single(),
    supabase
      .from("v_zeiteintraege")
      .select("*")
      .eq("rapport_id", id)
      .order("start_zeit", { ascending: true, nullsFirst: false }),
    supabase.from("kunden").select("id, name, vorname").order("name"),
    supabase.from("projekte").select("id, bezeichnung, kunde_id").order("bezeichnung"),
    supabase.from("profiles").select("id, name").is("deaktiviert_am", null).order("name"),
    supabase
      .from("dienstleistungen")
      .select("id, bezeichnung, aktiv, einheit, zaehlt_als_arbeitszeit, rabatt_erlaubt")
      .eq("aktiv", true)
      .order("bezeichnung"),
    supabase.from("rabattsaetze").select("id, prozent, bezeichnung, aktiv").order("sortierung"),
    // Rückrichtung der Verknüpfung: Die Anfrage hält rapport_id, hier wird
    // danach gesucht. Bewusst keine zweite Spalte am Rapport – siehe 0034.
    supabase.from("anfragen").select("id, titel").eq("rapport_id", id).maybeSingle(),
    ladeDokumente(supabase, "rapport", id),
  ]);

  if (!rapportRoh) notFound();

  const rapport = rapportRoh as Rapport;
  const positionen = (positionenRoh as ZeiteintragMitDetails[] | null) ?? [];
  const offen = rapport.status === "offen";

  // Bearbeiten läuft über einen Query-Parameter statt über Client-State:
  // Die Seite ist serverseitig gerendert, und so bleibt ein angefangenes
  // Bearbeiten auch nach einem Reload erhalten.
  const inBearbeitung = bearbeiten
    ? positionen.find((z) => z.id === bearbeiten)
    : undefined;

  const summeStunden = positionen.reduce((s, z) => s + Number(z.menge_stunden ?? 0), 0);
  const summeBetrag = positionen.reduce((s, z) => s + Number(z.betrag ?? 0), 0);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Rapport {rapportNummer(rapport)}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {formatDatumCH(rapport.datum)} · {rapport.kunden?.vorname ? `${rapport.kunden.vorname} ` : ""}
            {rapport.kunden?.name}
          </p>
          {herkunft && (
            <p className="text-sm text-gray-500 mt-1">
              Aus Anfrage{" "}
              <Link
                href={`/anfragen/${herkunft.id}`}
                className="text-arcos-steel hover:underline"
              >
                {herkunft.titel}
              </Link>
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Link href="/rapporte" className="text-sm text-arcos-steel hover:underline">
            Zur Übersicht
          </Link>
          {offen && (
            <DeleteButton
              action={loescheRapport.bind(null, id)}
              label="Rapport löschen"
              confirmText="Rapport wirklich löschen? Die erfassten Leistungen bleiben als Zeiteinträge bestehen."
            />
          )}
        </div>
      </div>

      {error && <div className="rounded bg-red-50 text-red-700 text-sm px-3 py-2">{error}</div>}

      {!offen && (
        <div className="rounded bg-gray-100 text-gray-700 text-sm px-3 py-2">
          Dieser Rapport ist abgeschlossen und lässt sich nicht mehr ändern. Für
          Korrekturen bitte stornieren und neu erstellen.
        </div>
      )}

      {/* Bei gebuchter Disposition liegt der Tagesplan neben dem Formular –
          der Platz rechts war ohnehin ungenutzt, und beim Planen wechselt
          man sonst dauernd zwischen Kalender und Rapport. */}
      <div className="flex flex-col md:flex-row gap-6 items-start">
        <div className="flex-1 min-w-0">
          <RapportKopfForm
            rapport={rapport}
            kunden={kunden ?? []}
            projekte={projekte ?? []}
            mitarbeitende={mitarbeitende ?? []}
            aktuellerUserId={profile?.id ?? ""}
            action={aktualisiereRapport.bind(null, id)}
            absendeText="Kopfdaten speichern"
            mitDisposition={organisation?.modul_disposition ?? false}
            gesperrt={!offen}
          />
        </div>
        {organisation?.modul_disposition && (
          <DispoTagesspalte
            tag={tag ?? rapport.datum}
            basisPfad={`/rapporte/${id}`}
            aktuellerRapportId={id}
          />
        )}
      </div>

      <div>
        <h2 className="text-lg font-medium mb-1">Positionen</h2>
        <p className="text-sm text-gray-500 mb-4">
          Anfahrt, Arbeitszeit und Material des Einsatzes. Jede Position ist ein
          Zeiteintrag und wird ganz normal verrechnet und exportiert.
        </p>

        {positionen.length === 0 ? (
          <p className="text-sm text-gray-400 bg-white rounded-lg border p-5 mb-4">
            Noch keine Positionen erfasst.
          </p>
        ) : (
          <div className="bg-white rounded-lg border overflow-x-auto mb-4">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-500">
                <tr>
                  <th className="px-4 py-2">Leistung</th>
                  <th className="px-4 py-2">Beschreibung</th>
                  <th className="px-4 py-2 text-right">Menge</th>
                  <th className="px-4 py-2 text-right">Betrag</th>
                  {offen && <th className="px-4 py-2"></th>}
                </tr>
              </thead>
              <tbody className="divide-y">
                {positionen.map((z) => (
                  <tr key={z.id}>
                    <td className="px-4 py-2">{z.dienstleistung_bezeichnung}</td>
                    <td className="px-4 py-2 text-gray-500 whitespace-pre-line">
                      {z.beschreibung ?? "–"}
                    </td>
                    <td className="px-4 py-2 text-right whitespace-nowrap">{mengeLabel(z)}</td>
                    <td className="px-4 py-2 text-right whitespace-nowrap">
                      CHF {Number(z.betrag ?? 0).toFixed(2)}
                    </td>
                    {offen && (
                      <td className="px-4 py-2 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-3">
                          <Link
                            href={`/rapporte/${id}?bearbeiten=${z.id}`}
                            className="text-xs text-arcos-steel hover:underline"
                          >
                            bearbeiten
                          </Link>
                          <form action={loeschePosition.bind(null, id, z.id)}>
                            <button
                              type="submit"
                              className="text-xs text-gray-400 hover:text-red-600"
                            >
                              entfernen
                            </button>
                          </form>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 font-medium">
                <tr>
                  <td className="px-4 py-2" colSpan={2}>
                    Total
                  </td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    {summeStunden > 0 ? `${summeStunden.toFixed(2)} h` : "–"}
                  </td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    CHF {summeBetrag.toFixed(2)}
                  </td>
                  {offen && <td />}
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {offen && inBearbeitung && (
          <RapportPositionForm
            key={inBearbeitung.id}
            dienstleistungen={dienstleistungen ?? []}
            rabattsaetze={rabattsaetze ?? []}
            action={aktualisierePosition.bind(null, id, inBearbeitung.id)}
            position={inBearbeitung}
            abbrechenHref={`/rapporte/${id}`}
          />
        )}
        {offen && !inBearbeitung && (
          <RapportPositionForm
            dienstleistungen={dienstleistungen ?? []}
            rabattsaetze={rabattsaetze ?? []}
            action={fuegePositionHinzu.bind(null, id)}
          />
        )}
      </div>

      <div className="max-w-2xl">
        <h2 className="text-lg font-medium mb-1">Dokumente</h2>
        <p className="text-sm text-gray-500 mb-4">
          Anweisungen, Pläne und Fotos zu diesem Einsatz – für die Person, die
          rausfährt.
        </p>
        <DokumenteBereich
          bereich="rapport"
          bezugId={id}
          initialDokumente={dokumente}
          kategorien={kategorien}
          aktuellerUserId={profile?.id ?? ""}
          istAdmin={profile?.role === "admin"}
        />
      </div>

      <p className="text-sm text-gray-400">
        Unterschrift, PDF und Versand folgen in der nächsten Etappe – siehe
        docs/phase8-arbeitsrapport-plan.md.
      </p>
    </div>
  );
}
