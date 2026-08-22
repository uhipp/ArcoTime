import Link from "next/link";
import { getCurrentProfile, getCurrentOrganisation } from "@/lib/get-profile";
import { createClient } from "@/lib/supabase/server";
import { heuteIso, formatDatumCH } from "@/lib/date-utils";
import type { Anfrage } from "@/lib/types";
import { darf } from "@/lib/berechtigungen";
import { begriff, getBegriffe } from "@/lib/begriffe";

export default async function DashboardPage() {
  const [profile, organisation, begriffe] = await Promise.all([
    getCurrentProfile(),
    getCurrentOrganisation(),
    getBegriffe(),
  ]);
  const isAdmin = darf(profile, "einstellungen.verwalten");
  const supabase = await createClient();
  const heute = heuteIso();

  const { data: wiedervorlagen } = profile
    ? await supabase
        .from("anfragen")
        .select("*, kunden(id, name, vorname), projekte(id, bezeichnung)")
        .eq("zugewiesen_an", profile.id)
        .neq("status", "erledigt")
        .not("wiedervorlage_am", "is", null)
        .lte("wiedervorlage_am", heute)
        .order("wiedervorlage_am", { ascending: true })
    : { data: null };

  const offeneWiedervorlagen = (wiedervorlagen as Anfrage[] | null) ?? [];

  // „Mein Tag" – was jemand HEUTE tut, und zwar zuoberst.
  //
  // Der Grund steht im Gespräch vom 23.08.2026: Auf dem Handy soll nicht der
  // Funktionsumfang kleiner sein, sondern die Reihenfolge stimmen. Wer
  // unterwegs die Anwendung öffnet, will seinen Einsatz und seinen Timer –
  // nicht die Kachel „Einstellungen". Erreichbar bleibt alles; es steht nur
  // weiter unten.
  const [{ data: eigeneRapporte }, { data: imTeam }, { data: laufenderTimer }] = profile
    ? await Promise.all([
        supabase
          .from("rapporte")
          .select(
            "id, datum, status, projekte(bezeichnung, zugang, standorte(bezeichnung, ort), kunden(name, vorname))"
          )
          .eq("mitarbeiter_id", profile.id)
          .eq("datum", heute)
          .order("created_at"),
        // Teamrapporte: Wer mitarbeitet, ohne die ausführende Person zu sein,
        // hat den Einsatz genauso im Kalender.
        supabase
          .from("rapport_mitarbeiter")
          .select(
            "rapport_id, rapporte!inner(id, datum, status, projekte(bezeichnung, zugang, standorte(bezeichnung, ort), kunden(name, vorname)))"
          )
          .eq("mitarbeiter_id", profile.id)
          .eq("rapporte.datum", heute),
        supabase
          .from("zeiteintraege")
          .select("id, rapport_id, timer_gestartet_um, beschreibung")
          .eq("mitarbeiter_id", profile.id)
          .not("timer_gestartet_um", "is", null)
          .limit(1)
          .maybeSingle(),
      ])
    : [{ data: null }, { data: null }, { data: null }];

  type TagesRapport = {
    id: string;
    datum: string;
    status: string;
    projekte?: unknown;
  };
  const einzeln = <T,>(w: unknown): T | undefined =>
    (Array.isArray(w) ? w[0] : w) as T | undefined;

  // Beide Quellen in eine Liste, doppelte Einträge weg: Wer ausführende Person
  // UND im Team ist, soll den Einsatz einmal sehen.
  const tagesRapporte = new Map<string, TagesRapport>();
  for (const r of (eigeneRapporte ?? []) as unknown as TagesRapport[]) {
    tagesRapporte.set(r.id, r);
  }
  for (const z of (imTeam ?? []) as unknown as { rapporte?: unknown }[]) {
    const r = einzeln<TagesRapport>(z.rapporte);
    if (r) tagesRapporte.set(r.id, r);
  }
  const meinTag = [...tagesRapporte.values()];

  const { count: offeneVergangene } = profile
    ? await supabase
        .from("rapporte")
        .select("id", { count: "exact", head: true })
        .eq("mitarbeiter_id", profile.id)
        .eq("status", "offen")
        .lt("datum", heute)
    : { count: 0 };

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Übersicht</h1>

      {/* Mein Tag. Berührungsflächen mindestens 44 px, weil dieser Block auf
          dem Telefon der erste ist, den jemand antippt. */}
      <section className="mb-8">
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
          <h2 className="text-lg font-medium">Mein Tag</h2>
          <span className="text-sm text-gray-500">{formatDatumCH(heute)}</span>
        </div>

        {/* Der laufende Timer zuerst und unübersehbar: Der vergessene Timer
            vom Freitagabend ist der erste Supportfall. */}
        {laufenderTimer && (
          <Link
            href={
              laufenderTimer.rapport_id
                ? `/rapporte/${laufenderTimer.rapport_id}`
                : `/zeiterfassung/${laufenderTimer.id}`
            }
            className="flex min-h-[44px] items-center justify-between gap-3 rounded-lg border border-red-300 bg-red-50 px-4 py-3 mb-3 hover:bg-red-100"
          >
            <span className="font-medium text-red-800">⏱ Ein Timer läuft</span>
            <span className="text-sm text-red-700">
              {laufenderTimer.beschreibung || "hier stoppen"}
            </span>
          </Link>
        )}

        {meinTag.length > 0 ? (
          <ul className="space-y-2">
            {meinTag.map((r) => {
              const auftrag = einzeln<{
                bezeichnung: string;
                zugang: string | null;
                standorte?: unknown;
                kunden?: unknown;
              }>(r.projekte);
              const ort = einzeln<{ bezeichnung: string; ort: string | null }>(
                auftrag?.standorte
              );
              const kunde = einzeln<{ name: string; vorname: string | null }>(auftrag?.kunden);
              return (
                <li key={r.id}>
                  <Link
                    href={`/rapporte/${r.id}`}
                    className="flex min-h-[44px] items-center justify-between gap-3 rounded-lg border bg-white px-4 py-3 hover:bg-gray-50"
                  >
                    <span className="min-w-0">
                      <span className="block font-medium truncate">
                        {kunde
                          ? [kunde.vorname, kunde.name].filter(Boolean).join(" ")
                          : "Ohne Kunde"}
                      </span>
                      <span className="block text-sm text-gray-500 truncate">
                        {auftrag?.bezeichnung}
                        {ort?.ort ? ` · ${ort.ort}` : ""}
                      </span>
                    </span>
                    <span className="text-sm text-gray-400 shrink-0">
                      {r.status === "offen" ? "offen" : r.status}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">
            Für heute ist kein Einsatz erfasst.{" "}
            <Link href="/rapporte/neu" className="text-arcos-steel hover:underline">
              {begriff(begriffe, "rapport", "einzahl")} anlegen
            </Link>{" "}
            oder{" "}
            <Link href="/zeiterfassung" className="text-arcos-steel hover:underline">
              Zeit erfassen
            </Link>
            .
          </p>
        )}

        {Boolean(offeneVergangene) && (
          <Link
            href="/rapporte"
            className="mt-3 flex min-h-[44px] items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 hover:bg-amber-100"
          >
            <strong>{offeneVergangene}</strong> offene{" "}
            {begriff(begriffe, "rapport", "mehrzahl")} aus vergangenen Tagen — unverrechnete
            Arbeit, solange sie offen sind.
          </Link>
        )}
      </section>

      {offeneWiedervorlagen.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-medium mb-3">Meine Wiedervorlagen</h2>
          <div className="bg-white rounded-lg border divide-y">
            {offeneWiedervorlagen.map((a) => {
              // Bewusst "<=" statt "<": alle Einträge in dieser Liste sind
              // bereits per .lte() gefiltert ("heute fällig oder früher") –
              // dieselbe Schwelle muss auch für die rote Hervorhebung
              // gelten, sonst wirkt eine heute fällige Wiedervorlage
              // optisch wie jede andere, nicht besonders eilige.
              const ueberfaellig = (a.wiedervorlage_am ?? "") <= heute;
              return (
                <Link
                  key={a.id}
                  href={`/anfragen/${a.id}`}
                  className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-gray-50"
                >
                  <div>
                    <div className="font-medium">{a.titel}</div>
                    <div className="text-sm text-gray-500">
                      {a.kunden?.vorname ? `${a.kunden.vorname} ` : ""}
                      {a.kunden?.name}
                      {a.projekte?.bezeichnung ? ` · ${a.projekte.bezeichnung}` : ""}
                    </div>
                  </div>
                  <div
                    className={`text-sm font-medium whitespace-nowrap ${
                      ueberfaellig ? "text-red-600" : "text-gray-500"
                    }`}
                  >
                    {ueberfaellig ? "Überfällig: " : ""}
                    {a.wiedervorlage_am
                      ? new Date(a.wiedervorlage_am).toLocaleDateString("de-CH")
                      : ""}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          href="/zeiterfassung"
          className="block rounded-lg border bg-white p-5 hover:shadow"
        >
          <div className="font-medium">Zeiterfassung</div>
          <div className="text-sm text-gray-500">Zeit erfassen & eigene Einträge</div>
        </Link>
        <Link
          href="/anfragen"
          className="block rounded-lg border bg-white p-5 hover:shadow"
        >
          <div className="font-medium">{begriff(begriffe, "anfrage", "mehrzahl")}</div>
          <div className="text-sm text-gray-500">
            {begriff(begriffe, "anfrage", "mehrzahl")} und Wiedervorlagen
          </div>
        </Link>
        <Link
          href="/rapporte"
          className="block rounded-lg border bg-white p-5 hover:shadow"
        >
          <div className="font-medium">{begriff(begriffe, "rapport", "mehrzahl")}</div>
          <div className="text-sm text-gray-500">
            {begriff(begriffe, "rapport", "mehrzahl")} und Nachweise
          </div>
        </Link>
        {organisation?.modul_disposition && (
          <Link
            href="/disposition"
            className="block rounded-lg border bg-white p-5 hover:shadow"
          >
            <div className="font-medium">Disposition</div>
            <div className="text-sm text-gray-500">Einsätze planen & verschieben</div>
          </Link>
        )}
        <Link
          href="/auswertungen"
          className="block rounded-lg border bg-white p-5 hover:shadow"
        >
          <div className="font-medium">Auswertungen</div>
          <div className="text-sm text-gray-500">Tag / Woche / Monat mit Filtern</div>
        </Link>
        <Link
          href="/kalender"
          className="block rounded-lg border bg-white p-5 hover:shadow"
        >
          <div className="font-medium">Kalender</div>
          <div className="text-sm text-gray-500">Monatsübersicht</div>
        </Link>
        <Link
          href="/kunden"
          className="block rounded-lg border bg-white p-5 hover:shadow"
        >
          <div className="font-medium">Kunden</div>
          <div className="text-sm text-gray-500">Adressen verwalten</div>
        </Link>
        <Link
          href="/projekte"
          className="block rounded-lg border bg-white p-5 hover:shadow"
        >
          <div className="font-medium">Projekte</div>
          <div className="text-sm text-gray-500">Projekte je Kunde</div>
        </Link>
        <Link
          href="/artikel"
          className="block rounded-lg border bg-white p-5 hover:shadow"
        >
          <div className="font-medium">Artikel</div>
          <div className="text-sm text-gray-500">Katalog & Preise</div>
        </Link>
        {isAdmin && (
          <Link
            href="/mitarbeiter"
            className="block rounded-lg border bg-white p-5 hover:shadow"
          >
            <div className="font-medium">Mitarbeitende</div>
            <div className="text-sm text-gray-500">Konten, Rollen & Abwesenheiten</div>
          </Link>
        )}
        {isAdmin && (
          <Link
            href="/export"
            className="block rounded-lg border bg-white p-5 hover:shadow"
          >
            <div className="font-medium">Export</div>
            <div className="text-sm text-gray-500">Positionen als Excel exportieren</div>
          </Link>
        )}
        {isAdmin && (
          <Link
            href="/einstellungen"
            className="block rounded-lg border bg-white p-5 hover:shadow"
          >
            <div className="font-medium">Einstellungen</div>
            <div className="text-sm text-gray-500">Auswahllisten, Arbeitszeit & Gruppen</div>
          </Link>
        )}
      </div>
    </div>
  );
}
