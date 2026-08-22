import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/get-profile";
import { begriff, getBegriffe, type Begriffe } from "@/lib/begriffe";
import { ladeDokumente } from "@/lib/dokumente-laden";
import { ProjektForm } from "@/components/projekt-form";
import { DokumenteBereich } from "@/components/dokumente-bereich";
import { ProjektAdressen, type AdressOption } from "@/components/projekt-adressen";
import { updateProjekt, deleteProjekt } from "@/app/actions/projekte";
import { DeleteButton } from "@/components/delete-button";
import { ProjektTeam } from "@/components/projekt-team";
import type { AdressRolle, Projekt, ProjektAdresse } from "@/lib/types";
import { PraesenzSperre } from "@/components/praesenz-sperre";
import { darf } from "@/lib/berechtigungen";
import { standorteAktiv } from "@/lib/standorte";
import { rapportNummer, type Rapport } from "@/lib/types";
import { formatDatumCH } from "@/lib/date-utils";

// Die Auftragsmaske nach docs/masken-leitlinie.md – die zweite Maske nach
// diesem Muster, nach den Kunden.
//
// Sie ist der Ort, an dem seit 0079/0080 ALLES Betriebswissen steht: Einsatzort,
// Anfahrt, Zugang, die zusätzlichen Adressen, das Team. Genau deshalb muss sie
// ohne Scrollen auskommen – vorher standen Formular, Team und Dokumente
// untereinander, und mit den neuen Feldern wäre die Seite doppelt so lang
// geworden.
//
// Der Grund für diese Bündelung: Ein Betrieb OHNE Standorte soll genau
// dasselbe können wie einer mit. Läge etwas am Standort, hätte er keinen Weg
// dorthin.

type SearchParams = {
  error?: string;
  reiter?: string;
  q?: string;
};

type ReiterName = "auftrag" | "adressen" | "team" | "rapporte" | "dokumente";

