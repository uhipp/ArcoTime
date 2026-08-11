"use client";

export function HilfeDruckenButton({ label = "Drucken" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="print:hidden rounded border text-sm font-medium px-3 py-1.5 hover:bg-gray-50"
    >
      🖨 {label}
    </button>
  );
}
