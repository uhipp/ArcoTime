import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/get-profile";
import { ladeDokumente } from "@/lib/dokumente-laden";
import { AnfrageForm } from "@/components/anfrage-form";
import { DokumenteBereich } from "@/components/dokumente-bereich";
import { DeleteButton } from "@/components/delete-button";
import { ZurueckLinks } from "@/components/zurueck-links";
import { AbsendeKnopf } from "@/components/absende-knopf";
import { rabattLabel } from "@/lib/rabatt";
import { ohneNamenszeile } from "@/lib/mitarbeiter-praefix";
import {
  bearbeiteAnfrage,
  deleteAnfrage,
} from "@/app/actions/anfragen";
import type { Anfrage } from "@/lib/types";
import { PraesenzSperre } from "@/components/praesenz-sperre";
import { darf } from "@/lib/berechtigungen";
import { begriff, getBegriffe } from "@/lib/begriffe";

export default async function AnfrageDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const begriffe = await getBegriffe();
  const supabase = await createClient();

  const [
    profile,
    { data: anfrage },
    { data: kunden },
    { data: projekte },
    { data: mitarbeitende },
    { data: artikel },
    { data: rabattsaetze },
    { data: kanaele },
    { data: prioritaeten },
    { dokumente, kategorien },
  ] = await Promise.all([
    getCurrentProfile(),
    supabase.from("anfragen").select("*, kunden(id, name, vorname)").eq("id", id).single(),
    supabase.from("kunden").select("id, name, vorname").order("name"),
    supabase.from("projekte").select("id, bezeichnung, kunde_id").order("bezeichnung"),
    supabase.from("profiles").select("id, name").order("name"),
    supabase.from("artikel").select("id, bezeichnung, aktiv").eq("aktiv", true).order("bezeichnung"),
    supabase.from("rabattsaetze").select("id, prozent, bezeichnung, aktiv").order("sortierung"),
    supabase.from("anfrage_kanaele").select("*").order("sortierung"),
    supabase.from("anfrage_prioritaeten").select("*").order("sortierung"),
    ladeDokumente(supabase, "anfrage", id),
  ]);

  if (!anfrage) notFound();

  // Eine Aktion für alle vier Absichten des Formulars – welche gilt,
  // entscheidet der gedrückte Knopf über sein Feld "absicht".
  const formularAction = bearbeiteAnfrage.bind(null, id);
  const deleteAction = deleteAnfrage.bind(null, id);

  const bereitsVerrechnet = Boolean(anfrage.zeiteintrag_id);
  const hatRapport = Boolean(anfrage.rapport_id);

  // Eine Anfrage kann auf "erledigt" stehen, ohne dass ein Nachweis
  // existiert: entweder weil sie ohne Zeiteintrag und ohne Rapport
  // geschlossen wurde, oder weil der Rapport später gelöscht wurde. In
  // beiden Fällen muss der Weg zu einem Rapport offen bleiben – sonst
  // sitzt der Vorgang in der Sackgasse.
  const rapportMoeglich = !hatRapport;

  // Reiner Sachtext der Anfrage, ohne die Namenszeile der zugewiesenen
  // Person – Grundlage für den Vorschlag im Erledigen-Block.
  const sachtext = ohneNamenszeile(
    anfrage.beschreibung,
    (mitarbeitende ?? []).map((m) => m.name)
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{begriff(begriffe, "anfrage")} bearbeiten</h1>
          <ZurueckLinks links={[{ href: "/anfragen", text: "Zur Übersicht" }]} />
        </div>
        {darf(profile, "anfragen.loeschen") && (
          <DeleteButton action={deleteAction} label="Anfrage löschen" />
        )}
      </div>

      {anfrage.status === "erledigt" && (
        <div className="rounded bg-green-50 text-green-800 text-sm px-3 py-2">
          Erledigt am{" "}
          {anfrage.erledigt_am ? new Date(anfrage.erledigt_am).toLocaleString("de-CH") : "–"}
          {bereitsVerrechnet && " · verrechnet"}
        </div>
      )}

      <PraesenzSperre bereich="anfrage" bezugId={id}>
        <AnfrageForm
          anfrage={anfrage as Anfrage}
          kunden={kunden ?? []}
          projekte={projekte ?? []}
          mitarbeitende={mitarbeitende ?? []}
          kanaele={kanaele ?? []}
          prioritaeten={prioritaeten ?? []}
          action={formularAction}
          error={error}
        >
          {!bereitsVerrechnet && (
            <div className="border-t pt-5">
              <h2 className="text-lg font-medium mb-1">
                {anfrage.status === "erledigt" ? "Nachträglich verrechnen" : "Anfrage erledigen"}
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                Drei Wege, eine Anfrage abzuschliessen – Änderungen oben werden
                bei allen dreien mitgespeichert. Der Zeiteintrag unten ist der
                übliche Weg; nicht verrechenbare Arbeit bitte über das interne
                Projekt mit Rabatt 100% erfassen.
              </p>
              <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Projekt</label>
                  <select
                    name="zeit_projekt_id"
                    defaultValue={anfrage.projekt_id ?? ""}
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="">Bitte wählen…</option>
                    {projekte
                      ?.filter((p) => p.kunde_id === anfrage.kunde_id)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.bezeichnung}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Artikel</label>
                  <select
                    name="zeit_artikel_id"
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="">Bitte wählen…</option>
                    {artikel?.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.bezeichnung}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Dauer (Minuten)</label>
                  <input
                    name="zeit_dauer_minuten"
                    type="number"
                    min={1}
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Mitarbeitende</label>
                  <select
                    name="zeit_mitarbeiter_id"
                    defaultValue={anfrage.zugewiesen_an ?? ""}
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="">Ich</option>
                    {mitarbeitende?.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Rabatt</label>
                  <select
                    name="zeit_rabatt_prozent"
                    defaultValue={0}
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  >
                    {rabattsaetze?.map((r) => (
                      <option key={r.id} value={r.prozent}>
                        {r.bezeichnung ?? rabattLabel(r.prozent)}
                        {!r.aktiv ? " (inaktiv)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Beschreibung des Zeiteintrags
                  </label>
                  {/* Ohne die führende Namenszeile zusammengesetzt – sonst
                      stünde der Name mitten in Zeile 1 ("Titel – Peter Huber").
                      Den Namen setzt erledigeAnfrage() serverseitig wieder als
                      eigene erste Zeile davor, passend zur tatsächlich
                      ausgewählten Person. */}
                  <textarea
                    name="zeit_beschreibung"
                    rows={2}
                    defaultValue={`${anfrage.titel}${sachtext ? " – " + sachtext : ""}`}
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Der Name der ausführenden Person wird beim Speichern
                    automatisch als erste Zeile ergänzt.
                  </p>
                </div>
                {rapportMoeglich && dokumente.length > 0 && (
                  <div className="rounded border bg-gray-50 px-3 py-3">
                    <p className="text-xs font-medium text-gray-600 mb-2">
                      Dokumente in den Rapport übernehmen
                    </p>
                    <div className="space-y-1">
                      {dokumente.map((d) => (
                        <label key={d.id} className="flex items-start gap-2 text-sm">
                          <input
                            type="checkbox"
                            name="uebernehmen_dokument"
                            value={d.id}
                            className="mt-1"
                          />
                          <span>
                            {d.dateiname}
                            {d.dokument_kategorien?.bezeichnung && (
                              <span className="text-gray-400">
                                {" "}
                                · {d.dokument_kategorien.bezeichnung}
                              </span>
                            )}
                          </span>
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      Gilt nur für „Erledigen mit Rapport“. Die Dokumente werden
                      kopiert – die Originale bleiben bei der Anfrage.
                    </p>
                  </div>
                )}
  
                <div className="flex flex-wrap items-center gap-3">
                  <AbsendeKnopf
                    name="absicht"
                    value="zeiteintrag"
                    laufttext="Wird erledigt…"
                    className="rounded bg-arcos-steel text-white text-sm font-medium px-4 py-2 hover:bg-arcos-navy disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {anfrage.status === "erledigt"
                      ? "Verrechnen"
                      : "Erledigen mit Zeiteintrag"}
                  </AbsendeKnopf>
  
                  {rapportMoeglich && (
                    <>
                      {/* Zweiter und dritter Weg. Die Felder des
                          Zeiteintrags-Blocks tragen kein required, die beiden
                          Knöpfe brauchen deshalb kein formNoValidate – und
                          dürfen es auch nicht haben, sonst fiele die Prüfung
                          von Kunde und Titel der Anfrage gleich mit weg. */}
                      <AbsendeKnopf
                        name="absicht"
                        value="rapport"
                        laufttext="Rapport wird angelegt…"
                        className="rounded border border-arcos-steel text-arcos-steel text-sm font-medium px-4 py-2 hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {anfrage.status === "erledigt"
                          ? "Rapport erstellen"
                          : "Erledigen mit Rapport"}
                      </AbsendeKnopf>
                      {anfrage.status !== "erledigt" && (
                        <AbsendeKnopf
                          name="absicht"
                          value="ohne_nachweis"
                          laufttext="Wird erledigt…"
                          className="rounded border text-sm font-medium px-4 py-2 hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          Nur als erledigt markieren
                        </AbsendeKnopf>
                      )}
                    </>
                  )}
                </div>
                <p className="text-xs text-gray-400">
                  <strong>Mit Rapport</strong> legt einen Rapport-Entwurf für
                  diesen Kunden an und übernimmt Titel und Beschreibung als
                  Bemerkung – die Positionen erfasst du danach im Rapport.
                  <strong> Nur als erledigt markieren</strong> schliesst die
                  Anfrage ohne Zeiteintrag und ohne Rapport, etwa bei einer
                  blossen Rückfrage.
                </p>
              </div>
            </div>
          )}
        </AnfrageForm>
      </PraesenzSperre>

      {(bereitsVerrechnet || anfrage.rapport_id) && (
        <p className="text-sm text-gray-500 flex flex-wrap gap-4">
          {bereitsVerrechnet && (
            <Link
              href={`/zeiterfassung/${anfrage.zeiteintrag_id}`}
              className="text-arcos-steel hover:underline"
            >
              Zugehörigen Zeiteintrag ansehen
            </Link>
          )}
          {anfrage.rapport_id && (
            <Link
              href={`/rapporte/${anfrage.rapport_id}`}
              className="text-arcos-steel hover:underline"
            >
              Zugehörigen Rapport ansehen
            </Link>
          )}
        </p>
      )}

      <div className="max-w-2xl">
        <h2 className="text-lg font-medium mb-4">Dokumente</h2>
        <DokumenteBereich
          bereich="anfrage"
          bezugId={id}
          initialDokumente={dokumente}
          kategorien={kategorien}
          aktuellerUserId={profile?.id ?? ""}
          istAdmin={darf(profile, "dokumente.loeschen")}
        />
      </div>
    </div>
  );
}
