import Image from "next/image";
import { setzeNeuesPasswort } from "@/app/actions/auth";
import { getLoginMandantName } from "@/lib/login-mandant";
import { getCurrentUser } from "@/lib/get-profile";
import { AbsendeKnopf } from "@/components/absende-knopf";
import { redirect } from "next/navigation";

export default async function PasswortSetzenPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const [mandantName, user] = await Promise.all([getLoginMandantName(), getCurrentUser()]);

  // Ohne gueltige Sitzung fuehrt das Formular ins Leere: updateUser braucht
  // eine angemeldete Person. Bisher landete man hier auch mit abgelaufenem
  // Link und bekam erst nach dem Absenden eine unverstaendliche Meldung.
  if (!user) {
    redirect(
      `/login?error=${encodeURIComponent(
        "Der Link ist abgelaufen oder wurde bereits verwendet. Bitte eine neue Einladung anfordern."
      )}`
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-lg shadow p-8">
        <Image
          src="/arcotime-logo.png"
          alt="ArcoTime"
          width={286}
          height={197}
          className="h-20 w-auto mx-auto block"
        />
        <p className="text-center text-sm text-gray-500 mb-4">
          Smart planen. Besser arbeiten.
        </p>
        {mandantName && (
          <p className="text-sm font-medium text-arcos-navy mb-4">{mandantName}</p>
        )}
        <h1 className="font-heading font-bold text-xl text-arcos-navy mb-1">
          Neues Passwort setzen
        </h1>
        {/* Zeigt, um welches Konto es geht. Wer den Link in einem Browser
            oeffnet, in dem schon jemand angemeldet ist, sieht sonst nicht,
            wessen Passwort er gerade setzt. */}
        <p className="text-sm text-gray-500 mb-6">
          Für <strong>{user.email}</strong>. Mindestens 8 Zeichen.
        </p>

        {error && (
          <div className="mb-4 rounded bg-red-50 text-red-700 text-sm px-3 py-2">
            {error}
          </div>
        )}

        <form action={setzeNeuesPasswort} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="passwort">
              Neues Passwort
            </label>
            <input
              id="passwort"
              name="passwort"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-arcos-steel"
            />
          </div>
          <div>
            <label
              className="block text-sm font-medium mb-1"
              htmlFor="passwort_wiederholung"
            >
              Passwort wiederholen
            </label>
            <input
              id="passwort_wiederholung"
              name="passwort_wiederholung"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-arcos-steel"
            />
          </div>
          <AbsendeKnopf laufttext="Wird gespeichert…">Passwort speichern</AbsendeKnopf>
        </form>
      </div>
    </div>
  );
}
