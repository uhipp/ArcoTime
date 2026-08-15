import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/get-profile";
import { ladeDokumente } from "@/lib/dokumente-laden";
import { DokumenteBereich } from "@/components/dokumente-bereich";
import { formatDatumCH, heuteIso } from "@/lib/date-utils";
import { ZeitFeld } from "@/components/zeit-feld";
import { erfasseAbwesenheit, loescheAbwesenheit } from "@/app/actions/abwesenheiten";
import { DatumFeld } from "@/components/datum-feld";
import { OptionalesDatumFeld } from "@/components/optionales-datum-feld";
import { darf } from "@/lib/berechtigungen";
import { getCurrentOrganisation } from "@/lib/get-profile";
import { DeleteButton } from "@/components/delete-button";
import {
  speichereAnstellung,
  erfassePensum,
  loeschePensum,
  speichereFerienanspruch,
} from "@/app/actions/zeitkonto";

// Erreichbar für Admin (jede Person) oder die Person selbst (nur die
// eigene) – Personal-Dokumente sind sensibel, siehe Phase-7-Plan.
export default async function MitarbeitendeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const istAdmin = darf(profile, "mitarbeitende.verwalten");
  if (!istAdmin && profile.id !== id) redirect("/");

  const supabase = await createClient();
  const [
    { data: person },
    { dokumente, kategorien },
    { data: abwesenheiten },
    { data: arten },
    organisation,
    { data: pensen },
    { data: ansprueche },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, name, vorname, nachname, email, role, eintritt, austritt")
      .eq("id", id)
      .single(),
    ladeDokumente(supabase, "mitarbeitende", id),
    // Vergangenes bleibt sichtbar, aber die Planung interessiert sich für
    // das Kommende – deshalb ab heute, absteigend nach Beginn.
    supabase
      .from("abwesenheiten")
      .select("*")
      .eq("mitarbeiter_id", id)
      .gte("bis", heuteIso())
      .order("von"),
    supabase
      .from("abwesenheitsarten")
      .select("wert, bezeichnung, farbe")
      .eq("aktiv", true)
      .order("sortierung"),
    getCurrentOrganisation(),
    supabase
      .from("pensen")
      .select("*")
      .eq("mitarbeiter_id", id)
      .order("ab_datum", { ascending: false }),
    supabase
      .from("ferienanspruch")
      .select("*")
      .eq("mitarbeiter_id", id)
      .order("jahr", { ascending: false }),
  ]);

  if (!person) notFound();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">
          {person.vorname ? `${person.vorname} ` : ""}
          {person.name}
        </h1>
        <p className="text-sm text-gray-500">
          {person.email ?? "–"} · {person.role === "admin" ? "Admin" : "Mitarbeitende"}
        </p>
      </div>

      {/* Anstellung, Pensum und Ferienanspruch – die Grundlagen des
          Zeitkontos (Phase 12, Etappe A). Nur mit gebuchtem Modul, und
          nur der Admin pflegt sie; die Person sieht ihre eigenen Werte. */}
      {organisation?.modul_zeitkonto && (
        <div className="max-w-2xl space-y-8">
          <div className="rounded-lg border bg-white p-4 flex flex-wrap items-center gap-3">
            <span className="flex-1 min-w-[14rem] text-sm text-gray-600">
              Soll gegen Ist je Monat, fortlaufender Saldo und Ferienguthaben.
            </span>
            <Link
              href={`/mitarbeiter/${id}/zeitkonto`}
              className="rounded bg-arcos-steel px-4 py-2 text-sm font-medium text-white hover:bg-arcos-navy"
            >
              Zeitkonto öffnen
            </Link>
          </div>

          <div>
            <h2 className="text-lg font-medium mb-1">Anstellung</h2>
            <p className="text-sm text-gray-500 mb-4">
              Ein- und Austritt bestimmen, ab wann und bis wann Sollstunden und
              Ferienanspruch anteilig gerechnet werden.
            </p>
            <form
              action={speichereAnstellung.bind(null, id)}
              className="flex flex-wrap items-end gap-3 rounded-lg border bg-white p-4 text-sm"
            >
              {/* OptionalesDatumFeld und nicht DatumFeld: Safari zeigt in
                  einem leeren Datumsfeld das heutige Datum als optische
                  Vorschau – nicht gespeichert, aber nicht von einem echten
                  Wert zu unterscheiden. Bei "Austritt" hiesse das: Jede
                  Person sieht aus, als hätte sie heute gekündigt.
                  Steht nichts in der Datenbank, gibt es hier auch kein
                  Feld, sondern nur "+ Datum setzen". */}
              <div>
                <span className="block text-xs text-gray-500 mb-1">Eintritt</span>
                {istAdmin ? (
                  <OptionalesDatumFeld name="eintritt" defaultValue={person.eintritt} />
                ) : (
                  <span className="text-sm">
                    {person.eintritt ? formatDatumCH(person.eintritt) : "–"}
                  </span>
                )}
              </div>
              <div>
                <span className="block text-xs text-gray-500 mb-1">Austritt</span>
                {istAdmin ? (
                  <OptionalesDatumFeld name="austritt" defaultValue={person.austritt} />
                ) : (
                  <span className="text-sm">
                    {person.austritt ? formatDatumCH(person.austritt) : "–"}
                  </span>
                )}
              </div>
              {istAdmin && (
                <button
                  type="submit"
                  className="rounded bg-arcos-steel px-4 py-2 text-sm font-medium text-white hover:bg-arcos-navy"
                >
                  Speichern
                </button>
              )}
            </form>
          </div>

          <div>
            <h2 className="text-lg font-medium mb-1">Pensum</h2>
            <p className="text-sm text-gray-500 mb-4">
              Ein neues Pensum <strong>ersetzt das alte nicht</strong>, es
              beginnt an einem Datum. Die Geschichte bleibt stehen, damit eine
              Auswertung des Vorjahres mit dem Pensum rechnet, das damals galt.
            </p>
            <ul className="divide-y rounded-lg border bg-white mb-4">
              {pensen?.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-2 text-sm">
                  <span className="w-28 font-mono text-xs text-gray-500">
                    ab {formatDatumCH(p.ab_datum)}
                  </span>
                  <span className="flex-1 min-w-[8rem]">
                    <strong>{Number(p.pensum_prozent)} %</strong>
                    {p.arbeitstage_pro_woche
                      ? ` · ${Number(p.arbeitstage_pro_woche)} Tage/Woche`
                      : ""}
                    {p.bemerkung ? (
                      <span className="block text-xs text-gray-500">{p.bemerkung}</span>
                    ) : null}
                  </span>
                  {istAdmin && (
                    <DeleteButton
                      action={loeschePensum.bind(null, id, p.id)}
                      label="entfernen"
                      confirmText="Diesen Pensum-Eintrag entfernen? Auswertungen ab diesem Datum rechnen danach mit dem vorherigen Pensum."
                    />
                  )}
                </li>
              ))}
              {(!pensen || pensen.length === 0) && (
                <li className="px-4 py-3 text-sm text-gray-400">
                  Noch kein Pensum erfasst – ohne Eintrag gilt 100 %.
                </li>
              )}
            </ul>

            {istAdmin && (
              <form
                action={erfassePensum.bind(null, id)}
                className="flex flex-wrap items-end gap-3 rounded-lg border bg-white p-4 text-sm"
              >
                <div>
                  <label className="block text-xs text-gray-500 mb-1" htmlFor="neues_pensum">
                    Gültig ab
                  </label>
                  <DatumFeld
                    id="neues_pensum"
                    name="ab_datum"
                    required
                    className="rounded border border-gray-300 px-2 py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1" htmlFor="pensum_prozent">
                    Pensum %
                  </label>
                  <input
                    id="pensum_prozent"
                    name="pensum_prozent"
                    type="number"
                    step="0.5"
                    min="1"
                    max="100"
                    required
                    defaultValue="100"
                    className="w-24 rounded border border-gray-300 px-2 py-1.5"
                  />
                </div>
                <div>
                  <label
                    className="block text-xs text-gray-500 mb-1"
                    htmlFor="arbeitstage_pro_woche"
                  >
                    Tage/Woche
                  </label>
                  <input
                    id="arbeitstage_pro_woche"
                    name="arbeitstage_pro_woche"
                    type="number"
                    step="0.5"
                    min="1"
                    max="7"
                    placeholder={String(Number(organisation.arbeitstage_pro_woche ?? 5))}
                    title="Leer = wie die Organisation. Nur nötig, wenn jemand die Teilzeit auf wenige ganze Tage verteilt."
                    className="w-24 rounded border border-gray-300 px-2 py-1.5"
                  />
                </div>
                <div className="flex-1 min-w-[10rem]">
                  <label className="block text-xs text-gray-500 mb-1" htmlFor="pensum_bemerkung">
                    Bemerkung
                  </label>
                  <input
                    id="pensum_bemerkung"
                    name="bemerkung"
                    placeholder="z.B. Reduktion auf eigenen Wunsch"
                    className="w-full rounded border border-gray-300 px-2 py-1.5"
                  />
                </div>
                <button
                  type="submit"
                  className="rounded bg-arcos-steel px-4 py-2 text-sm font-medium text-white hover:bg-arcos-navy"
                >
                  Hinzufügen
                </button>
              </form>
            )}
          </div>

          <div>
            <h2 className="text-lg font-medium mb-1">Ferienanspruch</h2>
            <p className="text-sm text-gray-500 mb-4">
              Je Jahr in Tagen – 20, 25, fünf Wochen für Lernende. Der Übertrag
              ist das, was aus dem Vorjahr stehen geblieben ist.
            </p>
            <ul className="divide-y rounded-lg border bg-white mb-4">
              {ansprueche?.map((a) => (
                <li key={a.jahr} className="flex flex-wrap items-center gap-3 px-4 py-2 text-sm">
                  <span className="w-16 font-mono text-xs text-gray-500">{a.jahr}</span>
                  <span className="flex-1 min-w-[8rem]">
                    <strong>{Number(a.tage)} Tage</strong>
                    {Number(a.uebertrag_tage) !== 0
                      ? ` · Übertrag ${Number(a.uebertrag_tage)} Tage`
                      : ""}
                    {a.bemerkung ? (
                      <span className="block text-xs text-gray-500">{a.bemerkung}</span>
                    ) : null}
                  </span>
                </li>
              ))}
              {(!ansprueche || ansprueche.length === 0) && (
                <li className="px-4 py-3 text-sm text-gray-400">
                  Noch kein Anspruch erfasst.
                </li>
              )}
            </ul>

            {istAdmin && (
              <form
                action={speichereFerienanspruch.bind(null, id)}
                className="flex flex-wrap items-end gap-3 rounded-lg border bg-white p-4 text-sm"
              >
                <div>
                  <label className="block text-xs text-gray-500 mb-1" htmlFor="neuer_anspruch">
                    Jahr
                  </label>
                  <input
                    id="neuer_anspruch"
                    name="jahr"
                    type="number"
                    required
                    defaultValue={new Date().getFullYear()}
                    className="w-24 rounded border border-gray-300 px-2 py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1" htmlFor="anspruch_tage">
                    Tage
                  </label>
                  <input
                    id="anspruch_tage"
                    name="tage"
                    type="number"
                    step="0.5"
                    min="0"
                    required
                    defaultValue="25"
                    className="w-24 rounded border border-gray-300 px-2 py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1" htmlFor="uebertrag_tage">
                    Übertrag
                  </label>
                  <input
                    id="uebertrag_tage"
                    name="uebertrag_tage"
                    type="number"
                    step="0.5"
                    defaultValue="0"
                    className="w-24 rounded border border-gray-300 px-2 py-1.5"
                  />
                </div>
                <div className="flex-1 min-w-[10rem]">
                  <label className="block text-xs text-gray-500 mb-1" htmlFor="anspruch_bemerkung">
                    Bemerkung
                  </label>
                  <input
                    id="anspruch_bemerkung"
                    name="bemerkung"
                    className="w-full rounded border border-gray-300 px-2 py-1.5"
                  />
                </div>
                <button
                  type="submit"
                  className="rounded bg-arcos-steel px-4 py-2 text-sm font-medium text-white hover:bg-arcos-navy"
                >
                  Speichern
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {istAdmin && (
        <div className="max-w-2xl">
          <h2 className="text-lg font-medium mb-1">Abwesenheiten</h2>
          <p className="text-sm text-gray-500 mb-4">
            Ferien, Krankheit und Ähnliches. Die Disposition schlägt an diesen
            Tagen keine Einsätze für diese Person vor. Erfasst wird vom Büro –
            deshalb ist dieser Block nur für Admins sichtbar.
          </p>

          {error && (
            <div className="rounded bg-red-50 text-red-700 text-sm px-3 py-2 mb-4">{error}</div>
          )}

          <ul className="bg-white rounded-lg border divide-y mb-4">
            {abwesenheiten?.length === 0 && (
              <li className="px-4 py-3 text-sm text-gray-400">
                Keine kommenden Abwesenheiten erfasst.
              </li>
            )}
            {abwesenheiten?.map((a) => {
              const art = arten?.find((x) => x.wert === a.art);
              return (
                <li key={a.id} className="flex items-center justify-between px-4 py-2 text-sm">
                  <span className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${art?.farbe ?? "bg-gray-300"}`} />
                    <span>
                      <strong>{art?.bezeichnung ?? a.art}</strong>
                      <span className="text-gray-500">
                        {" "}
                        · {formatDatumCH(a.von)}
                        {a.bis !== a.von ? ` bis ${formatDatumCH(a.bis)}` : ""}
                        {a.von_zeit ? ` (${String(a.von_zeit).slice(0, 5)}–${String(a.bis_zeit ?? "").slice(0, 5) || "?"})` : ""}
                      </span>
                      {a.bemerkung && (
                        <span className="block text-xs text-gray-400">{a.bemerkung}</span>
                      )}
                    </span>
                  </span>
                  <form action={loescheAbwesenheit.bind(null, id, a.id)}>
                    <button type="submit" className="text-xs text-gray-400 hover:text-red-600">
                      entfernen
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>

          <form
            action={erfasseAbwesenheit.bind(null, id)}
            className="bg-white rounded-lg border p-4 flex flex-wrap items-end gap-3 text-sm"
          >
            <div>
              <label className="block text-xs text-gray-500 mb-1">Von</label>
              <DatumFeld
                id="neue_abwesenheit"
                name="von"
                required
                className="rounded border border-gray-300 px-2 py-1.5"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Bis (optional)</label>
              <OptionalesDatumFeld name="bis" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Art</label>
              <select name="art" required className="rounded border border-gray-300 px-2 py-1.5">
                {arten?.map((a) => (
                  <option key={a.wert} value={a.wert}>
                    {a.bezeichnung}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Halbtags von</label>
              <div className="w-24">
                <ZeitFeld id="abw_von_zeit" name="von_zeit" startwert="" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">bis</label>
              <div className="w-24">
                <ZeitFeld id="abw_bis_zeit" name="bis_zeit" startwert="" />
              </div>
            </div>
            <input
              name="bemerkung"
              placeholder="Bemerkung (optional)"
              className="flex-1 min-w-[8rem] rounded border border-gray-300 px-2 py-1.5"
            />
            <button
              type="submit"
              className="rounded bg-arcos-steel text-white text-sm font-medium px-4 py-2 hover:bg-arcos-navy"
            >
              Erfassen
            </button>
          </form>
          <p className="text-xs text-gray-400 mt-2">
            Enddatum leer lassen für einen einzelnen Tag. Die Uhrzeiten nur
            ausfüllen, wenn es ein halber Tag ist – sonst gilt ganztägig.
          </p>
        </div>
      )}

      <div className="max-w-2xl">
        <h2 className="text-lg font-medium mb-1">Dokumente</h2>
        <p className="text-sm text-gray-500 mb-4">
          Nur für Admin und diese Person sichtbar (z.B. Vertrag, Ausweiskopie).
        </p>
        <DokumenteBereich
          bereich="mitarbeitende"
          bezugId={id}
          initialDokumente={dokumente}
          kategorien={kategorien}
          aktuellerUserId={profile.id}
          istAdmin={istAdmin}
        />
      </div>
    </div>
  );
}
