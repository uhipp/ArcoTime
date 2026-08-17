import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganisation, getCurrentProfile } from "@/lib/get-profile";
import { darf } from "@/lib/berechtigungen";
import { ZurueckLinks } from "@/components/zurueck-links";
import { ladeAbo } from "@/lib/abo";
import { staffelBeschreibung } from "@/lib/lizenzpreise";
import { formatDatumCH } from "@/lib/date-utils";
import { landName, rechnungsNummer } from "@/lib/rechnung-daten";
import { kuendigeAbo, widerrufeKuendigung } from "@/app/actions/abo";
import { FIRMA } from "@/content/recht";

// Abonnement: was gebucht ist, was verrechnet wurde, und der Weg hinaus.
//
// Der letzte Punkt ist der Grund für diese Seite. AGB Ziffer 6 sagt zu, dass
// die Kündigung "über die Anwendung" möglich ist – ohne diese Seite wäre das
// eine Zusage ohne Deckung gewesen.
//
// Zweiter Grund: Belege. Die Rechnungen liegen als PDF im Ablagebereich,
// aber eine Kundin kommt dort nicht hin. Eine Rechnung, die nur im Postfach
// desjenigen liegt, der sie damals bekommen hat, ist im Zweifel weg.

function datumAusDate(d: Date | null): string | null {
  return d ? d.toISOString().slice(0, 10) : null;
}

