import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, getCurrentOrganisation } from "@/lib/get-profile";
import { formatDatumCH, heuteIso } from "@/lib/date-utils";
import { mengeLabel } from "@/lib/menge";
import { DeleteButton } from "@/components/delete-button";
import { RapportKopfForm } from "@/components/rapport-kopf-form";
import { DispoTagesspalte } from "@/components/dispo-tagesspalte";
import { DokumenteBereich } from "@/components/dokumente-bereich";
import { ladeDokumente } from "@/lib/dokumente-laden";
import { RapportPositionForm } from "@/components/rapport-position-form";
import { RapportAbschluss } from "@/components/rapport-abschluss";
import { RapportVersand } from "@/components/rapport-versand";
import { RapportStorno } from "@/components/rapport-storno";
import { RapportTeam } from "@/components/rapport-team";
import {
  aktualisiereRapport,
  loescheRapport,
  fuegePositionHinzu,
  aktualisierePosition,
  loeschePosition,
  schliesseRapportAb,
  signiereRapport,
  versendeRapport,
  storniereRapport,
} from "@/app/actions/rapporte";
import { rapportNummer, type Rapport, type ZeiteintragMitDetails } from "@/lib/types";
import { PraesenzSperre } from "@/components/praesenz-sperre";

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
    { data: beteiligteRoh },
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
    supabase.from("projekte").select("id, bezeichnung, kunde_id, projektleiter_id").order("bezeichnung"),
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
    supabase
      .from("rapport_beteiligte")
      .select("mitarbeiter_id, profiles(id, name)")
      .eq("rapport_id", id),
    ladeDokumente(supabase, "rapport", id),
  ]);

  if (!rapportRoh) notFound();

  const rapport = rapportRoh as Rapport;
  const positionen = (positionenRoh as ZeiteintragMitDetails[] | null) ?? [];
  const offen = rapport.status === "offen";

  // PostgREST liefert die eingebettete Zeile je nach Beziehung als Objekt
  // oder Liste – beides abfangen und vereinheitlichen.
  const beteiligte = ((beteiligteRoh ?? []) as { profiles: unknown }[])
    .flatMap((z) => (Array.isArray(z.profiles) ? z.profiles : z.profiles ? [z.profiles] : []))
    .map((p) => p as { id: string; name: string })
    .sort((a, b) => a.name.localeCompare(b.name, "de-CH"));

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
        <div className="flex items-center gap-3">
          <Link
            href={`/rapporte/${id}/druck`}
            className="text-sm text-arcos-steel hover:underline"
          >
            Druckansicht
          </Link>
          {/* Kein <Link>: Das PDF ist keine Seite der Anwendung, sondern
              eine Datei. Der Router soll sie nicht abzufangen versuchen. */}
          <a
            href={`/rapporte/${id}/pdf`}
            target="_blank"
            rel="noopener"
            className="text-sm text-arcos-steel hover:underline"
          >
            PDF
          </a>
          <Link href="/rapporte" className="text-sm text-arcos-steel hover:underline">
            Zur Übersicht
          </Link>
          {offen && (
            <DeleteButton
              action={loescheRapport.bind(null, id)}
              label="Rapport löschen"
              confirmText="Rapport wirklich löschen? Die erfassten Positionen werden dabei mitgelöscht – sie gelten als nicht geleistet."
            />
          )}
        </div>
      </div>

      {error && <div className="rounded bg-red-50 text-red-700 text-sm px-3 py-2">{error}</div>}

      {!offen && rapport.status !== "storniert" && (
        <div className="rounded bg-gray-100 text-gray-700 text-sm px-3 py-2">
          Dieser Rapport ist abgeschlossen und lässt sich nicht mehr ändern. Für
          Korrekturen bitte stornieren und neu erstellen.
        </div>
      )}

      {rapport.status === "storniert" && (
        <div className="rounded bg-red-50 text-red-800 text-sm px-3 py-2">
          <strong>Storniert</strong>
          {rapport.storniert_am
            ? ` am ${new Date(rapport.storniert_am).toLocaleString("de-CH")}`
            : ""}
          {rapport.storno_grund ? ` · ${rapport.storno_grund}` : ""}. Die Positionen
          zählen nicht mehr, bleiben aber zum Nachvollziehen erhalten.
        </div>
      )}

      {/* Bei gebuchter Disposition liegt der Tagesplan neben dem Formular –
          der Platz rechts war ohnehin ungenutzt, und beim Planen wechselt
          man sonst dauernd zwischen Kalender und Rapport. */}
      <div className="flex flex-col md:flex-row gap-6 items-start">
        <div className="flex-1 min-w-0">
          <PraesenzSperre bereich="rapport" bezugId={id}>
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
          </PraesenzSperre>
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
            mitarbeiterId={rapport.mitarbeiter_id}
            datum={rapport.datum}
            abbrechenHref={`/rapporte/${id}`}
          />
        )}
        {offen && !inBearbeitung && (
          <RapportPositionForm
            dienstleistungen={dienstleistungen ?? []}
            rabattsaetze={rabattsaetze ?? []}
            action={fuegePositionHinzu.bind(null, id)}
            mitarbeiterId={rapport.mitarbeiter_id}
            datum={rapport.datum}
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

      <RapportTeam
        rapportId={id}
        beteiligte={beteiligte}
        alle={mitarbeitende ?? []}
        verantwortlichId={rapport.mitarbeiter_id ?? null}
        bearbeitbar={offen}
      />

      {offen && (
        <RapportAbschluss
          signierenAction={signiereRapport.bind(null, id)}
          ohneUnterschriftAction={schliesseRapportAb.bind(null, id)}
          anzahlPositionen={positionen.length}
          datumInZukunft={rapport.datum > heuteIso()}
        />
      )}

      {!offen && rapport.unterschrift_png && (
        <div className="bg-white rounded-lg border p-5 max-w-2xl">
          <h2 className="text-lg font-medium mb-1">Unterschrift</h2>
          <p className="text-sm text-gray-500 mb-3">
            {rapport.unterzeichner_name}
            {rapport.signiert_am
              ? ` · ${new Date(rapport.signiert_am).toLocaleString("de-CH")}`
              : ""}
          </p>
          {/* Bewusst ein einfaches img: Die Unterschrift ist eine
              Data-URL in der Zeile des Rapports, next/image brächte hier
              nichts ausser Umwegen. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={rapport.unterschrift_png}
            alt={`Unterschrift von ${rapport.unterzeichner_name ?? "Kunde"}`}
            className="max-h-40 border rounded bg-white"
          />
        </div>
      )}

      {!offen && !rapport.unterschrift_png && rapport.abschluss_vermerk && (
        <p className="text-sm text-gray-500 max-w-2xl">
          Abgeschlossen ohne Unterschrift. Vermerk:{" "}
          <strong>{rapport.abschluss_vermerk}</strong>
        </p>
      )}

      {/* Versand erst nach dem Abschluss: Ein Entwurf ist noch keine
          Aussage über geleistete Arbeit. Storniert ebenfalls nicht. */}
      {!offen && rapport.status !== "storniert" && (
        <RapportVersand
          action={versendeRapport.bind(null, id)}
          vorgabeEmpfaenger={rapport.kunden?.email ?? null}
          versendetAn={rapport.versendet_an ?? null}
          versendetAm={rapport.versendet_am ?? null}
        />
      )}

      {/* Storno erst nach dem Abschluss – ein Entwurf wird gelöscht, nicht
          ungültig gestellt. */}
      {!offen && rapport.status !== "storniert" && (
        <RapportStorno action={storniereRapport.bind(null, id)} />
      )}
    </div>
  );
}
