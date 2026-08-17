import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/get-profile";
import { logout } from "@/app/actions/auth";
import { SUPPORT_MAIL } from "@/lib/kontakt";
import { formatDatumCH, heuteIso } from "@/lib/date-utils";

const NACHRICHTEN: Record<string, string> = {
  test_abgelaufen:
    "Deine 30-tägige Testphase ist abgelaufen. Bitte wähle ein Abo, damit dein Team ArcoTime weiter nutzen kann.",
  zahlung_fehlgeschlagen:
    "Die letzte Zahlung konnte nicht verarbeitet werden. Bitte aktualisiere dein Zahlungsmittel, damit der Zugriff wieder freigeschaltet wird.",
  manuell_pausiert: "Dieses Konto wurde vorübergehend pausiert.",
};

export default async function GesperrtPage() {
  const profil = await getCurrentProfile();
  const supabase = await createClient();

  const { data } = await supabase
    .from("profiles")
    .select("organisationen(status, sperrgrund, nachfrist_bis)")
    .eq("id", profil?.id ?? "")
    .single();

  const organisation = data?.organisationen as unknown as {
    status: string;
    sperrgrund: string | null;
    nachfrist_bis: string | null;
  } | null;

  // Läuft die Nachfrist noch, landet hier nur, wer etwas ÄNDERN wollte –
  // Lesen und Exportieren lässt die Zugriffssperre durch. Die Meldung muss
  // das sagen, sonst wirkt die Anwendung kaputt statt schreibgeschützt.
  const inNachfrist = Boolean(
    organisation?.nachfrist_bis && organisation.nachfrist_bis >= heuteIso()
  );

  const nachricht = inNachfrist
    ? `Das Abonnement ist beendet. Bis zum ${formatDatumCH(organisation!.nachfrist_bis!)} könnt ihr eure Daten noch ansehen und herunterladen – ändern lässt sich nichts mehr.`
    : ((organisation?.sperrgrund && NACHRICHTEN[organisation.sperrgrund]) ??
      (organisation?.status === "gekuendigt"
        ? "Das Abonnement ist beendet und die Frist zum Herunterladen der Daten ist abgelaufen. Meldet euch bei uns, wenn ihr eure Daten noch braucht."
        : "Dieses Konto ist aktuell nicht zugänglich."));

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-lg shadow p-8 text-center">
        <Image
          src="/arcotime-logo.png"
          alt="ArcoTime"
          width={286}
          height={197}
          className="h-16 w-auto mx-auto block mb-4"
          priority
        />
        <h1 className="text-lg font-semibold text-arcos-navy mb-2">Zugriff gesperrt</h1>
        <p className="text-sm text-gray-600 mb-6">{nachricht}</p>
        <p className="text-xs text-gray-400 mb-6">
          Fragen? Wende dich an Arcos Group:{" "}
          <a href={`mailto:${SUPPORT_MAIL}`} className="text-arcos-steel hover:underline">
            {SUPPORT_MAIL}
          </a>
        </p>
        {inNachfrist && (
          <a
            href="/export"
            className="block w-full rounded bg-arcos-navy text-white text-sm font-medium py-2 mb-3 hover:opacity-90"
          >
            Zu den Daten und zum Export
          </a>
        )}
        <form action={logout}>
          <button
            type="submit"
            className="w-full rounded border text-sm font-medium py-2 hover:bg-gray-50"
          >
            Abmelden
          </button>
        </form>
      </div>
    </div>
  );
}
