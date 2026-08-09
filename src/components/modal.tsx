"use client";

// Leichtgewichtiges, wiederverwendbares Modal – z.B. um Stammdaten (wie
// einen neuen Kunden) direkt aus einem anderen Formular heraus zu erfassen,
// ohne die aktuelle Seite zu verlassen und dabei bereits eingegebene Daten
// zu verlieren.
export function Modal({
  titel,
  onClose,
  children,
}: {
  titel: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-lg max-w-md w-full p-5 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium">{titel}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Schliessen"
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