export default async function ProjektDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { id } = await params;
  const p = await searchParams;
  const { error, q } = p;
  const supabase = await createClient();

  const [profile, ortsebene, begriffe, { data: projekt }] = await Promise.all([
    getCurrentProfile(),
    standorteAktiv(),
    getBegriffe(),
    supabase
      .from("projekte")
      .select("*, kunden(id, name, vorname), standorte(id, bezeichnung, ort)")
      .eq("id", id)
      .single(),
  ]);

  if (!projekt) notFound();

  const istAdmin = darf(profile, "projekte.loeschen");
  const einzahl = begriff(begriffe, "projekt", "einzahl");
  const mehrzahl = begriff(begriffe, "projekt", "mehrzahl");

  const reiter: { name: ReiterName; titel: string }[] = [
    { name: "auftrag", titel: einzahl },
    { name: "adressen", titel: "Adressen" },
    { name: "team", titel: "Team" },
    { name: "rapporte", titel: begriff(begriffe, "rapport", "mehrzahl") },
    { name: "dokumente", titel: "Dokumente" },
  ];
  const aktiv: ReiterName = reiter.some((r) => r.name === p.reiter)
    ? (p.reiter as ReiterName)
    : "auftrag";

  // Die Liste links: gesucht wird von vorn, wie in der Kundenmaske.
  let listeQuery = supabase
    .from("projekte")
    .select("id, bezeichnung, status, kunden(name, vorname), standorte(ort)")
    .order("status")
    .order("bezeichnung")
    .limit(300);
  if (q) listeQuery = listeQuery.ilike("bezeichnung", `${q}%`);
  const { data: liste } = await listeQuery;

  const kunde = (Array.isArray(projekt.kunden) ? projekt.kunden[0] : projekt.kunden) as
    | { id: string; name: string; vorname: string | null }
    | undefined;
  const standort = (
    Array.isArray(projekt.standorte) ? projekt.standorte[0] : projekt.standorte
  ) as { id: string; bezeichnung: string; ort: string | null } | undefined;

  const reiterLink = (name: ReiterName) => `/projekte/${id}?reiter=${name}${q ? `&q=${q}` : ""}`;

  return (
    <div data-vollbild className="h-full flex flex-col">
      <div className="shrink-0 border-b bg-white px-3 md:px-4 py-2 md:py-0 md:h-12 flex flex-wrap md:flex-nowrap items-center gap-2 md:gap-3">
        <Link
          href="/projekte"
          className="font-heading font-semibold text-arcos-navy hover:underline"
        >
          {mehrzahl}
        </Link>
        <span className="text-gray-300">›</span>
        <span className="font-medium truncate">{projekt.bezeichnung}</span>
        {kunde && (
          <Link
            href={`/kunden/${kunde.id}`}
            className="text-sm text-gray-500 hover:text-arcos-navy truncate"
          >
            {[kunde.vorname, kunde.name].filter(Boolean).join(" ")}
          </Link>
        )}
        {projekt.status !== "aktiv" && (
          <span className="rounded bg-amber-100 text-amber-800 text-xs px-1.5 py-0.5">
            {projekt.status}
          </span>
        )}
        <span className="ml-auto flex items-center gap-2">
          <Link
            href="/projekte"
            className="rounded border border-gray-300 text-sm px-3 py-1.5 hover:bg-gray-50"
          >
            Ganze Liste
          </Link>
          {/* Löschen bleibt beim Admin – siehe 0031. */}
          {istAdmin && (
            <DeleteButton
              action={deleteProjekt.bind(null, id)}
              label={`${einzahl} löschen`}
              confirmText={`${einzahl} wirklich löschen? Geht nur, wenn keine Zeiteinträge vorhanden sind.`}
            />
          )}
        </span>
      </div>

      {error && (
        <div className="shrink-0 bg-red-50 text-red-700 text-sm px-4 py-2 border-b">{error}</div>
      )}

      <div className="flex-1 min-h-0 flex">
        {/* Auf dem Telefon wird aus dem Nebeneinander ein Nacheinander
            (Masken-Leitlinie, Abschnitt 6): Bei 375 px blieben dem Detail
            neben dieser Spalte 87 px. Der Weg zurück zur Liste ist der Knopf
            „Ganze Liste" oben rechts. */}
        <div className="hidden md:flex w-72 shrink-0 border-r bg-white flex-col min-h-0">
          <form className="p-2 border-b">
            <input
              type="search"
              name="q"
              defaultValue={q ?? ""}
              placeholder={`Suche ${einzahl}…`}
              className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-arcos-steel"
            />
            <input type="hidden" name="reiter" value={aktiv} />
          </form>
          <ul className="flex-1 min-h-0 overflow-y-auto divide-y">
            {(liste ?? []).map((pr) => {
              const gewaehlt = pr.id === id;
              const prKunde = (Array.isArray(pr.kunden) ? pr.kunden[0] : pr.kunden) as
                | { name: string; vorname: string | null }
                | undefined;
              const prOrt = (Array.isArray(pr.standorte) ? pr.standorte[0] : pr.standorte) as
                | { ort: string | null }
                | undefined;
              return (
                <li key={pr.id}>
                  <Link
                    href={`/projekte/${pr.id}?reiter=${aktiv}${q ? `&q=${q}` : ""}`}
                    className={`block border-l-2 px-3 py-2 text-sm ${
                      gewaehlt
                        ? "border-arcos-steel bg-arcos-steel/10"
                        : "border-transparent hover:bg-gray-50"
                    }`}
                  >
                    <span
                      className={`block truncate ${gewaehlt ? "font-medium text-arcos-navy" : ""}`}
                    >
                      {pr.bezeichnung}
                    </span>
                    <span className="block text-xs text-gray-400 truncate">
                      {prKunde
                        ? [prKunde.vorname, prKunde.name].filter(Boolean).join(" ")
                        : "ohne Kunde"}
                      {prOrt?.ort ? ` · ${prOrt.ort}` : ""}
                      {pr.status !== "aktiv" ? " · inaktiv" : ""}
                    </span>
                  </Link>
                </li>
              );
            })}
            {(liste ?? []).length === 0 && (
              <li className="px-3 py-4 text-xs text-gray-400">
                Kein Treffer. Die Suche greift von vorn.
              </li>
            )}
          </ul>
          <div className="p-2 border-t">
            <Link
              href="/projekte/neu"
              className="block rounded bg-arcos-steel text-white text-sm font-medium text-center px-3 py-2 hover:bg-arcos-navy"
            >
              + {einzahl} erfassen
            </Link>
          </div>
        </div>

        <div className="flex-1 min-h-0 flex flex-col">
          <nav className="h-12 md:h-10 shrink-0 border-b bg-white px-2 flex items-stretch gap-1 text-sm overflow-x-auto whitespace-nowrap">
            {reiter.map((r) => (
              <Link
                key={r.name}
                href={reiterLink(r.name)}
                className={`px-3 flex items-center border-b-2 ${
                  r.name === aktiv
                    ? "border-arcos-steel text-arcos-navy font-medium"
                    : "border-transparent text-gray-600 hover:text-arcos-navy"
                }`}
              >
                {r.titel}
              </Link>
            ))}
          </nav>

          <div className="flex-1 min-h-0">
            {aktiv === "auftrag" && (
              <div className="h-full overflow-y-auto p-4">
                {/* Der Einsatzort steht auch dort, wo die Ortsebene aus ist –
                    dann als reine Anzeige ohne Auswahl. */}
                {standort && !ortsebene && (
                  <p className="text-xs text-gray-400 mb-3 max-w-2xl">
                    Einsatzort: {[standort.bezeichnung, standort.ort].filter(Boolean).join(", ")}
                  </p>
                )}
                <AuftragReiter projektId={id} projekt={projekt as Projekt} ortsebene={ortsebene} error={error} />
              </div>
            )}

            {aktiv === "adressen" && (
              <div className="h-full overflow-y-auto p-4">
                <AdressenReiter projektId={id} istAdmin={istAdmin} />
              </div>
            )}

            {aktiv === "team" && (
              <div className="h-full overflow-y-auto p-4">
                <TeamReiter
                  projektId={id}
                  sichtbarFuerAlle={Boolean(projekt.sichtbar_fuer_alle)}
                />
              </div>
            )}

            {aktiv === "rapporte" && (
              <div className="h-full overflow-y-auto p-4">
                <RapporteReiter projektId={id} begriffe={begriffe} />
              </div>
            )}

            {aktiv === "dokumente" && (
              <div className="h-full overflow-y-auto p-4">
                <DokumenteReiter
                  projektId={id}
                  userId={profile?.id ?? ""}
                  istAdmin={istAdmin}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Die Reiter laden nur, was sie zeigen.
// ---------------------------------------------------------------------------

async function AuftragReiter({
  projektId,
  projekt,
  ortsebene,
  error,
}: {
  projektId: string;
  projekt: Projekt;
  ortsebene: boolean;
  error?: string;
}) {
  const supabase = await createClient();
  const [{ data: kunden }, { data: mitarbeitende }] = await Promise.all([
    supabase.from("kunden").select("id, name, vorname").eq("ist_kunde", true).order("name"),
    supabase.from("profiles").select("id, name").is("deaktiviert_am", null).order("name"),
  ]);

  return (
    <PraesenzSperre bereich="projekt" bezugId={projektId}>
      <ProjektForm
        projekt={projekt}
        kunden={kunden ?? []}
        mitarbeitende={mitarbeitende ?? []}
        action={updateProjekt.bind(null, projektId)}
        error={error}
        standorteAktiv={ortsebene}
      />
    </PraesenzSperre>
  );
}

async function AdressenReiter({
  projektId,
  istAdmin,
}: {
  projektId: string;
  istAdmin: boolean;
}) {
  const supabase = await createClient();
  const [{ data: adressen }, { data: rollen }, { data: auswahl }] = await Promise.all([
    supabase
      .from("projekt_adressen")
      .select(
        "id, projekt_id, partner_id, rolle_id, ansprechperson_id, gueltig_von, gueltig_bis, notiz, kunden(id, name, vorname, ort, email, telefon), adress_rollen(id, bezeichnung)"
      )
      .eq("projekt_id", projektId)
      .order("created_at"),
    supabase
      .from("adress_rollen")
      .select("id, bezeichnung, sortierung, aktiv")
      .eq("aktiv", true)
      .order("sortierung"),
    // Das ganze Adressbuch: Der Architekt steht dort ohne Kundenrolle und
    // muss trotzdem wählbar sein.
    supabase.from("kunden").select("id, name, vorname, ort").order("name").limit(500),
  ]);

  return (
    <ProjektAdressen
      projektId={projektId}
      adressen={(adressen ?? []) as unknown as ProjektAdresse[]}
      rollen={(rollen ?? []) as AdressRolle[]}
      auswahl={(auswahl ?? []) as AdressOption[]}
      istAdmin={istAdmin}
    />
  );
}

async function TeamReiter({
  projektId,
  sichtbarFuerAlle,
}: {
  projektId: string;
  sichtbarFuerAlle: boolean;
}) {
  const supabase = await createClient();
  const [{ data: teamZeilen }, { data: mitarbeitende }] = await Promise.all([
    supabase
      .from("projekt_mitarbeiter")
      .select("user_id, profiles(id, name)")
      .eq("projekt_id", projektId),
    supabase.from("profiles").select("id, name").is("deaktiviert_am", null).order("name"),
  ]);

  // PostgREST liefert die eingebettete Zeile je nach Beziehung als Objekt
  // oder Liste – beides abfangen und auf { id, name } vereinheitlichen.
  const team = ((teamZeilen ?? []) as { profiles: unknown }[])
    .flatMap((z) => (Array.isArray(z.profiles) ? z.profiles : z.profiles ? [z.profiles] : []))
    .map((x) => x as { id: string; name: string })
    .sort((a, b) => a.name.localeCompare(b.name, "de-CH"));

  return (
    <ProjektTeam
      projektId={projektId}
      team={team}
      alle={mitarbeitende ?? []}
      sichtbarFuerAlle={sichtbarFuerAlle}
    />
  );
}

async function RapporteReiter({
  projektId,
  begriffe,
}: {
  projektId: string;
  begriffe: Begriffe;
}) {
  const supabase = await createClient();
  const { data: rapporte } = await supabase
    .from("rapporte")
    .select("id, datum, jahr, nummer, status, bemerkung")
    .eq("projekt_id", projektId)
    .order("datum", { ascending: false });

  const mehrzahl = begriff(begriffe, "rapport", "mehrzahl");
  const einzahl = begriff(begriffe, "rapport", "einzahl");
  const zeilen = (rapporte ?? []) as Rapport[];

  return (
    <div>
      <h3 className="font-medium mb-3">
        {mehrzahl} ({zeilen.length})
      </h3>
      <div className="bg-white rounded-lg border overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-2">Datum</th>
              <th className="px-4 py-2">Nummer</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Bemerkung</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {zeilen.map((r) => (
              <tr key={r.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-2 whitespace-nowrap">{formatDatumCH(r.datum)}</td>
                <td className="px-4 py-2 whitespace-nowrap">
                  {r.jahr != null && r.nummer != null ? rapportNummer(r) : "Entwurf"}
                </td>
                <td className="px-4 py-2">{r.status}</td>
                <td className="px-4 py-2 text-gray-500 truncate max-w-xs">
                  {r.bemerkung ?? ""}
                </td>
                <td className="px-4 py-2 text-right">
                  <Link href={`/rapporte/${r.id}`} className="text-arcos-steel hover:underline">
                    Öffnen
                  </Link>
                </td>
              </tr>
            ))}
            {zeilen.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                  Für diesen Auftrag ist noch kein {einzahl} erfasst.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

async function DokumenteReiter({
  projektId,
  userId,
  istAdmin,
}: {
  projektId: string;
  userId: string;
  istAdmin: boolean;
}) {
  const supabase = await createClient();
  const { dokumente, kategorien } = await ladeDokumente(supabase, "projekt", projektId);
  return (
    <DokumenteBereich
      bereich="projekt"
      bezugId={projektId}
      initialDokumente={dokumente}
      kategorien={kategorien}
      aktuellerUserId={userId}
      istAdmin={istAdmin}
    />
  );
}
