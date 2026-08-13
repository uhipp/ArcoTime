"use client";

import { useState } from "react";
import { DatumFeld } from "@/components/datum-feld";

// Safari zeigt bei einem leeren <input type="date"> das heutige Datum als
// optische Vorschau an (kein echter Wert, siehe anfrage-form.tsx für die
// ausführliche Herleitung) – das kann leicht mit einem tatsächlich gesetzten
// Datum verwechselt werden. Lösung: das Feld existiert bei fehlendem Wert
// gar nicht als Datums-Input, sondern nur als "+ Datum setzen"-Link.
export function OptionalesDatumFeld({
  name,
  defaultValue,
  formId,
  className = "rounded border border-gray-300 px-2 py-1.5",
}: {
  name: string;
  defaultValue?: string | null;
  formId?: string;
  className?: string;
}) {
  const [aktiv, setAktiv] = useState(Boolean(defaultValue));
  const [wert, setWert] = useState(defaultValue ?? "");

  if (!aktiv) {
    return (
      <button
        type="button"
        onClick={() => setAktiv(true)}
        className="text-xs text-arcos-steel hover:underline whitespace-nowrap"
      >
        + Datum setzen
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-1">
      <DatumFeld
        name={name}
        value={wert}
        onChange={(e) => setWert(e.target.value)}
        form={formId}
        className={className}
      />
      <button
        type="button"
        onClick={() => {
          setAktiv(false);
          setWert("");
        }}
        title="Entfernen"
        className="text-xs text-gray-400 hover:text-red-600"
      >
        ✕
      </button>
    </span>
  );
}
