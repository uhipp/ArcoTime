import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, getCurrentOrganisation } from "@/lib/get-profile";
import { darf } from "@/lib/berechtigungen";
import { ZurueckLinks } from "@/components/zurueck-links";
import { DeleteButton } from "@/components/delete-button";
import { ladeZeitkonto, stundenText } from "@/lib/zeitkonto";
import { schliesseMonatAb, oeffneMonatWieder } from "@/app/actions/zeitkonto";

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

// Monatsabschluss über alle Mitarbeitenden (Phase 12, Etappe D).
//
// Eine Seite für den Monat und nicht ein Knopf je Person: Der Abschluss
// ist eine Arbeit des Büros, die einmal im Monat für alle ansteht. Wer
// dafür zwanzig Personenseiten öffnen müsste, tut es nicht.
export default async function AbschlussPage({
  searchParams,
}: {
  searchParams: Promise<{ jahr?: string; monat?: string; error?: string }>;
}) {
  const [profile, organisation] = await Promise.all([
    getCurrentProfile(),
    getCurrentOrganisation(),
  ]);
  if (!darf(profile, "einstellungen.verwalten")) redirect("/");
  if (!organisation?.modul_zeitkonto) redirect("/einstellungen");

  const { jahr, monat, error } = await searchParams;
  const heute = new Date();
  // Vorgabe ist der VORmonat: Abgeschlossen wird, was vorbei ist.
  const vormonat = new Date(heute.getFullYear(), heute.getMonth() - 1, 1);
  const gewaehltesJahr = Number(jahr) || vormonat.getFullYear();
  const gewaehlterMonat = Number(monat) || vormonat.getMonth() + 1;

  const supabase = await createClient();
  const { data: personen } = await supabase
    .from("profiles")
    .select("id, name, vorname, austritt")
    .is("deaktiviert_am", null)
    .order("name");

  const letzterTag = new Date(gewaehltesJahr, gewaehlterMonat, 0).getDate();
  const monatVon = `${gewaehltesJahr}-${String(gewaehlterMonat).padStart(2, "0")}-01`;
  const monatBis = `${gewaehltesJahr}-${String(gewaehlterMonat).padStart(2, "0")}-${letzterTag}`;

  const [{ data: abschluesse }, { data: offeneRapporte }] = await Promise.all([
    supabase
      .from("monatsabschluesse")
      .select("id, mitarbeiter_id, soll_stunden, ist_stunden, saldo_ende, ferien_bezogen_tage, offene_rapporte, abgeschlossen_am")
      .eq("jahr", gewaehltesJahr)
      .eq("monat", gewaehlterMonat),
    supabase
      .from("rapporte")
      .select("id, mitarbeiter_id")
      .eq("status", "offen")
      .gte("datum", monatVon)
      .lte("datum", monatBis),
  ]);

  const abschlussVon = new Map((abschluesse ?? []).map((a) => [a.mitarbeiter_id, a]));
  const offeneJePerson = new Map<string, number>();
  for (const r of offeneRapporte ?? []) {
    offeneJePerson.set(r.mitarbeiter_id, (offeneJePerson.get(r.mitarbeiter_id) ?? 0) + 1);
  }

  // Die Zahlen je Person. Bewusst nacheinander und nicht in einem Zug:
  // Die Berechnung liest je Person ein Jahr, und bei zwanzig Personen
  // wäre ein gleichzeitiger Schwung Abfragen unhöflich gegenüber der
  // Datenbank.
  const zeilen = [];
  for (const p of personen ?? []) {
    const konto = await ladeZeitkonto(supabase, p.id, gewaehltesJahr);
    const zeile = konto.zeilen.find((z) => z.monat === gewaehlterMonat);
    zeilen.push({
      person: p,
      zeile,
      ferienRest: konto.ferienRest,
      abschluss: abschlussVon.get(p.id),
      offen: offeneJePerson.get(p.id) ?? 0,
    });
  }

  const query = (over: { jahr?: number; monat?: number }) =>
    `/einstellungen/zeitkonto/abschluss?jahr=${over.jahr ?? gewaehltesJahr}&monat=${
      over.monat ?? gewaehlterMonat
    }`;

  const vorher = new Date(gewaehltesJahr, gewaehlterMonat - 2, 1);
  const nachher = new Date(gewaehltesJahr, gewaehlterMonat, 1);
  const offeneGesamt = zeilen.reduce((s, z) => s + (z.abschluss ? 0 : z.offen), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Monatsabschluss</h1>
        <ZurueckLinks
          links={[
            { href: "/einstellungen/zeitkonto", text: "Zu den Sollstunden" },
            { href: "/einstellungen", text: "Zu den Einstellungen" },
          ]}
        />
      </div>

      {error && <div className="rounded bg-red-50 text-red-700 text-sm px-3 py-2">{error}</div>}

      <p className="text-sm text-gray-500 max-w-3xl">
        Der Abschluss hält Soll, Ist, Saldo und Ferien fest, wie sie jetzt
        sind. Danach rechnet das Zeitkonto den Folgemonat auf diesem Stand
        weiter, und eine spätere Korrektur an einem alten Zeiteintrag
        verschiebt die Zahl nicht mehr, die an die Lohnbuchhaltung ging.
        Korrekturen laufen dann über eine Buchung im Folgemonat.
      </p>

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <Link
          href={query({ jahr: vorher.getFullYear(), monat: vorher.getMonth() + 1 })}
          className="rounded border bg-white px-3 py-1.5 hover:bg-gray-50"
        >
          ← {MONATE[vorher.getMonth()]} {vorher.getFullYear()}
        </Link>
        <span className="font-medium">
          {MONATE[gewaehlterMonat - 1]} {gewaehltesJahr}
        </span>
        <Link
          href={query({ jahr: nachher.getFullYear(), monat: nachher.getMonth() + 1 })}
          className="rounded border bg-white px-3 py-1.5 hover:bg-gray-50"
        >
          {MONATE[nachher.getMonth()]} {nachher.getFullYear()} →
        </Link>
        <a
          href={`/einstellungen/zeitkonto/abschluss/pdf?jahr=${gewaehltesJahr}&monat=${gewaehlterMonat}`}
          target="_blank"
          rel="noopener"
          className="ml-auto rounded border bg-white px-3 py-1.5 hover:bg-gray-50"
        >
          Übersicht als PDF
        </a>
      </div>

      {offeneGesamt > 0 && (
        <p className="rounded border-2 border-amber-400 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong>
            {offeneGesamt} {offeneGesamt === 1 ? "Rapport ist" : "Rapporte sind"} in diesem
            Monat noch offen.
          </strong>{" "}
          Ihre Stunden zählen erst mit dem Abschluss des Rapports – wird der
          Monat jetzt eingefroren, fehlen sie dauerhaft. Der typische Fall ist
          der Einsatz vom Monatsletzten, der erst ein paar Tage später
          abgeschlossen wird.
        </p>
      )}

      <div className="bg-white rounded-lg border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-2 font-medium">Person</th>
              <th className="px-4 py-2 font-medium text-right">Soll</th>
              <th className="px-4 py-2 font-medium text-right">Ist</th>
              <th className="px-4 py-2 font-medium text-right">Saldo Ende</th>
              <th className="px-4 py-2 font-medium text-right">Ferien Rest</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {zeilen.map(({ person, zeile, ferienRest, abschluss, offen }) => (
              <tr key={person.id} className={abschluss ? "bg-gray-50" : ""}>
                <td className="px-4 py-2">
                  <Link
                    href={`/mitarbeiter/${person.id}/zeitkonto?jahr=${gewaehltesJahr}`}
                    className="text-arcos-steel hover:underline"
                  >
                    {person.vorname ? `${person.vorname} ` : ""}
                    {person.name}
                  </Link>
                </td>
                <td className="px-4 py-2 text-right whitespace-nowrap">
                  {(abschluss ? Number(abschluss.soll_stunden) : (zeile?.soll ?? 0)).toFixed(2)}
                </td>
                <td className="px-4 py-2 text-right whitespace-nowrap">
                  {(abschluss ? Number(abschluss.ist_stunden) : (zeile?.ist ?? 0)).toFixed(2)}
                </td>
                <td className="px-4 py-2 text-right whitespace-nowrap font-medium">
                  {stundenText(abschluss ? Number(abschluss.saldo_ende) : (zeile?.saldo ?? 0))}
                </td>
                <td className="px-4 py-2 text-right whitespace-nowrap">
                  {(abschluss ? Number(abschluss.ferien_bezogen_tage) : ferienRest).toFixed(1)}
                </td>
                <td className="px-4 py-2 whitespace-nowrap">
                  {abschluss ? (
                    <span className="text-xs text-gray-500">
                      abgeschlossen{" "}
                      {new Date(abschluss.abgeschlossen_am).toLocaleDateString("de-CH")}
                      {abschluss.offene_rapporte > 0 && (
                        <span className="text-amber-700">
                          {" "}
                          · {abschluss.offene_rapporte} Rapport
                          {abschluss.offene_rapporte === 1 ? "" : "e"} war
                          {abschluss.offene_rapporte === 1 ? "" : "en"} offen
                        </span>
                      )}
                    </span>
                  ) : offen > 0 ? (
                    <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                      {offen} Rapport{offen === 1 ? "" : "e"} offen
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">bereit</span>
                  )}
                </td>
                <td className="px-4 py-2 text-right whitespace-nowrap">
                  {abschluss ? (
                    <DeleteButton
                      action={oeffneMonatWieder.bind(
                        null,
                        gewaehltesJahr,
                        gewaehlterMonat,
                        abschluss.id
                      )}
                      label="wieder öffnen"
                      confirmText="Diesen Monat wieder öffnen? Die festgehaltenen Zahlen werden verworfen und neu gerechnet – auch der Saldo aller Folgemonate ändert sich damit."
                    />
                  ) : (
                    <form
                      action={schliesseMonatAb.bind(
                        null,
                        gewaehltesJahr,
                        gewaehlterMonat,
                        person.id
                      )}
                    >
                      <button
                        type="submit"
                        className="rounded bg-arcos-steel px-3 py-1.5 text-xs font-medium text-white hover:bg-arcos-navy"
                      >
                        Abschliessen
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
            {zeilen.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-gray-400">
                  Keine aktiven Mitarbeitenden.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-400">
        Bewusst je Person und nicht für alle auf einmal: Wer bei einer Person
        noch etwas nachtragen will, soll die übrigen trotzdem abschliessen
        können. Ein Abschluss lässt sich wieder öffnen – das Änderungsprotokoll
        hält beides fest.
      </p>
    </div>
  );
}
