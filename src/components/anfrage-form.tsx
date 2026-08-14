"use client";

import { useActionState, useState } from "react";
import type { FormularErgebnis } from "@/lib/formular-ergebnis";
import { useKundeSchnellErstellen } from "@/components/kunde-schnell-erstellen";
import { useProjektSchnellErstellen } from "@/components/projekt-schnell-erstellen";
import type { Anfrage, Kunde, Projekt } from "@/lib/types";
import { DatumFeld } from "@/components/datum-feld";
import Link from "next/link";
import { AbsendeKnopf } from "@/components/absende-knopf";

type AnfrageKanal = { id: string; wert: string; bezeichnung: string; symbol: string; aktiv: boolean };
type AnfragePrioritaet = { id: string; wert: string; bezeichnung: string; aktiv: boolean };
type KundeOption = Pick<Kunde, "id" | "name" | "vorname">;
type ProjektOption = Pick<Projekt, "id" | "bezeichnung"> & { kunde_id: string };

export function AnfrageForm({
  anfrage,
  kunden,
  projekte,
  mitarbeitende,
  kanaele,
  prioritaeten,
  action,
  error,
  children,
}: {
  anfrage?: Anfrage;
  kunden: KundeOption[];
  projekte: ProjektOption[];
  mitarbeitende: { id: string; name: string }[];
  kanaele: AnfrageKanal[];
  prioritaeten: AnfragePrioritaet[];
  action: (bisher: FormularErgebnis, formData: FormData) => Promise<FormularErgebnis>;
  error?: string;
  // Der Erledigen-Block der Detailseite. Er liegt bewusst INNERHALB dieses
  // Formulars: als eigenes <form> daneben gingen Änderungen an Titel und
  // Beschreibung beim Klick auf "Erledigen" verloren, weil der Browser nur
  // das Formular des gedrückten Buttons abschickt. Sein Submit-Button
  // überschreibt die Aktion per formAction.
  children?: React.ReactNode;
}) {
  // Fehler kommt aus der Aktion zurück statt per Weiterleitung – so bleibt
  // die Eingabe stehen (siehe lib/formular-ergebnis). Weil an diesem
  // Formular vier Absichten hängen, verzweigt eine einzige Aktion über das
  // Feld "absicht" des gedrückten Knopfs.
  const [ergebnis, formAction] = useActionState(action, null);
  const meldung = ergebnis?.fehler ?? error;
  const [kundenListe, setKundenListe] = useState(kunden);
  const [kundeId, setKundeId] = useState(anfrage?.kunde_id ?? "");
  const [projekteListe, setProjekteListe] = useState(projekte);
  const [projektId, setProjektId] = useState(anfrage?.projekt_id ?? "");
  const [wiedervorlageAm, setWiedervorlageAm] = useState(anfrage?.wiedervorlage_am ?? "");
  // Steuert, ob das Datumsfeld überhaupt angezeigt wird (siehe Kommentar
  // weiter unten beim Feld selbst – Safari-Rendering-Eigenart).
  const [wiedervorlageAktiv, setWiedervorlageAktiv] = useState(Boolean(anfrage?.wiedervorlage_am));

  const kundeHook = useKundeSchnellErstellen((kunde) => {
    setKundenListe((liste) => [...liste, kunde].sort((a, b) => a.name.localeCompare(b.name, "de-CH")));
    setKundeId(kunde.id);
  });

  // Nur Projekte des gewählten Kunden zur Auswahl stellen. Ohne diesen Filter
  // liesse sich eine Anfrage an ein Projekt einer fremden Kundin hängen –
  // die Detailseite filtert im Erledigen-Block längst genauso.
  const projekteDesKunden = kundeId
    ? projekteListe.filter((p) => p.kunde_id === kundeId)
    : [];

  // Kundenwechsel: eine Projektauswahl, die nicht zum neuen Kunden gehört,
  // verwerfen. Sonst bliebe sie unsichtbar im State stehen (die Option ist
  // ja ausgeblendet) und würde beim Speichern mitgeschickt.
  function waehleKunde(neuerKundeId: string) {
    setKundeId(neuerKundeId);
    setProjektId((aktuell) => {
      const projekt = projekteListe.find((p) => p.id === aktuell);
      return projekt?.kunde_id === neuerKundeId ? aktuell : "";
    });
  }

  const projektHook = useProjektSchnellErstellen({
    kunden: kundenListe,
    vorausgewaehlterKunde: kundeId,
    onErstellt: (projekt) => {
      setProjekteListe((liste) =>
        [...liste, projekt].sort((a, b) => a.bezeichnung.localeCompare(b.bezeichnung, "de-CH"))
      );
      setProjektId(projekt.id);
    },
  });

  return (
    <>
      <form action={formAction} className="space-y-5 bg-white rounded-lg border p-5 max-w-2xl">
        {meldung && (
          <div className="rounded bg-red-50 text-red-700 text-sm px-3 py-2">{meldung}</div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              onChange={(e) => waehleKunde(e.target.value)}
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
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium" htmlFor="projekt_id">
                Projekt (optional)
              </label>
              {projektHook.trigger}
            </div>
            <select
              id="projekt_id"
              name="projekt_id"
              value={projektId}
              onChange={(e) => setProjektId(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-arcos-steel"
            >
              <option value="">Kein Projekt</option>
              {projekteDesKunden.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.bezeichnung}
                </option>
              ))}
            </select>
            {!kundeId && (
              <p className="text-xs text-gray-400 mt-1">
                Bitte zuerst den Kunden wählen.
              </p>
            )}
            {kundeId && projekteDesKunden.length === 0 && (
              <p className="text-xs text-gray-400 mt-1">
                Für diesen Kunden ist noch kein Projekt erfasst.
              </p>
            )}
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
            <label className="block text-sm font-medium mb-1">Wiedervorlage</label>
            {/* Das native <input type="date"> wird bewusst NICHT dauerhaft
                angezeigt: Safari rendert ein leeres Datumsfeld mit dem
                heutigen Datum als optische Vorschau (kein echter Wert, aber
                leicht mit einem gesetzten Datum zu verwechseln – lässt sich
                über kein Attribut abstellen). Stattdessen erscheint das
                Feld erst nach einem bewussten Klick, dann darf es ruhig
                mit "heute" starten, weil dann klar ist, dass wirklich ein
                Datum gewünscht ist. */}
            {wiedervorlageAktiv ? (
              <div className="flex items-center gap-2">
                <DatumFeld
                  id="wiedervorlage_am"
                  autoComplete="off"
                  value={wiedervorlageAm}
                  onChange={(e) => setWiedervorlageAm(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-arcos-steel"
                />
                <button
                  type="button"
                  onClick={() => {
                    setWiedervorlageAktiv(false);
                    setWiedervorlageAm("");
                  }}
                  className="text-xs text-gray-400 hover:text-red-600 shrink-0"
                >
                  Entfernen
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setWiedervorlageAktiv(true)}
                className="text-sm text-arcos-steel hover:underline"
              >
                + Datum setzen
              </button>
            )}
            <input type="hidden" name="wiedervorlage_am" value={wiedervorlageAktiv ? wiedervorlageAm : ""} />
            <p className="text-xs text-gray-400 mt-1">
              Nur setzen, wenn diese Anfrage an einem bestimmten Datum
              wieder aufgegriffen werden soll.
            </p>
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
          <AbsendeKnopf
            laufttext="Wird gespeichert…"
            className="rounded bg-arcos-steel text-white text-sm font-medium px-4 py-2 hover:bg-arcos-navy disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Speichern
          </AbsendeKnopf>
          <Link
            href="/anfragen"
            className="rounded border text-sm font-medium px-4 py-2 hover:bg-gray-50"
          >
            Abbrechen
          </Link>
        </div>

        {children}
      </form>

      {/* Bewusst ausserhalb des äusseren <form>: verschachtelte <form>-Elemente
          sind ungültiges HTML und würden das Absenden beider Formulare
          durcheinanderbringen. */}
      {kundeHook.modal}
      {projektHook.modal}
    </>
  );
}
