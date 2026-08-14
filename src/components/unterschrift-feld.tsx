"use client";

import { useEffect, useRef, useState } from "react";

// Unterschriftsfeld für Maus, Stift und Finger.
//
// Bewusst ein eigenes Feld statt einer Bibliothek: Was hier gebraucht
// wird, sind ein paar Linien zwischen Zeigerereignissen – dafür eine
// Abhängigkeit aufzunehmen, die gepflegt werden will, lohnt nicht.
//
// Gezeichnet wird über Pointer Events. Sie decken Maus, Stift und Finger
// mit demselben Code ab; getrennte Touch-Behandlung wäre dreimal
// dasselbe. touch-action: none ist dabei nötig, sonst scrollt das Tablet
// die Seite, statt zu zeichnen.
export function UnterschriftFeld({ name }: { name: string }) {
  const leinwand = useRef<HTMLCanvasElement | null>(null);
  const zeichnet = useRef(false);
  const [leer, setLeer] = useState(true);
  const [wert, setWert] = useState("");

  useEffect(() => {
    const el = leinwand.current;
    if (!el) return;

    // Auflösung des Geräts berücksichtigen, sonst sieht die Linie auf
    // einem Tablet ausgefranst aus.
    const dichte = window.devicePixelRatio || 1;
    const breite = el.clientWidth;
    const hoehe = el.clientHeight;
    el.width = breite * dichte;
    el.height = hoehe * dichte;

    const ctx = el.getContext("2d");
    if (!ctx) return;
    ctx.scale(dichte, dichte);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0E0C19";
  }, []);

  function punkt(e: React.PointerEvent<HTMLCanvasElement>) {
    const el = leinwand.current!;
    const rahmen = el.getBoundingClientRect();
    return { x: e.clientX - rahmen.left, y: e.clientY - rahmen.top };
  }

  function beginnen(e: React.PointerEvent<HTMLCanvasElement>) {
    const ctx = leinwand.current?.getContext("2d");
    if (!ctx) return;
    // Zeiger einfangen: Wer über den Rand hinauszeichnet, soll die Linie
    // nicht abreissen sehen.
    leinwand.current?.setPointerCapture(e.pointerId);
    zeichnet.current = true;
    const p = punkt(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  }

  function ziehen(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!zeichnet.current) return;
    const ctx = leinwand.current?.getContext("2d");
    if (!ctx) return;
    const p = punkt(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }

  function beenden() {
    if (!zeichnet.current) return;
    zeichnet.current = false;
    const el = leinwand.current;
    if (!el) return;
    setLeer(false);
    // Erst beim Loslassen in das versteckte Feld schreiben – bei jedem
    // Strich das ganze Bild zu kodieren wäre unnötige Arbeit.
    setWert(el.toDataURL("image/png"));
  }

  function loeschen() {
    const el = leinwand.current;
    const ctx = el?.getContext("2d");
    if (!el || !ctx) return;
    ctx.clearRect(0, 0, el.width, el.height);
    setLeer(true);
    setWert("");
  }

  return (
    <div>
      <canvas
        ref={leinwand}
        onPointerDown={beginnen}
        onPointerMove={ziehen}
        onPointerUp={beenden}
        onPointerLeave={beenden}
        className="w-full h-40 rounded border border-gray-300 bg-white touch-none cursor-crosshair"
      />
      <div className="flex items-center justify-between mt-1">
        <p className="text-xs text-gray-400">
          {leer ? "Hier unterschreiben." : "Unterschrift erfasst."}
        </p>
        <button
          type="button"
          onClick={loeschen}
          className="text-xs text-gray-500 hover:text-red-600"
        >
          Löschen
        </button>
      </div>
      <input type="hidden" name={name} value={wert} />
    </div>
  );
}
