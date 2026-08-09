import Image from "next/image";
import { requestPasswordReset } from "@/app/actions/auth";
import { getLoginMandantName } from "@/lib/login-mandant";

export default async function PasswortVergessenPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; gesendet?: string }>;
}) {
  const { error, gesendet } = await searchParams;
  const mandantName = await getLoginMandantName();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-lg shadow p-8">
        <Image
          src="/arcotime-logo.png"
          alt="ArcoTime"
          width={286}
          height={197}
          className="h-14 w-auto mb-2"
        />
        {mandantName && (
          <p className="text-sm font-medium text-arcos-navy mb-4">{mandantName}</p>
        )}
        <h1 className="font-heading font-bold text-xl text-arcos-navy mb-1">
          Passwort vergessen
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          Gib deine E-Mail-Adresse ein — wir senden dir einen Link zum
          Zurücksetzen.
        </p>

        {gesendet && (
          <div className="mb-4 rounded bg-green-50 text-green-800 text-sm px-3 py-2">
            Falls diese Adresse bei uns registriert ist, ist eine E-Mail mit
            einem Link unterwegs. Bitte auch den Spam-Ordner prüfen.
          </div>
        )}

        {error && (
          <div className="mb-4 rounded bg-red-50 text-red-700 text-sm px-3 py-2">
            {error}
          </div>
        )}

        <form action={requestPasswordReset} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="email">
              E-Mail
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-arcos-steel"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded bg-arcos-steel text-white text-sm font-medium py-2 hover:bg-arcos-navy"
          >
            Link senden
          </button>
        </form>

        <a href="/login" className="block text-center text-sm text-gray-500 hover:underline mt-4">
          Zurück zur Anmeldung
        </a>
      </div>
    </div>
  );
}
