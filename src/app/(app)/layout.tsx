import Link from "next/link";
import { getCurrentProfile } from "@/lib/get-profile";
import { logout } from "@/app/actions/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();
  const isAdmin = profile?.role === "admin";

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="font-semibold">Zeiterfassung</span>
            <nav className="flex gap-4 text-sm">
              <Link href="/kunden" className="hover:text-blue-600">
                Kunden
              </Link>
              <Link href="/mandate" className="hover:text-blue-600">
                Mandate
              </Link>
              <Link href="/dienstleistungen" className="hover:text-blue-600">
                Dienstleistungen
              </Link>
              {isAdmin && (
                <Link href="/einstellungen" className="hover:text-blue-600">
                  Einstellungen
                </Link>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <span>
              {profile?.name} {isAdmin && "(Admin)"}
            </span>
            <form action={logout}>
              <button
                type="submit"
                className="text-gray-500 hover:text-gray-800"
              >
                Abmelden
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
