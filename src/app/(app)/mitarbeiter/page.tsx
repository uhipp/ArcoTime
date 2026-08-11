import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/get-profile";
import { updateMitarbeiter, ladeMitarbeitendeEin } from "@/app/actions/mitarbeiter";
import type { Profile } from "@/lib/types";

export default async function MitarbeitendePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const profile = await getCurrentProfile();
  if (profile?.role !== "admin") redirect("/");

  const { error } = await searchParams;
  const supabase = await createClient();

  const { data: mitarbeitende } = await supabase
    .from("profiles")
    .select("id, name, vorname, nachname, email, role, farbe")
    .order("nachname");

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Mitarbeitende</h1>

      {error && (
        <div className="rounded bg-red-50 text-red-700 text-sm px-3 py-2 mb-4">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg border p-5 mb-8">
        <h2 className="text-lg font-medium mb-1">Neue Person einladen</h2>
        <p className="text-sm text-gray-500 mb-4">
          Legt direkt einen Login an und sendet eine E-Mail mit einem Link,
          über den die Person selbst ihr Passwort festlegt.
        </p>
        <form action={ladeMitarbeitendeEin} className="flex flex-wrap items-end gap-3 text-sm">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Vorname</label>
            <input
              name="vorname"
              required
              className="rounded border border-gray-300 px-3 py-2 min-w-[9rem]"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Nachname</label>
            <input
              name="nachname"
              required
              className="rounded border border-gray-300 px-3 py-2 min-w-[9rem]"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">E-Mail</label>
            <input
              name="email"
              type="email"
              required
              className="rounded border border-gray-300 px-3 py-2 min-w-[14rem]"
            />
          </div>
          <button
            type="submit"
            className="rounded bg-arcos-steel text-white text-sm font-medium px-4 py-2 hover:bg-arcos-navy"
          >
            Einladungslink senden
          </button>
        </form>
      </div>

      <div className="bg-white rounded-lg border overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-2">Vorname</th>
              <th className="px-4 py-2">Nachname</th>
              <th className="px-4 py-2">E-Mail</th>
              <th className="px-4 py-2">Rolle</th>
              <th className="px-4 py-2">Farbe</th>
              <th className="px-4 py-2"></th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {(mitarbeitende as Profile[] | null)?.map((m) => {
              const action = updateMitarbeiter.bind(null, m.id);
              return (
                <tr key={m.id} className="border-t">
                  <td className="px-2 py-2">
                    <form action={action} id={`form-${m.id}`} className="contents">
                      <input
                        name="vorname"
                        defaultValue={m.vorname ?? ""}
                        placeholder="Vorname"
                        form={`form-${m.id}`}
                        className="w-full rounded border border-gray-300 px-2 py-1.5"
                      />
                    </form>
                  </td>
                  <td className="px-2 py-2">
                    <input
                      name="nachname"
                      defaultValue={m.nachname ?? ""}
                      placeholder="Nachname"
                      form={`form-${m.id}`}
                      className="w-full rounded border border-gray-300 px-2 py-1.5"
                    />
                  </td>
                  <td className="px-2 py-2 text-gray-500">{m.email ?? "–"}</td>
                  <td className="px-2 py-2">
                    <select
                      name="role"
                      defaultValue={m.role}
                      form={`form-${m.id}`}
                      className="rounded border border-gray-300 px-2 py-1.5"
                    >
                      <option value="mitarbeiter">Mitarbeitende</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="color"
                      name="farbe"
                      defaultValue={m.farbe ?? "#457B9D"}
                      form={`form-${m.id}`}
                      title="Farbe im Kalender"
                      className="h-9 w-12 rounded border border-gray-300 cursor-pointer"
                    />
                  </td>
                  <td className="px-2 py-2 text-right">
                    <button
                      type="submit"
                      form={`form-${m.id}`}
                      className="rounded bg-arcos-steel text-white text-sm font-medium px-3 py-1.5 hover:bg-arcos-navy"
                    >
                      Speichern
                    </button>
                  </td>
                  <td className="px-2 py-2 text-right whitespace-nowrap">
                    <Link href={`/mitarbeiter/${m.id}`} className="text-arcos-steel hover:underline text-sm">
                      Dokumente
                    </Link>
                  </td>
                </tr>
              );
            })}
            {(!mitarbeitende || mitarbeitende.length === 0) && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-gray-400">
                  Keine Mitarbeitenden gefunden.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
