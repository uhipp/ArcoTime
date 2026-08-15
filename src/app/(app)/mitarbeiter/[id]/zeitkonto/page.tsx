import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, getCurrentOrganisation } from "@/lib/get-profile";
import { darf } from "@/lib/berechtigungen";
import { ZurueckLinks } from "@/components/zurueck-links";
import { DeleteButton } from "@/components/delete-button";
import { DatumFeld } from "@/components/datum-feld";
import { formatDatumCH } from "@/lib/date-utils";
import { ladeZeitkonto, stundenText } from "@/lib/zeitkonto";
import { erfasseZeitkontoBuchung, loescheZeitkontoBuchung } from "@/app/actions/zeitkonto";

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

// Das Zeitkonto einer Person (Phase 12, Etappe C).
//
// Zwölf Monatszeilen mit Soll, Ist und fortlaufendem Saldo, dazu das
// Ferienguthaben. Die eigene Seite und nicht ein Abschnitt bei den
// Personendaten: Es ist die Ansicht, die man bei der Jahresbesprechung
// aufschlägt, und sie braucht die Breite.
export default async function ZeitkontoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ jahr?: string; error?: string }>;
}) {
  const { id } = await params;
  const { jahr, error } = await searchParams;

  const [profile, organisation] = await Promise.all([
    getCurrentProfile(),
    getCurrentOrganisation(),
  ]);
  if (!profile) redirect("/login");

  const istAdmin = darf(profile, "mitarbeitende.verwalten");
  // Die eigene Auswertung darf jede Person sehen – es ist ihre Arbeitszeit.
  if (!istAdmin && profile.id !== id) redirect("/");
  if (!organisation?.modul_zeitkonto) redirect(`/mitarbeiter/${id}`);

  const gewaehltesJahr = Number(jahr) || new Date().getFullYear();
  const supabase = await createClient();

  // PostgREST liefert den eingebetteten Erfasser je nach Beziehung als
  // Objekt oder Liste – beides abfangen, wie bei den Beteiligten am
  // Rapport.
  type Buchung = {
    id: string;
    datum: string;
    stunden: number;
    grund: string;
    profiles: { name: string } | { name: string }[] | null;
  };

  const [{ data: person }, konto, { data: buchungenRoh }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, name, vorname, eintritt, austritt")
      .eq("id", id)
      .single(),
    ladeZeitkonto(supabase, id, gewaehltesJahr),
    supabase
      .from("zeitkonto_buchungen")
      .select("id, datum, stunden, grund, profiles!zeitkonto_buchungen_erfasst_von_fkey(name)")
      .eq("mitarbeiter_id", id)
      .order("datum", { ascending: false }),
  ]);

  if (!person) notFound();

  const buchungen = ((buchungenRoh ?? []) as unknown as Buchung[]).map((b) => ({
    ...b,
    erfasser: Array.isArray(b.profiles) ? b.profiles[0]?.name : b.profiles?.name,
  }));

  const name = `${person.vorname ? `${person.vorname} ` : ""}${person.name}`;
  const summeSoll = konto.zeilen.reduce((s, z) => s + z.soll, 0);
  const summeIst = konto.zeilen.reduce((s, z) => s + z.ist, 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Zeitkonto {name}</h1>
        <ZurueckLinks
          links={[
            { href: `/mitarbeiter/${id}`, text: "Zur Person" },
            ...(istAdmin ? [{ href: "/mitarbeiter", text: "Zur Übersicht" }] : []),
          ]}
        />
      </div>

      {error && <div className="rounded bg-red-50 text-red-700 text-sm px-3 py-2">{error}</div>}

      {konto.hinweise.map((h) => (
        <p key={h} className="rounded bg-amber-50 text-amber-900 text-sm px-3 py-2">
          {h}
        </p>
      ))}

      <div className="flex flex-wrap items-center gap-2 text-sm">
        {[gewaehltesJahr - 1, gewaehltesJahr, gewaehltesJahr + 1].map((j) => (
          <Link
            key={j}
            href={`/mitarbeiter/${id}/zeitkonto?jahr=${j}`}
            className={`rounded border px-3 py-1.5 ${
              j === gewaehltesJahr ? "bg-arcos-steel text-white" : "bg-white hover:bg-gray-50"
            }`}
          >
            {j}
          </Link>
        ))}
        {/* Kein <Link>: Das PDF ist eine Datei und keine Seite der
            Anwendung – der Router soll sie nicht abzufangen versuchen. */}
        <a
          href={`/mitarbeiter/${id}/zeitkonto/pdf?jahr=${gewaehltesJahr}`}
          target="_blank"
          rel="noopener"
          className="ml-auto rounded border bg-white px-3 py-1.5 hover:bg-gray-50"
        >
          Als PDF (A4 quer)
        </a>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-lg border bg-white p-4">
          <div className="text-xs text-gray-500">Saldo Ende {gewaehltesJahr}</div>
          <div
            className={`text-2xl font-semibold ${
              konto.endsaldo < 0 ? "text-red-700" : "text-arcos-navy"
            }`}
          >
            {stundenText(konto.endsaldo)} h
          </div>
          <div className="text-xs text-gray-400 mt-1">
            Start ins Jahr: {stundenText(konto.startsaldo)} h
          </div>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <div className="text-xs text-gray-500">Ferien Rest</div>
          <div className="text-2xl font-semibold text-arcos-navy">
            {konto.ferienRest.toFixed(1)} Tage
          </div>
          <div className="text-xs text-gray-400 mt-1">
            Anspruch {konto.ferienAnspruch.toFixed(1)}
            {konto.ferienUebertrag !== 0
              ? ` + Übertrag ${konto.ferienUebertrag.toFixed(1)}`
              : ""}{" "}
            − bezogen {konto.ferienBezogen.toFixed(1)}
          </div>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <div className="text-xs text-gray-500">Jahr</div>
          <div className="text-2xl font-semibold text-arcos-navy">
            {summeIst.toFixed(1)} h
          </div>
          <div className="text-xs text-gray-400 mt-1">
            von {summeSoll.toFixed(1)} h Soll
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-2 font-medium">Monat</th>
              <th className="px-4 py-2 font-medium text-right">Soll</th>
              <th className="px-4 py-2 font-medium text-right">Ist</th>
              <th className="px-4 py-2 font-medium text-right">Abbau</th>
              <th className="px-4 py-2 font-medium text-right">Buchungen</th>
              <th className="px-4 py-2 font-medium text-right">Differenz</th>
              <th className="px-4 py-2 font-medium text-right">Saldo</th>
              <th className="px-4 py-2 font-medium text-right">Ferien</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {konto.zeilen.map((z) => {
              const leer = z.soll === 0 && z.ist === 0 && z.buchungen === 0;
              return (
                <tr key={z.monat} className={leer ? "text-gray-400" : ""}>
                  <td className="px-4 py-2">{MONATE[z.monat - 1]}</td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    {z.soll.toFixed(2)}
                  </td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">{z.ist.toFixed(2)}</td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    {z.kompensation ? z.kompensation.toFixed(2) : "–"}
                  </td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    {z.buchungen ? stundenText(z.buchungen) : "–"}
                  </td>
                  <td
                    className={`px-4 py-2 text-right whitespace-nowrap ${
                      z.bewegung < 0 ? "text-red-700" : ""
                    }`}
                  >
                    {stundenText(z.bewegung)}
                  </td>
                  <td
                    className={`px-4 py-2 text-right whitespace-nowrap font-medium ${
                      z.saldo < 0 ? "text-red-700" : ""
                    }`}
                  >
                    {stundenText(z.saldo)}
                  </td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    {z.ferienTage ? z.ferienTage.toFixed(1) : "–"}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t bg-gray-50 font-medium">
              <td className="px-4 py-2">Jahr</td>
              <td className="px-4 py-2 text-right">{summeSoll.toFixed(2)}</td>
              <td className="px-4 py-2 text-right">{summeIst.toFixed(2)}</td>
              <td colSpan={3}></td>
              <td className="px-4 py-2 text-right">{stundenText(konto.endsaldo)}</td>
              <td className="px-4 py-2 text-right">{konto.ferienBezogen.toFixed(1)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="text-xs text-gray-400">
        Soll = Sollstunden des Monats, auf die Arbeitstage verteilt und mit dem
        Pensum gerechnet, abzüglich bezahlter Absenzen. Ist = erfasste
        Arbeitszeit; Positionen offener Rapporte zählen erst mit deren
        Abschluss. Abbau = Stunden aus Abwesenheiten, die den Saldo belasten.
      </p>

      <div className="max-w-2xl">
        <h2 className="text-lg font-medium mb-1">Manuelle Buchungen</h2>
        <p className="text-sm text-gray-500 mb-4">
          Für alles, was weder erfasste Zeit noch Abwesenheit ist: den
          Startsaldo bei der Einführung, die Auszahlung von Überstunden, eine
          Kürzung zum Jahreswechsel. Eine Buchung <strong>vor dem 1. Januar</strong>{" "}
          des angezeigten Jahres wirkt als Startsaldo.
        </p>

        <ul className="divide-y rounded-lg border bg-white mb-4">
          {buchungen?.map((b) => (
            <li key={b.id} className="flex flex-wrap items-center gap-3 px-4 py-2 text-sm">
              <span className="w-24 font-mono text-xs text-gray-500">
                {formatDatumCH(b.datum)}
              </span>
              <span
                className={`w-20 text-right font-medium ${
                  Number(b.stunden) < 0 ? "text-red-700" : "text-green-700"
                }`}
              >
                {stundenText(Number(b.stunden))} h
              </span>
              <span className="flex-1 min-w-[10rem]">
                {b.grund}
                <span className="block text-xs text-gray-400">
                  erfasst von {b.erfasser ?? "Unbekannt"}
                </span>
              </span>
              {istAdmin && (
                <DeleteButton
                  action={loescheZeitkontoBuchung.bind(null, id, b.id)}
                  label="entfernen"
                  confirmText="Diese Buchung entfernen? Der Saldo ändert sich damit rückwirkend."
                />
              )}
            </li>
          ))}
          {(!buchungen || buchungen.length === 0) && (
            <li className="px-4 py-3 text-sm text-gray-400">Noch keine Buchungen.</li>
          )}
        </ul>

        {istAdmin && (
          <form
            action={erfasseZeitkontoBuchung.bind(null, id)}
            className="flex flex-wrap items-end gap-3 rounded-lg border bg-white p-4 text-sm"
          >
            <div>
              <label className="block text-xs text-gray-500 mb-1" htmlFor="buchung_datum">
                Datum
              </label>
              <DatumFeld
                id="buchung_datum"
                name="datum"
                required
                className="rounded border border-gray-300 px-2 py-1.5"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1" htmlFor="buchung_stunden">
                Stunden
              </label>
              <input
                id="buchung_stunden"
                name="stunden"
                type="number"
                step="any"
                required
                placeholder="-8.5"
                title="Positiv = Gutschrift, negativ = Belastung"
                className="w-28 rounded border border-gray-300 px-2 py-1.5"
              />
            </div>
            <div className="flex-1 min-w-[12rem]">
              <label className="block text-xs text-gray-500 mb-1" htmlFor="buchung_grund">
                Grund
              </label>
              <input
                id="buchung_grund"
                name="grund"
                required
                placeholder="z.B. Auszahlung Überstunden"
                className="w-full rounded border border-gray-300 px-2 py-1.5"
              />
            </div>
            <button
              type="submit"
              className="rounded bg-arcos-steel px-4 py-2 text-sm font-medium text-white hover:bg-arcos-navy"
            >
              Buchen
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
