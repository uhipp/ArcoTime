import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/get-profile";
import { ZurueckLinks } from "@/components/zurueck-links";
import { darf } from "@/lib/berechtigungen";

type Eintrag = {
  id: number;
  tabelle: string;
  datensatz_id: string | null;
  aktion: string;
  bezeichnung: string | null;
  geaendert_am: string;
  geaendert_von: string | null;
  vorher: Record<string, unknown> | null;
  nachher: Record<string, unknown> | null;
  profiles: { name: string } | null;
};

// Tabellennamen in die Sprache der Anwendung übersetzen. Was hier fehlt,
// erscheint mit seinem technischen Namen – das ist ehrlicher als eine
// Umschreibung, die etwas anderes meint.
const BEREICHE: Record<string, string> = {
  kunden: "Kunde",
  projekte: "Projekt",
  dienstleistungen: "Dienstleistung",
  zeiteintraege: "Zeiteintrag",
  rapporte: "Rapport",
  rapport_beteiligte: "Rapport – Beteiligte",
  rapport_standardpositionen: "Standardposition",
  anfragen: "Anfrage",
  dokumente: "Dokument",
  profiles: "Mitarbeitende",
  organisationen: "Organisation",
  kundenpreise: "Kundenpreis",
  kundenrabatte: "Kundenrabatt",
  dienstleistungsklassen: "Dienstleistungsklasse",
  einheiten: "Einheit",
  mwst_codes: "MWSt-Code",
  rabattsaetze: "Rabattsatz",
  abwesenheiten: "Abwesenheit",
  abwesenheitsarten: "Abwesenheitsart",
  schliesstage: "Schliesstag",
  gruppen: "Gruppe",
  gruppen_mitglieder: "Gruppenmitglied",
  anfrage_kanaele: "Anfrage-Kanal",
  anfrage_prioritaeten: "Anfrage-Priorität",
  dokument_kategorien: "Dokument-Kategorie",
  belege_exporte: "Export",
};

// Felder, die niemandem etwas sagen oder nichts zu suchen haben.
const VERBORGEN = new Set([
  "id",
  "organisation_id",
  "user_id",
  "unterschrift_png",
]);

function wert(v: unknown): string {
  if (v === null || v === undefined || v === "") return "leer";
  if (typeof v === "boolean") return v ? "ja" : "nein";
  const text = String(v);
  return text.length > 80 ? `${text.slice(0, 80)}…` : text;
}

