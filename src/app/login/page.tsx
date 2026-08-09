import Image from "next/image";
import { login } from "@/app/actions/auth";
import { HashSessionHandler } from "@/components/hash-session-handler";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <HashSessionHandler />
      <div className="w-full max-w-sm bg-white rounded-lg shadow p-8">
        <Image
          src="/arcos-group-logo.png"
          alt="Arcos Group"
          width={140}
          height={28}
          className="h-7 w-auto mb-4"
          priority
        />
        <h1 className="font-heading font-bold text-xl text-arcos-navy mb-1">
          ArcoTime
        </h1>
        <p className="text-sm text-gray-500 mb-6">Bitte melde dich an.</p>

        {error && (
          <div className="mb-4 rounded bg-red-50 text-red-700 text-sm px-3 py-2">
            {error}
          </div>
        )}

        <form action={login} className="space-y-4">
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
          <div>
            <label
              className="block text-sm font-medium mb-1"
              htmlFor="password"
            >
              Passwort
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-arcos-steel"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded bg-arcos-steel text-white text-sm font-medium py-2 hover:bg-arcos-navy"
          >
            Anmelden
          </button>
        </form>

        <a
          href="/passwort-vergessen"
          className="block text-center text-sm text-gray-500 hover:underline mt-4"
        >
          Passwort vergessen?
        </a>
      </div>
    </div>
  );
}
