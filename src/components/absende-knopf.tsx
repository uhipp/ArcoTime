"use client";

import { useFormStatus } from "react-dom";

// Absende-Knopf, der sich während der laufenden Server Action selbst
// sperrt.
//
// Anlass: Beim Setzen des ersten Passworts nach einer Einladung meldete
// ArcoTime "New password should be different from the old password" –
// eine Meldung, die für jemanden, der gerade erst eingeladen wurde, keinen
// Sinn ergibt. Naheliegende Erklärung: Der Knopf gab keinerlei Rückmeldung,
// die Runde über Vercel und Supabase dauert einen Moment, und wer ein
// zweites Mal klickt, schickt dieselbe Anfrage nochmals. Der erste Aufruf
// setzt das Passwort, der zweite bekommt zu hören, es sei schon so – und
// nur dessen Fehler landet auf dem Bildschirm.
//
// Ein Formular, das nichts tut, lädt zum zweiten Klick geradezu ein. Das
// gehört überall hin, wo eine Server Action etwas verändert; hier
// eingeführt, weil es an dieser Stelle jemanden ausgesperrt hat.
export function AbsendeKnopf({
  children,
  laufttext,
  className,
  name,
  value,
}: {
  children: React.ReactNode;
  laufttext?: string;
  className?: string;
  // Für Formulare mit mehreren Absichten: Der Wert des gedrückten Knopfs
  // landet in den Formulardaten, und eine einzige Aktion verzweigt darauf.
  // useActionState kennt nur eine Aktion je Formular – mit formAction je
  // Knopf liesse sich die Eingabe bei einer Ablehnung nicht bewahren.
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending}
      aria-busy={pending}
      className={
        className ??
        "w-full rounded bg-arcos-steel text-white text-sm font-medium py-2 hover:bg-arcos-navy disabled:opacity-60 disabled:cursor-not-allowed"
      }
    >
      {pending ? laufttext ?? "Bitte warten…" : children}
    </button>
  );
}
