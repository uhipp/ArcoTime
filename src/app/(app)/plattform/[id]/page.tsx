import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/get-profile";
import {
  bearbeiteMitarbeiterPlattform,
  ladePersonEinPlattform,
  reaktiviereMitarbeiter,
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
  searchParams: Promise<{ error?: string }>;
}) {
  const profil = await getCurrentProfile();
  if (!profil?.ist_platform_admin) redirect("/");

  const { id } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();

  const [{ data: organisation }, { data: mitarbeitende }] = await Promise.all([
    supabase.from("organisationen").select("id, name, lizenzen_gebucht").eq("id", id).single(),
    supabase
      .from("profiles")
      .select("id, name, vorname, nachname, email, role, deaktiviert_am")
      .eq("organisation_id", id)
      .order("nachname"),
  ]);

  if (!organisation) notFound();

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
    </div>
  );
}
