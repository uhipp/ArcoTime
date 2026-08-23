"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";

function dauerSeit(start: string): string {
  const sekunden = Math.max(0, Math.floor((Date.now() - new Date(start).getTime()) / 1000));
  const h = Math.floor(sekunden / 3600);
  const m = Math.floor((sekunden % 3600) / 60);
  const s = sekunden % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}

// Laufzeit im Sekundentakt. Gerechnet wird ab dem gespeicherten
// Startzeitpunkt, nicht ab dem Öffnen der Seite – so stimmt die Anzeige
// auch, wenn das Telefon zwischendurch im Ruhezustand war.
function Laufzeit({ seit }: { seit: string }) {
  const [text, setText] = useState(() => dauerSeit(seit));

  useEffect(() => {
    const id = setInterval(() => setText(dauerSeit(seit)), 1000);
    return () => clearInterval(id);
  }, [seit]);

  return <span className="font-mono tabular-nums">{text}</span>;
}

function Knopf({
  laeuft,
  seit,
  gross,
}: {
  laeuft: boolean;
  seit: string | null;
  gross: boolean;
}) {
  const { pending } = useFormStatus();

  // Mindesthöhe 44 Pixel: Das ist die Grösse, die sich mit dem Daumen
  // sicher treffen lässt. Wer im Auto zielen muss, tut es während der
  // Fahrt.
  const basis =
    "inline-flex items-center justify-center gap-2 rounded font-medium disabled:opacity-60 disabled:cursor-not-allowed min-h-[44px]";
  const groesse = gross ? "w-full px-6 py-3 text-base" : "px-4 py-2 text-sm";
  // „Ankunft – Timer stoppen" und „Losfahren – Timer starten" hiess es bis
  // zum 23.08.2026. Die Wörter kamen von dem Fall, der den Timer veranlasst
  // hat – der Fahrzeit. Am Artikel „Beratung" stand dann „Ankunft", und der
  // Nutzer fragte zu Recht, warum. Ein Knopf, der eine Zeit misst, sagt nicht
  // voraus, WELCHE Zeit das ist.
  const farbe = laeuft
    ? "bg-red-600 text-white hover:bg-red-700"
    : "border border-arcos-steel text-arcos-steel hover:bg-arcos-steel hover:text-white";

  return (
    <button type="submit" disabled={pending} className={`${basis} ${groesse} ${farbe}`}>
      {laeuft ? (
        <>
          <span aria-hidden>■</span>
          Timer stoppen
          {seit && (
            <>
              {" · "}
              <Laufzeit seit={seit} />
            </>
          )}
        </>
      ) : (
        <>
          <span aria-hidden>▶</span>
          Timer starten
        </>
      )}
    </button>
  );
}

// Timer an einer Rapportposition.
//
// Der Anlass ist die Fahrzeit: Der Monteur sitzt im Fahrzeug, öffnet den
// Rapport des Kunden, startet den Timer und fährt los; bei der Ankunft
// stoppt er ihn. Zwei Berührungen, sonst nichts – deshalb ein einzelner
// grosser Knopf und kein Formular.
export function PositionsTimer({
  action,
  laeuft,
  seit,
  gross = false,
  id,
}: {
  action: () => Promise<void>;
  laeuft: boolean;
  seit: string | null;
  // Gross im Hinweisband über den Positionen, klein in der Tabellenzeile.
  gross?: boolean;
  id?: string;
}) {
  return (
    <form action={action} id={id}>
      <Knopf laeuft={laeuft} seit={seit} gross={gross} />
    </form>
  );
}
