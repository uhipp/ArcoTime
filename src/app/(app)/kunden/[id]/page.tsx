import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/get-profile";
import { standorteAktiv } from "@/lib/standorte";
import { begriff, getBegriffe, type Begriffe } from "@/lib/begriffe";
import { ladeDokumente } from "@/lib/dokumente-laden";
import { KundeForm } from "@/components/kunde-form";
import { KundenPreiseRabatte } from "@/components/kunden-preise-rabatte";
import { KundenAnsprechpersonen, type AnsprechpersonZeile } from "@/components/kunden-ansprechpersonen";
import {
  KundenBetriebKontakt,
  type KontaktArt,
  type KontaktZeile,
} from "@/components/kunden-kontaktkanaele";
import { KundenStandorte, type PartnerOption } from "@/components/kunden-standorte";
import { DokumenteBereich } from "@/components/dokumente-bereich";
import { updateKunde, deleteKunde } from "@/app/actions/kunden";
import { DeleteButton } from "@/components/delete-button";
import { OptionalesDatumFeld } from "@/components/optionales-datum-feld";
import type {
  Beteiligter,
  BeteiligtenRolle,
  Kunde,
  Standort,
  ZeiteintragMitDetails,
} from "@/lib/types";
import { mengeLabel } from "@/lib/menge";
import { PraesenzSperre } from "@/components/praesenz-sperre";
import { darf } from "@/lib/berechtigungen";

// Die Kundenmaske nach docs/masken-leitlinie.md.
//
// Vorher war das eine Seite, auf der Adresse, Preise, Rabatte, Historie,
// Ansprechpersonen und Dokumente untereinander standen – der Anwender war
// „laufend am Scrollen“, und wer zwischendurch ans Telefon musste, fand
// danach nicht mehr zurück.
//
// Jetzt: Liste links, Detail rechts, alles Nebensächliche in Reitern, und
// die Seite selbst scrollt nicht. Gescrollt wird nur in den inneren Flächen.
// Die Auswahl steht in der Adresse (…?reiter=standorte&standort=…), damit der
// Zurück-Knopf funktioniert, ein Link teilbar bleibt und die Maske eine
// Serverkomponente bleiben kann.

type SearchParams = {
  error?: string;
  reiter?: string;
  standort?: string;
  q?: string;
  von?: string;
  bis?: string;
  projekt_id?: string;
};

type ReiterName =
  | "adresse"
  | "personen"
  | "standorte"
  | "auftraege"
  | "konditionen"
  | "dokumente"
  | "historie";

function reiterListe(begriffe: Begriffe, standorteAktiv: boolean) {
  const alle: { name: ReiterName; titel: string }[] = [
    { name: "adresse", titel: "Adresse" },
    { name: "personen", titel: "Ansprechpersonen" },
    { name: "standorte", titel: "Standorte" },
    { name: "auftraege", titel: begriff(begriffe, "projekt", "mehrzahl") },
    { name: "konditionen", titel: "Preise und Rabatte" },
    { name: "dokumente", titel: "Dokumente" },
    { name: "historie", titel: "Historie" },
  ];
  // Wer die Ortsebene nicht braucht, sieht sie nicht: Ein Einmannbetrieb mit
  // einem Ort je Kunde soll keinen Reiter pflegen, der für ihn immer
  // dasselbe sagt (organisationen.standorte_aktiv, 0076).
  return standorteAktiv ? alle : alle.filter((r) => r.name !== "standorte");
}

