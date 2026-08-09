import Image from "next/image";
import { setzeNeuesPasswort } from "@/app/actions/auth";
import { getLoginMandantName } from "@/lib/login-mandant";

export default async function PasswortSetzenPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
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
          Neues Passwort setzen
        </h1>
        <p className="text-sm text-gray-500 mb-6">Mindestens 8 Zeichen.</p>

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
          <button
            type="submit"
            className="w-full rounded bg-arcos-steel text-white text-sm font-medium py-2 hover:bg-arcos-navy"
          >
            Passwort speichern
          </button>
        </form>
      </div>
    </div>
  );
}
