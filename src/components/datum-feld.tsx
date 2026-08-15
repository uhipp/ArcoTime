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
//
// autoComplete="off": Ein leeres Datumsfeld muss leer bleiben. Browser
// stellen Formularwerte nach einer Weiterleitung oder beim Zurückgehen
// gerne wieder her, und bei einem Feld wie "Austritt" ist das nicht
// bloss lästig – ein Datum, das niemand eingetragen hat, beendet dort
// ein unbefristetes Arbeitsverhältnis.
//
// WICHTIG für optionale Datumsfelder: Safari zeigt in einem LEEREN
// <input type="date"> das heutige Datum als graue Vorschau an. Es ist
// kein Wert und wird nicht gespeichert – von einem echten Datum ist es
// aber nicht zu unterscheiden. Bei einem Feld wie "Austritt" sieht damit
// jede Person aus, als hätte sie heute gekündigt.
//
// Für alles, was leer bleiben darf, deshalb OptionalesDatumFeld
// verwenden: Ohne Wert gibt es dort gar kein Datumsfeld, sondern nur
// "+ Datum setzen".
//
// Grundregel dazu: Datumsfelder werden NIE mit dem heutigen Datum
// vorbelegt. Ein vorbelegtes Datum wird übersehen und mitgespeichert;
// das leere Feld zwingt zur bewussten Angabe. Ausnahmen sind Filter und
// Zeiträume, die eine Ansicht steuern und nichts speichern.
export const DatumFeld = forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  function DatumFeld({ className, onChange, ...rest }, ref) {
    return (
      <input
        autoComplete="off"
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
