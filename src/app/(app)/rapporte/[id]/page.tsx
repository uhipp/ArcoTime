import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, getCurrentOrganisation } from "@/lib/get-profile";
import { formatDatumCH, heuteIso } from "@/lib/date-utils";
import { mengeLabel } from "@/lib/menge";
import { DeleteButton } from "@/components/delete-button";
import { RapportKopfForm } from "@/components/rapport-kopf-form";
import { DispoTagesspalte } from "@/components/dispo-tagesspalte";
import { PositionsTimer } from "@/components/positions-timer";
import { KundenKontakt } from "@/components/kunden-kontakt";
import { RapportKontakte } from "@/components/rapport-kontakte";
import { ladeRapportKontakte } from "@/lib/rapport-dokument-daten";
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
  ersetzeBeteiligten,
  starteZeitAnPosition,
  stoppeZeitAnPosition,
} from "@/app/actions/rapporte";
import { rapportNummer, type Rapport, type ZeiteintragMitDetails } from "@/lib/types";
import { PraesenzSperre } from "@/components/praesenz-sperre";
import { darf } from "@/lib/berechtigungen";
import { mitKunde } from "@/lib/rapport-kunde";
import { begriff, getBegriffe } from "@/lib/begriffe";

export default async function RapportDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    error?: string;
    bearbeiten?: string;
    tag?: string;
    von?: string;
    ansicht?: string;
    datum?: string;
  }>;
}) {
  const { id } = await params;
  const { error, bearbeiten, tag, von, ansicht, datum } = await searchParams;
  const begriffe = await getBegriffe();
  const supabase = await createClient();

  const [
    profile,
    organisation,
    { data: rapportRoh },
    { data: positionenRoh },
    { data: kunden },
    { data: projekte },
    { data: mitarbeitende },
    { data: artikel },
    { data: rabattsaetze },
    { data: herkunft },
    { data: beteiligteRoh },
    { data: gruppen },
    { dokumente, kategorien },
  ] = await Promise.all([
    getCurrentProfile(),
    getCurrentOrganisation(),
    supabase
      .from("rapporte")
      .select(
        "*, projekte(id, bezeichnung, anreise_km, zugang, standorte(bezeichnung, strasse, hausnummer, plz, ort, land), kunden(id, name, vorname, email, strasse, hausnummer, plz, ort, land, telefon)), profiles!rapporte_mitarbeiter_id_fkey(id, name)"
      )
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
      .from("artikel")
      .select("id, bezeichnung, aktiv, einheit, zaehlt_als_arbeitszeit, rabatt_erlaubt, menge_aus_anreise")
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
    supabase.from("gruppen").select("id, bezeichnung").eq("aktiv", true).order("sortierung"),
    ladeDokumente(supabase, "rapport", id),
  ]);

  if (!rapportRoh) notFound();

  const rapport = mitKunde(rapportRoh as Rapport);
  const positionen = (positionenRoh as ZeiteintragMitDetails[] | null) ?? [];
  const offen = rapport.status === "offen";

  // Die Anfahrt steht seit 0080 am Auftrag und nicht mehr am Kunden: Eine
  // Verwaltung mit vierzig Liegenschaften hat vierzig Distanzen. Die
  // Einbettung liefert je nach Beziehung ein Objekt oder eine Liste.
  const auftrag = (Array.isArray(rapport.projekte) ? rapport.projekte[0] : rapport.projekte) as
    | { anreise_km?: number | null; zugang?: string | null; standorte?: unknown }
    | undefined;
  const anreiseKm = auftrag?.anreise_km != null ? Number(auftrag.anreise_km) : null;

  // Die Navigation zeigt auf den EINSATZORT und nicht auf die Anschrift des
  // Kunden. Für einen Betrieb mit Standorten war das bisher der Weg zum
  // falschen Haus – genau der Fehler, den die Ortsebene beheben soll. Die
  // Nummer bleibt die des Kunden; wer unterwegs anruft, will die Zentrale.
  const einsatzort = (
    Array.isArray(auftrag?.standorte) ? auftrag?.standorte[0] : auftrag?.standorte
  ) as
    | {
        bezeichnung: string;
        strasse: string | null;
        hausnummer: string | null;
        plz: string | null;
        ort: string | null;
        land: string | null;
      }
    | undefined;
  const navigationsziel = einsatzort
    ? { ...einsatzort, name: einsatzort.bezeichnung, telefon: rapport.kunde?.telefon ?? null }
    : rapport.kunde;

  const kontakte = await ladeRapportKontakte(
    supabase,
    rapport.projekt_id,
    rapport.kunde?.id ?? null,
    rapport.datum
  );
  const laufendePosition = positionen.find((z) => z.timer_gestartet_um) ?? null;

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
          <h1 className="text-2xl font-semibold">
            {begriff(begriffe, "rapport")} {rapportNummer(rapport)}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {formatDatumCH(rapport.datum)} · {rapport.kunde?.vorname ? `${rapport.kunde.vorname} ` : ""}
            {rapport.kunde?.name}
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
          {von === "disposition" && (
            <Link
              href={`/disposition?${new URLSearchParams(
                Object.entries({ ansicht, datum }).filter(([, v]) => v) as [string, string][]
              ).toString()}`}
              className="text-sm text-arcos-steel hover:underline"
            >
              Zur Disposition
            </Link>
          )}
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

      {/* Navigation und Anruf zuoberst: Das ist der Moment vor der
          Abfahrt, und der Monteur soll dafür nicht durch den Rapport
          scrollen müssen. */}
      {offen && <KundenKontakt kunde={navigationsziel} />}

      {/* Der Zugang gehört neben die Navigation und nicht in eine Notiz
          weiter unten: Er wird in der Minute gebraucht, in der man ankommt.
          whitespace-pre-line, weil das Feld mehrzeilig ist – „Schlüssel
          Nr. 4 im Kasten links" und der Code stehen selten auf einer Zeile. */}
      {offen && (einsatzort?.bezeichnung || auftrag?.zugang) && (
        <div className="rounded-lg border bg-white p-4 text-sm">
          {einsatzort?.bezeichnung && (
            <p className="font-medium">{einsatzort.bezeichnung}</p>
          )}
          {auftrag?.zugang && (
            <p className="text-gray-600 whitespace-pre-line mt-1">
              <span className="text-xs text-gray-500">Zugang: </span>
              {auftrag.zugang}
            </p>
          )}
        </div>
      )}

      {/* Die Menschen zuoberst, wie die Navigation: Wer vor der Tür steht,
          braucht sie zuerst – und dieselbe Liste steht auf dem Ausdruck. */}
      {offen && <RapportKontakte kontakte={kontakte} />}

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
              beteiligte={beteiligte}
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
        {/* Rapporte aus einer Anfrage können ohne Projekt entstehen, wenn
            die Anfrage keines hatte. Ohne Projekt geht hier gar nichts –
            das muss dastehen und nicht erst beim ersten Versuch kommen. */}
        {offen && !rapport.projekt_id && (
          <p className="mb-4 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Diesem Rapport fehlt das <strong>Projekt</strong>. Solange es fehlt,
            lassen sich weder Positionen erfassen noch Standardpositionen
            übernehmen – bitte oben im Kopf eines wählen.
          </p>
        )}
        <p className="text-sm text-gray-500 mb-4">
          Anfahrt, Arbeitszeit und Material des Einsatzes. Jede Position ist ein
          Zeiteintrag und wird ganz normal verrechnet und exportiert.
        </p>

        {/* Läuft ein Timer, steht er zuoberst und daumengross: Wer bei
            der Ankunft stoppen will, soll nicht erst die richtige Zeile
            in einer Tabelle suchen müssen. */}
        {offen && laufendePosition && (
          <div className="mb-4 rounded-lg border-2 border-red-500 bg-red-50 p-4">
            <p className="text-sm font-medium text-red-800 mb-1">
              Timer läuft: {laufendePosition.artikel_bezeichnung}
            </p>
            <p className="text-xs text-red-700 mb-3">
              Gestartet um {laufendePosition.start_zeit?.slice(0, 5) ?? "–"} Uhr. Die
              gemessene Zeit ersetzt beim Stoppen die Dauer dieser Position.
            </p>
            <PositionsTimer
              action={stoppeZeitAnPosition.bind(null, id, laufendePosition.id)}
              laeuft
              seit={laufendePosition.timer_gestartet_um}
              gross
            />
          </div>
        )}

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
                    <td className="px-4 py-2">{z.artikel_bezeichnung}</td>
                    <td className="px-4 py-2 text-gray-500 whitespace-pre-line">
                      {z.beschreibung ?? "–"}
                    </td>
                    <td className="px-4 py-2 text-right whitespace-nowrap">
                      {z.timer_gestartet_um ? (
                        <span className="font-medium text-red-700">⏱ Timer läuft</span>
                      ) : (
                        mengeLabel(z)
                      )}
                    </td>
                    <td className="px-4 py-2 text-right whitespace-nowrap">
                      CHF {Number(z.betrag ?? 0).toFixed(2)}
                    </td>
                    {offen && (
                      <td className="px-4 py-2 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-3">
                          {/* Nur bei Arbeitszeit: Kilometer und Material
                              misst man nicht mit der Uhr. */}
                          {z.menge == null && !z.beleg_id && (
                            <PositionsTimer
                              id={`timer_${z.id}`}
                              action={
                                z.timer_gestartet_um
                                  ? stoppeZeitAnPosition.bind(null, id, z.id)
                                  : starteZeitAnPosition.bind(null, id, z.id)
                              }
                              laeuft={Boolean(z.timer_gestartet_um)}
                              seit={z.timer_gestartet_um}
                            />
                          )}
                          <Link
                            // fokus: Das Bearbeitungsformular steht unter
                            // der Tabelle – ohne den Parameter beginnt die
                            // Seite oben und man scrollt erst einmal hin.
                            href={`/rapporte/${id}?bearbeiten=${z.id}&fokus=pos_artikel`}
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
            artikel={artikel ?? []}
            rabattsaetze={rabattsaetze ?? []}
            action={aktualisierePosition.bind(null, id, inBearbeitung.id)}
            position={inBearbeitung}
            mitarbeiterId={rapport.mitarbeiter_id}
            datum={rapport.datum}
            beteiligte={beteiligte}
            anreiseKm={anreiseKm}
            abbrechenHref={`/rapporte/${id}`}
          />
        )}
        {offen && !inBearbeitung && (
          <RapportPositionForm
            artikel={artikel ?? []}
            rabattsaetze={rabattsaetze ?? []}
            action={fuegePositionHinzu.bind(null, id)}
            mitarbeiterId={rapport.mitarbeiter_id}
            datum={rapport.datum}
            beteiligte={beteiligte}
            anreiseKm={anreiseKm}
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
          istAdmin={darf(profile, "dokumente.loeschen")}
        />
      </div>

      <RapportTeam
        rapportId={id}
        beteiligte={beteiligte}
        alle={mitarbeitende ?? []}
        gruppen={gruppen ?? []}
        verantwortlichId={rapport.mitarbeiter_id ?? null}
        bearbeitbar={offen}
        ersetzenAction={ersetzeBeteiligten.bind(null, id)}
      />

      {offen && (
        <RapportAbschluss
          signierenAction={signiereRapport.bind(null, id)}
          ohneUnterschriftAction={schliesseRapportAb.bind(null, id)}
          anzahlPositionen={positionen.length}
          datumInZukunft={rapport.datum > heuteIso()}
          darfAbschliessen={
            rapport.mitarbeiter_id === profile?.id ||
            darf(profile, "rapporte.abschliessen.fremde")
          }
          verantwortlichName={rapport.profiles?.name ?? null}
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
          vorgabeEmpfaenger={rapport.kunde?.email ?? null}
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
