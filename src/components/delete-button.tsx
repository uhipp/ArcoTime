"use client";

export function DeleteButton({
  action,
  label = "Löschen",
  confirmText = "Wirklich löschen?",
  // Rot ist die Voreinstellung, weil der Knopf meistens etwas entfernt.
  // Für harmlose Vorgänge mit Rückfrage – etwa das Senden eines neuen
  // Zugangslinks – wäre Rot eine falsche Warnung.
  harmlos = false,
}: {
  action: (formData: FormData) => void;
  label?: string;
  confirmText?: string;
  harmlos?: boolean;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(confirmText)) e.preventDefault();
      }}
    >
      <button type="submit" className={`text-sm hover:underline ${harmlos ? "text-arcos-steel" : "text-red-600"}`}>
        {label}
      </button>
    </form>
  );
}
