import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { getCurrentProfile, getCurrentOrganisation } from "@/lib/get-profile";
import { begriff, getBegriffe } from "@/lib/begriffe";
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
  const [profile, organisation, begriffe] = await Promise.all([
    getCurrentProfile(),
    getCurrentOrganisation(),
    // Wie der Betrieb die Dinge nennt (0073). In der Navigation sieht man es
    // zuerst – dort steht das Wort auf jeder Seite.
    getBegriffe(),
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

  // Die Navigation ist auf jeder Seite dieselbe Liste – zwei Zeilen im Kopf
  // statt drei: Produkt und Organisation oben, Bereiche darunter. 88 px
  // statt der bisherigen ~140 px, siehe docs/masken-leitlinie.md Abschnitt 5.
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50 print:h-auto print:overflow-visible print:bg-white">
      {nachfristBis && (
        <div className="shrink-0 bg-amber-100 text-amber-900 text-sm px-4 py-3 print:hidden">
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
      <header className="shrink-0 bg-white border-b border-gray-200 print:hidden">
        {/* Zone 1 – Produkt und Organisation, 48 px. Das waagrechte Lockup
            statt des senkrechten mit Slogan: Auf einer Maske, die ohne
            Scrollen auskommen soll, ist jede eingesparte Zeile Höhe eine
            Datenzeile mehr. Das ganze Logo mit Slogan bleibt auf der
            Anmeldeseite, der Startseite und auf allem, was das Haus
            verlässt – PDF und Systemmails. */}
        <div className="h-12 px-4 flex items-center justify-between gap-4 border-b border-gray-100">
          <div className="flex items-center gap-3.5 min-w-0">
            <Link href="/" className="shrink-0">
              <Image
                src="/arcotime-logo-quer.png"
                alt="ArcoTime"
                width={599}
                height={128}
                className="h-[26px] w-auto"
                priority
              />
            </Link>
            {organisation && (
              <>
                <span className="w-px h-[22px] bg-gray-200 shrink-0" aria-hidden />
                <span className="font-heading font-semibold text-sm text-arcos-navy tracking-tight truncate">
                  {organisation.name}
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-500 shrink-0">
            <Link href="/aenderungen" className="hover:text-arcos-navy whitespace-nowrap">
              🆕 Neuigkeiten
            </Link>
            <KontextHilfeLink />
            {profile && (
              <Link
                href={`/mitarbeiter/${profile.id}`}
                className="hover:text-arcos-navy whitespace-nowrap"
              >
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

        {/* Zone 2 – die Bereiche, 40 px. Bei vielen Modulen und einem
            schmalen Fenster wird daraus eine waagrecht scrollbare Leiste
            statt eines Umbruchs: Die Höhe des Kopfs muss verlässlich sein,
            sonst rutscht jede Maske darunter. */}
        <nav className="h-10 px-4 flex items-center gap-4 text-sm overflow-x-auto whitespace-nowrap">
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
            {begriff(begriffe, "anfrage", "mehrzahl")}
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
              {begriff(begriffe, "rapport", "mehrzahl")}
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
                title={`Offene ${begriff(begriffe, "rapport", "mehrzahl")} aus vergangenen Tagen`}
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
            {begriff(begriffe, "kunde", "mehrzahl")}
          </Link>
          <Link href="/projekte" className="hover:text-arcos-navy">
            {begriff(begriffe, "projekt", "mehrzahl")}
          </Link>
          <Link href="/dienstleistungen" className="hover:text-arcos-navy">
            {begriff(begriffe, "dienstleistung", "mehrzahl")}
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
        </nav>
      </header>
      {/* Gescrollt wird hier, nicht am Fenster – so bleibt der Kopf stehen.
          Eine Maske mit data-vollbild bekommt über .seite die ganze Fläche
          und scrollt dann nur in ihren inneren Listen (globals.css). */}
      <main className="flex-1 min-h-0 overflow-y-auto print:overflow-visible">
        <div className="seite max-w-5xl mx-auto px-4 py-8 print:p-0 print:max-w-none">
          {children}
        </div>
      </main>
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
