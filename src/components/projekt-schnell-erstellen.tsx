"use client";

import { useState } from "react";
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
}: {
  kunden: KundeOption[];
  vorausgewaehlterKunde?: string;
  onErstellt: (projekt: NeuesProjekt) => void;
}) {
  const [modalOffen, setModalOffen] = useState(false);
  const [speichert, setSpeichert] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const [kundenListe, setKundenListe] = useState(kunden);
  const [kundeId, setKundeId] = useState(vorausgewaehlterKunde ?? "");

  function handleNeuerKunde(kunde: NeuerKunde) {
    setKundenListe((liste) =>
      [...liste, kunde].sort((a, b) => a.name.localeCompare(b.name, "de-CH"))
    );
    setKundeId(kunde.id);
  }

  const kundeHook = useKundeSchnellErstellen(handleNeuerKunde);

  async function handleSubmit(formData: FormData) {
    setFehler(null);
    setSpeichert(true);
    const { data, error } = await erstelleProjektSchnell(formData);
    setSpeichert(false);

    if (error || !data) {
      setFehler(error ?? "Unbekannter Fehler.");
      return;
    }

    onErstellt(data);
    setModalOffen(false);
  }

  function oeffnen() {
    setKundeId(vorausgewaehlterKunde ?? "");
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
              "Projekte" ergänzt werden.
            </p>
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
          </form>
        </Modal>
      )}
      {kundeHook.modal}
    </>
  );

  return { trigger, modal };
}
