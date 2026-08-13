"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

// Springt nach dem Speichern zurück ins Erfassungsformular.
//
// Server Actions leiten auf die Seite zurück, die dann oben beginnt. Bei
// einem Formular am Seitenende hiesse das nach jedem Eintrag erneut
// scrollen und klicken – bei fünf Positionen fünfmal.
//
// Bewusst zentral im App-Layout statt je Formular: Eine Aktion hängt
// "?fokus=<element-id>" an ihre Redirect-URL, das Zielfeld braucht nur eine
// id. Damit gilt die Regel überall gleich, auch für Formulare, die es noch
// nicht gibt.
export function AutoFokus() {
  const params = useSearchParams();
  const ziel = params.get("fokus");

  useEffect(() => {
    if (!ziel) return;

    const el = document.getElementById(ziel);
    if (!el) return;

    // "center" statt "start": Der eben gespeicherte Eintrag soll oberhalb
    // sichtbar bleiben, damit man die Bestätigung sieht.
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    // preventScroll, weil scrollIntoView die Position bereits setzt –
    // sonst ruckelt es zweimal.
    (el as HTMLElement & { focus?: (o?: FocusOptions) => void }).focus?.({
      preventScroll: true,
    });
  }, [ziel]);

  return null;
}
