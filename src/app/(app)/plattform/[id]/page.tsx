import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/get-profile";
import {
  bearbeiteMitarbeiterPlattform,
  ladePersonEinPlattform,
  reaktiviereMitarbeiter,
  loescheOrganisationPlattform,
} from "@/app/actions/plattform";

type MitarbeiterZeile = {
  id: string;
  name: string;
  vorname: string | null;
  nachname: string | null;
  email: string | null;
  role: string;
  deaktiviert_am: string | null;
};

export default async function OrganisationDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; loeschen?: string; frist?: string }>;
}) {
  const profil = await getCurrentProfile();
  if (!profil?.ist_platform_admin) redirect("/");

  const { id } = await params;
  const { error, loeschen, frist } = await searchParams;
  const supabase = await createClient();

  // Die Profile eines FREMDEN Mandanten liest bewusst der Dienstschlüssel.
  //
  // Seit 0070 sind Profile strikt mandantengebunden – auch für Arcos. Vorher
  // erlaubte die RLS-Regel Plattform-Admins den Zugriff pauschal, und diese
  // Ausnahme wirkte in der ganzen Anwendung: fremde Mitarbeitende standen in
  // der eigenen Liste und in jeder Auswahl. Der Zugriff gehört an diese
  // Stelle, wo er gewollt und sichtbar ist, und nirgendwo sonst.
  //
  // Die Berechtigung ist oben geprüft (ist_platform_admin), und die
  // Organisation selbst kommt weiter über den RLS-geprüften Weg.
  const admin = createAdminClient();

  const [{ data: organisation }, { data: mitarbeitende }] = await Promise.all([
    supabase
      .from("organisationen")
      .select("id, name, lizenzen_gebucht, status, nachfrist_bis, stripe_subscription_id")
      .eq("id", id)
      .single(),
    admin
      .from("profiles")
      .select("id, name, vorname, nachname, email, role, deaktiviert_am")
      .eq("organisation_id", id)
      .order("nachname"),
  ]);

  if (!organisation) notFound();

  // Umfang der Löschung – gezählt aus derselben Quelle, aus der gelöscht
  // wird (0064). Nur laden, wenn die Bestätigung offen ist: Die Abfrage
  // zählt jede abhängige Tabelle einzeln durch, und dafür gibt es beim
  // blossen Ansehen der Seite keinen Grund.
  const { data: loeschUmfang } =
    loeschen === "1"
      ? await supabase.rpc("zaehle_organisation_daten", { p_organisation: id })
      : { data: null };

  const umfang = (loeschUmfang ?? []) as { tabelle: string; anzahl: number }[];
  const summe = umfang.reduce((s, z) => s + Number(z.anzahl), 0);

  const heute = new Date().toISOString().slice(0, 10);
  const nochGeschuetzt =
    organisation.status === "aktiv" ||
    Boolean(organisation.nachfrist_bis && organisation.nachfrist_bis >= heute);

  // Läuft die Frist der Kundin noch, steht vor der Löschung ein Fenster, das
  // man wegklicken muss. Ein Hinweis IM Formular wird überlesen – wer schon
  // auf "löschen" geklickt hat, liest nicht mehr, sondern sucht den nächsten
  // Knopf. Der Weg dahin führt über einen zweiten Klick, der als Adresse
  // sichtbar ist (?frist=verstanden), damit die Bestätigung nicht durch ein
  // versehentliches Klicken neben das Fenster verlorengeht.
  const fristHinweisOffen = loeschen === "1" && nochGeschuetzt && frist !== "verstanden";

  const liste = (mitarbeitende as MitarbeiterZeile[] | null) ?? [];
  const genutzt = liste.filter((m) => !m.deaktiviert_am).length;

  return (
    <div>
      <Link href="/plattform" className="text-sm text-arcos-steel hover:underline">
        ← Zur Plattform-Übersicht
      </Link>
      <div className="flex items-center justify-between mt-2 mb-6 flex-wrap gap-2">
        <h1 className="text-2xl font-semibold">{organisation.name}</h1>
        <span className="text-sm text-gray-500">
          {organisation.lizenzen_gebucht != null
            ? `${genutzt} von ${organisation.lizenzen_gebucht} Lizenzen genutzt`
            : `${genutzt} Lizenzen genutzt (unbegrenzt)`}
        </span>
      </div>

      {error && (
        <div className="rounded bg-red-50 text-red-700 text-sm px-3 py-2 mb-4">{error}</div>
      )}

      {/* --------------------------------------------------------------- */}
      {/* Person einladen                                                 */}
      {/* --------------------------------------------------------------- */}
      <div className="bg-white rounded-lg border p-5 mb-8">
        <h2 className="text-lg font-medium mb-1">Person einladen</h2>
        <p className="text-sm text-gray-500 mb-4">
          Z.B. wenn bei diesem Kunden die zuständige Person wechselt und noch
          niemand Passendes vorhanden ist.
        </p>
        <form
          action={ladePersonEinPlattform.bind(null, organisation.id)}
          className="flex flex-wrap items-end gap-3 text-sm"
        >
          <div>
            <label className="block text-xs text-gray-500 mb-1">Vorname</label>
            <input name="vorname" required className="rounded border border-gray-300 px-3 py-2 min-w-[9rem]" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Nachname</label>
            <input name="nachname" required className="rounded border border-gray-300 px-3 py-2 min-w-[9rem]" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">E-Mail</label>
            <input name="email" type="email" required className="rounded border border-gray-300 px-3 py-2 min-w-[14rem]" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Rolle</label>
            <select name="role" defaultValue="admin" className="rounded border border-gray-300 px-3 py-2">
              <option value="admin">Admin</option>
              <option value="mitarbeiter">Mitarbeitende</option>
            </select>
          </div>
          <button
            type="submit"
            className="rounded bg-arcos-steel text-white text-sm font-medium px-4 py-2 hover:bg-arcos-navy"
          >
            Einladungslink senden
          </button>
        </form>
      </div>

      {/* --------------------------------------------------------------- */}
      {/* Mitarbeitende bearbeiten                                        */}
      {/* --------------------------------------------------------------- */}
      <div className="bg-white rounded-lg border overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-3 py-2">Vorname</th>
              <th className="px-3 py-2">Nachname</th>
              <th className="px-3 py-2">E-Mail (Login)</th>
              <th className="px-3 py-2">Rolle</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {liste.map((m) => {
              const formId = `person-${m.id}`;
              const deaktiviert = Boolean(m.deaktiviert_am);
              const action = bearbeiteMitarbeiterPlattform.bind(null, m.id);
              return (
                <tr key={m.id} className={`border-t ${deaktiviert ? "bg-gray-50 text-gray-400" : ""}`}>
                  <td className="px-2 py-2">
                    <form action={action} id={formId} className="contents">
                      <input
                        name="vorname"
                        defaultValue={m.vorname ?? ""}
                        form={formId}
                        className="w-full rounded border border-gray-300 px-2 py-1.5"
                      />
                    </form>
                  </td>
                  <td className="px-2 py-2">
                    <input
                      name="nachname"
                      defaultValue={m.nachname ?? ""}
                      form={formId}
                      className="w-full rounded border border-gray-300 px-2 py-1.5"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      name="email"
                      type="email"
                      defaultValue={m.email ?? ""}
                      form={formId}
                      className="w-full rounded border border-gray-300 px-2 py-1.5 min-w-[13rem]"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <select
                      name="role"
                      defaultValue={m.role}
                      form={formId}
                      className="rounded border border-gray-300 px-2 py-1.5"
                    >
                      <option value="mitarbeiter">Mitarbeitende</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap text-xs">
                    {deaktiviert ? (
                      <span>Deaktiviert seit {new Date(m.deaktiviert_am!).toLocaleDateString("de-CH")}</span>
                    ) : (
                      <span className="text-green-700">Aktiv</span>
                    )}
                  </td>
                  <td className="px-2 py-2 text-right whitespace-nowrap">
                    <button
                      type="submit"
                      form={formId}
                      className="rounded bg-arcos-steel text-white text-xs font-medium px-3 py-1.5 hover:bg-arcos-navy"
                    >
                      Speichern
                    </button>
                    {deaktiviert && (
                      <form action={reaktiviereMitarbeiter.bind(null, m.id)} className="inline-block ml-2">
                        <button type="submit" className="rounded border text-xs font-medium px-3 py-1.5 hover:bg-gray-50">
                          Reaktivieren
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              );
            })}
            {liste.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                  Keine Mitarbeitenden gefunden.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400 mt-3">
        Änderung der E-Mail-Adresse ändert auch die Login-E-Mail – die Person
        meldet sich danach mit der neuen Adresse an.
      </p>

      {/* ----------------------------------------------------------------- */}
      {/* Mandant löschen                                                    */}
      {/* ----------------------------------------------------------------- */}
      <div className="bg-white rounded-lg border border-red-200 p-5 mt-10">
        <h2 className="text-lg font-medium mb-1 text-red-700">Mandant löschen</h2>
        <p className="text-sm text-gray-600 mb-3">
          Entfernt diese Organisation mit allen Daten und Benutzerkonten. Nach AGB
          Ziffer 10 ist das 30 Tage nach Vertragsende zu tun. <strong>Die Löschung
          lässt sich nicht rückgängig machen</strong> – es gibt keinen Papierkorb.
        </p>
        <p className="text-sm text-gray-600 mb-4">
          {organisation.stripe_subscription_id
            ? "Ein laufendes Abonnement bei Stripe wird dabei beendet – sonst liefe die Belastung weiter, während es den Mandanten nicht mehr gibt. "
            : ""}
          Die Rechnungen der Arcos Group an diese Kundin bleiben bestehen: Sie sind
          Belege und zehn Jahre aufzubewahren (Art. 958f OR).
        </p>

        <div className="flex flex-wrap gap-3 mb-4">
          <a
            href={`/api/export/vollstaendig?organisation=${organisation.id}`}
            className="inline-block rounded border px-4 py-2 text-sm hover:bg-gray-50"
          >
            Sicherungskopie herunterladen (JSON)
          </a>
          <a
            href={`/api/export/vollstaendig?organisation=${organisation.id}&format=xlsx`}
            className="inline-block rounded border px-4 py-2 text-sm hover:bg-gray-50"
          >
            als Excel
          </a>
        </div>

        {loeschen !== "1" || fristHinweisOffen ? (
          <Link
            href={`/plattform/${organisation.id}?loeschen=1`}
            className="inline-block rounded border border-red-300 text-red-700 px-4 py-2 text-sm hover:bg-red-50"
          >
            Löschung vorbereiten
          </Link>
        ) : (
          <div className="rounded bg-red-50 border border-red-200 p-4 space-y-4">
            <div>
              <p className="text-sm font-medium text-red-900 mb-2">
                Gelöscht werden {summe} Datensätze und {liste.length} Benutzerkonten:
              </p>
              {umfang.length > 0 ? (
                <ul className="text-sm text-red-900 grid grid-cols-2 sm:grid-cols-3 gap-x-6">
                  {umfang.map((z) => (
                    <li key={z.tabelle}>
                      {z.tabelle}: {z.anzahl}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-red-900">Keine Daten erfasst.</p>
              )}
              {liste.length > 0 && (
                <p className="text-sm text-red-900 mt-2">
                  Konten: {liste.map((m) => m.email ?? m.name).join(", ")}
                </p>
              )}
            </div>

            {/* Abtippen statt anklicken: Gegen den Griff auf die falsche
                Zeile hilft keine Rückfrage mit "OK", sondern nur etwas, das
                man nicht aus Versehen tut. */}
            <form action={loescheOrganisationPlattform.bind(null, organisation.id)}>
              <label className="block text-sm text-red-900 mb-1">
                Zur Bestätigung den Namen der Organisation eintippen:{" "}
                <strong>{organisation.name}</strong>
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  name="bestaetigung"
                  autoComplete="off"
                  className="rounded border border-red-300 px-3 py-2 text-sm"
                  placeholder={organisation.name}
                />
                <button
                  type="submit"
                  className="rounded bg-red-600 text-white px-4 py-2 text-sm hover:bg-red-700"
                >
                  Endgültig löschen
                </button>
                <Link href={`/plattform/${organisation.id}`} className="text-sm underline">
                  Abbrechen
                </Link>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* --------------------------------------------------------------- */}
      {/* Fenster: die Frist der Kundin läuft noch                         */}
      {/* --------------------------------------------------------------- */}
      {fristHinweisOffen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-6 space-y-4">
            <h3 className="text-lg font-semibold text-red-700">
              Die Frist dieser Kundin läuft noch
            </h3>

            {organisation.status === "aktiv" ? (
              // Ohne Abo ist es ein Gratismandant (Demo, intern, Testzugang) –
              // dann wäre "entzieht ihr eine bezahlte Leistung" schlicht falsch.
              <p className="text-sm text-gray-700">
                <strong>{organisation.name}</strong> ist <strong>aktiv</strong> und wird
                genutzt.{" "}
                {organisation.stripe_subscription_id
                  ? "Die Kundin hat ein laufendes Abonnement und vollen Anspruch auf ihre Daten; eine Löschung jetzt entzieht ihr eine bezahlte Leistung."
                  : "Für diese Organisation läuft kein Abonnement (Demo- oder Gratiszugang) – die Daten darin sind trotzdem echte Arbeit."}
              </p>
            ) : (
              <p className="text-sm text-gray-700">
                Nach AGB Ziffer 10 bleiben die Daten <strong>30 Tage abrufbereit</strong>,
                damit die Kundin sie herunterladen kann. Diese Frist läuft noch bis zum{" "}
                <strong>
                  {organisation.nachfrist_bis
                    ? new Date(organisation.nachfrist_bis).toLocaleDateString("de-CH", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })
                    : "—"}
                </strong>
                . Wer jetzt löscht, nimmt ihr diese Möglichkeit.
              </p>
            )}

            <p className="text-sm text-gray-700">
              Die Löschung ist <strong>nicht umkehrbar</strong>. Wenn es trotzdem sein
              muss – etwa bei einem Testmandanten oder auf ausdrücklichen Wunsch der
              Kundin – lade vorher die Sicherungskopie herunter.
            </p>

            <a
              href={`/api/export/vollstaendig?organisation=${organisation.id}`}
              className="inline-block rounded border px-4 py-2 text-sm hover:bg-gray-50"
            >
              Sicherungskopie herunterladen
            </a>

            <div className="flex flex-wrap items-center gap-3 pt-2 border-t">
              <Link
                href={`/plattform/${organisation.id}`}
                className="rounded bg-arcos-navy text-white px-4 py-2 text-sm hover:opacity-90"
              >
                Abbrechen
              </Link>
              <Link
                href={`/plattform/${organisation.id}?loeschen=1&frist=verstanden`}
                className="text-sm text-red-700 underline"
              >
                Verstanden – trotzdem löschen
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
