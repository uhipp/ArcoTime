import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { getCurrentProfile, getCurrentOrganisation } from "@/lib/get-profile";
import { createClient } from "@/lib/supabase/server";
import { heuteIso } from "@/lib/date-utils";
import { logout } from "@/app/actions/auth";
import { Toast } from "@/components/toast";
import { KontextHilfeLink } from "@/components/kontext-hilfe-link";

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

  // Zähler für fällige Wiedervorlagen direkt in der Navigation, damit man
  // sie sofort sieht statt sie nur auf der Übersichtsseite zu entdecken.
  const supabase = await createClient();
  const { count: faelligeWiedervorlagen } = profile
    ? await supabase
        .from("anfragen")
        .select("id", { count: "exact", head: true })
        .eq("zugewiesen_an", profile.id)
        .neq("status", "erledigt")
        .not("wiedervorlage_am", "is", null)
        .lte("wiedervorlage_am", heuteIso())
    : { count: 0 };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b-2 border-arcos-steel print:hidden">
        <div className="max-w-5xl mx-auto px-4 pt-3">
          {/* Erste Zeile: Mandant + Benutzer/Abmelden links, Logo rechts.
              Bewusst nur 2 Elemente in dieser Zeile (statt 3 mit der
              Navigation) – bei einem grossen Logo würde eine 3-Element-Zeile
              sonst umbrechen und das Logo unter die Navigation rutschen
              lassen statt daneben zu bleiben. */}
          <div className="flex items-start justify-between gap-4">
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

            {/* Fixes Applikations-Logo (nicht mandantenspezifisch). Slogan
                bewusst als Text statt im Bild – im Bild eingebetteter Text
                wird beim Herunterskalieren auf Header-Grösse unleserlich. */}
            <Link href="/" className="shrink-0 flex flex-col items-center">
              <Image
                src="/arcotime-logo.png"
                alt="ArcoTime"
                width={286}
                height={197}
                className="h-14 w-auto"
                priority
              />
              <span className="text-xs text-gray-500 mt-0.5 whitespace-nowrap">
                Smart planen. Besser arbeiten.
              </span>
            </Link>
          </div>

          <nav className="flex flex-wrap gap-4 text-sm py-3">
            <Link href="/zeiterfassung" className="hover:text-arcos-navy">
              Zeiterfassung
            </Link>
            <Link href="/anfragen" className="hover:text-arcos-navy flex items-center gap-1.5">
              Anfragen
              {Boolean(faelligeWiedervorlagen) && (
                <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full bg-red-600 text-white text-xs font-medium">
                  {faelligeWiedervorlagen}
                </span>
              )}
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
            {profile?.ist_platform_admin && (
              <Link href="/plattform" className="hover:text-arcos-navy text-red-600 font-medium">
                Plattform
              </Link>
            )}
            <span className="ml-auto">
              <KontextHilfeLink />
            </span>
          </nav>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-8 print:p-0 print:max-w-none">{children}</main>
      <Suspense fallback={null}>
        <div className="print:hidden">
          <Toast />
        </div>
      </Suspense>
    </div>
  );
}
