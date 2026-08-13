"use client";

import { forwardRef } from "react";

// Datumseingabe für die ganze Anwendung.
//
// Grund für die eigene Komponente: Safari schliesst den nativen
// Datumsauswähler nach der Auswahl eines Tages NICHT von selbst – man muss
// daneben klicken, um ihn loszuwerden. Ein blur() direkt nach der Änderung
// schliesst ihn.
//
// Das native Feld bleibt bewusst erhalten: Auf dem Tablet ist der
// Systemauswähler mit Abstand die beste Bedienung, und ein nachgebauter
// Kalender wäre dort ein Rückschritt.
//
// Der blur betrifft auch die Tastatureingabe – dort feuert "change" aber
// erst, wenn das Datum vollständig und gültig ist. Der Fokus wandert also
// nicht mitten im Tippen weg.
export const DatumFeld = forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  function DatumFeld({ className, onChange, ...rest }, ref) {
    return (
      <input
        {...rest}
        ref={ref}
        type="date"
        onChange={(e) => {
          onChange?.(e);
          const el = e.currentTarget;
          // Im nächsten Frame, damit der Browser die Auswahl zuerst
          // übernimmt – ein sofortiger blur verwirft sie in manchen
          // Safari-Versionen.
          requestAnimationFrame(() => el.blur());
        }}
        className={
          className ??
          "w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-arcos-steel"
        }
      />
    );
  }
);