export default async function KundeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { id } = await params;
  const p = await searchParams;
  const { error, standort: standortWahl, q, von, bis, projekt_id } = p;
  const supabase = await createClient();

  const [profile, begriffe, { data: kunde }] = await Promise.all([
    getCurrentProfile(),
    getBegriffe(),
    supabase.from("kunden").select("*").eq("id", id).single(),
  ]);

  if (!kunde) notFound();

  // Der Schalter ist mehr als eine Anzeigefrage: Er kann erst wahr sein, wenn
  // 0076 gelaufen ist. Deshalb hängt auch die Einbettung des Einsatzorts unten
  // daran – vor der Migration gibt es die Spalte nicht, und eine Abfrage, die
  // sie erwähnt, käme leer zurück. Eine leere Auftragsliste, die „noch kein
  // Auftrag erfasst" behauptet, wäre schlimmer als ein fehlender Ort.
  const ortsebene = await standorteAktiv();
  const reiter = reiterListe(begriffe, ortsebene);
  const aktiv: ReiterName = reiter.some((r) => r.name === p.reiter)
    ? (p.reiter as ReiterName)
    : "adresse";

  const istAdmin = darf(profile, "kunden.loeschen");

  // Die Liste links: nur was eine zweizeilige Zeile braucht. Gesucht wird
  // von vorn – „Bür“ findet Bürgi, nicht jeden Text mit „bür“ darin.
  let listeQuery = supabase
    .from("kunden")
    .select("id, name, vorname, plz, ort, ist_kunde")
    .order("name")
    .limit(300);
  if (q) {
    listeQuery = listeQuery.or(`name.ilike.${q}%,vorname.ilike.${q}%,ort.ilike.${q}%`);
  }
  const { data: liste } = await listeQuery;

  const kundeName = `${kunde.vorname ? `${kunde.vorname} ` : ""}${kunde.name}`;
  const basis = `/kunden/${id}`;
  const reiterLink = (name: ReiterName) => `${basis}?reiter=${name}${q ? `&q=${q}` : ""}`;

  return (
    <div data-vollbild className="h-full flex flex-col">
      {/* Zone 3 – Bereichsleiste: wo bin ich, und was ist gewählt. Bleibt
          nach einer Unterbrechung ohne Scrollen sichtbar. */}
      <div className="h-12 shrink-0 border-b bg-white px-4 flex items-center gap-3">
        <Link href="/kunden" className="font-heading font-semibold text-arcos-navy hover:underline">
          {begriff(begriffe, "kunde", "mehrzahl")}
        </Link>
        <span className="text-gray-300">›</span>
        <span className="font-medium truncate">{kundeName}</span>
        {!kunde.ist_kunde && (
          <span
            title="Geschäftspartner ohne Kundenrolle – erscheint nicht in der Auswahl eines Auftrags"
            className="rounded bg-gray-100 text-gray-500 text-xs px-1.5 py-0.5"
          >
            nur Adresse
          </span>
        )}
        <span className="ml-auto flex items-center gap-2">
          <Link
            href="/kunden"
            className="rounded border border-gray-300 text-sm px-3 py-1.5 hover:bg-gray-50"
          >
            Ganze Liste
          </Link>
          {/* Löschen bleibt beim Admin (RLS seit 0031): Ein Kunde hängt an
              bestehenden Zeiteinträgen und Rapporten. Erfassen und
              Bearbeiten darf jeder. */}
          {istAdmin && (
            <DeleteButton
              action={deleteKunde.bind(null, id)}
              label="Kunde löschen"
              confirmText="Kunde inkl. aller zugehörigen Projekte ohne Zeiteinträge wirklich löschen?"
            />
          )}
        </span>
      </div>

      {error && (
        <div className="shrink-0 bg-red-50 text-red-700 text-sm px-4 py-2 border-b">{error}</div>
      )}

      <div className="flex-1 min-h-0 flex">
        {/* Liste links */}
        <div className="w-72 shrink-0 border-r bg-white flex flex-col min-h-0">
          <form className="p-2 border-b">
            <input
              type="search"
              name="q"
              defaultValue={q ?? ""}
              placeholder="Suche Name, Ort…"
              className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-arcos-steel"
            />
            <input type="hidden" name="reiter" value={aktiv} />
          </form>
          <ul className="flex-1 min-h-0 overflow-y-auto divide-y">
            {(liste ?? []).map((k) => {
              const gewaehlt = k.id === id;
              return (
                <li key={k.id}>
                  <Link
                    href={`/kunden/${k.id}?reiter=${aktiv}${q ? `&q=${q}` : ""}`}
                    className={`block border-l-2 px-3 py-2 text-sm ${
                      gewaehlt
                        ? "border-arcos-steel bg-arcos-steel/10"
                        : "border-transparent hover:bg-gray-50"
                    }`}
                  >
                    <span
                      className={`block truncate ${gewaehlt ? "font-medium text-arcos-navy" : ""}`}
                    >
                      {k.vorname ? `${k.vorname} ` : ""}
                      {k.name}
                    </span>
                    <span className="block text-xs text-gray-400 truncate">
                      {[k.plz, k.ort].filter(Boolean).join(" ") || "ohne Ort"}
                      {!k.ist_kunde && " · nur Adresse"}
                    </span>
                  </Link>
                </li>
              );
            })}
            {(liste ?? []).length === 0 && (
              <li className="px-3 py-4 text-xs text-gray-400">
                Kein Treffer. Die Suche greift von vorn – „Bür“ findet Bürgi.
              </li>
            )}
          </ul>
          <div className="p-2 border-t">
            <Link
              href="/kunden/neu"
              className="block rounded bg-arcos-steel text-white text-sm font-medium text-center px-3 py-2 hover:bg-arcos-navy"
            >
              + {begriff(begriffe, "kunde", "einzahl")} erfassen
            </Link>
          </div>
        </div>

        {/* Detail rechts */}
        <div className="flex-1 min-h-0 flex flex-col">
          <nav className="h-10 shrink-0 border-b bg-white px-2 flex items-stretch gap-1 text-sm overflow-x-auto whitespace-nowrap">
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
            {aktiv === "adresse" && (
              <div className="h-full overflow-y-auto p-4">
                <div className="max-w-3xl space-y-6">
                  <PraesenzSperre bereich="kunde" bezugId={id}>
                    <KundeForm
                      kunde={kunde as Kunde}
                      action={updateKunde.bind(null, id)}
                      error={error}
                    />
                  </PraesenzSperre>
                  {/* Die Kanäle des Betriebs gehören zur Adresse und zu
                      keiner Person – bis zum 22.08.2026 standen sie im
                      Reiter Ansprechpersonen. */}
                  <BetriebKontaktReiter kundeId={id} istAdmin={istAdmin} />
                </div>
              </div>
            )}

            {aktiv === "personen" && <PersonenReiter kundeId={id} istAdmin={istAdmin} />}

            {aktiv === "standorte" && (
              <StandorteReiter
                kundeId={id}
                standortWahl={standortWahl}
                userId={profile?.id ?? ""}
                istAdmin={istAdmin}
              />
            )}

            {aktiv === "auftraege" && (
              <AuftraegeReiter kundeId={id} begriffe={begriffe} ortsebene={ortsebene} />
            )}

            {aktiv === "konditionen" && (
              <div className="h-full overflow-y-auto p-4">
                <KonditionenReiter
                  kundeId={id}
                  standardRabatt={Number(kunde.standard_rabatt_prozent ?? 0)}
                />
              </div>
            )}

            {aktiv === "dokumente" && (
              <div className="h-full overflow-y-auto p-4">
                <DokumenteReiter kundeId={id} userId={profile?.id ?? ""} istAdmin={istAdmin} />
              </div>
            )}

            {aktiv === "historie" && (
              <HistorieReiter
                kundeId={id}
                von={von}
                bis={bis}
                projektId={projekt_id}
                begriffe={begriffe}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Die Reiter laden nur, was sie zeigen. Vorher standen alle dreizehn
// Abfragen der Seite in einem Promise.all – auch die Historie, die niemand
// aufgeschlagen hatte.
// ---------------------------------------------------------------------------

async function PersonenReiter({ kundeId, istAdmin }: { kundeId: string; istAdmin: boolean }) {
  const supabase = await createClient();
  const [{ data: ansprechpersonen }, { data: arten }] = await Promise.all([
    supabase
      .from("ansprechpersonen")
      // Die Kontakte der Person kommen als Einbettung mit: PostgREST löst
      // sie über den einzigen Fremdschlüssel zwischen den beiden Tabellen
      // auf, und eine zweite Abfrage je Person wäre N+1.
      .select(
        "id, anrede, vorname, name, funktion, notiz, ist_standard, aktiv, kontakte(id, wert, bemerkung, art_id, kunde_id, ansprechperson_id)"
      )
      .eq("kunde_id", kundeId)
      .order("ist_standard", { ascending: false })
      .order("name"),
    supabase
      .from("kontakt_arten")
      .select("id, bezeichnung, art")
      .eq("aktiv", true)
      .order("sortierung"),
  ]);

  type PersonMitKontakten = AnsprechpersonZeile & { kontakte?: KontaktZeile[] };
  const personenRoh = (ansprechpersonen as PersonMitKontakten[] | null) ?? [];
  // Die eingebetteten Kontakte hier abstreifen: Sie wandern in die flache
  // Liste darunter, und die Komponente soll sie nicht zweimal bekommen.
  const personen: AnsprechpersonZeile[] = personenRoh.map((x) => ({
    id: x.id,
    anrede: x.anrede,
    vorname: x.vorname,
    name: x.name,
    funktion: x.funktion,
    notiz: x.notiz,
    ist_standard: x.ist_standard,
    aktiv: x.aktiv,
  }));
  // Nur noch die Kanäle der Personen – die des Betriebs stehen im Reiter
  // „Adresse".
  const alleKontakte: KontaktZeile[] = personenRoh.flatMap((x) => x.kontakte ?? []);

  return (
    <div className="h-full overflow-y-auto p-4">
      <KundenAnsprechpersonen
        kundeId={kundeId}
        personen={personen}
        kontakte={alleKontakte}
        arten={(arten ?? []) as KontaktArt[]}
        istAdmin={istAdmin}
      />
    </div>
  );
}

async function BetriebKontaktReiter({
  kundeId,
  istAdmin,
}: {
  kundeId: string;
  istAdmin: boolean;
}) {
  const supabase = await createClient();
  const [{ data: kontakte }, { data: arten }] = await Promise.all([
    // Ohne Person: die Angaben, die dem Kunden als Ganzem gehören.
    supabase
      .from("kontakte")
      .select("id, wert, bemerkung, art_id, kunde_id, ansprechperson_id")
      .eq("kunde_id", kundeId),
    supabase
      .from("kontakt_arten")
      .select("id, bezeichnung, art")
      .eq("aktiv", true)
      .order("sortierung"),
  ]);

  return (
    <KundenBetriebKontakt
      kundeId={kundeId}
      kontakte={(kontakte ?? []) as KontaktZeile[]}
      arten={(arten ?? []) as KontaktArt[]}
      istAdmin={istAdmin}
    />
  );
}

async function StandorteReiter({
  kundeId,
  standortWahl,
  userId,
  istAdmin,
}: {
  kundeId: string;
  standortWahl?: string;
  userId: string;
  istAdmin: boolean;
}) {
  const supabase = await createClient();

  // Die Standorte eines Kunden hängen an der Beteiligtenrolle „Kunde“ – eine
  // Spalte kunde_id am Standort gibt es bewusst nicht (0076). Deshalb ist
  // hier beteiligte die Basistabelle und der Standort die Einbettung.
  const { data: zugehoerig } = await supabase
    .from("beteiligte")
    .select(
      "standorte!inner(id, bezeichnung, adresse_zusatz, strasse, hausnummer, plz, ort, land, ist_standard, anreise_km, zugang, notizen, aktiv), beteiligten_rollen!inner(bezeichnung)"
    )
    .eq("partner_id", kundeId)
    .eq("beteiligten_rollen.bezeichnung", "Kunde")
    .not("standort_id", "is", null);

  const standorte = ((zugehoerig ?? []) as unknown as { standorte: Standort }[])
    .map((z) => z.standorte)
    .filter(Boolean)
    .sort(
      (a, b) =>
        Number(b.ist_standard) - Number(a.ist_standard) ||
        a.bezeichnung.localeCompare(b.bezeichnung, "de-CH")
    );

  // „neu“ ist kein Datensatz, sondern der Wunsch nach einem leeren Formular.
  const gewaehlt =
    standortWahl === "neu"
      ? null
      : (standorte.find((s) => s.id === standortWahl) ?? standorte[0] ?? null);

  const [{ data: beteiligte }, { data: rollen }, { data: partner }, ablage] = await Promise.all([
    gewaehlt
      ? supabase
          .from("beteiligte")
          .select(
            "id, standort_id, projekt_id, rapport_id, partner_id, rolle_id, gueltig_von, gueltig_bis, notiz, kunden(id, name, vorname, ort), beteiligten_rollen(id, bezeichnung)"
          )
          .eq("standort_id", gewaehlt.id)
          .order("created_at")
      : Promise.resolve({ data: [] }),
    supabase
      .from("beteiligten_rollen")
      .select("id, bezeichnung, sortierung, aktiv")
      .eq("aktiv", true)
      .order("sortierung"),
    // Das ganze Adressbuch, nicht nur die Kunden: Der Architekt steht dort
    // ohne Kundenrolle und muss trotzdem wählbar sein.
    supabase.from("kunden").select("id, name, vorname, ort").order("name").limit(500),
    gewaehlt
      ? ladeDokumente(supabase, "standort", gewaehlt.id)
      : Promise.resolve({ dokumente: [], kategorien: [] }),
  ]);

  return (
    <KundenStandorte
      kundeId={kundeId}
      standorte={standorte}
      gewaehlt={gewaehlt}
      beteiligte={(beteiligte ?? []) as unknown as Beteiligter[]}
      rollen={(rollen ?? []) as BeteiligtenRolle[]}
      partner={(partner ?? []) as PartnerOption[]}
      dokumente={ablage.dokumente}
      kategorien={ablage.kategorien}
      userId={userId}
      istAdmin={istAdmin}
    />
  );
}

// Die Einbettung ist eine 1:1-Beziehung, die erzeugten Typen kennen aber nur
// „irgendeine Einbettung“ und geben ein Array her. Statt einer Zusicherung an
// jeder Verwendungsstelle steht die Umrechnung einmal hier.
function ortEinesAuftrags(standort: unknown): string {
  const s = (Array.isArray(standort) ? standort[0] : standort) as
    | { bezeichnung?: string | null; ort?: string | null }
    | null
    | undefined;
  if (!s) return "–";
  return [s.bezeichnung, s.ort].filter(Boolean).join(", ") || "–";
}

async function AuftraegeReiter({
  kundeId,
  begriffe,
  ortsebene,
}: {
  kundeId: string;
  begriffe: Begriffe;
  ortsebene: boolean;
}) {
  const supabase = await createClient();

  // Zwei Abfragen mit festen Spaltenlisten statt einer zusammengesetzten:
  // Die erzeugten Typen lesen die Spaltenliste als Literal, ein
  // Template-Literal versteht sie nicht.
  const mitOrt = supabase
    .from("projekte")
    .select("id, bezeichnung, status, kostenstelle, startdatum, standorte(bezeichnung, ort)")
    .eq("kunde_id", kundeId)
    .order("status")
    .order("bezeichnung");
  const ohneOrt = supabase
    .from("projekte")
    .select("id, bezeichnung, status, kostenstelle, startdatum")
    .eq("kunde_id", kundeId)
    .order("status")
    .order("bezeichnung");

  type AuftragZeile = {
    id: string;
    bezeichnung: string;
    status: string;
    kostenstelle: string | null;
    startdatum: string | null;
    standorte?: unknown;
  };
  const { data } = ortsebene ? await mitOrt : await ohneOrt;
  const projekte = (data ?? []) as unknown as AuftragZeile[];

  const mehrzahl = begriff(begriffe, "projekt", "mehrzahl");
  const einzahl = begriff(begriffe, "projekt", "einzahl");

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium">
          {mehrzahl} ({projekte.length})
        </h3>
        <Link
          href={`/projekte/neu?kunde_id=${kundeId}`}
          className="rounded bg-arcos-steel text-white text-sm font-medium px-3 py-1.5 hover:bg-arcos-navy"
        >
          + {einzahl}
        </Link>
      </div>
      <div className="bg-white rounded-lg border overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-2">Bezeichnung</th>
              {ortsebene && <th className="px-4 py-2">Einsatzort</th>}
              <th className="px-4 py-2">Kostenstelle</th>
              <th className="px-4 py-2">Start</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {projekte.map((pr) => (
              <tr key={pr.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-2">{pr.bezeichnung}</td>
                {ortsebene && (
                  <td className="px-4 py-2 text-gray-500">
                      {ortEinesAuftrags(pr.standorte)}
                  </td>
                )}
                <td className="px-4 py-2">{pr.kostenstelle ?? "–"}</td>
                <td className="px-4 py-2 whitespace-nowrap">
                  {pr.startdatum ? new Date(pr.startdatum).toLocaleDateString("de-CH") : "–"}
                </td>
                <td className="px-4 py-2">{pr.status}</td>
                <td className="px-4 py-2 text-right">
                  <Link href={`/projekte/${pr.id}`} className="text-arcos-steel hover:underline">
                    Öffnen
                  </Link>
                </td>
              </tr>
            ))}
            {projekte.length === 0 && (
              <tr>
                <td colSpan={ortsebene ? 6 : 5} className="px-4 py-6 text-center text-gray-400">
                  {/* Leere Listen zeigen den Weg nach vorn, nicht die
                      Sackgasse. */}
                  Für diesen Kunden ist noch kein {einzahl} erfasst – „+ {einzahl}“ oben
                  legt einen an.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

async function KonditionenReiter({
  kundeId,
  standardRabatt,
}: {
  kundeId: string;
  standardRabatt: number;
}) {
  const supabase = await createClient();
  const [{ data: artikel }, { data: klassen }, { data: preise }, { data: rabatte }] =
    await Promise.all([
      supabase
        .from("artikel")
        .select("id, bezeichnung, einheit, preis")
        .eq("aktiv", true)
        .order("bezeichnung"),
      supabase.from("artikelklassen").select("id, bezeichnung").order("sortierung"),
      supabase
        .from("kundenpreise")
        .select("id, preis, artikel_id, artikel(id, bezeichnung, einheit)")
        .eq("kunde_id", kundeId),
      supabase
        .from("kundenrabatte")
        .select("id, rabatt_prozent, klasse_id, artikelklassen(id, bezeichnung)")
        .eq("kunde_id", kundeId),
    ]);

  // Bewusst ohne Adminprüfung: Preise und Rabatte sind Vorgaben für die
  // Erfassung, keine Historie – siehe 0032.
  return (
    <KundenPreiseRabatte
      kundeId={kundeId}
      artikel={artikel ?? []}
      klassen={klassen ?? []}
      preise={(preise ?? []) as never[]}
      rabatte={(rabatte ?? []) as never[]}
      standardRabatt={standardRabatt}
    />
  );
}

async function DokumenteReiter({
  kundeId,
  userId,
  istAdmin,
}: {
  kundeId: string;
  userId: string;
  istAdmin: boolean;
}) {
  const supabase = await createClient();
  const { dokumente, kategorien } = await ladeDokumente(supabase, "kunde", kundeId);
  return (
    <DokumenteBereich
      bereich="kunde"
      bezugId={kundeId}
      initialDokumente={dokumente}
      kategorien={kategorien}
      aktuellerUserId={userId}
      istAdmin={istAdmin}
    />
  );
}

async function HistorieReiter({
  kundeId,
  von,
  bis,
  projektId,
  begriffe,
}: {
  kundeId: string;
  von?: string;
  bis?: string;
  projektId?: string;
  begriffe: Begriffe;
}) {
  const supabase = await createClient();

  let anfragenQuery = supabase
    .from("anfragen")
    .select("*, projekte(id, bezeichnung)")
    .eq("kunde_id", kundeId)
    .order("created_at", { ascending: false });
  if (von) anfragenQuery = anfragenQuery.gte("created_at", von);
  if (bis) anfragenQuery = anfragenQuery.lte("created_at", `${bis}T23:59:59`);
  if (projektId) anfragenQuery = anfragenQuery.eq("projekt_id", projektId);

  let zeitQuery = supabase
    .from("v_zeiteintraege")
    .select("*")
    // Nur erbrachte Leistung, keine Entwürfe – siehe 0036.
    .eq("vorlaeufig", false)
    .eq("kunde_id", kundeId)
    .order("datum", { ascending: false })
    .order("start_zeit", { ascending: false });
  if (von) zeitQuery = zeitQuery.gte("datum", von);
  if (bis) zeitQuery = zeitQuery.lte("datum", bis);
  if (projektId) zeitQuery = zeitQuery.eq("projekt_id", projektId);

  const [{ data: anfragen }, { data: zeiteintraege }, { data: projekte }] = await Promise.all([
    anfragenQuery,
    zeitQuery,
    supabase.from("projekte").select("id, bezeichnung").eq("kunde_id", kundeId).order("bezeichnung"),
  ]);

  const zeilen = (zeiteintraege as ZeiteintragMitDetails[] | null) ?? [];
  const summeStunden = zeilen.reduce((s, z) => s + Number(z.menge_stunden), 0);

  return (
    <div className="h-full overflow-y-auto p-4 space-y-6">
      <form className="flex flex-wrap items-center gap-2 text-sm">
        <input type="hidden" name="reiter" value="historie" />
        <OptionalesDatumFeld name="von" defaultValue={von} />
        <span className="text-gray-400">bis</span>
        <OptionalesDatumFeld name="bis" defaultValue={bis} />
        <select
          name="projekt_id"
          defaultValue={projektId ?? ""}
          className="rounded border border-gray-300 px-2 py-1.5"
        >
          <option value="">Alle {begriff(begriffe, "projekt", "mehrzahl")}</option>
          {projekte?.map((pr) => (
            <option key={pr.id} value={pr.id}>
              {pr.bezeichnung}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded border px-3 py-1.5 hover:bg-gray-50">
          Filtern
        </button>
        {(von || bis || projektId) && (
          <Link
            href={`/kunden/${kundeId}?reiter=historie`}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            Filter zurücksetzen
          </Link>
        )}
      </form>

      <div>
        <h3 className="text-sm font-semibold text-gray-500 mb-2">
          {begriff(begriffe, "anfrage", "mehrzahl")} ({anfragen?.length ?? 0})
        </h3>
        <div className="bg-white rounded-lg border overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="px-4 py-2">Datum</th>
                <th className="px-4 py-2">Titel</th>
                <th className="px-4 py-2">{begriff(begriffe, "projekt", "einzahl")}</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {anfragen?.map((a) => (
                <tr key={a.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2 whitespace-nowrap">
                    {new Date(a.created_at).toLocaleDateString("de-CH")}
                  </td>
                  <td className="px-4 py-2">{a.titel}</td>
                  <td className="px-4 py-2">{a.projekte?.bezeichnung ?? "–"}</td>
                  <td className="px-4 py-2">{a.status}</td>
                  <td className="px-4 py-2 text-right">
                    <Link href={`/anfragen/${a.id}`} className="text-arcos-steel hover:underline">
                      Öffnen
                    </Link>
                  </td>
                </tr>
              ))}
              {(!anfragen || anfragen.length === 0) && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                    Keine {begriff(begriffe, "anfrage", "mehrzahl")} im gewählten Zeitraum.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-500 mb-2">
          Zeiterfassung ({zeilen.length}
          {zeilen.length > 0 ? ` – ${summeStunden.toFixed(2)} h` : ""})
        </h3>
        <div className="bg-white rounded-lg border overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="px-4 py-2">Datum</th>
                <th className="px-4 py-2">{begriff(begriffe, "projekt", "einzahl")}</th>
                <th className="px-4 py-2">{begriff(begriffe, "artikel", "einzahl")}</th>
                <th className="px-4 py-2">Mitarbeitende</th>
                <th className="px-4 py-2">Dauer</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {zeilen.map((z) => {
                const laeuft = Boolean(z.timer_gestartet_um);
                return (
                  <tr
                    key={z.id}
                    className={`border-t ${laeuft ? "bg-red-50 hover:bg-red-100" : "hover:bg-gray-50"}`}
                  >
                    <td className="px-4 py-2 whitespace-nowrap">
                      {new Date(z.datum).toLocaleDateString("de-CH")}
                    </td>
                    <td className="px-4 py-2">{z.projekt_bezeichnung}</td>
                    <td className="px-4 py-2">{z.artikel_bezeichnung}</td>
                    <td className="px-4 py-2">{z.mitarbeiter_name}</td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      {laeuft ? (
                        <span className="font-medium text-red-700">⏱ Timer aktiv</span>
                      ) : (
                        mengeLabel(z)
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {z.beleg_id ? (
                        <span className="text-xs text-gray-400">exportiert</span>
                      ) : (
                        <Link
                          href={`/zeiterfassung/${z.id}`}
                          className="text-arcos-steel hover:underline"
                        >
                          Öffnen
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
              {zeilen.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                    Keine Zeiteinträge im gewählten Zeitraum.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
