import Image from "next/image";
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
      <header className="bg-white border-b-2 border-arcos-steel">
        <div className="max-w-5xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-y-2">
          <div className="flex flex-wrap items-center gap-6">
            <Link href="/" className="flex items-center gap-3 shrink-0">
              <Image
                src="/arcos-group-logo.png"
                alt="Arcos Group"
                width={120}
                height={24}
                className="h-6 w-auto shrink-0"
                priority
              />
              <span className="h-6 w-px bg-gray-200 shrink-0" />
              <span className="font-heading font-bold text-lg text-arcos-navy tracking-tight whitespace-nowrap">
                ArcoTime
              </span>
            </Link>
            <nav className="flex flex-wrap gap-4 text-sm">
              <Link href="/zeiterfassung" className="hover:text-arcos-navy">
                Zeiterfassung
              </Link>
              <Link href="/auswertungen" className="hover:text-arcos-navy">
                Auswertungen
              </Link>
              <Link href="/kunden" className="hover:text-arcos-navy">
                Kunden
              </Link>
              <Link href="/mandate" className="hover:text-arcos-navy">
                Mandate
              </Link>
              <Link href="/dienstleistungen" className="hover:text-arcos-navy">
                Dienstleistungen
              </Link>
              {isAdmin && (
                <Link href="/einstellungen" className="hover:text-arcos-navy">
                  Einstellungen
                </Link>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-500 shrink-0">
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
