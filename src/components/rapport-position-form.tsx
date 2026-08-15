"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { rabattLabel } from "@/lib/rabatt";
import { ZeitFeld } from "@/components/zeit-feld";
import { minutenZwischen } from "@/lib/zeit";
import { holeTagesbelegung } from "@/app/actions/zeiteintraege";
import { stundenLabel, type Tagesbelegung } from "@/lib/tagesbelegung";
import type { FormularErgebnis } from "@/lib/formular-ergebnis";
import { AbsendeKnopf } from "@/components/absende-knopf";
import type { Dienstleistung, ZeiteintragMitDetails } from "@/lib/types";

type Rabattsatz = { id: string; prozent: number; bezeichnung: string | null; aktiv: boolean };
type DienstleistungOption = Pick<
  Dienstleistung,
  | "id"
  | "bezeichnung"
  | "aktiv"
  | "einheit"
  | "zaehlt_als_arbeitszeit"
  | "rabatt_erlaubt"
  | "menge_aus_anreise"
>;

// Eine Position zum Rapport hinzufügen. Bewusst schlanker als die
// Zeiterfassung: Datum, ausführende Person und Projekt kommen vom Rapport
// und gelten für den ganzen Einsatz. Kein Timer – wer einen Rapport
// schreibt, ist mit der Arbeit fertig.
export function RapportPositionForm({
  dienstleistungen,
  rabattsaetze,
  action,
  position,
  abbrechenHref,
  mitarbeiterId,
  datum,
  beteiligte,
  anreiseKm,
}: {
  dienstleistungen: DienstleistungOption[];
  rabattsaetze: Rabattsatz[];
  action: (bisher: FormularErgebnis, formData: FormData) => Promise<FormularErgebnis>;
  // Gesetzt beim Bearbeiten einer bestehenden Position.
  position?: ZeiteintragMitDetails;
  abbrechenHref?: string;
  // Für die Tagesarbeitszeit-Prüfung: beide kommen vom Rapport und gelten
  // für den ganzen Einsatz.
  mitarbeiterId: string;
  datum: string;
  // Anfahrt-Kilometer des Kunden dieses Rapports (0050). Wird bei
  // Leistungen mit dem Häkchen "Anreise" als Menge vorgeschlagen.
  anreiseKm?: number | null;
  // Beteiligte des Einsatzes (0045). Bei mehreren wird die Person je
  // Stundenposition gewählt – sonst laufen alle Stunden auf die
  // verantwortliche Person und jede Auswertung je Mitarbeitendem
  // stimmt nicht.
  beteiligte: { id: string; name: string }[];
}) {
  const bearbeiten = position != null;

  // Der Fehler kommt aus der Aktion ZURÜCK statt über eine Weiterleitung.
  // Damit bleibt alles Getippte stehen: Es gibt keine Navigation, die das
  // Formular neu aufbauen würde.
  const [ergebnis, formAction] = useActionState(action, null);

  const [dienstleistungId, setDienstleistungId] = useState(position?.dienstleistung_id ?? "");
  const [startZeit, setStartZeit] = useState(position?.start_zeit?.slice(0, 5) ?? "");
  const [endZeit, setEndZeit] = useState(position?.end_zeit?.slice(0, 5) ?? "");
  const [dauerText, setDauerText] = useState(
    position?.dauer_minuten != null ? String(position.dauer_minuten) : ""
  );
  const [mengeText, setMengeText] = useState(
    position?.menge != null ? String(position.menge) : ""
  );
  // Beim Bearbeiten gilt die gespeicherte Dauer, nicht die aus Von/Bis
  // errechnete – sie kann bewusst abweichen, etwa wegen einer Pause.
  const [dauerManuell, setDauerManuell] = useState(bearbeiten);

  const gewaehlt = dienstleistungen.find((d) => d.id === dienstleistungId);

  // Anreise-Kilometer als Menge vorschlagen – dieselbe Regel wie in der
  // Zeiterfassung: Ein Vorschlag darf nie überschreiben, was jemand
  // selbst eingetragen hat. Ersetzt wird nur ein leeres Feld oder der
  // Vorschlag der zuvor gewählten Leistung.
  const anreiseVorschlag = anreiseKm != null ? String(Number(anreiseKm)) : "";

  function waehleDienstleistung(neueId: string) {
    const alte = dienstleistungen.find((d) => d.id === dienstleistungId);
    const neue = dienstleistungen.find((d) => d.id === neueId);
    setDienstleistungId(neueId);

    if (!neue?.menge_aus_anreise || anreiseVorschlag === "") return;
    setMengeText((aktuell) => {
      const alterVorschlag = alte?.menge_aus_anreise ? anreiseVorschlag : "";
      if (aktuell !== "" && aktuell !== alterVorschlag) return aktuell;
      return anreiseVorschlag;
    });
  }
  const istMengenartikel = gewaehlt != null && !gewaehlt.zaehlt_als_arbeitszeit;
  const einheit = gewaehlt?.einheit ?? "Stück";

  const rabattGesperrt = gewaehlt != null && !gewaehlt.rabatt_erlaubt;
  const waehlbareRabatte = rabattGesperrt
    ? rabattsaetze.filter((r) => Number(r.prozent) === 0 || Number(r.prozent) === 100)
    : rabattsaetze;

  // Tagessumme der Person live nachladen, damit die Warnung VOR dem
  // Speichern erscheint. Vorher schlug die Grenze erst beim Absenden zu –
  // und das war genau der Moment, in dem die Eingabe verloren ging.
  const [belegungRoh, setBelegungRoh] = useState<Tagesbelegung | null>(null);
  const belegungRelevant = Boolean(mitarbeiterId && datum && !istMengenartikel);
  const belegung = belegungRelevant ? belegungRoh : null;

  useEffect(() => {
    if (!belegungRelevant) return;
    let verworfen = false;
    holeTagesbelegung({
      mitarbeiterId,
      datum,
      startZeit: startZeit || null,
      endZeit: endZeit || null,
      ohneEintragId: position?.id ?? null,
    })
      .then((r) => {
        if (!verworfen) setBelegungRoh(r);
      })
      .catch(() => {
        // Nur ein Hinweis – scheitert die Abfrage, bleibt das Formular
        // vollständig benutzbar. Der Server prüft beim Speichern erneut.
        if (!verworfen) setBelegungRoh(null);
      });
    return () => {
      verworfen = true;
    };
  }, [belegungRelevant, mitarbeiterId, datum, startZeit, endZeit, position?.id]);

  const dauer = Number(dauerText) || 0;
  const summeMitDieser = (belegung?.summeMinuten ?? 0) + (istMengenartikel ? 0 : dauer);
  const warnschwelle = belegung?.warnungAbMinuten ?? null;
  const sperrschwelle = belegung?.sperreAbMinuten ?? null;
  const tagZuLang = warnschwelle != null && summeMitDieser > warnschwelle;
  const wirdGesperrt = sperrschwelle != null && summeMitDieser > sperrschwelle;

  function onZeitChange(neuStart: string, neuEnde: string) {
    setStartZeit(neuStart);
    setEndZeit(neuEnde);
    if (neuStart && neuEnde && !dauerManuell) {
      const m = minutenZwischen(neuStart, neuEnde);
      if (m !== null) setDauerText(String(m));
    }
  }

  return (
    <form action={formAction} className="bg-white rounded-lg border p-5 space-y-4">
      <h3 className="text-sm font-semibold">
        {bearbeiten ? "Position bearbeiten" : "Position hinzufügen"}
      </h3>

      <div>
        <label className="block text-xs text-gray-500 mb-1" htmlFor="pos_dienstleistung">
          Leistung
        </label>
        <select
          id="pos_dienstleistung"
          name="dienstleistung_id"
          required
          value={dienstleistungId}
          onChange={(e) => waehleDienstleistung(e.target.value)}
          className="w-full max-w-md rounded border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="" disabled>
            Bitte wählen…
          </option>
          {dienstleistungen.map((d) => (
            <option key={d.id} value={d.id}>
              {d.bezeichnung} ({d.einheit})
            </option>
          ))}
        </select>
      </div>

      {istMengenartikel ? (
        <div className="max-w-xs">
          <label className="block text-xs text-gray-500 mb-1" htmlFor="pos_menge">
            Menge in {einheit}
          </label>
          <input
            id="pos_menge"
            name="menge"
            type="number"
            step="0.01"
            min={0}
            required
            value={mengeText}
            onChange={(e) => setMengeText(e.target.value)}
            onFocus={(e) => {
              const el = e.currentTarget;
              requestAnimationFrame(() => el.select());
            }}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1" htmlFor="pos_von">
              Von (optional)
            </label>
            <ZeitFeld
              id="pos_von"
              name="start_zeit"
              startwert={position?.start_zeit?.slice(0, 5) ?? ""}
              onZeit={(z) => onZeitChange(z ?? "", endZeit)}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1" htmlFor="pos_bis">
              Bis (optional)
            </label>
            <ZeitFeld
              id="pos_bis"
              name="end_zeit"
              startwert={position?.end_zeit?.slice(0, 5) ?? ""}
              onZeit={(z) => onZeitChange(startZeit, z ?? "")}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1" htmlFor="pos_dauer">
              Dauer (Minuten)
            </label>
            <input
              id="pos_dauer"
              name="dauer_minuten"
              type="number"
              min={0}
              value={dauerText}
              onChange={(e) => {
                setDauerText(e.target.value);
                setDauerManuell(true);
              }}
              onFocus={(e) => {
                const el = e.currentTarget;
                requestAnimationFrame(() => el.select());
              }}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
      )}

      {/* Nur bei einem Team und nur bei Arbeitszeit: Material und
          Reisespesen gehören zum Auftrag, nicht zu einer Person. */}
      {beteiligte.length > 1 && !istMengenartikel && (
        <div>
          <label className="block text-xs text-gray-500 mb-1" htmlFor="pos_mitarbeiter">
            Geleistet von
          </label>
          <select
            id="pos_mitarbeiter"
            name="mitarbeiter_id"
            defaultValue={position?.mitarbeiter_id ?? mitarbeiterId}
            className="rounded border border-gray-300 px-3 py-2 text-sm min-w-[12rem]"
          >
            {beteiligte.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="block text-xs text-gray-500 mb-1" htmlFor="pos_beschreibung">
          Beschreibung
        </label>
        <textarea
          id="pos_beschreibung"
          name="beschreibung"
          rows={2}
          defaultValue={position?.beschreibung ?? ""}
          placeholder="Was wurde gemacht?"
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      {/* Warnung erscheint, WÄHREND man tippt – nicht erst nach dem
          Absenden. Die Sperre ist damit der seltene Ausnahmefall. */}
      {belegung && (tagZuLang || wirdGesperrt) && (
        <div
          className={`rounded text-sm px-3 py-2 ${
            wirdGesperrt ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-800"
          }`}
        >
          Mit dieser Position kommt {belegung.eintraege.length > 0 ? "der Tag" : "dieser Tag"} auf{" "}
          <strong>{stundenLabel(summeMitDieser)}</strong>.
          {wirdGesperrt
            ? " Das überschreitet die zulässige Tagesarbeitszeit – so lässt sich die Position nicht speichern."
            : " Bitte prüfen, ob das stimmt."}
        </div>
      )}

      {/* Fehler aus der Aktion: Die Eingabe oben bleibt dabei erhalten. */}
      {ergebnis?.fehler && (
        <div className="rounded bg-red-50 text-red-700 text-sm px-3 py-2">{ergebnis.fehler}</div>
      )}

      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1" htmlFor="pos_rabatt">
            Rabatt
          </label>
          <select
            id="pos_rabatt"
            name="rabatt_prozent"
            defaultValue={position?.rabatt_prozent ?? 0}
            className="rounded border border-gray-300 px-3 py-2 text-sm"
          >
            {waehlbareRabatte.map((r) => (
              <option key={r.id} value={r.prozent}>
                {r.bezeichnung ?? rabattLabel(r.prozent)}
              </option>
            ))}
          </select>
        </div>
        <AbsendeKnopf
          laufttext="Wird gespeichert…"
          className="rounded bg-arcos-steel text-white text-sm font-medium px-4 py-2 hover:bg-arcos-navy disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {bearbeiten ? "Änderungen speichern" : "Position hinzufügen"}
        </AbsendeKnopf>
        {abbrechenHref && (
          <Link
            href={abbrechenHref}
            className="rounded border text-sm font-medium px-4 py-2 hover:bg-gray-50"
          >
            Abbrechen
          </Link>
        )}
      </div>

      {rabattGesperrt && (
        <p className="text-xs text-gray-400">
          Für diese Leistung sind keine Teilrabatte zugelassen.
        </p>
      )}
    </form>
  );
}
