import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, getCurrentOrganisation } from "@/lib/get-profile";
import { FARBEN_OPTIONEN } from "@/lib/farben";
import {
  updateOrganisation,
  createKlasse,
  toggleKlasse,
  updateKlasse,
  createMwstCode,
  toggleMwstCode,
  updateMwstCode,
  createRabattsatz,
  toggleRabattsatz,
  updateRabattsatz,
  createAnfrageKanal,
  toggleAnfrageKanal,
  updateAnfrageKanal,
  createAnfragePrioritaet,
  toggleAnfragePrioritaet,
  updateAnfragePrioritaet,
  createDokumentKategorie,
  toggleDokumentKategorie,
  updateDokumentKategorie,
} from "@/app/actions/einstellungen";

export default async function EinstellungenPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const profile = await getCurrentProfile();
  if (profile?.role !== "admin") redirect("/");

  const { error } = await searchParams;
  const organisation = await getCurrentOrganisation();
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
        <h2 className="text-lg font-medium mb-3">Organisation</h2>
        <p className="text-sm text-gray-500 mb-3">
          Erscheint im Header anstelle eines fixen Kunden-Logos.
        </p>
        <form action={updateOrganisation} className="space-y-3">
          <div className="flex gap-2">
            <input
              name="name"
              required
              defaultValue={organisation?.name ?? ""}
              placeholder="Name der Organisation"
              className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="rounded bg-arcos-steel text-white text-sm font-medium px-4 py-2 hover:bg-arcos-navy"
            >
              Speichern
            </button>
          </div>
          <label className="flex items-start gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              name="zeige_auf_login"
              defaultChecked={organisation?.zeige_auf_login ?? false}
              className="mt-0.5"
            />
            <span>
              Auf der Login-Seite anzeigen. Übergangslösung: Solange es noch
              keine eigene Adresse pro Organisation gibt, kann das nur eine
              Organisation gleichzeitig sein.
            </span>
          </label>
        </form>
      </section>

      <section>
        <h2 className="text-lg font-medium mb-3">Dienstleistungsklassen</h2>
        <p className="text-sm text-gray-500 mb-3">
          Auswahlliste für den Dienstleistungskatalog.
        </p>
        <ul className="bg-white rounded-lg border divide-y mb-4">
          {klassen?.map((k) => (
            <li key={k.id} className="px-4 py-2 text-sm">
              <form
                action={updateKlasse.bind(null, k.id)}
                className="flex flex-wrap items-center gap-2"
              >
                <input
                  name="bezeichnung"
                  required
                  defaultValue={k.bezeichnung}
                  aria-label="Bezeichnung"
                  className={`flex-1 min-w-[10rem] rounded border border-gray-300 px-2 py-1 ${
                    k.aktiv ? "" : "text-gray-400"
                  }`}
                />
                <input
                  name="sortierung"
                  type="number"
                  defaultValue={k.sortierung ?? 0}
                  aria-label="Sortierung"
                  title="Sortierung"
                  className="w-16 rounded border border-gray-300 px-2 py-1"
                />
                <button type="submit" className="text-xs text-arcos-steel hover:underline">
                  speichern
                </button>
              </form>
              <form action={toggleKlasse.bind(null, k.id, !k.aktiv)} className="mt-1">
                <button type="submit" className="text-xs text-gray-400 hover:text-arcos-steel">
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
          Bestehende Einträge lassen sich direkt in der Zeile korrigieren.
        </p>
        <p className="rounded bg-blue-50 text-blue-900 text-xs px-3 py-2 mb-3">
          Eine Änderung am Satz gilt nur für <strong>künftige</strong>{" "}
          Zeiteinträge. Bereits erfasste behalten den Satz, der beim Erfassen
          gültig war – Exporte vergangener Perioden bleiben dadurch unverändert.
        </p>
        <ul className="bg-white rounded-lg border divide-y mb-4">
          {mwstCodes?.map((m) => (
            <li key={m.id} className="px-4 py-2 text-sm">
              <form
                action={updateMwstCode.bind(null, m.id)}
                className="flex flex-wrap items-center gap-2"
              >
                <input
                  name="code"
                  required
                  defaultValue={m.code}
                  aria-label="Code"
                  className={`w-24 rounded border border-gray-300 px-2 py-1 ${
                    m.aktiv ? "" : "text-gray-400"
                  }`}
                />
                <input
                  name="bezeichnung"
                  required
                  defaultValue={m.bezeichnung}
                  aria-label="Bezeichnung"
                  className={`flex-1 min-w-[8rem] rounded border border-gray-300 px-2 py-1 ${
                    m.aktiv ? "" : "text-gray-400"
                  }`}
                />
                <input
                  name="satz"
                  type="number"
                  step="0.1"
                  min={0}
                  max={100}
                  required
                  defaultValue={Number(m.satz)}
                  aria-label="Satz in Prozent"
                  className={`w-20 rounded border border-gray-300 px-2 py-1 ${
                    m.aktiv ? "" : "text-gray-400"
                  }`}
                />
                <span className="text-xs text-gray-400">%</span>
                <button type="submit" className="text-xs text-arcos-steel hover:underline">
                  speichern
                </button>
              </form>
              <form
                action={toggleMwstCode.bind(null, m.id, !m.aktiv)}
                className="mt-1"
              >
                <button type="submit" className="text-xs text-gray-400 hover:text-arcos-steel">
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
            <li key={r.id} className="px-4 py-2 text-sm">
              <form
                action={updateRabattsatz.bind(null, r.id)}
                className="flex flex-wrap items-center gap-2"
              >
                <input
                  name="prozent"
                  type="number"
                  step="0.1"
                  min={0}
                  max={100}
                  required
                  defaultValue={Number(r.prozent)}
                  aria-label="Prozent"
                  className={`w-20 rounded border border-gray-300 px-2 py-1 ${
                    r.aktiv ? "" : "text-gray-400"
                  }`}
                />
                <span className="text-xs text-gray-400">%</span>
                <input
                  name="bezeichnung"
                  defaultValue={r.bezeichnung ?? ""}
                  placeholder="Bezeichnung (optional)"
                  aria-label="Bezeichnung"
                  className={`flex-1 min-w-[8rem] rounded border border-gray-300 px-2 py-1 ${
                    r.aktiv ? "" : "text-gray-400"
                  }`}
                />
                <input
                  name="sortierung"
                  type="number"
                  defaultValue={r.sortierung ?? 0}
                  aria-label="Sortierung"
                  title="Sortierung"
                  className="w-16 rounded border border-gray-300 px-2 py-1"
                />
                <button type="submit" className="text-xs text-arcos-steel hover:underline">
                  speichern
                </button>
              </form>
              <form action={toggleRabattsatz.bind(null, r.id, !r.aktiv)} className="mt-1">
                <button type="submit" className="text-xs text-gray-400 hover:text-arcos-steel">
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
            <li key={k.id} className="px-4 py-2 text-sm">
              <form
                action={updateAnfrageKanal.bind(null, k.id)}
                className="flex flex-wrap items-center gap-2"
              >
                <input
                  name="symbol"
                  defaultValue={k.symbol}
                  aria-label="Symbol"
                  title="Symbol"
                  className="w-14 rounded border border-gray-300 px-2 py-1 text-center"
                />
                <input
                  name="bezeichnung"
                  required
                  defaultValue={k.bezeichnung}
                  aria-label="Bezeichnung"
                  className={`flex-1 min-w-[8rem] rounded border border-gray-300 px-2 py-1 ${
                    k.aktiv ? "" : "text-gray-400"
                  }`}
                />
                <input
                  name="sortierung"
                  type="number"
                  defaultValue={k.sortierung ?? 0}
                  aria-label="Sortierung"
                  title="Sortierung"
                  className="w-16 rounded border border-gray-300 px-2 py-1"
                />
                <button type="submit" className="text-xs text-arcos-steel hover:underline">
                  speichern
                </button>
              </form>
              <form action={toggleAnfrageKanal.bind(null, k.id, !k.aktiv)} className="mt-1">
                <button type="submit" className="text-xs text-gray-400 hover:text-arcos-steel">
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
            <li key={p.id} className="px-4 py-2 text-sm">
              <form
                action={updateAnfragePrioritaet.bind(null, p.id)}
                className="flex flex-wrap items-center gap-2"
              >
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${p.farbe}`} />
                <select
                  name="farbe"
                  defaultValue={p.farbe}
                  aria-label="Farbe"
                  className="rounded border border-gray-300 px-2 py-1"
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
                  defaultValue={p.bezeichnung}
                  aria-label="Bezeichnung"
                  className={`flex-1 min-w-[8rem] rounded border border-gray-300 px-2 py-1 ${
                    p.aktiv ? "" : "text-gray-400"
                  }`}
                />
                <input
                  name="sortierung"
                  type="number"
                  defaultValue={p.sortierung ?? 0}
                  aria-label="Sortierung"
                  title="Sortierung"
                  className="w-16 rounded border border-gray-300 px-2 py-1"
                />
                <button type="submit" className="text-xs text-arcos-steel hover:underline">
                  speichern
                </button>
              </form>
              <form action={toggleAnfragePrioritaet.bind(null, p.id, !p.aktiv)} className="mt-1">
                <button type="submit" className="text-xs text-gray-400 hover:text-arcos-steel">
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
            <li key={k.id} className="px-4 py-2 text-sm">
              <form
                action={updateDokumentKategorie.bind(null, k.id)}
                className="flex flex-wrap items-center gap-2"
              >
                <input
                  name="bezeichnung"
                  required
                  defaultValue={k.bezeichnung}
                  aria-label="Bezeichnung"
                  className={`flex-1 min-w-[10rem] rounded border border-gray-300 px-2 py-1 ${
                    k.aktiv ? "" : "text-gray-400"
                  }`}
                />
                <input
                  name="sortierung"
                  type="number"
                  defaultValue={k.sortierung ?? 0}
                  aria-label="Sortierung"
                  title="Sortierung"
                  className="w-16 rounded border border-gray-300 px-2 py-1"
                />
                <button type="submit" className="text-xs text-arcos-steel hover:underline">
                  speichern
                </button>
              </form>
              <form action={toggleDokumentKategorie.bind(null, k.id, !k.aktiv)} className="mt-1">
                <button type="submit" className="text-xs text-gray-400 hover:text-arcos-steel">
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
