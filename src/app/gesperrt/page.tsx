import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/get-profile";
import { logout } from "@/app/actions/auth";

const NACHRICHTEN: Record<string, string> = {
  test_abgelaufen:
    "Deine 14-tägige Testphase ist abgelaufen. Bitte wähle ein Abo, damit dein Team ArcoTime weiter nutzen kann.",
  zahlung_fehlgeschlagen:
    "Die letzte Zahlung konnte nicht verarbeitet werden. Bitte aktualisiere dein Zahlungsmittel, damit der Zugriff wieder freigeschaltet wird.",
  manuell_pausiert: "Dieses Konto wurde vorübergehend pausiert.",
};

export default async function GesperrtPage() {
  const profil = await getCurrentProfile();
  const supabase = await createClient();

  const { data } = await supabase
    .from("profiles")
    .select("organisationen(status, sperrgrund)")
    .eq("id", profil?.id ?? "")
    .single();

  const organisation = data?.organisationen as unknown as { status: string; sperrgrund: string | null } | null;
  const nachricht =
    (organisation?.sperrgrund && NACHRICHTEN[organisation.sperrgrund]) ??
    (organisation?.status === "gekuendigt"
      ? "Dieses Abo wurde gekündigt."
      : "Dieses Konto ist aktuell nicht zugänglich.");

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
          <a href="mailto:uhipp@arcos.ch" className="text-arcos-steel hover:underline">
            uhipp@arcos.ch
          </a>
        </p>
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
