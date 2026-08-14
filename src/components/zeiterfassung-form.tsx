"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { heuteIso } from "@/lib/date-utils";
import { rabattLabel } from "@/lib/rabatt";
import { useProjektSchnellErstellen } from "@/components/projekt-schnell-erstellen";
import { holeTagesbelegung } from "@/app/actions/zeiteintraege";
import { ZeitFeld } from "@/components/zeit-feld";
import { minutenZwischen } from "@/lib/zeit";
import { stundenLabel, type Tagesbelegung } from "@/lib/tagesbelegung";
import type { Dienstleistung, Kunde, Projekt, Zeiteintrag } from "@/lib/types";
import { DatumFeld } from "@/components/datum-feld";
import Link from "next/link";
import type { FormularErgebnis } from "@/lib/formular-ergebnis";
import { AbsendeKnopf } from "@/components/absende-knopf";

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
  | "beschreibung"
  | "aktiv"
  | "einheit"
  | "zaehlt_als_arbeitszeit"
  | "rabatt_erlaubt"
  | "klasse_id"
>;

// Rabatt eines Kunden auf eine ganze Dienstleistungsklasse.
type KlassenRabatt = { kunde_id: string; klasse_id: string; rabatt_prozent: number };

// Zahlenfelder sind mit 0 vorbelegt – wer hineinklickt, will die 0 ersetzen,
// nicht dahinter weitertippen. Beim Tabben markiert der Browser den Inhalt
// von selbst, beim Klicken nicht: Dort setzt "mousedown" den Fokus, und das
// darauf folgende "mouseup" hebt die Auswahl sofort wieder auf. Deshalb erst
// im nächsten Frame markieren, wenn der Klick abgeschlossen ist. Ein zweiter
// Klick ins bereits fokussierte Feld löst kein focus-Ereignis mehr aus – dort
// lässt sich der Cursor also weiterhin normal positionieren.
function inhaltMarkieren(e: React.FocusEvent<HTMLInputElement>) {
  const el = e.currentTarget;
  requestAnimationFrame(() => el.select());
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
  action: (bisher: FormularErgebnis, formData: FormData) => Promise<FormularErgebnis>;
  starteTimerAction?: (formData: FormData) => void;
  stoppeTimerAction?: (formData: FormData) => void;
  error?: string;
}) {

  // Fehler kommt aus der Aktion zurueck statt per Weiterleitung –
  // so bleibt die Eingabe stehen (siehe lib/formular-ergebnis).
  const [ergebnis, formAction] = useActionState(action, null);
  const meldung = ergebnis?.fehler ?? error;
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
  // Als Text statt Zahl: Number("") ergibt 0, das Feld liesse sich sonst
  // nicht leeren – es spränge beim Löschen sofort auf 0 zurück.
  const [dauerText, setDauerText] = useState(
    zeiteintrag?.dauer_minuten != null ? String(zeiteintrag.dauer_minuten) : ""
  );
  const [mengeText, setMengeText] = useState(
    zeiteintrag?.menge != null ? String(zeiteintrag.menge) : ""
  );
  const dauer = Number(dauerText) || 0;

  // Sobald die Dauer von Hand gesetzt wurde, überschreibt Von/Bis sie nicht
  // mehr. Typischer Fall: 08:00-17:00 ergibt 540 Minuten, davon geht die
  // Mittagspause ab. Ohne diese Sperre wäre die Korrektur weg, sobald man
  // eine der beiden Zeiten nochmal anfasst.
  const [dauerManuell, setDauerManuell] = useState(false);

  const [dienstleistungId, setDienstleistungId] = useState(
    zeiteintrag?.dienstleistung_id ?? ""
  );
  const [beschreibung, setBeschreibung] = useState(zeiteintrag?.beschreibung ?? "");
  const beschreibungRef = useRef<HTMLTextAreaElement | null>(null);
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

  const [mitarbeiterId, setMitarbeiterId] = useState(
    zeiteintrag?.mitarbeiter_id ?? aktuellerUserId
  );

  // ---------------------------------------------------------------
  // Tagesbelegung: Überschneidungen und Tagessumme live anzeigen
  // ---------------------------------------------------------------
  const [datum, setDatum] = useState(zeiteintrag?.datum ?? heuteIso());
  const [belegungRoh, setBelegungRoh] = useState<Tagesbelegung | null>(null);

  // Mengenartikel haben weder Uhrzeit noch Arbeitszeit – für sie ist die
  // Tagessumme bedeutungslos. Ob die Belegung überhaupt gilt, wird beim
  // Rendern abgeleitet statt im Effect zurückgesetzt: So kann gar nicht
  // erst ein veralteter Wert kurz sichtbar werden, und es entfällt ein
  // zusätzlicher Renderdurchgang.
  const belegungRelevant = Boolean(mitarbeiterId && datum && !istMengenartikel);
  const belegung = belegungRelevant ? belegungRoh : null;

  useEffect(() => {
    if (!belegungRelevant) return;

    let abgebrochen = false;
    holeTagesbelegung({
      mitarbeiterId,
      datum,
      startZeit: startZeit || null,
      endZeit: endZeit || null,
      ohneEintragId: zeiteintrag?.id ?? null,
    })
      .then((ergebnis) => {
        // Verwerfen, wenn inzwischen ein neuerer Aufruf unterwegs ist –
        // sonst überschreibt eine langsame Antwort eine aktuellere.
        if (!abgebrochen) setBelegungRoh(ergebnis);
      })
      .catch(() => {
        // Der Hinweis ist Komfort, kein Muss: Scheitert die Abfrage, bleibt
        // das Formular benutzbar. Die harte Grenze prüft der Server ohnehin
        // beim Speichern erneut.
        if (!abgebrochen) setBelegungRoh(null);
      });

    return () => {
      abgebrochen = true;
    };
  }, [belegungRelevant, mitarbeiterId, datum, startZeit, endZeit, zeiteintrag?.id]);

  const summeMitDiesem = (belegung?.summeMinuten ?? 0) + (istMengenartikel ? 0 : dauer);
  const warnschwelle = belegung?.warnungAbMinuten ?? null;
  const tagZuLang = warnschwelle != null && summeMitDiesem > warnschwelle;
  const hatUeberschneidung = (belegung?.ueberschneidungen.length ?? 0) > 0;

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

  // Die Beschreibung einer Dienstleistung ist eine Vorgabe für den
  // Beschreibungstext des Zeiteintrags – sie landet unter der Namenszeile
  // der/des Mitarbeitenden. Übernommen wird sie nur, solange dort nichts
  // Eigenes steht: entweder ist das Feld leer, oder es enthält nur die
  // Namenszeile, oder darunter steht noch unverändert die Vorgabe der
  // zuvor gewählten Dienstleistung. Selbst getippter Text bleibt in jedem
  // Fall stehen – eine Vorgabe darf niemals Arbeit überschreiben.
  function mitVorgabe(aktuell: string, alteId: string, neueId: string): string {
    const alteVorgabe = dienstleistungen.find((d) => d.id === alteId)?.beschreibung ?? "";
    const neueVorgabe = dienstleistungen.find((d) => d.id === neueId)?.beschreibung ?? "";

    const zeilen = aktuell === "" ? [] : aktuell.split("\n");
    const name = nameFuer(mitarbeiterId);
    const hatNamenszeile = zeilen.length > 0 && zeilen[0] === name;
    const kopf = hatNamenszeile ? zeilen[0] : null;
    const rest = (hatNamenszeile ? zeilen.slice(1) : zeilen).join("\n").trim();

    if (rest !== "" && rest !== alteVorgabe.trim()) return aktuell;

    const teile = [];
    if (kopf !== null) teile.push(kopf);
    else if (name !== "" && aktuell === "") teile.push(name);
    teile.push(neueVorgabe);
    // Abschliessendes \n auch ohne Vorgabe, damit der Cursor wie bisher
    // unter der Namenszeile beginnt.
    return teile.join("\n") + (neueVorgabe === "" ? "" : "\n");
  }

  function onDienstleistungChange(neueId: string) {
    const alteId = dienstleistungId;
    setDienstleistungId(neueId);
    setBeschreibung((aktuell) => mitVorgabe(aktuell, alteId, neueId));

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
    if (neueStart && neueEnde && !dauerManuell) {
      const m = minutenZwischen(neueStart, neueEnde);
      if (m !== null) setDauerText(String(m));
    }
  }

  return (
    <>
    <form action={formAction} className="space-y-5 bg-white rounded-lg border p-5">
      {meldung && (
        <div className="rounded bg-red-50 text-red-700 text-sm px-3 py-2">
          {meldung}
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
        <DatumFeld
          id="datum"
          name="datum"
          disabled={laeuft}
          value={datum}
          onChange={(e) => setDatum(e.target.value)}
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
              value={mengeText}
              onChange={(e) => setMengeText(e.target.value)}
              onFocus={inhaltMarkieren}
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
            „Zeiterfassung“ ist der Eintrag rot markiert.
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
              <ZeitFeld
                id="start_zeit"
                name="start_zeit"
                startwert={zeiteintrag?.start_zeit?.slice(0, 5) ?? ""}
                onZeit={(zeit) => onZeitChange(zeit ?? "", endZeit)}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1" htmlFor="end_zeit">
                Bis
              </label>
              <ZeitFeld
                id="end_zeit"
                name="end_zeit"
                startwert={zeiteintrag?.end_zeit?.slice(0, 5) ?? ""}
                onZeit={(zeit) => onZeitChange(startZeit, zeit ?? "")}
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
                value={dauerText}
                onChange={(e) => {
                  setDauerText(e.target.value);
                  setDauerManuell(true);
                }}
                onFocus={inhaltMarkieren}
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
          {/* Abweichung sichtbar machen, statt sie stillschweigend
              hinzunehmen – sonst fällt ein versehentlich stehengebliebener
              Wert erst in der Abrechnung auf. */}
          {dauerManuell &&
            startZeit &&
            endZeit &&
            minutenZwischen(startZeit, endZeit) !== null &&
            minutenZwischen(startZeit, endZeit) !== dauer && (
              <p className="text-xs text-amber-700 mt-2">
                Die Dauer weicht von der Zeitspanne ab
                {` (${formatDauer(minutenZwischen(startZeit, endZeit)!)})`} – z.B.
                wegen einer Pause. Sie bleibt so stehen.{" "}
                <button
                  type="button"
                  onClick={() => {
                    setDauerManuell(false);
                    const m = minutenZwischen(startZeit, endZeit);
                    if (m !== null) setDauerText(String(m));
                  }}
                  className="underline hover:no-underline"
                >
                  Aus Zeitspanne neu berechnen
                </button>
              </p>
            )}
          {/* Früher wurde eine rückwärts laufende Zeitspanne stillschweigend
              zu 0 Minuten – der Vertipper fiel erst beim Speichern auf, mit
              einer Meldung, die den Grund nicht nannte. */}
          {startZeit && endZeit && minutenZwischen(startZeit, endZeit) === null && (
            <p className="text-xs text-red-600 mt-2">
              „Bis“ liegt vor oder auf „Von“ – die Dauer wurde deshalb nicht
              neu berechnet. Einsätze über Mitternacht bitte auf zwei Einträge
              aufteilen.
            </p>
          )}
        </div>
      )}

      {/* Hinweis, kein Hindernis: Doppelt belegte Zeiten sind manchmal
          gewollt (zwei Kunden parallel betreut). Die harte Grenze prüft der
          Server beim Speichern, sie ist unter Einstellungen einstellbar. */}
      {!laeuft && belegung && (hatUeberschneidung || tagZuLang) && (
        <div
          className={`rounded border px-3 py-2 text-sm ${
            hatUeberschneidung
              ? "border-amber-300 bg-amber-50 text-amber-900"
              : "border-blue-200 bg-blue-50 text-blue-900"
          }`}
        >
          {hatUeberschneidung && (
            <div className="mb-1">
              <strong>Zeitliche Überschneidung</strong> mit:
              <ul className="list-disc ml-5 mt-1">
                {belegung.ueberschneidungen.map((u) => (
                  <li key={u.id}>
                    {u.bezeichnung}
                    {u.start_zeit && u.end_zeit ? ` – ${u.start_zeit}–${u.end_zeit}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div>
            An diesem Tag bereits {stundenLabel(belegung.summeMinuten)} erfasst
            {dauer > 0 ? `, mit diesem Eintrag ${stundenLabel(summeMitDiesem)}` : ""}.
            {tagZuLang && warnschwelle != null && (
              <> Das liegt über der eingestellten Schwelle von {stundenLabel(warnschwelle)}.</>
            )}
          </div>
          <div className="text-xs mt-1 opacity-80">
            Speichern ist weiterhin möglich – dies ist nur ein Hinweis.
          </div>
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
          <AbsendeKnopf
            laufttext="Wird gespeichert…"
            className="rounded bg-arcos-steel text-white text-sm font-medium px-4 py-2 hover:bg-arcos-navy disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Speichern
          </AbsendeKnopf>
        )}
        <Link
          href="/zeiterfassung"
          className="rounded border text-sm font-medium px-4 py-2 hover:bg-gray-50"
        >
          Abbrechen
        </Link>
      </div>
    </form>

    {projektHook.modal}
    </>
  );
}
