"use client";

import { useEffect, useRef, useState } from "react";
import { heuteIso } from "@/lib/date-utils";
import { rabattLabel } from "@/lib/rabatt";
import { useProjektSchnellErstellen } from "@/components/projekt-schnell-erstellen";
import type { Dienstleistung, Kunde, Projekt, Zeiteintrag } from "@/lib/types";

type Rabattsatz = { id: string; prozent: number; bezeichnung: string | null; aktiv: boolean };
type KundeOption = Pick<Kunde, "id" | "name" | "vorname">;
type ProjektOption = Pick<Projekt, "id" | "bezeichnung" | "status" | "kunde_id"> & {
  kunden?: {
    name: string;
    vorname: string | null;
    // Vorbelegung des Rabatts, siehe kunden.standard_rabatt_prozent.
    standard_rabatt_prozent?: number | null;
  } | null;
};
type DienstleistungOption = Pick<
  Dienstleistung,
  | "id"
  | "bezeichnung"
  | "aktiv"
  | "einheit"
  | "zaehlt_als_arbeitszeit"
  | "rabatt_erlaubt"
  | "klasse_id"
>;

// Rabatt eines Kunden auf eine ganze Dienstleistungsklasse.
type KlassenRabatt = { kunde_id: string; klasse_id: string; rabatt_prozent: number };

function minutenZwischen(start: string, ende: string): number | null {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = ende.split(":").map(Number);
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return null;
  // Bewusst auch 0/negativ zurückgeben (statt null), damit das Dauer-Feld
  // den tatsächlichen Von/Bis-Wert transparent zeigt, statt auf einem alten
  // Stand stehen zu bleiben, wenn z.B. Von = Bis eingegeben wird.
  return Math.max(0, eh * 60 + em - (sh * 60 + sm));
}

function formatDauer(minuten: number) {
  const h = Math.floor(minuten / 60);
  const m = minuten % 60;
  return `${h}h ${String(m).padStart(2, "0")}min`;
}

function formatUhrzeit(iso: string) {
  return new Date(iso).toLocaleTimeString("de-CH", { hour: "2-digit", minute: "2-digit" });
}

// Live-Anzeige der bereits verstrichenen Zeit seit einem echten,
// server-seitig gespeicherten Zeitpunkt – funktioniert auch nach einem
// Neuladen der Seite korrekt, weil sie sich nicht auf lokalen React-State
// verlässt, sondern auf den tatsächlichen Startzeitpunkt.
function LaufendeZeit({ seit }: { seit: string }) {
  const [sekunden, setSekunden] = useState(() =>
    Math.max(0, Math.floor((Date.now() - new Date(seit).getTime()) / 1000))
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setSekunden(Math.max(0, Math.floor((Date.now() - new Date(seit).getTime()) / 1000)));
    }, 1000);
    return () => clearInterval(interval);
  }, [seit]);

  const h = Math.floor(sekunden / 3600);
  const m = Math.floor((sekunden % 3600) / 60);
  const s = sekunden % 60;

  return (
    <span className="font-mono text-lg font-semibold text-red-700">
      {String(h).padStart(2, "0")}:{String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
    </span>
  );
}