export default async function AboPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; kuendigen?: string }>;
}) {
  const profile = await getCurrentProfile();
  if (!darf(profile, "abo.verwalten")) redirect("/");

  const { error, kuendigen } = await searchParams;
  const eigene = await getCurrentOrganisation();
  const supabase = await createClient();

  const { data: organisation } = await supabase
    .from("organisationen")
    .select("id, name, stripe_subscription_id, strasse, hausnummer, plz, ort, land, steuernummer")
    .eq("id", eigene?.id ?? "")
    .single();

  const [{ count: belegteLizenzen }, { data: rechnungen }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("organisation_id", eigene?.id ?? ""),
    supabase
      .from("rechnungen")
      .select("id, jahr, nummer, ausgestellt_am, periode_von, periode_bis, brutto, waehrung, pdf_pfad")
      // Ausdrücklich auf die eigene Organisation eingegrenzt und nicht der
      // RLS-Regel überlassen: Die erlaubt zusätzlich Plattform-Admins, die
      // sonst auf IHRER Abo-Seite die Rechnungen aller Kundinnen sähen.
      .eq("organisation_id", eigene?.id ?? "")
      .order("jahr", { ascending: false })
      .order("nummer", { ascending: false }),
  ]);

  const { abo, fehler: aboFehler } = organisation?.stripe_subscription_id
    ? await ladeAbo(organisation.stripe_subscription_id)
    : { abo: null, fehler: null };

  const periodenende = datumAusDate(abo?.periodeEndetAm ?? null);
  const testende = datumAusDate(abo?.testEndetAm ?? null);

  return (
    <div className="space-y-6">
      <ZurueckLinks links={[{ href: "/einstellungen", text: "Einstellungen" }]} />
      <h1 className="text-2xl font-semibold">Abonnement</h1>

      {error && (
        <div className="rounded bg-red-50 text-red-700 text-sm px-3 py-2">{error}</div>
      )}

      {/* --------------------------------------------------------------- */}
      <div className="rounded-lg border bg-white p-5 space-y-4">
        <h2 className="text-lg font-medium">Euer Abonnement</h2>

        {!organisation?.stripe_subscription_id && (
          <p className="text-sm text-gray-600">
            Für <strong>{organisation?.name}</strong> ist kein Abonnement über die
            Selbstregistrierung hinterlegt. Fragen zur Abrechnung beantwortet{" "}
            <a className="underline" href={`mailto:${FIRMA.supportEmail}`}>
              {FIRMA.supportEmail}
            </a>
            .
          </p>
        )}

        {aboFehler && (
          <div className="rounded bg-amber-50 text-amber-800 text-sm px-3 py-2">
            Die Angaben zum Abonnement sind gerade nicht abrufbar ({aboFehler}). Bitte
            später nochmals versuchen – am Vertrag ändert das nichts.
          </div>
        )}

        {abo && (
          <>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
              <div className="flex justify-between border-b py-1">
                <dt className="text-gray-500">Abrechnung</dt>
                <dd>
                  {abo.zyklus === "jaehrlich"
                    ? "jährlich"
                    : abo.zyklus === "monatlich"
                      ? "monatlich"
                      : "—"}
                </dd>
              </div>
              <div className="flex justify-between border-b py-1">
                <dt className="text-gray-500">Benutzerlizenzen</dt>
                <dd>
                  {abo.lizenzen}
                  {typeof belegteLizenzen === "number" && (
                    <span className="text-gray-500"> · {belegteLizenzen} belegt</span>
                  )}
                </dd>
              </div>
              {testende && (
                <div className="flex justify-between border-b py-1">
                  <dt className="text-gray-500">Testphase bis</dt>
                  <dd>{formatDatumCH(testende)}</dd>
                </div>
              )}
              <div className="flex justify-between border-b py-1">
                <dt className="text-gray-500">
                  {abo.gekuendigtAufPeriodenende ? "Zugang bis" : "Nächste Verlängerung"}
                </dt>
                <dd>{periodenende ? formatDatumCH(periodenende) : "—"}</dd>
              </div>
            </dl>

            <p className="text-sm text-gray-500">{staffelBeschreibung()}</p>

            {abo.gekuendigtAufPeriodenende && !abo.beendet && (
              <div className="rounded bg-amber-50 text-amber-900 text-sm px-3 py-3 space-y-3">
                <p>
                  Das Abonnement ist <strong>gekündigt</strong>. ArcoTime bleibt bis{" "}
                  {periodenende ? formatDatumCH(periodenende) : "zum Ende der Periode"}{" "}
                  vollständig nutzbar; danach wird nichts mehr belastet.
                </p>
                <p>
                  Bitte denkt vor diesem Datum an einen{" "}
                  <Link href="/export" className="underline">
                    Export eurer Daten
                  </Link>
                  .
                </p>
                <form action={widerrufeKuendigung}>
                  <button
                    type="submit"
                    className="rounded border border-amber-700 px-4 py-2 text-sm hover:bg-amber-100"
                  >
                    Kündigung zurückziehen
                  </button>
                </form>
              </div>
            )}

            {abo.beendet && (
              <div className="rounded bg-gray-100 text-gray-700 text-sm px-3 py-2">
                Das Abonnement ist beendet.
              </div>
            )}
          </>
        )}
      </div>

      {/* --------------------------------------------------------------- */}
      <div className="rounded-lg border bg-white p-5 space-y-3">
        <h2 className="text-lg font-medium">Rechnungen</h2>
        {!rechnungen?.length ? (
          <p className="text-sm text-gray-500">
            Noch keine Rechnungen. Die erste entsteht mit der ersten Belastung nach der
            Testphase; sie kommt zusätzlich per E-Mail an alle Administratorinnen und
            Administratoren.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="py-2 font-medium">Nummer</th>
                <th className="py-2 font-medium">Datum</th>
                <th className="py-2 font-medium">Zeitraum</th>
                <th className="py-2 font-medium text-right">Betrag</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {rechnungen.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="py-2">{rechnungsNummer(r.jahr, r.nummer)}</td>
                  <td className="py-2">{formatDatumCH(r.ausgestellt_am)}</td>
                  <td className="py-2 text-gray-500">
                    {r.periode_von && r.periode_bis
                      ? `${formatDatumCH(r.periode_von)} – ${formatDatumCH(r.periode_bis)}`
                      : "—"}
                  </td>
                  <td className="py-2 text-right">
                    {r.waehrung} {Number(r.brutto).toFixed(2)}
                  </td>
                  <td className="py-2 text-right">
                    {r.pdf_pfad ? (
                      <a
                        className="text-arcos-steel hover:underline"
                        href={`/api/rechnungen/${r.id}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        PDF
                      </a>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* --------------------------------------------------------------- */}
      <div className="rounded-lg border bg-white p-5 space-y-2">
        <h2 className="text-lg font-medium">Rechnungsadresse</h2>
        <p className="text-sm">
          {organisation?.name}
          <br />
          {[organisation?.strasse, organisation?.hausnummer].filter(Boolean).join(" ") || "—"}
          <br />
          {[organisation?.plz, organisation?.ort].filter(Boolean).join(" ") || "—"}
          {organisation?.land && organisation.land !== "CH" && (
            <>
              <br />
              {landName(organisation.land)}
            </>
          )}
          {organisation?.steuernummer && (
            <>
              <br />
              <span className="text-gray-500">MWST-Nr. {organisation.steuernummer}</span>
            </>
          )}
        </p>
        <p className="text-sm text-gray-500">
          Adresse und Ort ändert ihr unter{" "}
          <Link href="/einstellungen" className="underline">
            Einstellungen → Organisation
          </Link>
          . Land und MWST-Nummer bestimmen die steuerliche Behandlung der Rechnung und
          müssen mit den Angaben beim Zahlungsdienstleister übereinstimmen – dafür bitte
          kurz an{" "}
          <a className="underline" href={`mailto:${FIRMA.supportEmail}`}>
            {FIRMA.supportEmail}
          </a>{" "}
          melden.
        </p>
      </div>

      {/* --------------------------------------------------------------- */}
      {abo && !abo.gekuendigtAufPeriodenende && !abo.beendet && (
        <div className="rounded-lg border bg-white p-5 space-y-3">
          <h2 className="text-lg font-medium">Kündigen</h2>
          <p className="text-sm text-gray-600">
            Ihr könnt jederzeit auf das Ende der laufenden Abrechnungsperiode kündigen.
            Bis dahin bleibt ArcoTime vollständig nutzbar.
          </p>

          {kuendigen !== "1" ? (
            <Link
              href="/einstellungen/abo?kuendigen=1"
              className="inline-block rounded border px-4 py-2 text-sm hover:bg-gray-50"
            >
              Abonnement kündigen
            </Link>
          ) : (
            // Bewusst als eigener Schritt und nicht als Rückfrage im Browser:
            // Vor einer Kündigung soll dastehen, was sie konkret bedeutet –
            // bis wann der Zugang bleibt und was mit den Daten geschieht.
            <div className="rounded bg-red-50 text-red-900 text-sm px-4 py-3 space-y-3">
              <p className="font-medium">Abonnement wirklich kündigen?</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  ArcoTime bleibt bis{" "}
                  <strong>
                    {periodenende ? formatDatumCH(periodenende) : "zum Ende der Periode"}
                  </strong>{" "}
                  vollständig nutzbar.
                </li>
                <li>Danach wird nichts mehr belastet.</li>
                <li>Bereits bezahlte Beträge werden nicht zurückerstattet (AGB Ziffer 6).</li>
                <li>
                  Die Daten werden 30 Tage nach Vertragsende gelöscht (AGB Ziffer 10) –
                  bitte vorher{" "}
                  <Link href="/export" className="underline">
                    exportieren
                  </Link>
                  .
                </li>
                <li>Ihr könnt die Kündigung bis zum Ablauf jederzeit zurückziehen.</li>
              </ul>
              <div className="flex items-center gap-3">
                <form action={kuendigeAbo}>
                  <button
                    type="submit"
                    className="rounded bg-red-600 text-white px-4 py-2 text-sm hover:bg-red-700"
                  >
                    Ja, kündigen
                  </button>
                </form>
                <Link href="/einstellungen/abo" className="text-sm underline">
                  Abbrechen
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
