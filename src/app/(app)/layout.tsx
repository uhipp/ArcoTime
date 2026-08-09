import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { getCurrentProfile, getCurrentOrganisation } from "@/lib/get-profile";
import { logout } from "@/app/actions/auth";
import { Toast } from "@/components/toast";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [profile, organisation] = await Promise.all([
    getCurrentProfile(),
    getCurrentOrganisation(),
  ]);
  const isAdmin = profile?.role === "admin";

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b-2 border-arcos-steel">
        <div className="max-w-5xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-y-3 gap-x-8">
          {/* Mandant + Benutzer/Abmelden – bewusst gestapelt statt in
              einer Zeile mit der Navigation, das wirkte zuvor überladen. */}
          <div className="flex flex-col gap-1 shrink-0">
            {organisation && (
              <span className="font-heading font-semibold text-sm text-arcos-navy tracking-tight">
                {organisation.name}
              </span>
            )}
            <div className="flex items-center gap-3 text-sm text-gray-500">
              {profile && (
                <Link href={`/mitarbeiter/${profile.id}`} className="hover:text-arcos-navy">
                  {profile.name} {isAdmin && "(Admin)"}
                </Link>
              )}
              <form action={logout}>
                <button type="submit" className="text-gray-500 hover:text-gray-800">
                  Abmelden
                </button>
              </form>
            </div>
          </div>

          <nav className="flex flex-wrap gap-4 text-sm">
            <Link href="/zeiterfassung" className="hover:text-arcos-navy">
              Zeiterfassung
            </Link>
            <Link href="/anfragen" className="hover:text-arcos-navy">
              Anfragen
            </Link>
            <Link href="/auswertungen" className="hover:text-arcos-navy">
              Auswertungen
            </Link>
            <Link href="/kalender" className="hover:text-arcos-navy">
              Kalender
            </Link>
            <Link href="/kunden" className="hover:text-arcos-navy">
              Kunden
            </Link>
            <Link href="/projekte" className="hover:text-arcos-navy">
              Projekte
            </Link>
            <Link href="/dienstleistungen" className="hover:text-arcos-navy">
              Dienstleistungen
            </Link>
            {isAdmin && (
              <Link href="/mitarbeiter" className="hover:text-arcos-navy">
                Mitarbeitende
              </Link>
            )}
            {isAdmin && (
              <Link href="/export" className="hover:text-arcos-navy">
                Export
              </Link>
            )}
            {isAdmin && (
              <Link href="/einstellungen" className="hover:text-arcos-navy">
                Einstellungen
              </Link>
            )}
          </nav>

          {/* Fixes Applikations-Logo (nicht mandantenspezifisch) */}
          <Link href="/" className="shrink-0">
            <Image
              src="/arcotime-logo.png"
              alt="ArcoTime"
              width={140}
              height={32}
              className="h-8 w-auto"
              priority
            />
          </Link>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>
      <Suspense fallback={null}>
        <Toast />
      </Suspense>
    </div>
  );
}
