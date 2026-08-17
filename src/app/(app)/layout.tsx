import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { getCurrentProfile, getCurrentOrganisation } from "@/lib/get-profile";
import { createClient } from "@/lib/supabase/server";
import { formatDatumCH, heuteIso } from "@/lib/date-utils";
import { logout } from "@/app/actions/auth";
import { Toast } from "@/components/toast";
import { AutoFokus } from "@/components/auto-fokus";
import { KontextHilfeLink } from "@/components/kontext-hilfe-link";
import { darf } from "@/lib/berechtigungen";

async function ladeNachfrist(organisationId: string | undefined) {
  if (!organisationId) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("organisationen")
    .select("status, nachfrist_bis")
    .eq("id", organisationId)
    .single();

  if (!data?.nachfrist_bis || data.status === "aktiv") return null;
  return data.nachfrist_bis >= heuteIso() ? data.nachfrist_bis : null;
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [profile, organisation] = await Promise.all([
    getCurrentProfile(),
    getCurrentOrganisation(),
  ]);
  const isAdmin = darf(profile, "einstellungen.verwalten");

  // Nachfrist nach Vertragsende (AGB Ziffer 10): lesen ja, erfassen nein.
  // Der Hinweis steht über ALLEN Seiten und nicht nur auf einer – wer in
  // dieser Zeit hereinkommt, soll nicht erst durch einen fehlgeschlagenen
  // Speicherversuch erfahren, woran er ist.
  const nachfristBis = await ladeNachfrist(organisation?.id);

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

  // Offene Rapporte vergangener Tage – dieselbe Überlegung wie oben und
  // dieselbe Auswahl wie in der täglichen Erinnerungsmail: Ein offener
  // Rapport ist unverrechnete Arbeit, und niemand vermisst etwas, das
  // nirgends steht. Nur die eigenen: Erinnern lässt sich sinnvoll nur,
  // wer abschliessen darf.
  const { count: offeneRapporte } = profile
    ? await supabase
        .from("rapporte")
        .select("id", { count: "exact", head: true })
        .eq("mitarbeiter_id", profile.id)
        .eq("status", "offen")
        .lt("datum", heuteIso())
    : { count: 0 };

  // Ein laufender Timer muss unübersehbar sein – der vergessene Timer vom
  // Freitagabend ist sonst der erste Supportfall. Der Zähler steht dort,
  // wo der Timer läuft: am Rapport oder in der Zeiterfassung.
  const { data: laufenderTimer } = profile
    ? await supabase
        .from("zeiteintraege")
        .select("id, rapport_id")
        .eq("mitarbeiter_id", profile.id)
        .not("timer_gestartet_um", "is", null)
        .limit(1)
        .maybeSingle()
    : { data: null };

  const timerAmRapport = Boolean(laufenderTimer?.rapport_id);
  const timerInZeiterfassung = Boolean(laufenderTimer && !laufenderTimer.rapport_id);

  return (
    <div className="min-h-screen bg-gray-50">
      {nachfristBis && (
        <div className="bg-amber-100 text-amber-900 text-sm px-4 py-3 print:hidden">
          <div className="max-w-5xl mx-auto">
            <strong>Nur-Lese-Modus.</strong> Das Abonnement ist beendet. Ihr könnt eure
            Daten noch bis zum {formatDatumCH(nachfristBis)} ansehen und herunterladen –
            neu erfassen lässt sich nichts mehr. Danach werden die Daten gelöscht.{" "}
            <Link href="/export" className="underline font-medium">
              Jetzt exportieren
            </Link>
          </div>
        </div>
      )}
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
            {/* Das Zeichen ist ein eigener Link auf den laufenden Eintrag,
                nicht bloss ein Hinweis: Zu wissen, DASS ein Timer läuft,
                nützt wenig, wenn man ihn dann suchen muss. Zwei
                verschachtelte Links gehen nicht, also stehen sie
                nebeneinander. */}
            <span className="flex items-center gap-1.5">
              <Link href="/zeiterfassung" className="hover:text-arcos-navy">
                Zeiterfassung
              </Link>
              {timerInZeiterfassung && laufenderTimer && (
                <Link
                  href={`/zeiterfassung/${laufenderTimer.id}`}
                  title="Es läuft ein Timer – hier stoppen"
                  className="inline-flex items-center justify-center h-5 px-1.5 rounded-full bg-red-600 text-white text-xs font-medium hover:bg-red-700"
                >
                  ⏱
                </Link>
              )}
            </span>
            <Link href="/anfragen" className="hover:text-arcos-navy flex items-center gap-1.5">
              Anfragen
              {Boolean(faelligeWiedervorlagen) && (
                <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full bg-red-600 text-white text-xs font-medium">
                  {faelligeWiedervorlagen}
                </span>
              )}
            </Link>
            {/* Ziel bleibt die ganze Liste: Ein Link, der je nach Zustand
                woanders hinführt, verwirrt mehr, als der eine gesparte
                Klick nützt. Den Filter setzt der Zähler daneben. */}
            <span className="flex items-center gap-1.5">
              <Link href="/rapporte" className="hover:text-arcos-navy">
                Rapporte
              </Link>
              {timerAmRapport && laufenderTimer?.rapport_id && (
                <Link
                  href={`/rapporte/${laufenderTimer.rapport_id}`}
                  title="An diesem Rapport läuft ein Timer – hier stoppen"
                  className="inline-flex items-center justify-center h-5 px-1.5 rounded-full bg-red-600 text-white text-xs font-medium hover:bg-red-700"
                >
                  ⏱
                </Link>
              )}
              {Boolean(offeneRapporte) && (
                <span
                  title="Offene Rapporte aus vergangenen Tagen"
                  className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full bg-red-600 text-white text-xs font-medium"
                >
                  {offeneRapporte}
                </span>
              )}
            </span>
            {organisation?.modul_disposition && (
              <Link href="/disposition" className="hover:text-arcos-navy">
                Disposition
              </Link>
            )}
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
            <span className="ml-auto flex items-center gap-4">
              <Link href="/aenderungen" className="hover:text-arcos-navy">
                🆕 Neuigkeiten
              </Link>
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
        {/* Gilt für die ganze Anwendung: Nach dem Speichern zurück ins
            Erfassungsformular, siehe components/auto-fokus.tsx. */}
        <AutoFokus />
      </Suspense>
    </div>
  );
}
