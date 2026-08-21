"use client";

import { useMemo, useState } from "react";
import { Modal } from "@/components/modal";
import { useKundeSchnellErstellen, type NeuerKunde } from "@/components/kunde-schnell-erstellen";
import { erstelleProjektSchnell } from "@/app/actions/projekte";
import type { Kunde } from "@/lib/types";

type KundeOption = Pick<Kunde, "id" | "name" | "vorname">;
export type NeuesProjekt = { id: string; bezeichnung: string; kunde_id: string };

// Projekt direkt aus einem anderen Formular heraus erfassen können (z.B.
// beim Erfassen einer Anfrage oder eines Zeiteintrags). Enthält selbst eine
// verschachtelte Kunde-Schnellerfassung, falls auch der Kunde noch fehlt –
// durchgängig nach demselben Prinzip. Status, Startdatum & weitere Angaben
// lassen sich später unter "Projekte" ergänzen.
//
// Als Hook aus demselben Grund wie useKundeSchnellErstellen: {trigger}
// gehört ins aufrufende Formular, {modal} muss ausserhalb davon stehen.
export function useProjektSchnellErstellen({
  kunden,
  vorausgewaehlterKunde,
  onErstellt,
  onKundeErstellt,
}: {
  kunden: KundeOption[];
  vorausgewaehlterKunde?: string;
  onErstellt: (projekt: NeuesProjekt) => void;
  // Wird ein Kunde IM Projektfenster angelegt, erfährt das aufrufende
  // Formular sonst nichts davon – seine eigene Kundenliste kennt ihn dann
  // nicht, und ein Kundenfeld dort stünde auf einem Wert ohne Eintrag.
  // Optional, damit die bestehenden Aufrufer unverändert bleiben.
  onKundeErstellt?: (kunde: NeuerKunde) => void;
}) {
  const [modalOffen, setModalOffen] = useState(false);
  const [speichert, setSpeichert] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const [warnung, setWarnung] = useState<NeuesProjekt | null>(null);
  const [letzteFormData, setLetzteFormData] = useState<FormData | null>(null);
  const [nestedNeueKunden, setNestedNeueKunden] = useState<NeuerKunde[]>([]);
  const [kundeId, setKundeId] = useState(vorausgewaehlterKunde ?? "");

  // Nicht aus `kunden` per useState übernehmen (useState-Initialwerte werden
  // nur beim allerersten Aufruf berücksichtigt) – sonst bleibt diese Liste
  // "eingefroren", wenn z.B. ein anderer Teil desselben Formulars (etwa das
  // separate "+ Neuer Kunde" neben dem Kunde-Feld einer Anfrage) zwischen-
  // zeitlich einen neuen Kunden anlegt. Stattdessen bei jedem Rendern frisch
  // aus der aktuellen `kunden`-Prop plus lokal (verschachtelt) angelegten
  // Kunden zusammensetzen, die dort noch nicht enthalten sind.
  const kundenListe = useMemo(() => {
    const zusaetzliche = nestedNeueKunden.filter(
      (n) => !kunden.some((k) => k.id === n.id)
    );
    return [...kunden, ...zusaetzliche].sort((a, b) =>
      a.name.localeCompare(b.name, "de-CH")
    );
  }, [kunden, nestedNeueKunden]);

  function handleNeuerKunde(kunde: NeuerKunde) {
    setNestedNeueKunden((liste) => [...liste, kunde]);
    setKundeId(kunde.id);
    onKundeErstellt?.(kunde);
  }

  const kundeHook = useKundeSchnellErstellen(handleNeuerKunde);

  async function handleSubmit(formData: FormData) {
    setFehler(null);
    setWarnung(null);
    setSpeichert(true);
    const ergebnis = await erstelleProjektSchnell(formData);
    setSpeichert(false);

    if (ergebnis.warnung) {
      setLetzteFormData(formData);
      setWarnung(ergebnis.warnung);
      return;
    }
    if (ergebnis.error || !ergebnis.data) {
      setFehler(ergebnis.error ?? "Unbekannter Fehler.");
      return;
    }

    onErstellt(ergebnis.data);
    setModalOffen(false);
  }

  // Dubletten-Warnung wurde bestätigt: mit demselben FormData nochmals
  // absenden, diesmal mit "erzwingen", damit die Server-Prüfung übersprungen
  // wird.
  async function handleTrotzdemAnlegen() {
    if (!letzteFormData) return;
    letzteFormData.set("erzwingen", "true");
    setFehler(null);
    setSpeichert(true);
    const ergebnis = await erstelleProjektSchnell(letzteFormData);
    setSpeichert(false);
    setWarnung(null);

    if (ergebnis.error || !ergebnis.data) {
      setFehler(ergebnis.error ?? "Unbekannter Fehler.");
      return;
    }
    onErstellt(ergebnis.data);
    setModalOffen(false);
  }

  function handleBestehendesVerwenden() {
    if (!warnung) return;
    onErstellt(warnung);
    setWarnung(null);
    setModalOffen(false);
  }

  function oeffnen() {
    setKundeId(vorausgewaehlterKunde ?? "");
    setFehler(null);
    setWarnung(null);
    setModalOffen(true);
  }

  const trigger = (
    <button
      type="button"
      onClick={oeffnen}
      className="text-xs text-arcos-steel hover:underline"
    >
      + Neues Projekt
    </button>
  );

  const modal = (
    <>
      {modalOffen && (
        <Modal titel="Neues Projekt" onClose={() => setModalOffen(false)}>
          <form action={handleSubmit} className="space-y-3">
            {fehler && (
              <div className="rounded bg-red-50 text-red-700 text-sm px-3 py-2">{fehler}</div>
            )}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs text-gray-500">Kunde *</label>
                {kundeHook.trigger}
              </div>
              <select
                name="kunde_id"
                required
                value={kundeId}
                onChange={(e) => setKundeId(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-arcos-steel"
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
              <label className="block text-xs text-gray-500 mb-1">Bezeichnung *</label>
              <input
                name="bezeichnung"
                required
                autoFocus
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-arcos-steel"
              />
            </div>
            <p className="text-xs text-gray-400">
              Status, Startdatum und weitere Angaben können später unter
              „Projekte“ ergänzt werden.
            </p>

            {warnung && (
              <div className="rounded bg-amber-50 text-amber-800 text-sm px-3 py-2 space-y-2">
                <p>
                  Ein Projekt namens „{warnung.bezeichnung}“ existiert für
                  diesen Kunden bereits.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleBestehendesVerwenden}
                    className="rounded bg-arcos-steel text-white text-xs font-medium px-3 py-1.5 hover:bg-arcos-navy"
                  >
                    Bestehendes verwenden
                  </button>
                  <button
                    type="button"
                    onClick={handleTrotzdemAnlegen}
                    disabled={speichert}
                    className="rounded border text-xs font-medium px-3 py-1.5 hover:bg-gray-50 disabled:opacity-60"
                  >
                    {speichert ? "Speichert…" : "Trotzdem neu anlegen"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setWarnung(null)}
                    className="text-xs text-gray-500 hover:underline px-1"
                  >
                    Zurück
                  </button>
                </div>
              </div>
            )}

            {!warnung && (
              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={speichert}
                  className="rounded bg-arcos-steel text-white text-sm font-medium px-4 py-2 hover:bg-arcos-navy disabled:opacity-60"
                >
                  {speichert ? "Speichert…" : "Projekt anlegen"}
                </button>
                <button
                  type="button"
                  onClick={() => setModalOffen(false)}
                  className="rounded border text-sm font-medium px-4 py-2 hover:bg-gray-50"
                >
                  Abbrechen
                </button>
              </div>
            )}
          </form>
        </Modal>
      )}
      {kundeHook.modal}
    </>
  );

  return { trigger, modal };
}
