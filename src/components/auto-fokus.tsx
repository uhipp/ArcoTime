"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

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
// Wichtig: Der Parameter muss nach dem Anspringen wieder aus der Adresse
// verschwinden. Sonst trägt die zweite gespeicherte Position denselben
// Wert wie die erste, der Effekt sieht keine Änderung und springt nicht –
// genau das ist passiert.
//
// Zuständig fürs Aufräumen ist der Toast, solange auch "erfolg" in der
// Adresse steht: Beide Komponenten hängen im selben Layout, und wenn beide
// unabhängig die Adresse neu schreiben, setzt die spätere den Parameter
// der früheren wieder ein. Steht "fokus" ausnahmsweise allein, räumt diese
// Komponente selbst auf.
export function AutoFokus() {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const ziel = params.get("fokus");
  const alleine = ziel != null && params.get("erfolg") == null;

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

    if (alleine) {
      const rest = new URLSearchParams(params.toString());
      rest.delete("fokus");
      const query = rest.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    }
    // params/router/pathname bewusst nicht in der Liste: Sie ändern sich
    // beim Aufräumen selbst und würden den Effekt sonst erneut auslösen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ziel, alleine]);

  return null;
}
