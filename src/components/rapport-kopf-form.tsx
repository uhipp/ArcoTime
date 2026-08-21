"use client";

import { useActionState, useEffect, useState } from "react";
import type { FormularErgebnis } from "@/lib/formular-ergebnis";
import { heuteIso } from "@/lib/date-utils";
import { ZeitFeld } from "@/components/zeit-feld";
import { freieZeitenAm } from "@/app/actions/rapporte";
import type { Rapport } from "@/lib/types";
import { DatumFeld } from "@/components/datum-feld";
import { AbsendeKnopf } from "@/components/absende-knopf";
import { STAND_FELD } from "@/lib/konflikt";
import { useProjektSchnellErstellen } from "@/components/projekt-schnell-erstellen";
import { useKundeSchnellErstellen } from "@/components/kunde-schnell-erstellen";

type KundeOption = { id: string; name: string; vorname: string | null };
type ProjektOption = {
  id: string;
  bezeichnung: string;
  kunde_id: string;
  projektleiter_id?: string | null;
};

// Kopfdaten eines Rapports. Datum und ausführende Person gelten für den
// ganzen Einsatz und werden deshalb hier gesetzt, nicht je Position.
export function RapportKopfForm({
  rapport,
  kunden,
  projekte,
  mitarbeitende,
  aktuellerUserId,
  action,
  error,
  absendeText,
  gesperrt,
  mitDisposition,
  vorgabeDatum,
  beteiligte = [],
}: {
  rapport?: Rapport;
  kunden: KundeOption[];
  projekte: ProjektOption[];
  mitarbeitende: { id: string; name: string }[];
  aktuellerUserId: string;
  action: (bisher: FormularErgebnis, formData: FormData) => Promise<FormularErgebnis>;
  error?: string;
  absendeText: string;
  gesperrt?: boolean;
  // Nur sichtbar, wenn die Organisation das Zusatzmodul Disposition
  // gebucht hat (organisationen.modul_disposition).
  mitDisposition?: boolean;
  // Aus der Disposition heraus vorbelegtes Einsatzdatum.
  vorgabeDatum?: string;
  // Beteiligte des Einsatzes (0045) – für den Tagesplan unter Planung.
  beteiligte?: { id: string; name: string }[];
}) {
  // Fehler kommt aus der Aktion zurück statt per Weiterleitung – so bleibt
  // die Eingabe stehen (siehe lib/formular-ergebnis).
  const [ergebnis, formAction] = useActionState(action, null);
  const meldung = ergebnis?.fehler ?? error;
  // Der Kunde ist hier nur ein FILTER für die Projektauswahl, kein Feld des
  // Rapports: Seit 0071 steht er am Projekt (Migration und
  // docs/plan-parteien-standorte.md). Beim Bearbeiten wird er deshalb aus
  // dem gewählten Projekt abgeleitet und nicht gespeichert.
  const [kundeId, setKundeId] = useState(
    projekte.find((p) => p.id === (rapport?.projekt_id ?? ""))?.kunde_id ?? ""
  );
  const [projektId, setProjektId] = useState(rapport?.projekt_id ?? "");

  // Verantwortliche Person: gespeicherter Wert, sonst die Projektleitung
  // des gewählten Projekts, sonst man selbst. Nur bei einem NEUEN Rapport
  // nachgeführt – an einem bestehenden hat jemand bewusst gewählt, und
  // ein Projektwechsel darf diese Wahl nicht stillschweigend überschreiben.
  const [mitarbeiterId, setMitarbeiterId] = useState(
    rapport?.mitarbeiter_id ??
      projekte.find((p) => p.id === (rapport?.projekt_id ?? ""))?.projektleiter_id ??
      aktuellerUserId
  );

  // Kunden- und Projektliste liegen im Zustand, damit ein im Fenster neu
  // angelegter Eintrag sofort in der Auswahl steht, ohne die Seite neu zu
  // laden.
  const [kundenListe, setKundenListe] = useState(kunden);
  const [projekteListe, setProjekteListe] = useState(projekte);

  function merkeKunde(kunde: { id: string; name: string; vorname: string | null }) {
    setKundenListe((liste) =>
      liste.some((k) => k.id === kunde.id)
        ? liste
        : [...liste, kunde].sort((a, b) => a.name.localeCompare(b.name, "de-CH"))
    );
  }

  const kundeHook = useKundeSchnellErstellen((kunde) => {
    merkeKunde(kunde);
    // Wie bei der Auswahl von Hand: Ein Projektwechsel gehört dazu, das
    // bisherige Projekt gehört einem anderen Kunden.
    waehleKunde(kunde.id);
  });

  const projektHook = useProjektSchnellErstellen({
    kunden: kundenListe,
    // Ein im Projektfenster angelegter Kunde muss auch oben zur Auswahl
    // stehen – sonst zeigt das Kundenfeld einen Wert ohne Eintrag.
    onKundeErstellt: merkeKunde,
    // Beim Öffnen liest der Hook diesen Wert neu (siehe oeffnen() dort), der
    // im Rapport gewählte Kunde ist also vorbelegt.
    vorausgewaehlterKunde: kundeId,
    onErstellt: (projekt) => {
      setProjekteListe((liste) =>
        // Der Hook liefert auch ein BESTEHENDES Projekt zurück, wenn man im
        // Fenster "bestehendes verwenden" wählt – dann nicht doppelt eintragen.
        liste.some((p) => p.id === projekt.id)
          ? liste
          : [
              ...liste,
              {
                id: projekt.id,
                bezeichnung: projekt.bezeichnung,
                kunde_id: projekt.kunde_id,
              },
            ].sort((a, b) => a.bezeichnung.localeCompare(b.bezeichnung, "de-CH"))
      );
      // Das Projekt bringt seinen Kunden mit: Wurde er im Fenster gleich mit
      // angelegt, springt der Filter oben mit.
      setKundeId(projekt.kunde_id);
      setProjektId(projekt.id);
    },
  });

  // Nur Projekte des gewählten Kunden – dieselbe Regel wie im
  // Anfrage-Formular (Bug0005).
  const projekteDesKunden = kundeId ? projekteListe.filter((p) => p.kunde_id === kundeId) : [];

  // Ein gewähltes Projekt, das der Filter nicht enthält, muss trotzdem als
  // Option da sein – sonst steht im Auswahlfeld ein Wert, den es nicht gibt,
  // und die Auswahl sieht leer aus. Fall: Der Kunde wurde im Projektfenster
  // gleich mit angelegt und steht in der Kundenliste dieser Seite noch nicht.
  const projektOptionen =
    projektId && !projekteDesKunden.some((x) => x.id === projektId)
      ? [...projekteDesKunden, ...projekteListe.filter((x) => x.id === projektId)]
      : projekteDesKunden;

  // Planung: Zustand im Formular halten, damit ein Klick auf eine freie
  // Zeit die Felder füllen kann.
  //
  // Wessen Tag hier gezeigt wird, stand bis 0045 in rapport.geplant_fuer.
  // Seit die Beteiligten in einer eigenen Tabelle stehen, wird die Spalte
  // nicht mehr geschrieben – das Auswahlfeld war deshalb an einem
  // bestehenden Rapport immer leer, und mit ihm blieb der ganze Tagesplan
  // unsichtbar. Neu kommen die Namen aus den Beteiligten, und die
  // Auswahl ist reine Ansicht: Sie wird nicht mitgeschickt.
  const [planPerson, setPlanPerson] = useState("");
  const [datum, setDatum] = useState(rapport?.datum ?? vorgabeDatum ?? heuteIso());
  const [planVon, setPlanVon] = useState(rapport?.geplant_von?.slice(11, 16) ?? "");
  const [planBis, setPlanBis] = useState(rapport?.geplant_bis?.slice(11, 16) ?? "");
  const [belegungRoh, setBelegungRoh] = useState<{
    belegt: { von: string; bis: string; titel: string }[];
    frei: { von: string; bis: string }[];
    // Gesetzt bei Schliesstag oder ganztägiger Abwesenheit – dann gibt es
    // nichts vorzuschlagen, nur etwas zu melden.
    gesperrt: string | null;
  } | null>(null);

  // Ob die Belegung überhaupt gilt, wird beim Rendern abgeleitet statt im
  // Effect zurückgesetzt: Damit kann kein veralteter Tagesplan der zuvor
  // gewählten Person kurz stehen bleiben.
  // Zur Auswahl stehen die verantwortliche Person und die übrigen
  // Beteiligten – an einem neuen Rapport gibt es noch keine Beteiligten,
  // und dann ist sie die einzige sinnvolle Antwort.
  const verantwortlichName =
    mitarbeitende.find((m) => m.id === mitarbeiterId)?.name ?? "Verantwortliche Person";
  const weitereBeteiligte = beteiligte.filter((b) => b.id !== mitarbeiterId);
  // Leere Wahl heisst "der verantwortlichen Person folgen": Wer oben die
  // Person wechselt, sieht sofort deren Tag, ohne zweimal zu klicken.
  const planPersonWirksam = planPerson || mitarbeiterId;
  const belegungRelevant = Boolean(mitDisposition && planPersonWirksam && datum);
  const belegung = belegungRelevant ? belegungRoh : null;

  useEffect(() => {
    if (!belegungRelevant) return;
    let verworfen = false;
    freieZeitenAm({ mitarbeiterId: planPersonWirksam, datum, ohneRapportId: rapport?.id ?? null })
      .then((r) => {
        if (!verworfen) setBelegungRoh(r);
      })
      .catch(() => {
        // Nur ein Vorschlag – scheitert die Abfrage, bleibt das Formular
        // vollständig benutzbar.
        if (!verworfen) setBelegungRoh(null);
      });
    return () => {
      verworfen = true;
    };
  }, [belegungRelevant, planPersonWirksam, datum, rapport?.id]);

  function waehleKunde(neu: string) {
    setKundeId(neu);
    setProjektId((aktuell) => {
      const p = projekteListe.find((x) => x.id === aktuell);
      return p?.kunde_id === neu ? aktuell : "";
    });
  }

  return (
    <>
      <form action={formAction} className="space-y-5 bg-white rounded-lg border p-5 max-w-2xl">
        {/* Stand beim Öffnen. Beim Speichern wird geprüft, ob der
            Datensatz seither unverändert ist – siehe lib/konflikt. */}
        {rapport?.updated_at && (
          <input type="hidden" name={STAND_FELD} value={String(rapport.updated_at)} />
        )}
        {meldung && (
          <div className="rounded bg-red-50 text-red-700 text-sm px-3 py-2">{meldung}</div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium" htmlFor="kunde_filter">
                Kunde
              </label>
              {!gesperrt && kundeHook.trigger}
            </div>
            <select
              id="kunde_filter"
              // Kein Feld des Rapports: Der Kunde kommt über das Projekt (0071).
              // Der Name sagt das, damit niemand ihn in der Aktion sucht.
              name="kunde_filter"
              required
              disabled={gesperrt}
              value={kundeId}
              onChange={(e) => waehleKunde(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100 disabled:text-gray-500"
            >
              <option value="" disabled>
                Bitte wählen…
              </option>
              {kundenListe.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.vorname ? `${k.vorname} ` : ""}
                  {k.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium" htmlFor="projekt_id">
                Projekt
              </label>
              {!gesperrt && projektHook.trigger}
            </div>
            <select
              id="projekt_id"
              name="projekt_id"
              required
              disabled={gesperrt}
              value={projektId}
              onChange={(e) => {
                setProjektId(e.target.value);
                // Projektleitung übernehmen, solange der Rapport neu ist.
                const leitung = projekteListe.find((p) => p.id === e.target.value)?.projektleiter_id;
                if (!rapport && leitung) setMitarbeiterId(leitung);
              }}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100 disabled:text-gray-500"
            >
              {/* Kein "Kein Projekt" mehr: Ohne Projekt lässt sich keine
                  Position erfassen und keine Standardposition anlegen – ein
                  solcher Rapport kann nichts und sieht doch aus wie einer.
                  Genau das ist im Test passiert. */}
              <option value="" disabled>
                Bitte wählen…
              </option>
              {projektOptionen.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.bezeichnung}
                </option>
              ))}
            </select>
            {!kundeId && (
              <p className="text-xs text-gray-400 mt-1">Bitte zuerst den Kunden wählen.</p>
            )}
            {kundeId && projekteDesKunden.length === 0 && (
              <p className="text-xs text-gray-500 mt-1">
                Für diesen Kunden ist noch kein Projekt erfasst – „+ Neues Projekt“
                oben legt eines an.
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="datum">
              Einsatzdatum
            </label>
            <DatumFeld
              id="datum"
              name="datum"
              required
              disabled={gesperrt}
              value={datum}
              onChange={(e) => setDatum(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100 disabled:text-gray-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="mitarbeiter_id">
              Ausgeführt von
            </label>
            <select
              id="mitarbeiter_id"
              name="mitarbeiter_id"
              disabled={gesperrt}
              value={mitarbeiterId}
              onChange={(e) => setMitarbeiterId(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100 disabled:text-gray-500"
            >
              {mitarbeitende.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        </div>


        {mitDisposition && (
          <div className="rounded border border-gray-200 bg-gray-50 p-4 space-y-4">
            <div>
              <span className="block text-sm font-medium">Planung</span>
              <span className="block text-xs text-gray-500 mt-0.5">
                Vom Büro eingeplanter Termin. Erscheint in der Disposition und
                lässt sich später mit der tatsächlich erfassten Zeit vergleichen.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1" htmlFor="plan_person">
                  Tagesplan von
                </label>
                {/* Bewusst ohne name: Wer dabei ist, steht unter
                    "Beteiligte" – dieses Feld wählt nur, wessen Tag unten
                    gezeigt wird, und wird nicht gespeichert. */}
                <select
                  id="plan_person"
                  value={planPerson}
                  onChange={(e) => setPlanPerson(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">{verantwortlichName} (verantwortlich)</option>
                  {weitereBeteiligte.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1" htmlFor="geplant_von_zeit">
                  Von
                </label>
                {/* Dieselbe Eingabe wie im Rapport: "1030", "10.30" oder
                    "10:30" werden beim Verlassen des Felds vereinheitlicht. */}
                <ZeitFeld
                  key={`von-${planVon}`}
                  id="geplant_von_zeit"
                  name="geplant_von_zeit"
                  startwert={planVon}
                  onZeit={(z) => setPlanVon(z ?? "")}
                  disabled={gesperrt}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1" htmlFor="geplant_bis_zeit">
                  Bis
                </label>
                <ZeitFeld
                  key={`bis-${planBis}`}
                  id="geplant_bis_zeit"
                  name="geplant_bis_zeit"
                  startwert={planBis}
                  onZeit={(z) => setPlanBis(z ?? "")}
                  disabled={gesperrt}
                />
              </div>
            </div>
            {belegung && !gesperrt && (
              <div className="rounded border border-gray-200 bg-white p-3 text-xs space-y-2">
                {belegung.gesperrt ? (
                  <div className="text-amber-800">
                    <strong>{belegung.gesperrt}</strong> – an diesem Tag ist keine
                    Planung vorgesehen. Von Hand eintragen bleibt möglich.
                  </div>
                ) : belegung.belegt.length > 0 ? (
                  <div>
                    <span className="text-gray-500">An diesem Tag bereits verplant: </span>
                    {belegung.belegt.map((b, i) => (
                      <span key={i} className="text-gray-700">
                        {i > 0 ? ", " : ""}
                        {b.von}–{b.bis} ({b.titel})
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-500">
                    An diesem Tag ist noch nichts eingeplant.
                  </div>
                )}

                {belegung.gesperrt ? null : belegung.frei.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-gray-500">Frei:</span>
                    {belegung.frei.map((f) => (
                      <button
                        key={`${f.von}-${f.bis}`}
                        type="button"
                        onClick={() => {
                          setPlanVon(f.von);
                          setPlanBis(f.bis);
                        }}
                        className="rounded border border-arcos-steel text-arcos-steel px-2 py-1 hover:bg-arcos-steel hover:text-white"
                      >
                        {f.von}–{f.bis}
                      </button>
                    ))}
                    <span className="text-gray-400">
                      (Klick übernimmt die Zeit, Arbeitstag 07:00–18:00)
                    </span>
                  </div>
                ) : (
                  <div className="text-amber-700">
                    Kein freies Fenster mehr an diesem Tag.
                  </div>
                )}
              </div>
            )}

            <p className="text-xs text-gray-400">
              Die Planzeiten gelten am Einsatzdatum oben. Leer lassen, wenn der
              Termin noch nicht feststeht.
            </p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="bemerkung">
            Bemerkung (erscheint auf dem Rapport)
          </label>
          <textarea
            id="bemerkung"
            name="bemerkung"
            rows={2}
            disabled={gesperrt}
            defaultValue={rapport?.bemerkung ?? ""}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100 disabled:text-gray-500"
          />
        </div>

        {!gesperrt && (
          <AbsendeKnopf
            laufttext="Wird gespeichert…"
            className="rounded bg-arcos-steel text-white text-sm font-medium px-4 py-2 hover:bg-arcos-navy disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {absendeText}
          </AbsendeKnopf>
        )}
      </form>
      {/* Ausserhalb des Formulars: Ein Formular im Formular ist in HTML nicht
          erlaubt, und das Fenster trägt selbst eines. */}
      {kundeHook.modal}
      {projektHook.modal}
    </>
  );
}
