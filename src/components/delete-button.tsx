"use client";

export function DeleteButton({
  action,
  label = "Löschen",
  confirmText = "Wirklich löschen?",
}: {
  action: (formData: FormData) => void;
  label?: string;
  confirmText?: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(confirmText)) e.preventDefault();
      }}
    >
      <button type="submit" className="text-sm text-red-600 hover:underline">
        {label}
      </button>
    </form>
  );
}
