import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, getCurrentOrganisation } from "@/lib/get-profile";
import { darf } from "@/lib/berechtigungen";
import { ZurueckLinks } from "@/components/zurueck-links";
import { speichereSollMonate } from "@/app/actions/zeitkonto";
import { SollstundenFormular } from "@/components/sollstunden-formular";


// Sollstunden je Monat und Jahr (Phase 12, Etappe A).
//
// Eine eigene Seite und kein Abschnitt in den Einstellungen: Es sind
// zwölf Felder je Jahr, und man wechselt zwischen Jahren – das braucht
// Platz und eine eigene Adresse, die sich als Lesezeichen ablegen lässt.
export default async function SollstundenPage({
  searchParams,
}: {
  searchParams: Promise<{ jahr?: string; error?: string }>;
}) {
  const [profile, organisation] = await Promise.all([
    getCurrentProfile(),
    getCurrentOrganisation(),
  ]);
  if (!darf(profile, "einstellungen.verwalten")) redirect("/");
  if (!organisation?.modul_zeitkonto) redirect("/einstellungen");

  const { jahr, error } = await searchParams;
  const heute = new Date();
  const gewaehltesJahr = Number(jahr) || heute.getFullYear();

  const supabase = await createClient();
  const [{ data: sollMonate }, { data: schliesstage }] = await Promise.all([
    supabase
      .from("soll_monate")
      .select("monat, sollstunden")
      .eq("jahr", gewaehltesJahr)
      .order("monat"),
    // Feiertage und Betriebsferien: Im Kalenderfenster werden sie mit
    // null vorbelegt und benannt – das ist die halbe Rechenarbeit.
    supabase
      .from("schliesstage")
      .select("bezeichnung, von, bis")
      .lte("von", `${gewaehltesJahr}-12-31`)
      .gte("bis", `${gewaehltesJahr}-01-01`)
      .order("von"),
  ]);

  const werte = Object.fromEntries(
    (sollMonate ?? []).map((s) => [s.monat, Number(s.sollstunden)])
  );

  // Das Tages-Soll bei vollem Pensum, als Kontrollgrösse neben der
  // Tabelle: Passen Monatssummen und Wochenstunden nicht zusammen, sieht
  // man es hier und nicht erst in der Auswertung.
  const tagesSoll =
    Number(organisation.wochenstunden ?? 42) /
    Number(organisation.arbeitstage_pro_woche ?? 5);

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold">Sollstunden je Monat</h1>
        <ZurueckLinks links={[{ href: "/einstellungen", text: "Zu den Einstellungen" }]} />
      </div>

      {error && (
        <div className="rounded bg-red-50 text-red-700 text-sm px-3 py-2">{error}</div>
      )}

      <p className="text-sm text-gray-500">
        Die verbindliche Sollzeit je Monat bei einem Pensum von 100 %. In der
        Praxis kommt diese Tabelle vom Treuhänder. Sie gilt für die ganze
        Organisation; das Pensum jeder Person rechnet ArcoTime davon ab.
      </p>

      <p className="text-sm text-gray-500">
        Wer die Tabelle nicht zur Hand hat, öffnet je Monat das{" "}
        <strong>Kalenderfenster</strong>: Es zeigt jeden Tag einzeln, belegt
        Werktage mit dem Tagesanteil und Wochenenden wie Schliesstage mit null
        vor. Einzelne Tage lassen sich korrigieren – Brückentage, ein halber
        24. Dezember –, und „Daten übernehmen“ schreibt die Summe in die
        Monatszeile.
      </p>

      <p className="rounded bg-blue-50 text-blue-900 text-sm px-3 py-2">
        Zur Kontrolle: Bei {Number(organisation.wochenstunden ?? 42)} Wochenstunden
        auf {Number(organisation.arbeitstage_pro_woche ?? 5)} Tage ergibt ein
        Arbeitstag <strong>{tagesSoll.toFixed(2)} Stunden</strong>. Mit diesem
        Wert werden später einzelne Ferien- und Absenztage bewertet – die
        Monatstabelle liefert die Summe, das Tages-Soll den einzelnen Tag.
      </p>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        {[gewaehltesJahr - 1, gewaehltesJahr, gewaehltesJahr + 1].map((j) => (
          <Link
            key={j}
            href={`/einstellungen/zeitkonto?jahr=${j}`}
            className={`rounded border px-3 py-1.5 ${
              j === gewaehltesJahr ? "bg-arcos-steel text-white" : "bg-white hover:bg-gray-50"
            }`}
          >
            {j}
          </Link>
        ))}
      </div>

      <form action={speichereSollMonate.bind(null, gewaehltesJahr)}>
        <SollstundenFormular
          jahr={gewaehltesJahr}
          wochenstunden={Number(organisation.wochenstunden ?? 42)}
          schliesstage={schliesstage ?? []}
          werte={werte}
        />

        <button
          type="submit"
          className="mt-4 rounded bg-arcos-steel px-4 py-2 text-sm font-medium text-white hover:bg-arcos-navy"
        >
          Sollstunden {gewaehltesJahr} speichern
        </button>
      </form>
    </div>
  );
}
