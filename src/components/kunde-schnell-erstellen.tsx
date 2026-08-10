"use client";

import { useState } from "react";
import { Modal } from "@/components/modal";
import { erstelleKundeSchnell } from "@/app/actions/kunden";

export type NeuerKunde = { id: string; name: string; vorname: string | null };

// Kunde direkt aus einem anderen Formular heraus erfassen können (z.B.
// während eines Telefonats, oder beim Anlegen eines Projekts), ohne das
// aufrufende Formular zu verlassen. Adresse & Rechnungsangaben lassen sich
// später unter "Kunden" ergänzen.
//
// Als Hook (statt fertiges Button+Modal-Bündel), weil der Trigger-Button
// zwar sichtbar NEBEN einem Feld innerhalb eines Formulars stehen muss,
// das Modal mit seinem eigenen <form> aber AUSSERHALB des aufrufenden
// <form> gerendert werden muss – verschachtelte <form>-Elemente sind
// ungültiges HTML und bringen das Absenden durcheinander. Aufrufende
// Komponenten platzieren {trigger} innerhalb ihres Formulars und {modal}
// als Geschwister-Element daneben.
export function useKundeSchnellErstellen(onErstellt: (kunde: NeuerKunde) => void) {
  const [modalOffen, setModalOffen] = useState(false);
  const [speichert, setSpeichert] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setFehler(null);
    setSpeichert(true);
    const { data, error } = await erstelleKundeSchnell(formData);
    setSpeichert(false);

    if (error || !data) {
      setFehler(error ?? "Unbekannter Fehler.");
      return;
    }

    onErstellt(data);
    setModalOffen(false);
  }

  const trigger = (
    <button
      type="button"
      onClick={() => setModalOffen(true)}
      className="text-xs text-arcos-steel hover:underline"
    >
      + Neuer Kunde
    </button>
  );

  const modal = modalOffen ? (
    <Modal titel="Neuer Kunde" onClose={() => setModalOffen(false)}>
      <form action={handleSubmit} className="space-y-3">
        {fehler && (
          <div className="rounded bg-red-50 text-red-700 text-sm px-3 py-2">{fehler}</div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Vorname</label>
            <input
              name="vorname"
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-arcos-steel"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Name / Firma *</label>
            <input
              name="name"
              required
              autoFocus
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-arcos-steel"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Telefon</label>
            <input
              name="telefon"
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-arcos-steel"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">E-Mail</label>
            <input
              name="email"
              type="email"
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-arcos-steel"
            />
          </div>
        </div>
        <p className="text-xs text-gray-400">
          Adresse & weitere Angaben können später unter "Kunden" ergänzt werden.
        </p>
        <div className="flex gap-2 pt-1">
          <button
            type="submit"
            disabled={speichert}
            className="rounded bg-arcos-steel text-white text-sm font-medium px-4 py-2 hover:bg-arcos-navy disabled:opacity-60"
          >
            {speichert ? "Speichert…" : "Kunde anlegen"}
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
  ) : null;

  return { trigger, modal };
}
