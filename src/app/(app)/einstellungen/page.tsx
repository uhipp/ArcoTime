import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/get-profile";
import { FARBEN_OPTIONEN } from "@/lib/farben";
import {
  createKlasse,
  toggleKlasse,
  createMwstCode,
  toggleMwstCode,
  createRabattsatz,
  toggleRabattsatz,
  createAnfrageKanal,
  toggleAnfrageKanal,
  createAnfragePrioritaet,
  toggleAnfragePrioritaet,
  createDokumentKategorie,
  toggleDokumentKategorie,
} from "@/app/actions/einstellungen";

export default async function EinstellungenPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const profile = await getCurrentProfile();
  if (profile?.role !== "admin") redirect("/");

  const { error } = await searchParams;
  const supabase = await createClient();
  const [
    { data: klassen },
    { data: mwstCodes },
    { data: rabattsaetze },
    { data: kanaele },
    { data: prioritaeten },
    { data: dokumentKategorien },
  ] = await Promise.all([
    supabase.from("dienstleistungsklassen").select("*").order("sortierung"),
    supabase.from("mwst_codes").select("*").order("code"),
    supabase.from("rabattsaetze").select("*").order("sortierung"),
    supabase.from("anfrage_kanaele").select("*").order("sortierung"),
    supabase.from("anfrage_prioritaeten").select("*").order("sortierung"),
    supabase.from("dokument_kategorien").select("*").order("sortierung"),
  ]);

  return (
    <div className="space-y-10 max-w-2xl">
      <h1 className="text-2xl font-semibold">Einstellungen</h1>
      <p className="text-sm text-gray-500">
        Auswahllisten in der ganzen App sind hier frei verwaltbar – nichts
        davon ist fix im Code. Bereits verwendete Werte lassen sich nur
        deaktivieren statt löschen, damit bestehende Einträge lesbar bleiben.
      </p>

      {error && (
        <div className="rounded bg-red-50 text-red-700 text-sm px-3 py-2">{error}</div>
      )}

      <section>
        <h2 className="text-lg font-medium mb-3">Dienstleistungsklassen</h2>
        <p className="text-sm text-gray-500 mb-3">
          Auswahlliste für den Dienstleistungskatalog.
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

      <section>
        <h2 className="text-lg font-medium mb-3">Rabattsätze</h2>
        <p className="text-sm text-gray-500 mb-3">
          Auswahlliste für die Zeiterfassung und das Erledigen von Anfragen.
          100% entspricht nicht verrechneter (interner) Zeit.
        </p>
        <ul className="bg-white rounded-lg border divide-y mb-4">
          {rabattsaetze?.map((r) => (
            <li key={r.id} className="flex items-center justify-between px-4 py-2 text-sm">
              <span className={r.aktiv ? "" : "text-gray-400 line-through"}>
                {Number(r.prozent)}% {r.bezeichnung ? `– ${r.bezeichnung}` : ""}
              </span>
              <form action={toggleRabattsatz.bind(null, r.id, !r.aktiv)}>
                <button type="submit" className="text-xs text-arcos-steel hover:underline">
                  {r.aktiv ? "deaktivieren" : "aktivieren"}
                </button>
              </form>
            </li>
          ))}
        </ul>
        <form action={createRabattsatz} className="flex gap-2">
          <input
            name="prozent"
            type="number"
            min={0}
            max={100}
            step="0.1"
            required
            placeholder="%"
            className="w-24 rounded border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            name="bezeichnung"
            placeholder="Bezeichnung (optional)"
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
        <h2 className="text-lg font-medium mb-3">Anfrage-Kanäle</h2>
        <p className="text-sm text-gray-500 mb-3">
          Auswahlliste für "Wie kam die Anfrage rein?".
        </p>
        <ul className="bg-white rounded-lg border divide-y mb-4">
          {kanaele?.map((k) => (
            <li key={k.id} className="flex items-center justify-between px-4 py-2 text-sm">
              <span className={k.aktiv ? "" : "text-gray-400 line-through"}>
                {k.symbol} {k.bezeichnung}
              </span>
              <form action={toggleAnfrageKanal.bind(null, k.id, !k.aktiv)}>
                <button type="submit" className="text-xs text-arcos-steel hover:underline">
                  {k.aktiv ? "deaktivieren" : "aktivieren"}
                </button>
              </form>
            </li>
          ))}
        </ul>
        <form action={createAnfrageKanal} className="flex gap-2">
          <input
            name="symbol"
            placeholder="Symbol (z.B. 📞)"
            className="w-28 rounded border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            name="bezeichnung"
            required
            placeholder="Bezeichnung"
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
        <h2 className="text-lg font-medium mb-3">Anfrage-Prioritäten</h2>
        <p className="text-sm text-gray-500 mb-3">
          Auswahlliste für die Priorität einer Anfrage – die Farbe erscheint
          als Punkt auf der Kanban-Karte.
        </p>
        <ul className="bg-white rounded-lg border divide-y mb-4">
          {prioritaeten?.map((p) => (
            <li key={p.id} className="flex items-center justify-between px-4 py-2 text-sm">
              <span className={`flex items-center gap-2 ${p.aktiv ? "" : "text-gray-400 line-through"}`}>
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${p.farbe}`} />
                {p.bezeichnung}
              </span>
              <form action={toggleAnfragePrioritaet.bind(null, p.id, !p.aktiv)}>
                <button type="submit" className="text-xs text-arcos-steel hover:underline">
                  {p.aktiv ? "deaktivieren" : "aktivieren"}
                </button>
              </form>
            </li>
          ))}
        </ul>
        <form action={createAnfragePrioritaet} className="flex gap-2">
          <select
            name="farbe"
            className="w-28 rounded border border-gray-300 px-3 py-2 text-sm"
            defaultValue="bg-gray-300"
          >
            {FARBEN_OPTIONEN.map((f) => (
              <option key={f.wert} value={f.wert}>
                {f.label}
              </option>
            ))}
          </select>
          <input
            name="bezeichnung"
            required
            placeholder="Bezeichnung"
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
        <h2 className="text-lg font-medium mb-3">Dokument-Kategorien</h2>
        <p className="text-sm text-gray-500 mb-3">
          Auswahlliste für die Dokumentenablage (bei Kunden, Projekten,
          Mitarbeitenden, Anfragen und Zeiteinträgen). Kategorie ist beim
          Hochladen optional.
        </p>
        <ul className="bg-white rounded-lg border divide-y mb-4">
          {dokumentKategorien?.map((k) => (
            <li key={k.id} className="flex items-center justify-between px-4 py-2 text-sm">
              <span className={k.aktiv ? "" : "text-gray-400 line-through"}>
                {k.bezeichnung}
              </span>
              <form action={toggleDokumentKategorie.bind(null, k.id, !k.aktiv)}>
                <button type="submit" className="text-xs text-arcos-steel hover:underline">
                  {k.aktiv ? "deaktivieren" : "aktivieren"}
                </button>
              </form>
            </li>
          ))}
        </ul>
        <form action={createDokumentKategorie} className="flex gap-2">
          <input
            name="bezeichnung"
            required
            placeholder="Neue Kategorie…"
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
    </div>
  );
}
