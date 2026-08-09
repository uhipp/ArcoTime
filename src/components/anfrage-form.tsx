"use client";

import { useState } from "react";
import { Modal } from "@/components/modal";
import { erstelleKundeSchnell } from "@/app/actions/kunden";
import type { Anfrage, Kunde, Projekt } from "@/lib/types";

type AnfrageKanal = { id: string; wert: string; bezeichnung: string; symbol: string; aktiv: boolean };
type AnfragePrioritaet = { id: string; wert: string; bezeichnung: string; aktiv: boolean };
type KundeOption = Pick<Kunde, "id" | "name" | "vorname">;

export function AnfrageForm({
  anfrage,
  kunden,
  projekte,
  mitarbeitende,
  kanaele,
  prioritaeten,
  action,
  error,
}: {
  anfrage?: Anfrage;
  kunden: KundeOption[];
  projekte: (Pick<Projekt, "id" | "bezeichnung"> & { kunde_id: string })[];
  mitarbeitende: { id: string; name: string }[];
  kanaele: AnfrageKanal[];
  prioritaeten: AnfragePrioritaet[];
  action: (formData: FormData) => void;
  error?: string;
}) {
  const [kundenListe, setKundenListe] = useState(kunden);
  const [kundeId, setKundeId] = useState(anfrage?.kunde_id ?? "");
  const [modalOffen, setModalOffen] = useState(false);
  const [speichertKunde, setSpeichertKunde] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Kunde direkt hier erfassen können (z.B. während eines Telefonats), ohne
  // die Anfrage-Erfassung zu verlassen und bereits eingegebene Angaben
  // (Titel, Beschreibung, …) zu verlieren. Adresse & Rechnungsangaben lassen
  // sich später unter "Kunden" ergänzen.
  async function handleNeuerKunde(formData: FormData) {
    setModalError(null);
    setSpeichertKunde(true);
    const { data, error } = await erstelleKundeSchnell(formData);
    setSpeichertKunde(false);

    if (error || !data) {
      setModalError(error ?? "Unbekannter Fehler.");
      return;
    }

    setKundenListe((liste) =>
      [...liste, data].sort((a, b) => a.name.localeCompare(b.name, "de-CH"))
    );
    setKundeId(data.id);
    setModalOffen(false);
  }

  return (
    <>
    <form action={action} className="space-y-5 bg-white rounded-lg border p-5 max-w-2xl">
      {error && (
        <div className="rounded bg-red-50 text-red-700 text-sm px-3 py-2">{error}</div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium" htmlFor="kunde_id">
              Kunde
            </label>
            <button
              type="button"
              onClick={() => setModalOffen(true)}
              className="text-xs text-arcos-steel hover:underline"
            >
              + Neuer Kunde
            </button>
          </div>
          <select
            id="kunde_id"
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
          <label className="block text-sm font-medium mb-1" htmlFor="projekt_id">
            Projekt (optional)
          </label>
          <select
            id="projekt_id"
            name="projekt_id"
            defaultValue={anfrage?.projekt_id ?? ""}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-arcos-steel"
          >
            <option value="">Kein Projekt</option>
            {projekte.map((p) => (
              <option key={p.id} value={p.id}>
                {p.bezeichnung}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="titel">
          Titel
        </label>
        <input
          id="titel"
          name="titel"
          required
          defaultValue={anfrage?.titel ?? ""}
          placeholder="Kurzer Betreff der Anfrage"
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-arcos-steel"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="beschreibung">
          Beschreibung
        </label>
        <textarea
          id="beschreibung"
          name="beschreibung"
          rows={3}
          defaultValue={anfrage?.beschreibung ?? ""}
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-arcos-steel"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="kanal">
            Kanal
          </label>
          <select
            id="kanal"
            name="kanal"
            defaultValue={anfrage?.kanal ?? kanaele.find((k) => k.wert === "sonstiges")?.wert ?? ""}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-arcos-steel"
          >
            {kanaele.map((k) => (
              <option key={k.id} value={k.wert}>
                {k.symbol} {k.bezeichnung}
                {!k.aktiv ? " (inaktiv)" : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="prioritaet">
            Priorität
          </label>
          <select
            id="prioritaet"
            name="prioritaet"
            defaultValue={
              anfrage?.prioritaet ?? prioritaeten.find((p) => p.wert === "normal")?.wert ?? ""
            }
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-arcos-steel"
          >
            {prioritaeten.map((p) => (
              <option key={p.id} value={p.wert}>
                {p.bezeichnung}
                {!p.aktiv ? " (inaktiv)" : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="wiedervorlage_am">
            Wiedervorlage
          </label>
          <input
            id="wiedervorlage_am"
            name="wiedervorlage_am"
            type="date"
            defaultValue={anfrage?.wiedervorlage_am ?? ""}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-arcos-steel"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="zugewiesen_an">
          Zugewiesen an
        </label>
        <select
          id="zugewiesen_an"
          name="zugewiesen_an"
          defaultValue={anfrage?.zugewiesen_an ?? ""}
          className="w-full max-w-xs rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-arcos-steel"
        >
          <option value="">Nicht zugewiesen</option>
          {mitarbeitende.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          className="rounded bg-arcos-steel text-white text-sm font-medium px-4 py-2 hover:bg-arcos-navy"
        >
          Speichern
        </button>
        <a
          href="/anfragen"
          className="rounded border text-sm font-medium px-4 py-2 hover:bg-gray-50"
        >
          Abbrechen
        </a>
      </div>
    </form>

    {/* Bewusst ausserhalb des äusseren <form>: verschachtelte <form>-Elemente
        sind ungültiges HTML und würden das Absenden beider Formulare
        durcheinanderbringen. */}
    {modalOffen && (
        <Modal titel="Neuer Kunde" onClose={() => setModalOffen(false)}>
          <form action={handleNeuerKunde} className="space-y-3">
            {modalError && (
              <div className="rounded bg-red-50 text-red-700 text-sm px-3 py-2">{modalError}</div>
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
                disabled={speichertKunde}
                className="rounded bg-arcos-steel text-white text-sm font-medium px-4 py-2 hover:bg-arcos-navy disabled:opacity-60"
              >
                {speichertKunde ? "Speichert…" : "Kunde anlegen"}
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
    </>
  );
}