export function ZeiterfassungForm({
  zeiteintrag,
  projekte,
  dienstleistungen,
  mitarbeitende,
  kunden,
  rabattsaetze,
  klassenRabatte,
  aktuellerUserId,
  action,
  starteTimerAction,
  stoppeTimerAction,
  error,
}: {
  zeiteintrag?: Zeiteintrag;
  projekte: ProjektOption[];
  dienstleistungen: DienstleistungOption[];
  mitarbeitende: { id: string; name: string }[];
  kunden: KundeOption[];
  rabattsaetze: Rabattsatz[];
  klassenRabatte: KlassenRabatt[];
  aktuellerUserId: string;
  action: (formData: FormData) => void;
  starteTimerAction?: (formData: FormData) => void;
  stoppeTimerAction?: (formData: FormData) => void;
  error?: string;
}) {
  const istNeu = !zeiteintrag;
  const laeuft = Boolean(zeiteintrag?.timer_gestartet_um);

  const [projekteListe, setProjekteListe] = useState(projekte);
  const [projektId, setProjektId] = useState(zeiteintrag?.projekt_id ?? "");

  const projektHook = useProjektSchnellErstellen({
    kunden,
    onErstellt: (projekt) => {
      const kunde = kunden.find((k) => k.id === projekt.kunde_id);
      setProjekteListe((liste) =>
        [
          ...liste,
          {
            id: projekt.id,
            bezeichnung: projekt.bezeichnung,
            status: "aktiv" as const,
            kunde_id: projekt.kunde_id,
            kunden: kunde ? { name: kunde.name, vorname: kunde.vorname } : null,
          },
        ].sort((a, b) => a.bezeichnung.localeCompare(b.bezeichnung, "de-CH"))
      );
      setProjektId(projekt.id);
    },
  });

  const [startZeit, setStartZeit] = useState(zeiteintrag?.start_zeit?.slice(0, 5) ?? "");
  const [endZeit, setEndZeit] = useState(zeiteintrag?.end_zeit?.slice(0, 5) ?? "");
  const [dauer, setDauer] = useState(zeiteintrag?.dauer_minuten ?? 0);
  const [menge, setMenge] = useState(zeiteintrag?.menge ?? 0);

  const [dienstleistungId, setDienstleistungId] = useState(
    zeiteintrag?.dienstleistung_id ?? ""
  );
  const gewaehlteDienstleistung = dienstleistungen.find((d) => d.id === dienstleistungId);

  // Mengenartikel (km, Spesen, Kleinmaterial) werden über eine Stückzahl
  // erfasst statt über Von/Bis – ein Kilometer hat keine Dauer. Solange
  // nichts gewählt ist, bleibt die Zeitmaske sichtbar (häufigster Fall).
  const istMengenartikel =
    gewaehlteDienstleistung != null && !gewaehlteDienstleistung.zaehlt_als_arbeitszeit;
  const einheit = gewaehlteDienstleistung?.einheit ?? "Stück";

  // Bei gesperrten Artikeln bleibt nur "kein Rabatt" oder "100% = nicht
  // verrechnet" – Teilrabatte auf z.B. Reisespesen sind nicht erwünscht.
  const rabattGesperrt =
    gewaehlteDienstleistung != null && !gewaehlteDienstleistung.rabatt_erlaubt;
  const waehlbareRabatte = rabattGesperrt
    ? rabattsaetze.filter((r) => Number(r.prozent) === 0 || Number(r.prozent) === 100)
    : rabattsaetze;

  const [rabatt, setRabatt] = useState(String(zeiteintrag?.rabatt_prozent ?? 0));

  // Vorgeschlagener Rabatt aus den Stammdaten. Reihenfolge:
  //   1. Dienstleistung erlaubt keinen Teilrabatt -> 0
  //   2. Rabatt des Kunden auf die Klasse der Dienstleistung (spezifischer)
  //   3. Standardrabatt des Kunden
  // Nur ein Vorschlag: Gespeichert wird der Wert am Eintrag, damit spätere
  // Stammdatenänderungen bestehende Einträge nicht verändern.
  function vorschlagFuer(projektIdNeu: string, dienstleistungIdNeu: string): string | null {
    const projekt = projekteListe.find((p) => p.id === projektIdNeu);
    const dienstleistung = dienstleistungen.find((d) => d.id === dienstleistungIdNeu);
    if (!projekt) return null;

    if (dienstleistung && !dienstleistung.rabatt_erlaubt) return "0";

    const kundeId = projekt.kunde_id;
    if (kundeId && dienstleistung?.klasse_id) {
      const klassenRabatt = klassenRabatte.find(
        (r) => r.kunde_id === kundeId && r.klasse_id === dienstleistung.klasse_id
      );
      if (klassenRabatt) return String(Number(klassenRabatt.rabatt_prozent));
    }

    const standard = projekt.kunden?.standard_rabatt_prozent;
    return standard != null ? String(Number(standard)) : null;
  }

  function onProjektChange(neueProjektId: string) {
    setProjektId(neueProjektId);
    if (!istNeu) return;
    const vorschlag = vorschlagFuer(neueProjektId, dienstleistungId);
    if (vorschlag != null) setRabatt(vorschlag);
  }

  function onDienstleistungChange(neueId: string) {
    setDienstleistungId(neueId);

    if (istNeu) {
      const vorschlag = vorschlagFuer(projektId, neueId);
      if (vorschlag != null) {
        setRabatt(vorschlag);
        return;
      }
    }

    // Auch beim Bearbeiten: Wechsel auf einen gesperrten Artikel darf keinen
    // unzulässigen Teilrabatt stehen lassen – die Option verschwindet aus
    // der Auswahl und würde sonst unsichtbar mitgeschickt.
    const dl = dienstleistungen.find((d) => d.id === neueId);
    if (dl && !dl.rabatt_erlaubt) {
      const aktuell = Number(rabatt);
      if (aktuell !== 0 && aktuell !== 100) setRabatt("0");
    }
  }

  const [mitarbeiterId, setMitarbeiterId] = useState(
    zeiteintrag?.mitarbeiter_id ?? aktuellerUserId
  );
  const [beschreibung, setBeschreibung] = useState(zeiteintrag?.beschreibung ?? "");
  const beschreibungRef = useRef<HTMLTextAreaElement | null>(null);

  const nameFuer = (id: string) => mitarbeitende.find((m) => m.id === id)?.name ?? "";

  function onMitarbeiterChange(neueId: string) {
    const alterName = nameFuer(mitarbeiterId);
    const neuerName = nameFuer(neueId);
    setMitarbeiterId(neueId);

    setBeschreibung((aktuell) => {
      const zeilen = aktuell.split("\n");
      if (aktuell === "") return `${neuerName}\n`;
      if (zeilen[0] === alterName) {
        zeilen[0] = neuerName;
        return zeilen.join("\n");
      }
      return aktuell;
    });
  }

  function onBeschreibungFocus() {
    if (beschreibung !== "") return;
    const name = nameFuer(mitarbeiterId);
    const neu = `${name}\n`;
    setBeschreibung(neu);
    requestAnimationFrame(() => {
      const el = beschreibungRef.current;
      if (el) {
        el.selectionStart = el.selectionEnd = neu.length;
      }
    });
  }

  function onZeitChange(neueStart: string, neueEnde: string) {
    setStartZeit(neueStart);
    setEndZeit(neueEnde);
    if (neueStart && neueEnde) {
      const m = minutenZwischen(neueStart, neueEnde);
      if (m !== null) setDauer(m);
    }
  }

  return (
    <>
    <form action={action} className="space-y-5 bg-white rounded-lg border p-5">
      {error && (
        <div className="rounded bg-red-50 text-red-700 text-sm px-3 py-2">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="mitarbeiter_id">
          Mitarbeitende
        </label>
        <select
          id="mitarbeiter_id"
          name="mitarbeiter_id"
          required
          disabled={laeuft}
          value={mitarbeiterId}
          onChange={(e) => onMitarbeiterChange(e.target.value)}
          className="w-full max-w-xs rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-arcos-steel disabled:bg-gray-100 disabled:text-gray-500"
        >
          {mitarbeitende.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
              {m.id === aktuellerUserId ? " (ich)" : ""}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium" htmlFor="projekt_id">
              Projekt
            </label>
            {!laeuft && projektHook.trigger}
          </div>
          <select
            id="projekt_id"
            name="projekt_id"
            required
            disabled={laeuft}
            value={projektId}
            onChange={(e) => onProjektChange(e.target.value)}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-arcos-steel disabled:bg-gray-100 disabled:text-gray-500"
          >
            <option value="" disabled>
              Bitte wählen…
            </option>
            {projekteListe.map((m) => (
              <option key={m.id} value={m.id}>
                {m.kunden?.vorname ? `${m.kunden.vorname} ` : ""}
                {m.kunden?.name} – {m.bezeichnung}
                {m.status === "inaktiv" ? " (inaktiv)" : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            className="block text-sm font-medium mb-1"
            htmlFor="dienstleistung_id"
          >
            Dienstleistung
          </label>
          <select
            id="dienstleistung_id"
            name="dienstleistung_id"
            required
            disabled={laeuft}
            value={dienstleistungId}
            onChange={(e) => onDienstleistungChange(e.target.value)}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-arcos-steel disabled:bg-gray-100 disabled:text-gray-500"
          >
            <option value="" disabled>
              Bitte wählen…
            </option>
            {dienstleistungen.map((d) => (
              <option key={d.id} value={d.id}>
                {d.bezeichnung}
                {!d.aktiv ? " (inaktiv)" : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="datum">
          Datum
        </label>
        <input
          id="datum"
          name="datum"
          type="date"
          disabled={laeuft}
          defaultValue={zeiteintrag?.datum ?? heuteIso()}
          required
          className="w-full max-w-xs rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-arcos-steel disabled:bg-gray-100 disabled:text-gray-500"
        />
      </div>

      {istMengenartikel ? (
        <div className="rounded border border-gray-200 p-4 bg-gray-50">
          <span className="block text-sm font-medium mb-3">Menge erfassen</span>
          <div className="max-w-xs">
            <label className="block text-xs text-gray-500 mb-1" htmlFor="menge">
              Menge in {einheit}
            </label>
            <input
              id="menge"
              name="menge"
              type="number"
              step="0.01"
              min={0}
              required
              value={menge}
              onChange={(e) => setMenge(Number(e.target.value))}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-arcos-steel"
            />
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Diese Position wird verrechnet, zählt aber nicht als Arbeitszeit –
            sie erscheint in keiner Stundenauswertung.
          </p>
        </div>
      ) : laeuft ? (
        <div className="rounded border-2 border-red-300 bg-red-50 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-red-700">⏱ Timer läuft</span>
            <LaufendeZeit seit={zeiteintrag!.timer_gestartet_um!} />
          </div>
          <p className="text-xs text-red-600 mt-1">
            Gestartet um {formatUhrzeit(zeiteintrag!.timer_gestartet_um!)} — diese Seite
            kann verlassen werden, der Timer läuft im Hintergrund weiter. Unter
            "Zeiterfassung" ist der Eintrag rot markiert.
          </p>
        </div>
      ) : (
        <div className="rounded border border-gray-200 p-4 bg-gray-50">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">Zeit erfassen</span>
            {istNeu && starteTimerAction && (
              <button
                type="submit"
                formAction={starteTimerAction}
                className="text-sm rounded bg-green-600 text-white px-3 py-1.5 hover:bg-green-700"
              >
                ▶ Timer starten
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1" htmlFor="start_zeit">
                Von
              </label>
              <input
                id="start_zeit"
                name="start_zeit"
                type="time"
                value={startZeit}
                onChange={(e) => onZeitChange(e.target.value, endZeit)}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-arcos-steel"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1" htmlFor="end_zeit">
                Bis
              </label>
              <input
                id="end_zeit"
                name="end_zeit"
                type="time"
                value={endZeit}
                onChange={(e) => onZeitChange(startZeit, e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-arcos-steel"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1" htmlFor="dauer_minuten">
                Dauer (Minuten)
              </label>
              <input
                id="dauer_minuten"
                name="dauer_minuten"
                type="number"
                min={0}
                value={dauer}
                onChange={(e) => setDauer(Number(e.target.value))}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-arcos-steel"
              />
              {/* Bewusst nicht "required"/min=1: beim Klick auf "Timer
                  starten" würde die Browser-Validierung sonst auch dieses
                  Feld prüfen, obwohl der Timer die Dauer erst beim Stoppen
                  braucht. Die eigentliche Prüfung (> 0) passiert serverseitig
                  beim Speichern. */}
            </div>
          </div>
          {dauer > 0 && (
            <p className="text-xs text-gray-400 mt-2">≈ {formatDauer(dauer)}</p>
          )}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="beschreibung">
          Beschreibung
        </label>
        <textarea
          ref={beschreibungRef}
          id="beschreibung"
          name="beschreibung"
          rows={3}
          value={beschreibung}
          onChange={(e) => setBeschreibung(e.target.value)}
          onFocus={onBeschreibungFocus}
          placeholder="Was wurde gemacht?"
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-arcos-steel"
        />
      </div>

      {!laeuft && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="rabatt_prozent">
              Rabatt
            </label>
            <select
              id="rabatt_prozent"
              name="rabatt_prozent"
              value={rabatt}
              onChange={(e) => setRabatt(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-arcos-steel"
            >
              {waehlbareRabatte.map((r) => (
                <option key={r.id} value={r.prozent}>
                  {r.bezeichnung ?? rabattLabel(r.prozent)}
                  {!r.aktiv ? " (inaktiv)" : ""}
                </option>
              ))}
            </select>
            {rabattGesperrt && (
              <p className="text-xs text-gray-400 mt-1">
                Für diese Dienstleistung sind keine Teilrabatte zugelassen. 100%
                bleibt möglich, um sie als nicht verrechnet zu buchen.
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="referenz">
              Referenz (optional)
            </label>
            <input
              id="referenz"
              name="referenz"
              defaultValue={zeiteintrag?.referenz ?? ""}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-arcos-steel"
            />
          </div>
        </div>
      )}

      <div className="flex gap-3">
        {laeuft && stoppeTimerAction ? (
          <button
            type="submit"
            formAction={stoppeTimerAction}
            className="rounded bg-red-600 text-white text-sm font-medium px-4 py-2 hover:bg-red-700"
          >
            ⏹ Timer stoppen
          </button>
        ) : (
          <button
            type="submit"
            className="rounded bg-arcos-steel text-white text-sm font-medium px-4 py-2 hover:bg-arcos-navy"
          >
            Speichern
          </button>
        )}
        <a
          href="/zeiterfassung"
          className="rounded border text-sm font-medium px-4 py-2 hover:bg-gray-50"
        >
          Abbrechen
        </a>
      </div>
    </form>

    {projektHook.modal}
    </>
  );
}
