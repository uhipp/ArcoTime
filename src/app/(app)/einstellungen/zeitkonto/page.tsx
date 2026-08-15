import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, getCurrentOrganisation } from "@/lib/get-profile";
import { darf } from "@/lib/berechtigungen";
import { ZurueckLinks } from "@/components/zurueck-links";
import { speichereSollMonate } from "@/app/actions/zeitkonto";

const MONATE = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
];

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
  const { data: sollMonate } = await supabase
    .from("soll_monate")
    .select("monat, sollstunden")
    .eq("jahr", gewaehltesJahr)
    .order("monat");

  const werte = new Map((sollMonate ?? []).map((s) => [s.monat, Number(s.sollstunden)]));
  const summe = [...werte.values()].reduce((s, w) => s + w, 0);

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
        <div className="rounded-lg border bg-white divide-y">
          {MONATE.map((name, i) => {
            const monat = i + 1;
            return (
              <div key={monat} className="flex items-center gap-3 px-4 py-2">
                <label className="flex-1 text-sm" htmlFor={`monat_${monat}`}>
                  {name}
                </label>
                <input
                  id={`monat_${monat}`}
                  name={`monat_${monat}`}
                  type="number"
                  step="0.25"
                  min="0"
                  defaultValue={werte.get(monat) ?? ""}
                  placeholder="–"
                  className="w-28 rounded border border-gray-300 px-2 py-1.5 text-sm text-right"
                />
                <span className="w-12 text-xs text-gray-400">Std.</span>
              </div>
            );
          })}
          <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 font-medium">
            <span className="flex-1 text-sm">Summe {gewaehltesJahr}</span>
            <span className="w-28 text-right text-sm">{summe.toFixed(2)}</span>
            <span className="w-12 text-xs text-gray-400">Std.</span>
          </div>
        </div>

        <p className="text-xs text-gray-400 mt-2">
          Ein leeres Feld heisst „nicht erfasst“ und nicht „null Stunden“ – der
          Monat wird dann aus der Tabelle entfernt.
        </p>

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
