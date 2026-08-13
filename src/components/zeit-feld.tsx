"use client";

import { useState } from "react";
import { normalisiereZeit } from "@/lib/zeit";

// Uhrzeit-Eingabe als Textfeld statt <input type="time">.
//
// Warum kein natives Zeitfeld: siehe Kommentar in lib/zeit.ts – Safari zeigt
// eine nicht abschaltbare Uhrzeit-Vorschau und liefert während der Eingabe
// keinen Zwischenstand.
//
// Getippt wird frei ("1030", "10.30", "10:30"), aufgeräumt wird beim
// Verlassen des Felds. So stört die Formatierung nicht beim Schreiben, und
// gespeichert wird trotzdem immer HH:MM.
export function ZeitFeld({
  id,
  name,
  startwert,
  onZeit,
  disabled,
}: {
  id: string;
  name: string;
  startwert: string;
  // Bekommt die normalisierte Zeit ("10:30") oder null, wenn das Feld leer
  // bzw. unbrauchbar ist.
  onZeit: (zeit: string | null) => void;
  disabled?: boolean;
}) {
  const [text, setText] = useState(startwert);

  function aufraeumen(roh: string) {
    const normalisiert = normalisiereZeit(roh);
    // Bei unbrauchbarer Eingabe das Feld leeren statt etwas zu erfinden –
    // "25:70" darf nicht stillschweigend zu einer gültigen Zeit werden.
    setText(normalisiert ?? "");
    onZeit(normalisiert);
  }

  return (
    <input
      id={id}
      name={name}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      placeholder="HH:MM"
      maxLength={5}
      disabled={disabled}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={(e) => aufraeumen(e.target.value)}
      // Enter würde sonst das Formular abschicken, bevor das Feld
      // aufgeräumt ist – dann ginge "1030" ungeprüft an den Server.
      onKeyDown={(e) => {
        if (e.key === "Enter") aufraeumen(e.currentTarget.value);
      }}
      onFocus={(e) => {
        const el = e.currentTarget;
        requestAnimationFrame(() => el.select());
      }}
      className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-arcos-steel disabled:bg-gray-100 disabled:text-gray-500"
    />
  );
}
