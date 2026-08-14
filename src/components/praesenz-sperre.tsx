"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { beendePraesenz, meldePraesenz, type Anwesende } from "@/app/actions/praesenz";

// Takt der Lebenszeichen. Deutlich kürzer als die Verfallszeit von zwei
// Minuten, damit ein einzelner Aussetzer niemanden verdrängt.
const TAKT_MS = 30_000;

const SperrKontext = createContext(false);

// Fragt der Absende-Knopf ab: Solange jemand anders am selben Datensatz
// arbeitet, sperrt er sich selbst.
export function useGesperrt(): boolean {
  return useContext(SperrKontext);
}

// Zeigt an, wer denselben Datensatz gerade offen hat – und sperrt das
// Speichern, solange das der Fall ist.
//
// Ergänzung zur Konfliktprüfung, nicht ihr Ersatz: Die Prüfung beim
// Speichern verhindert den Datenverlust zuverlässig, meldet ihn aber
// erst, wenn die Arbeit getan ist. Dieser Hinweis kommt beim Öffnen.
//
// Warum das Speichern wirklich gesperrt wird und nicht nur ein Hinweis
// erscheint: Ein Text "wird gerade bearbeitet" neben einem Knopf, der
// trotzdem speichert, wäre eine Einladung zum Konflikt. Weil die
// Anwesenheit nach zwei Minuten ohne Lebenszeichen von selbst abläuft,
// bleibt dabei niemand dauerhaft ausgesperrt – anders als bei einer
// echten Sperre, die jemand von Hand aufheben müsste.
export function PraesenzSperre({
  bereich,
  bezugId,
  children,
}: {
  bereich: string;
  bezugId: string;
  children: React.ReactNode;
}) {
  const [andere, setAndere] = useState<Anwesende>([]);

  useEffect(() => {
    let beendet = false;

    const melden = async () => {
      try {
        const liste = await meldePraesenz(bereich, bezugId);
        if (!beendet) setAndere(liste);
      } catch {
        // Der Hinweis ist Komfort. Scheitert die Meldung, bleibt das
        // Formular benutzbar – die Konfliktprüfung beim Speichern greift
        // ohnehin unabhängig davon.
      }
    };

    melden();
    const takt = setInterval(melden, TAKT_MS);

    return () => {
      beendet = true;
      clearInterval(takt);
      // Aufräumen, so gut es geht. Der Browser garantiert keinen Aufruf
      // beim Schliessen des Tabs – deshalb läuft die Anwesenheit ohnehin
      // von selbst ab.
      void beendePraesenz(bereich, bezugId);
    };
  }, [bereich, bezugId]);

  const gesperrt = andere.length > 0;
  const namen = andere.map((a) => a.name);

  return (
    <SperrKontext.Provider value={gesperrt}>
      {gesperrt && (
        <div
          role="status"
          className="rounded bg-amber-50 text-amber-900 text-sm px-3 py-2 mb-4"
        >
          <strong>
            {namen.length === 1
              ? `${namen[0]} bearbeitet diesen Datensatz gerade.`
              : `${namen.slice(0, -1).join(", ")} und ${namen[namen.length - 1]} bearbeiten diesen Datensatz gerade.`}
          </strong>{" "}
          Änderungen lassen sich im Moment nicht speichern. Sobald
          {namen.length === 1 ? " die Bearbeitung" : " die Bearbeitungen"} beendet
          {namen.length === 1 ? " ist" : " sind"}, gibt ArcoTime das Formular von
          selbst wieder frei.
        </div>
      )}
      {children}
    </SperrKontext.Provider>
  );
}
