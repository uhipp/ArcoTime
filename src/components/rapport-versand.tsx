"use client";

import { useActionState } from "react";
import { AbsendeKnopf } from "@/components/absende-knopf";
import type { FormularErgebnis } from "@/lib/formular-ergebnis";

// Rapport als PDF an den Kunden senden.
//
// Erscheint erst nach dem Abschluss: Ein Entwurf ist noch keine Aussage
// über geleistete Arbeit, und wer eine geänderte Fassung nachreichen
// muss, verliert das Vertrauen in beide.
//
// Der Versand ist bewusst kein einzelner Knopf, sondern ein Formular mit
// sichtbarer Empfängeradresse: Ein Mail an den falschen Kunden lässt sich
// nicht zurückholen.
export function RapportVersand({
  action,
  vorgabeEmpfaenger,
  versendetAn,
  versendetAm,
}: {
  action: (bisher: FormularErgebnis, formData: FormData) => Promise<FormularErgebnis>;
  vorgabeEmpfaenger: string | null;
  versendetAn: string | null;
  versendetAm: string | null;
}) {
  const [ergebnis, formAction] = useActionState(action, null);

  return (
    <div className="bg-white rounded-lg border p-5 max-w-2xl">
      <h2 className="text-lg font-medium mb-1">An den Kunden senden</h2>
      <p className="text-sm text-gray-500 mb-4">
        Der Rapport geht als PDF-Anhang raus. Antworten des Kunden landen bei
        eurer Organisation, nicht bei ArcoTime.
      </p>

      {versendetAn && (
        <p className="rounded bg-green-50 text-green-800 text-sm px-3 py-2 mb-4">
          Bereits gesendet an <strong>{versendetAn}</strong>
          {versendetAm ? ` am ${new Date(versendetAm).toLocaleString("de-CH")}` : ""}. Ein
          erneutes Senden ist möglich.
        </p>
      )}

      <form action={formAction} className="space-y-3">
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="empfaenger">
            Empfänger
          </label>
          <input
            id="empfaenger"
            name="empfaenger"
            type="email"
            required
            defaultValue={versendetAn ?? vorgabeEmpfaenger ?? ""}
            placeholder="name@firma.ch"
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-arcos-steel"
          />
          {!vorgabeEmpfaenger && (
            <p className="text-xs text-gray-400 mt-1">
              Beim Kunden ist keine E-Mail-Adresse hinterlegt – bitte hier
              eintragen oder beim Kunden ergänzen.
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="nachricht">
            Nachricht (optional)
          </label>
          <textarea
            id="nachricht"
            name="nachricht"
            rows={3}
            placeholder="Bleibt leer, wenn nichts weiter zu sagen ist – dann geht ein kurzer Standardtext raus."
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-arcos-steel"
          />
        </div>

        {ergebnis?.fehler && (
          <div className="rounded bg-red-50 text-red-700 text-sm px-3 py-2">
            {ergebnis.fehler}
          </div>
        )}

        <AbsendeKnopf
          laufttext="Wird gesendet…"
          className="rounded bg-arcos-steel text-white text-sm font-medium px-4 py-2 hover:bg-arcos-navy disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {versendetAn ? "Erneut senden" : "Senden"}
        </AbsendeKnopf>
      </form>
    </div>
  );
}
