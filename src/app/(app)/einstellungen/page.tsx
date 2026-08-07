import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/get-profile";
import {
  createKlasse,
  toggleKlasse,
  createMwstCode,
  toggleMwstCode,
} from "@/app/actions/einstellungen";

export default async function EinstellungenPage() {
  const profile = await getCurrentProfile();
  if (profile?.role !== "admin") redirect("/");

  const supabase = await createClient();
  const [{ data: klassen }, { data: mwstCodes }] = await Promise.all([
    supabase.from("dienstleistungsklassen").select("*").order("sortierung"),
    supabase.from("mwst_codes").select("*").order("code"),
  ]);

  return (
    <div className="space-y-10 max-w-2xl">
      <h1 className="text-2xl font-semibold">Einstellungen</h1>

      <section>
        <h2 className="text-lg font-medium mb-3">Dienstleistungsklassen</h2>
        <p className="text-sm text-gray-500 mb-3">
          Feste Auswahlliste für den Dienstleistungskatalog.
        </p>
        <ul className="bg-white rounded-lg border divide-y mb-4">
          {klassen?.map((k) => (
            <li key={k.id} className="flex items-center justify-between px-4 py-2 text-sm">
              <span className={k.aktiv ? "" : "text-gray-400 line-through"}>
                {k.bezeichnung}
              </span>
              <form action={toggleKlasse.bind(null, k.id, !k.aktiv)}>
                <button type="submit" className="text-xs text-arcos-steel hover:underline">
                  {k.aktiv ? "deaktivieren" : "aktivieren"}
                </button>
              </form>
            </li>
          ))}
        </ul>
        <form action={createKlasse} className="flex gap-2">
          <input
            name="bezeichnung"
            required
            placeholder="Neue Klasse…"
            className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded bg-arcos-steel text-white text-sm font-medium px-4 py-2 hover:bg-arcos-navy"
          >
            Hinzufügen
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-lg font-medium mb-3">MWSt-Codes</h2>
        <p className="text-sm text-gray-500 mb-3">
          Bitte an die effektiven Codes aus eurem Buchhaltungssystem anpassen.
        </p>
        <ul className="bg-white rounded-lg border divide-y mb-4">
          {mwstCodes?.map((m) => (
            <li key={m.id} className="flex items-center justify-between px-4 py-2 text-sm">
              <span className={m.aktiv ? "" : "text-gray-400 line-through"}>
                {m.code} – {m.bezeichnung} ({Number(m.satz).toFixed(1)}%)
              </span>
              <form action={toggleMwstCode.bind(null, m.id, !m.aktiv)}>
                <button type="submit" className="text-xs text-arcos-steel hover:underline">
                  {m.aktiv ? "deaktivieren" : "aktivieren"}
                </button>
              </form>
            </li>
          ))}
        </ul>
        <form action={createMwstCode} className="flex gap-2">
          <input
            name="code"
            required
            placeholder="Code (z.B. B81)"
            className="w-32 rounded border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            name="bezeichnung"
            required
            placeholder="Bezeichnung"
            className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            name="satz"
            type="number"
            step="0.1"
            placeholder="Satz %"
            className="w-24 rounded border border-gray-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded bg-arcos-steel text-white text-sm font-medium px-4 py-2 hover:bg-arcos-navy"
          >
            Hinzufügen
          </button>
        </form>
      </section>
    </div>
  );
}