// Änderungsprotokoll: was an den Daten dieser Organisation geschehen ist.
//
// Der Zweck ist Nachvollziehbarkeit gegenüber der eigenen Organisation –
// einschliesslich der Eingriffe durch Arcos. Als Auftragsbearbeiter
// braucht Arcos vollen Zugriff auf die Datenbank (Backups,
// Fehlerkorrektur); das zu verschleiern wäre schlechter, als es zu
// benennen. Ein Eingriff am Anmeldeweg vorbei hat kein Konto und
// erscheint deshalb ausdrücklich als solcher.
export default async function ProtokollPage({
  searchParams,
}: {
  searchParams: Promise<{ bereich?: string; seite?: string }>;
}) {
  const profile = await getCurrentProfile();
  if (!darf(profile, "protokoll.lesen")) redirect("/");

  const { bereich, seite } = await searchParams;
  const supabase = await createClient();

  const proSeite = 50;
  const seitenNr = Math.max(1, Number(seite ?? "1") || 1);
  const von = (seitenNr - 1) * proSeite;

  let abfrage = supabase
    .from("aenderungsprotokoll")
    .select(
      "id, tabelle, datensatz_id, aktion, bezeichnung, geaendert_am, geaendert_von, vorher, nachher, profiles!aenderungsprotokoll_geaendert_von_fkey(name)",
      { count: "exact" }
    )
    .order("geaendert_am", { ascending: false })
    .range(von, von + proSeite - 1);

  if (bereich) abfrage = abfrage.eq("tabelle", bereich);

  const { data, count } = await abfrage;
  const eintraege = (data ?? []) as unknown as Eintrag[];
  const gesamt = count ?? 0;

  const query = (over: Record<string, string | undefined>) => {
    const qs = new URLSearchParams();
    Object.entries({ bereich, seite, ...over }).forEach(([k, v]) => {
      if (v) qs.set(k, v);
    });
    const s = qs.toString();
    return s ? `/einstellungen/aenderungsprotokoll?${s}` : "/einstellungen/aenderungsprotokoll";
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold">Änderungsprotokoll</h1>
        <ZurueckLinks links={[{ href: "/einstellungen", text: "Zu den Einstellungen" }]} />
      </div>

      <p className="text-sm text-gray-500">
        Jede Änderung an euren Stammdaten, Belegen und Konten – wer, wann und
        was. Aufgezeichnet wird in der Datenbank selbst und nicht in der
        Anwendung: So erscheinen auch Eingriffe, die nicht über die Oberfläche
        laufen, etwa eine Korrektur durch Arcos im Rahmen des Supports. Das
        Protokoll lässt sich nicht bearbeiten und nicht löschen, auch nicht von
        Administratoren.
      </p>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Link
          href={query({ bereich: undefined, seite: undefined })}
          className={`rounded border px-3 py-1.5 ${
            !bereich ? "bg-arcos-steel text-white" : "bg-white hover:bg-gray-50"
          }`}
        >
          Alle Bereiche
        </Link>
        {["kunden", "projekte", "zeiteintraege", "rapporte", "dienstleistungen", "profiles"].map(
          (t) => (
            <Link
              key={t}
              href={query({ bereich: t, seite: undefined })}
              className={`rounded border px-3 py-1.5 ${
                bereich === t ? "bg-arcos-steel text-white" : "bg-white hover:bg-gray-50"
              }`}
            >
              {BEREICHE[t] ?? t}
            </Link>
          )
        )}
      </div>

      {eintraege.length === 0 ? (
        <p className="rounded-lg border bg-white p-5 text-sm text-gray-500">
          Noch keine Einträge. Das Protokoll beginnt mit seiner Einrichtung –
          frühere Änderungen sind nicht rückwirkend erfasst.
        </p>
      ) : (
        <ul className="divide-y rounded-lg border bg-white">
          {eintraege.map((e) => {
            const felder = Object.keys({ ...(e.vorher ?? {}), ...(e.nachher ?? {}) })
              .filter((k) => !VERBORGEN.has(k))
              .sort();

            return (
              <li key={e.id} className="px-4 py-3">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
                  <span className="font-mono text-xs text-gray-500 whitespace-nowrap">
                    {new Date(e.geaendert_am).toLocaleString("de-CH")}
                  </span>
                  <span className="font-medium">
                    {BEREICHE[e.tabelle] ?? e.tabelle}
                    {e.bezeichnung ? ` „${e.bezeichnung}“` : ""}
                  </span>
                  <span
                    className={`rounded px-2 py-0.5 text-xs ${
                      e.aktion === "geloescht"
                        ? "bg-red-100 text-red-800"
                        : e.aktion === "angelegt"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {e.aktion}
                  </span>
                  <span className="text-xs text-gray-500">
                    {e.profiles?.name ? (
                      e.profiles.name
                    ) : (
                      // Kein Konto heisst: nicht über die Anmeldung, also
                      // über einen direkten Datenbankzugriff. Genau dieser
                      // Fall soll benannt und nicht verschwiegen werden.
                      <span className="text-amber-700 font-medium">
                        Arcos (direkter Datenbankzugriff)
                      </span>
                    )}
                  </span>
                </div>

                {felder.length > 0 && e.aktion === "geaendert" && (
                  <ul className="mt-1 space-y-0.5">
                    {felder.map((f) => (
                      <li key={f} className="text-xs text-gray-600">
                        <span className="text-gray-400">{f}:</span>{" "}
                        <span className="line-through text-gray-400">
                          {wert(e.vorher?.[f])}
                        </span>{" "}
                        → <span className="font-medium">{wert(e.nachher?.[f])}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {gesamt > proSeite && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">
            {von + 1}–{Math.min(von + proSeite, gesamt)} von {gesamt}
          </span>
          <div className="flex gap-2">
            {seitenNr > 1 && (
              <Link
                href={query({ seite: String(seitenNr - 1) })}
                className="rounded border bg-white px-3 py-1.5 hover:bg-gray-50"
              >
                ← Neuere
              </Link>
            )}
            {von + proSeite < gesamt && (
              <Link
                href={query({ seite: String(seitenNr + 1) })}
                className="rounded border bg-white px-3 py-1.5 hover:bg-gray-50"
              >
                Ältere →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
