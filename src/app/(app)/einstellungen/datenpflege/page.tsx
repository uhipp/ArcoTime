import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/get-profile";
import { ZurueckLinks } from "@/components/zurueck-links";
import { DeleteButton } from "@/components/delete-button";
import { AUFGABEN, pruefungen, vorschau, type AufgabenSchluessel } from "@/lib/datenpflege";
import { starteAufgabe, widerrufeLauf } from "@/app/actions/datenpflege";
import { darf } from "@/lib/berechtigungen";

type Lauf = {
  id: string;
  aufgabe: string;
  ausgefuehrt_am: string;
  anzahl: number;
  rueckgaengig_am: string | null;
  profiles: { name: string } | null;
};

// Datenpflege: was an den eigenen Daten zu tun ist – und was daran
// verändert wurde.
//
// Der Bereich ist aus einer Frage entstanden, die sich bei fremden
// Mandanten stellt: Migration 0033 hat per update in die Inhalte ALLER
// Organisationen eingegriffen, um Strasse und Hausnummer zu trennen. Bei
// eigenen Daten ist das unkritisch, bei fremden ein Vertrauensthema.
//
// Die Antwort ist nicht weniger Zugriff – als Auftragsbearbeiter braucht
// Arcos vollen Zugriff für Backups und Fehlerkorrektur, und das zu
// verschleiern wäre schlechter, als es zu benennen. Die Antwort ist
// Nachvollziehbarkeit: Umformungen von Altdaten laufen je Organisation
// auf Knopfdruck, mit Vorschau und mit einem Rückweg.
export default async function DatenpflegePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; zeige?: string }>;
}) {
  const profile = await getCurrentProfile();
  if (!darf(profile, "datenpflege.verwalten")) redirect("/");

  const { error, zeige } = await searchParams;
  const supabase = await createClient();

  const schluessel = Object.keys(AUFGABEN) as AufgabenSchluessel[];
  const offeneVorschau = zeige && schluessel.includes(zeige as AufgabenSchluessel)
    ? await vorschau(supabase, zeige as AufgabenSchluessel)
    : [];

  const [checks, { data: laeufeRoh }] = await Promise.all([
    pruefungen(supabase),
    supabase
      .from("datenpflege_laeufe")
      .select("id, aufgabe, ausgefuehrt_am, anzahl, rueckgaengig_am, profiles!datenpflege_laeufe_ausgefuehrt_von_fkey(name)")
      .order("ausgefuehrt_am", { ascending: false })
      .limit(20),
  ]);

  const laeufe = (laeufeRoh ?? []) as unknown as Lauf[];

  return (
    <div className="space-y-10 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold">Datenpflege</h1>
        <ZurueckLinks links={[{ href: "/einstellungen", text: "Zu den Einstellungen" }]} />
      </div>

      {error && (
        <div className="rounded bg-red-50 text-red-700 text-sm px-3 py-2">{error}</div>
      )}

      <p className="text-sm text-gray-500">
        Hier stehen Aufgaben an euren eigenen Daten. Erweiterungen an ArcoTime
        bringen neue Felder mit – die <strong>Struktur</strong> gilt sofort für
        alle, das <strong>Umformen bestehender Werte</strong> löst ihr selbst
        aus, wenn es euch passt. Jede Sammelaktion zeigt vorher, was sie tun
        würde, und lässt sich danach rückgängig machen.
      </p>

      <section>
        <h2 className="text-lg font-medium mb-3">Sammelaktionen</h2>
        <div className="space-y-4">
          {schluessel.map((key) => {
            const aufgabe = AUFGABEN[key];
            const zeigtVorschau = zeige === key;

            return (
              <div key={key} className="rounded-lg border bg-white p-5">
                <h3 className="font-medium mb-1">{aufgabe.titel}</h3>
                <p className="text-sm text-gray-500 mb-2">{aufgabe.erklaerung}</p>
                <p className="rounded bg-blue-50 text-blue-900 text-xs px-3 py-2 mb-3">
                  {aufgabe.hinweis}
                </p>

                {!zeigtVorschau ? (
                  <Link
                    href={`/einstellungen/datenpflege?zeige=${key}`}
                    className="inline-block rounded border px-4 py-2 text-sm hover:bg-gray-50"
                  >
                    Vorschau ansehen
                  </Link>
                ) : offeneVorschau.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    Nichts zu tun – bei allen Kunden ist die Anfahrt entweder
                    hinterlegt oder es gibt keine bisherige Position, aus der sie
                    sich ableiten liesse.
                  </p>
                ) : (
                  <>
                    <div className="mb-3 overflow-x-auto rounded border">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-left text-gray-500">
                          <tr>
                            <th className="px-3 py-2 font-medium">Kunde</th>
                            <th className="px-3 py-2 font-medium">Bisher</th>
                            <th className="px-3 py-2 font-medium">Neu</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {offeneVorschau.map((z) => (
                            <tr key={z.id}>
                              <td className="px-3 py-1.5">{z.bezeichnung}</td>
                              <td className="px-3 py-1.5 text-gray-400">{z.bisher}</td>
                              <td className="px-3 py-1.5 font-medium">{z.neu}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <form action={starteAufgabe.bind(null, key)}>
                        <button
                          type="submit"
                          className="rounded bg-arcos-steel px-4 py-2 text-sm font-medium text-white hover:bg-arcos-navy"
                        >
                          {offeneVorschau.length} Datensätze anpassen
                        </button>
                      </form>
                      <Link
                        href="/einstellungen/datenpflege"
                        className="text-sm text-gray-500 hover:underline"
                      >
                        Abbrechen
                      </Link>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-medium mb-1">Prüfungen</h2>
        <p className="text-sm text-gray-500 mb-3">
          Lücken in den Stammdaten, die erst auffallen, wenn sie stören – beim
          Versand ohne E-Mail-Adresse, im Brief ohne Ort. Diese Prüfungen ändern
          nichts, sie zeigen nur, wo etwas fehlt.
        </p>
        {checks.length === 0 ? (
          <p className="rounded-lg border bg-white p-5 text-sm text-gray-500">
            Keine Lücken gefunden – die Stammdaten sind vollständig.
          </p>
        ) : (
          <ul className="divide-y rounded-lg border bg-white">
            {checks.map((p) => (
              <li key={p.titel} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <span className="inline-flex h-7 min-w-[1.75rem] items-center justify-center rounded-full bg-amber-100 px-2 text-sm font-medium text-amber-800">
                  {p.anzahl}
                </span>
                <span className="flex-1 min-w-[14rem]">
                  <span className="block text-sm font-medium">{p.titel}</span>
                  <span className="block text-xs text-gray-500">{p.erklaerung}</span>
                </span>
                <Link href={p.href} className="text-sm text-arcos-steel hover:underline">
                  {p.linkText}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-lg font-medium mb-1">Ausgeführte Läufe</h2>
        <p className="text-sm text-gray-500 mb-3">
          Wer wann welche Sammelaktion ausgelöst hat. Ein Lauf bleibt hier
          stehen, auch wenn er rückgängig gemacht wurde – die Spur ist der
          Zweck.
        </p>
        {laeufe.length === 0 ? (
          <p className="rounded-lg border bg-white p-5 text-sm text-gray-500">
            Noch keine Sammelaktion ausgeführt.
          </p>
        ) : (
          <ul className="divide-y rounded-lg border bg-white">
            {laeufe.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <span className="flex-1 min-w-[14rem]">
                  <span className="block text-sm">
                    {AUFGABEN[l.aufgabe as AufgabenSchluessel]?.titel ?? l.aufgabe}
                  </span>
                  <span className="block text-xs text-gray-500">
                    {new Date(l.ausgefuehrt_am).toLocaleString("de-CH")} ·{" "}
                    {l.profiles?.name ?? "Unbekannt"} · {l.anzahl} Datensätze
                    {l.rueckgaengig_am &&
                      ` · rückgängig gemacht am ${new Date(
                        l.rueckgaengig_am
                      ).toLocaleString("de-CH")}`}
                  </span>
                </span>
                {!l.rueckgaengig_am && (
                  <DeleteButton
                    action={widerrufeLauf.bind(null, l.id)}
                    label="Rückgängig machen"
                    confirmText="Diesen Lauf rückgängig machen? Die betroffenen Datensätze werden auf den Stand von vor der Ausführung zurückgesetzt – auch spätere Änderungen von Hand gehen dabei verloren."
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
