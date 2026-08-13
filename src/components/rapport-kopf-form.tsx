"use client";

import { useEffect, useState } from "react";
import { heuteIso } from "@/lib/date-utils";
import { ZeitFeld } from "@/components/zeit-feld";
import { freieZeitenAm } from "@/app/actions/rapporte";
import type { Rapport } from "@/lib/types";
import { DatumFeld } from "@/components/datum-feld";

type KundeOption = { id: string; name: string; vorname: string | null };
type ProjektOption = { id: string; bezeichnung: string; kunde_id: string };

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
}: {
  rapport?: Rapport;
  kunden: KundeOption[];
  projekte: ProjektOption[];
  mitarbeitende: { id: string; name: string }[];
  aktuellerUserId: string;
  action: (formData: FormData) => void;
  error?: string;
  absendeText: string;
  gesperrt?: boolean;
  // Nur sichtbar, wenn die Organisation das Zusatzmodul Disposition
  // gebucht hat (organisationen.modul_disposition).
  mitDisposition?: boolean;
  // Aus der Disposition heraus vorbelegtes Einsatzdatum.
  vorgabeDatum?: string;
}) {
  const [kundeId, setKundeId] = useState(rapport?.kunde_id ?? "");
  const [projektId, setProjektId] = useState(rapport?.projekt_id ?? "");

  // Nur Projekte des gewählten Kunden – dieselbe Regel wie im
  // Anfrage-Formular (Bug0005).
  const projekteDesKunden = kundeId ? projekte.filter((p) => p.kunde_id === kundeId) : [];

  // Planung: Zustand im Formular halten, damit ein Klick auf eine freie
  // Zeit die Felder füllen kann.
  const [geplantFuer, setGeplantFuer] = useState(rapport?.geplant_fuer ?? "");
  const [datum, setDatum] = useState(rapport?.datum ?? vorgabeDatum ?? heuteIso());
  const [planVon, setPlanVon] = useState(rapport?.geplant_von?.slice(11, 16) ?? "");
  const [planBis, setPlanBis] = useState(rapport?.geplant_bis?.slice(11, 16) ?? "");
  const [belegung, setBelegung] = useState<{
    belegt: { von: string; bis: string; titel: string }[];
    frei: { von: string; bis: string }[];
    // Gesetzt bei Schliesstag oder ganztägiger Abwesenheit – dann gibt es
    // nichts vorzuschlagen, nur etwas zu melden.
    gesperrt: string | null;
  } | null>(null);

  useEffect(() => {
    if (!mitDisposition || !geplantFuer || !datum) {
      setBelegung(null);
      return;
    }
    let verworfen = false;
    freieZeitenAm({ mitarbeiterId: geplantFuer, datum, ohneRapportId: rapport?.id ?? null })
      .then((r) => {
        if (!verworfen) setBelegung(r);
      })
      .catch(() => {
        // Nur ein Vorschlag – scheitert die Abfrage, bleibt das Formular
        // vollständig benutzbar.
        if (!verworfen) setBelegung(null);
      });
    return () => {
      verworfen = true;
    };
  }, [mitDisposition, geplantFuer, datum, rapport?.id]);

  function waehleKunde(neu: string) {
    setKundeId(neu);
    setProjektId((aktuell) => {
      const p = projekte.find((x) => x.id === aktuell);
      return p?.kunde_id === neu ? aktuell : "";
    });
  }

  return (
    <form action={action} className="space-y-5 bg-white rounded-lg border p-5 max-w-2xl">
      {error && <div className="rounded bg-red-50 text-red-700 text-sm px-3 py-2">{error}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="kunde_id">
            Kunde
          </label>
          <select
            id="kunde_id"
            name="kunde_id"
            required
            disabled={gesperrt}
            value={kundeId}
            onChange={(e) => waehleKunde(e.target.value)}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100 disabled:text-gray-500"
          >
            <option value="" disabled>
              Bitte wählen…
            </option>
            {kunden.map((k) => (
              <option key={k.id} value={k.id}>
                {k.vorname ? `${k.vorname} ` : ""}
                {k.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="projekt_id">
            Projekt
          </label>
          <select
            id="projekt_id"
            name="projekt_id"
            disabled={gesperrt}
            value={projektId}
            onChange={(e) => setProjektId(e.target.value)}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100 disabled:text-gray-500"
          >
            <option value="">Kein Projekt</option>
            {projekteDesKunden.map((p) => (
              <option key={p.id} value={p.id}>
                {p.bezeichnung}
              </option>
            ))}
          </select>
          {!kundeId && (
            <p className="text-xs text-gray-400 mt-1">Bitte zuerst den Kunden wählen.</p>
          )}
          {kundeId && projekteDesKunden.length === 0 && (
            <p className="text-xs text-gray-400 mt-1">
              Für diesen Kunden ist noch kein Projekt erfasst.
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
            defaultValue={rapport?.mitarbeiter_id ?? aktuellerUserId}
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
              <label className="block text-xs text-gray-500 mb-1" htmlFor="geplant_fuer">
                Eingeplant für
              </label>
              <select
                id="geplant_fuer"
                name="geplant_fuer"
                disabled={gesperrt}
                value={geplantFuer}
                onChange={(e) => setGeplantFuer(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100 disabled:text-gray-500"
              >
                <option value="">Noch niemand</option>
                {mitarbeitende.map((m) => (
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
        <button
          type="submit"
          className="rounded bg-arcos-steel text-white text-sm font-medium px-4 py-2 hover:bg-arcos-navy"
        >
          {absendeText}
        </button>
      )}
    </form>
  );
}
