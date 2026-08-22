"use client";

export function DeleteButton({
  action,
  label = "Löschen",
  confirmText = "Wirklich löschen?",
  // Rot ist die Voreinstellung, weil der Knopf meistens etwas entfernt.
  // Für harmlose Vorgänge mit Rückfrage – etwa das Senden eines neuen
  // Zugangslinks – wäre Rot eine falsche Warnung.
  harmlos = false,
  // Grau, bis man darüberfährt. Für Zeilen in einer Liste: Zwölf rote
  // "entfernen" untereinander sehen nach Alarm aus, obwohl nichts los ist.
  // Bei den Kundenpreisen war es von Anfang an so, und der Nutzer hat es
  // am 22.08.2026 für die Kontaktlisten ausdrücklich gewünscht.
  leise = false,
}: {
  action: (formData: FormData) => void;
  label?: string;
  confirmText?: string;
  harmlos?: boolean;
  leise?: boolean;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(confirmText)) e.preventDefault();
      }}
    >
      <button
        type="submit"
        className={
          leise
            ? "text-xs text-gray-400 hover:text-red-600"
            : `text-sm hover:underline ${harmlos ? "text-arcos-steel" : "text-red-600"}`
        }
      >
        {label}
      </button>
    </form>
  );
}
