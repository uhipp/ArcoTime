"use client";

import { useActionState, useEffect, useState } from "react";
import { useKundeSchnellErstellen } from "@/components/kunde-schnell-erstellen";
import type { Kunde, Projekt } from "@/lib/types";
import { DatumFeld } from "@/components/datum-feld";
import Link from "next/link";
import type { FormularErgebnis } from "@/lib/formular-ergebnis";
import { AbsendeKnopf } from "@/components/absende-knopf";
import { STAND_FELD } from "@/lib/konflikt";
import {
  ladeStandorteDesKunden,
  type StandortOption,
} from "@/app/actions/standorte";

export function ProjektForm({
  projekt,
  kunden,
  mitarbeitende,
  action,
  error,
  standorteAktiv = false,
  kundeVorgabe,
}: {
  projekt?: Projekt;
  kunden: Pick<Kunde, "id" | "name" | "vorname">[];
  mitarbeitende: { id: string; name: string }[];
  action: (bisher: FormularErgebnis, formData: FormData) => Promise<FormularErgebnis>;
  error?: string;
  // Ortsebene eingeschaltet? (0076). Aus heisst: kein Feld, und die
  // Datenbank setzt den Standardstandort des Kunden selbst.
  standorteAktiv?: boolean;
  // Kommt der Weg aus der Kundenmaske, ist der Kunde schon bekannt.
  kundeVorgabe?: string;
}) {

  // Fehler kommt aus der Aktion zurueck statt per Weiterleitung –
  // so bleibt die Eingabe stehen (siehe lib/formular-ergebnis).
  const [ergebnis, formAction] = useActionState(action, null);
  const meldung = ergebnis?.fehler ?? error;
  const [kundenListe, setKundenListe] = useState(kunden);
  const [kundeId, setKundeId] = useState(projekt?.kunde_id ?? kundeVorgabe ?? "");

  // WO gearbeitet wird – die zweite Achse des Auftrags neben WER bestellt
  // (0077). Die Orte hängen am gewählten Kunden und werden deshalb beim
  // Wechsel nachgeladen statt alle mitgeliefert.
  const [standorte, setStandorte] = useState<StandortOption[]>([]);
  const [standortId, setStandortId] = useState(projekt?.standort_id ?? "");

  useEffect(() => {
    // Kein Zurücksetzen im Effektkörper: Das Kundenfeld hat keinen wählbaren
    // Leerwert, es geht also nie von einem Kunden zurück auf keinen. Die Liste
    // wird nur in der Antwort gesetzt – ein synchrones setState hier wäre eine
    // Kaskade von Renderdurchläufen.
    if (!standorteAktiv || !kundeId) return;
    let abgebrochen = false;
    void ladeStandorteDesKunden(kundeId).then((liste) => {
      if (abgebrochen) return;
      setStandorte(liste);
      // Die bisherige Wahl behalten, wenn sie zum Kunden passt – sonst der
      // Standardstandort. Nach einem Kundenwechsel wäre der alte Ort die
      // Adresse eines fremden Kunden.
      setStandortId((bisher) =>
        liste.some((s) => s.id === bisher)
          ? bisher
          : (liste.find((s) => s.ist_standard)?.id ?? liste[0]?.id ?? "")
      );
    });
    return () => {
      abgebrochen = true;
    };
  }, [kundeId, standorteAktiv]);

  const kundeHook = useKundeSchnellErstellen((kunde) => {
    setKundenListe((liste) => [...liste, kunde].sort((a, b) => a.name.localeCompare(b.name, "de-CH")));
    setKundeId(kunde.id);
  });

  return (
    <>
    <form action={formAction} className="space-y-6 max-w-2xl">
      {/* Stand beim Öffnen. Beim Speichern wird geprüft, ob der
          Datensatz seither unverändert ist – siehe lib/konflikt. */}
      {projekt?.updated_at && (
        <input type="hidden" name={STAND_FELD} value={String(projekt.updated_at)} />
      )}
      {meldung && (
        <div className="rounded bg-red-50 text-red-700 text-sm px-3 py-2">
          {meldung}
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium" htmlFor="kunde_id">
            Kunde
          </label>
          {kundeHook.trigger}
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

      {standorteAktiv && (
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="standort_id">
            Einsatzort
          </label>
          <select
            id="standort_id"
            name="standort_id"
            required
            value={standortId}
            onChange={(e) => setStandortId(e.target.value)}
            disabled={standorte.length === 0}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-arcos-steel disabled:bg-gray-50"
          >
            <option value="" disabled>
              {kundeId
                ? standorte.length === 0
                  ? "Für diesen Kunden ist kein Standort erfasst"
                  : "Bitte wählen…"
                : "Zuerst den Kunden wählen"}
            </option>
            {standorte.map((s) => (
              <option key={s.id} value={s.id}>
                {s.bezeichnung}
                {s.ort ? `, ${s.ort}` : ""}
                {s.ist_standard ? " (Standard)" : ""}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-400 mt-1">
            Wo gearbeitet wird. Bestimmt die Adresse auf dem Rapport und die
            Anfahrt – neue Orte kommen beim Kunden unter „Standorte“ dazu.
          </p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="bezeichnung">
          Bezeichnung
        </label>
        <input
          id="bezeichnung"
          name="bezeichnung"
          required
          defaultValue={projekt?.bezeichnung ?? ""}
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-arcos-steel"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="status">
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={projekt?.status ?? "aktiv"}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-arcos-steel"
          >
            <option value="aktiv">Aktiv</option>
            <option value="inaktiv">Inaktiv</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="startdatum">
            Startdatum
          </label>
          <DatumFeld
            id="startdatum"
            name="startdatum"
            // Kein heutiges Datum als Vorgabe: Ein vorbelegtes Datum wird
            // übersehen und mitgespeichert.
            defaultValue={projekt?.startdatum ?? ""}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-arcos-steel"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="projektleiter_id">
          Projektleitung
        </label>
        <select
          id="projektleiter_id"
          name="projektleiter_id"
          defaultValue={projekt?.projektleiter_id ?? ""}
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-arcos-steel"
        >
          <option value="">Niemand zugewiesen</option>
          {mitarbeitende.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-400 mt-1">
          Verantwortet das Projekt. Wird beim Anlegen eines Rapports
          vorgeschlagen.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="kostenstelle">
          Kostenstelle
        </label>
        <input
          id="kostenstelle"
          name="kostenstelle"
          defaultValue={projekt?.kostenstelle ?? ""}
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-arcos-steel"
        />
        <p className="text-xs text-gray-400 mt-1">
          Wird bei jedem Zeiteintrag dieses Projekts automatisch in den Export
          übernommen.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="naechste_belegnummer">
          Nächste Belegnummer
        </label>
        <input
          id="naechste_belegnummer"
          name="naechste_belegnummer"
          type="number"
          placeholder="470000"
          defaultValue={projekt?.naechste_belegnummer ?? ""}
          className="w-full max-w-xs rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-arcos-steel"
        />
        <p className="text-xs text-gray-400 mt-1">
          Wird beim nächsten Export für dieses Projekt vergeben und danach
          automatisch um 1 erhöht. Nur ändern, wenn du z.B. an eine bestehende
          Nummerierung im Buchhaltungssystem anschliessen willst.
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="sichtbar_fuer_alle"
          defaultChecked={projekt?.sichtbar_fuer_alle ?? true}
        />
        Für alle Mitarbeitende sichtbar
      </label>

      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="notizen">
          Notizen
        </label>
        <textarea
          id="notizen"
          name="notizen"
          rows={3}
          defaultValue={projekt?.notizen ?? ""}
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-arcos-steel"
        />
      </div>

      <div className="flex gap-3">
        <AbsendeKnopf
          laufttext="Wird gespeichert…"
          className="rounded bg-arcos-steel text-white text-sm font-medium px-4 py-2 hover:bg-arcos-navy disabled:opacity-60 disabled:cursor-not-allowed"
        >
          Speichern
        </AbsendeKnopf>
        <Link
          href="/projekte"
          className="rounded border text-sm font-medium px-4 py-2 hover:bg-gray-50"
        >
          Abbrechen
        </Link>
      </div>
    </form>

    {kundeHook.modal}
    </>
  );
}
