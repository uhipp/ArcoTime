import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { OptionalesDatumFeld } from "@/components/optionales-datum-feld";
import { getCurrentProfile } from "@/lib/get-profile";
import {
  erstelleOrganisation,
  aktualisiereOrganisation,
  alsBezahltMarkieren,
  reaktiviereMitarbeiter,
} from "@/app/actions/plattform";

type Organisation = {
  id: string;
  name: string;
  status: string;
  lizenzen_gebucht: number | null;
  abrechnungszyklus: string;
  modul_disposition: boolean;
  preis_pro_zyklus: number | null;
  waehrung: string;
  test_endet_am: string | null;
  naechster_zahltermin: string | null;
  sperrgrund: string | null;
};

type ProfilKurz = {
  id: string;
  name: string;
  organisation_id: string;
  deaktiviert_am: string | null;
  role: string;
};

export default async function PlattformPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const profil = await getCurrentProfile();
  if (!profil?.ist_platform_admin) redirect("/");

  const { error } = await searchParams;
  const supabase = await createClient();

  const [{ data: organisationen }, { data: profile }] = await Promise.all([
    supabase.from("organisationen").select("*").order("erstellt_am"),
    supabase.from("profiles").select("id, name, organisation_id, deaktiviert_am, role").order("name"),
  ]);

  const orgs = (organisationen as Organisation[] | null) ?? [];
  const alleProfile = (profile as ProfilKurz[] | null) ?? [];
  const orgName = new Map(orgs.map((o) => [o.id, o.name]));

  const genutzteLizenzen = (orgId: string) =>
    alleProfile.filter((p) => p.organisation_id === orgId && !p.deaktiviert_am).length;

  const deaktivierte = alleProfile.filter((p) => p.deaktiviert_am);

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-2">Plattform-Administration</h1>
      <p className="text-sm text-gray-500 mb-6">
        Nur für Arcos Group – Verwaltung aller Kunden-Organisationen und deren Lizenzen.
      </p>

      {error && (
        <div className="rounded bg-red-50 text-red-700 text-sm px-3 py-2 mb-4">{error}</div>
      )}

      {/* --------------------------------------------------------------- */}
      {/* Neue Organisation anlegen                                       */}
      {/* --------------------------------------------------------------- */}
      <div className="bg-white rounded-lg border p-5 mb-8">
        <h2 className="text-lg font-medium mb-1">Neue Organisation anlegen</h2>
        <p className="text-sm text-gray-500 mb-4">
          Für einen neuen Kunden oder einen Demo-Mandanten. Legt sofort das erste
          Admin-Konto der Organisation an und sendet eine Einladungs-Mail.
        </p>
        <form action={erstelleOrganisation} className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Name der Organisation</label>
            <input name="name" required className="w-full rounded border border-gray-300 px-3 py-2" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Anzahl Lizenzen</label>
            <input
              name="lizenzen_gebucht"
              type="number"
              min={1}
              required
              defaultValue={5}
              className="w-full rounded border border-gray-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Abrechnungszyklus</label>
            <select name="abrechnungszyklus" defaultValue="monatlich" className="w-full rounded border border-gray-300 px-3 py-2">
              <option value="monatlich">Monatlich</option>
              <option value="jaehrlich">Jährlich</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Preis pro Zyklus (optional)</label>
            <input
              name="preis_pro_zyklus"
              type="number"
              step="0.01"
              placeholder="z.B. 45.00"
              className="w-full rounded border border-gray-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Admin – Vorname</label>
            <input name="admin_vorname" required className="w-full rounded border border-gray-300 px-3 py-2" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Admin – Nachname</label>
            <input name="admin_nachname" required className="w-full rounded border border-gray-300 px-3 py-2" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs text-gray-500 mb-1">Admin – E-Mail</label>
            <input
              name="admin_email"
              type="email"
              required
              className="w-full rounded border border-gray-300 px-3 py-2"
            />
          </div>
          <div className="flex items-center gap-2 pt-6">
            <input type="checkbox" name="ist_demo" id="ist_demo" />
            <label htmlFor="ist_demo" className="text-xs text-gray-500">
              Demo-Organisation (nur Hinweistext, keine Sonderfunktion)
            </label>
          </div>
          <div className="sm:col-span-3">
            <button
              type="submit"
              className="rounded bg-arcos-steel text-white text-sm font-medium px-4 py-2 hover:bg-arcos-navy"
            >
              Organisation anlegen
            </button>
          </div>
        </form>
      </div>

      {/* --------------------------------------------------------------- */}
      {/* Organisationen verwalten                                        */}
      {/* --------------------------------------------------------------- */}
      <div className="bg-white rounded-lg border overflow-hidden overflow-x-auto mb-8">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-3 py-2">Organisation</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Lizenzen (genutzt/gebucht)</th>
              <th className="px-3 py-2">Dispo</th>
              <th className="px-3 py-2">Zyklus</th>
              <th className="px-3 py-2">Preis</th>
              <th className="px-3 py-2">Testphase bis</th>
              <th className="px-3 py-2">Nächster Zahltermin</th>
              <th className="px-3 py-2">Sperrgrund</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {orgs.map((org) => {
              const action = aktualisiereOrganisation.bind(null, org.id);
              const formId = `org-${org.id}`;
              const genutzt = genutzteLizenzen(org.id);
              const ueberLimit = org.lizenzen_gebucht != null && genutzt > org.lizenzen_gebucht;
              return (
                <tr key={org.id} className="border-t align-top">
                  <td className="px-3 py-2 whitespace-nowrap">
                    <Link href={`/plattform/${org.id}`} className="font-medium text-arcos-navy hover:underline">
                      {org.name}
                    </Link>
                  </td>
                  <td className="px-2 py-2">
                    <form action={action} id={formId} className="contents">
                      <select
                        name="status"
                        defaultValue={org.status}
                        form={formId}
                        className="rounded border border-gray-300 px-2 py-1.5"
                      >
                        <option value="aktiv">Aktiv</option>
                        <option value="pausiert">Pausiert</option>
                        <option value="gekuendigt">Gekündigt</option>
                      </select>
                    </form>
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap">
                    <span className={ueberLimit ? "text-red-600 font-medium" : "text-gray-500"}>
                      {genutzt} /
                    </span>{" "}
                    <input
                      name="lizenzen_gebucht"
                      type="number"
                      min={0}
                      defaultValue={org.lizenzen_gebucht ?? ""}
                      placeholder="∞"
                      form={formId}
                      className="w-16 rounded border border-gray-300 px-2 py-1.5"
                    />
                  </td>
                  <td className="px-2 py-2">
                    {/* Kostenpflichtiges Zusatzmodul – Freischaltung
                        vorerst nur hier, Selbstbuchung folgt. */}
                    <input
                      type="checkbox"
                      name="modul_disposition"
                      defaultChecked={org.modul_disposition}
                      form={formId}
                      title="Zusatzmodul Disposition"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <select
                      name="abrechnungszyklus"
                      defaultValue={org.abrechnungszyklus}
                      form={formId}
                      className="rounded border border-gray-300 px-2 py-1.5"
                    >
                      <option value="monatlich">Monatlich</option>
                      <option value="jaehrlich">Jährlich</option>
                    </select>
                  </td>
                  <td className="px-2 py-2">
                    <input
                      name="preis_pro_zyklus"
                      type="number"
                      step="0.01"
                      defaultValue={org.preis_pro_zyklus ?? ""}
                      form={formId}
                      className="w-20 rounded border border-gray-300 px-2 py-1.5"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <OptionalesDatumFeld
                      name="test_endet_am"
                      defaultValue={org.test_endet_am?.slice(0, 10) ?? null}
                      formId={formId}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <OptionalesDatumFeld
                      name="naechster_zahltermin"
                      defaultValue={org.naechster_zahltermin ?? null}
                      formId={formId}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      name="sperrgrund"
                      defaultValue={org.sperrgrund ?? ""}
                      placeholder="–"
                      form={formId}
                      className="w-28 rounded border border-gray-300 px-2 py-1.5"
                    />
                  </td>
                  <td className="px-2 py-2 text-right whitespace-nowrap">
                    <button
                      type="submit"
                      form={formId}
                      className="rounded bg-arcos-steel text-white text-xs font-medium px-3 py-1.5 hover:bg-arcos-navy"
                    >
                      Speichern
                    </button>
                    {org.status !== "aktiv" && (
                      <form action={alsBezahltMarkieren.bind(null, org.id)} className="inline-block ml-2">
                        <button
                          type="submit"
                          className="rounded border text-xs font-medium px-3 py-1.5 hover:bg-gray-50"
                        >
                          Als bezahlt markieren
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              );
            })}
            {orgs.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-6 text-center text-gray-400">
                  Keine Organisationen gefunden.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400 mb-8">
        Auf den Namen klicken, um die Mitarbeitenden dieser Organisation zu verwalten
        (Person bearbeiten, Admin-Rolle übertragen, neue Person einladen). Leeres
        Lizenzenfeld = unbegrenzt (für die eigene Organisation gedacht). Status
        "Aktiv" setzt den Sperrgrund automatisch zurück.
      </p>

      {/* --------------------------------------------------------------- */}
      {/* Deaktivierte Mitarbeitenden-Konten                              */}
      {/* --------------------------------------------------------------- */}
      <div className="bg-white rounded-lg border overflow-hidden overflow-x-auto">
        <div className="px-4 py-3 border-b">
          <h2 className="text-lg font-medium">Deaktivierte Mitarbeitenden-Konten</h2>
          <p className="text-sm text-gray-500">
            Von Kunden selbst deaktivierte Konten (Lizenz freigegeben) – nur hier
            reaktivierbar.
          </p>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Organisation</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {deaktivierte.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="px-3 py-2">{p.name}</td>
                <td className="px-3 py-2 text-gray-500">{orgName.get(p.organisation_id) ?? "–"}</td>
                <td className="px-3 py-2 text-right">
                  <form action={reaktiviereMitarbeiter.bind(null, p.id)}>
                    <button
                      type="submit"
                      className="rounded border text-xs font-medium px-3 py-1.5 hover:bg-gray-50"
                    >
                      Reaktivieren
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {deaktivierte.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-gray-400">
                  Keine deaktivierten Konten.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
