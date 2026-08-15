import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/get-profile";
import { ladeDokumente } from "@/lib/dokumente-laden";
import { DokumenteBereich } from "@/components/dokumente-bereich";
import { formatDatumCH, heuteIso } from "@/lib/date-utils";
import { ZeitFeld } from "@/components/zeit-feld";
import { erfasseAbwesenheit, loescheAbwesenheit } from "@/app/actions/abwesenheiten";
import { DatumFeld } from "@/components/datum-feld";
import { darf } from "@/lib/berechtigungen";

// Erreichbar für Admin (jede Person) oder die Person selbst (nur die
// eigene) – Personal-Dokumente sind sensibel, siehe Phase-7-Plan.
export default async function MitarbeitendeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const istAdmin = darf(profile, "mitarbeitende.verwalten");
  if (!istAdmin && profile.id !== id) redirect("/");

  const supabase = await createClient();
  const [
    { data: person },
    { dokumente, kategorien },
    { data: abwesenheiten },
    { data: arten },
  ] = await Promise.all([
    supabase.from("profiles").select("id, name, vorname, nachname, email, role").eq("id", id).single(),
    ladeDokumente(supabase, "mitarbeitende", id),
    // Vergangenes bleibt sichtbar, aber die Planung interessiert sich für
    // das Kommende – deshalb ab heute, absteigend nach Beginn.
    supabase
      .from("abwesenheiten")
      .select("*")
      .eq("mitarbeiter_id", id)
      .gte("bis", heuteIso())
      .order("von"),
    supabase
      .from("abwesenheitsarten")
      .select("wert, bezeichnung, farbe")
      .eq("aktiv", true)
      .order("sortierung"),
  ]);

  if (!person) notFound();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">
          {person.vorname ? `${person.vorname} ` : ""}
          {person.name}
        </h1>
        <p className="text-sm text-gray-500">
          {person.email ?? "–"} · {person.role === "admin" ? "Admin" : "Mitarbeitende"}
        </p>
      </div>

      {istAdmin && (
        <div className="max-w-2xl">
          <h2 className="text-lg font-medium mb-1">Abwesenheiten</h2>
          <p className="text-sm text-gray-500 mb-4">
            Ferien, Krankheit und Ähnliches. Die Disposition schlägt an diesen
            Tagen keine Einsätze für diese Person vor. Erfasst wird vom Büro –
            deshalb ist dieser Block nur für Admins sichtbar.
          </p>

          {error && (
            <div className="rounded bg-red-50 text-red-700 text-sm px-3 py-2 mb-4">{error}</div>
          )}

          <ul className="bg-white rounded-lg border divide-y mb-4">
            {abwesenheiten?.length === 0 && (
              <li className="px-4 py-3 text-sm text-gray-400">
                Keine kommenden Abwesenheiten erfasst.
              </li>
            )}
            {abwesenheiten?.map((a) => {
              const art = arten?.find((x) => x.wert === a.art);
              return (
                <li key={a.id} className="flex items-center justify-between px-4 py-2 text-sm">
                  <span className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${art?.farbe ?? "bg-gray-300"}`} />
                    <span>
                      <strong>{art?.bezeichnung ?? a.art}</strong>
                      <span className="text-gray-500">
                        {" "}
                        · {formatDatumCH(a.von)}
                        {a.bis !== a.von ? ` bis ${formatDatumCH(a.bis)}` : ""}
                        {a.von_zeit ? ` (${String(a.von_zeit).slice(0, 5)}–${String(a.bis_zeit ?? "").slice(0, 5) || "?"})` : ""}
                      </span>
                      {a.bemerkung && (
                        <span className="block text-xs text-gray-400">{a.bemerkung}</span>
                      )}
                    </span>
                  </span>
                  <form action={loescheAbwesenheit.bind(null, id, a.id)}>
                    <button type="submit" className="text-xs text-gray-400 hover:text-red-600">
                      entfernen
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>

          <form
            action={erfasseAbwesenheit.bind(null, id)}
            className="bg-white rounded-lg border p-4 flex flex-wrap items-end gap-3 text-sm"
          >
            <div>
              <label className="block text-xs text-gray-500 mb-1">Von</label>
              <DatumFeld
                id="neue_abwesenheit"
                name="von"
                required
                className="rounded border border-gray-300 px-2 py-1.5"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Bis (optional)</label>
              <DatumFeld name="bis"  className="rounded border border-gray-300 px-2 py-1.5" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Art</label>
              <select name="art" required className="rounded border border-gray-300 px-2 py-1.5">
                {arten?.map((a) => (
                  <option key={a.wert} value={a.wert}>
                    {a.bezeichnung}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Halbtags von</label>
              <div className="w-24">
                <ZeitFeld id="abw_von_zeit" name="von_zeit" startwert="" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">bis</label>
              <div className="w-24">
                <ZeitFeld id="abw_bis_zeit" name="bis_zeit" startwert="" />
              </div>
            </div>
            <input
              name="bemerkung"
              placeholder="Bemerkung (optional)"
              className="flex-1 min-w-[8rem] rounded border border-gray-300 px-2 py-1.5"
            />
            <button
              type="submit"
              className="rounded bg-arcos-steel text-white text-sm font-medium px-4 py-2 hover:bg-arcos-navy"
            >
              Erfassen
            </button>
          </form>
          <p className="text-xs text-gray-400 mt-2">
            Enddatum leer lassen für einen einzelnen Tag. Die Uhrzeiten nur
            ausfüllen, wenn es ein halber Tag ist – sonst gilt ganztägig.
          </p>
        </div>
      )}

      <div className="max-w-2xl">
        <h2 className="text-lg font-medium mb-1">Dokumente</h2>
        <p className="text-sm text-gray-500 mb-4">
          Nur für Admin und diese Person sichtbar (z.B. Vertrag, Ausweiskopie).
        </p>
        <DokumenteBereich
          bereich="mitarbeitende"
          bezugId={id}
          initialDokumente={dokumente}
          kategorien={kategorien}
          aktuellerUserId={profile.id}
          istAdmin={istAdmin}
        />
      </div>
    </div>
  );
}
