import Link from "next/link";
import { getCurrentProfile, getCurrentOrganisation } from "@/lib/get-profile";
import { createClient } from "@/lib/supabase/server";
import { heuteIso } from "@/lib/date-utils";
import type { Anfrage } from "@/lib/types";

export default async function DashboardPage() {
  const [profile, organisation] = await Promise.all([
    getCurrentProfile(),
    getCurrentOrganisation(),
  ]);
  const isAdmin = profile?.role === "admin";
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

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Übersicht</h1>

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
          <div className="font-medium">Anfragen</div>
          <div className="text-sm text-gray-500">Kundenanfragen & Wiedervorlagen</div>
        </Link>
        <Link
          href="/rapporte"
          className="block rounded-lg border bg-white p-5 hover:shadow"
        >
          <div className="font-medium">Rapporte</div>
          <div className="text-sm text-gray-500">Arbeitsrapporte & Nachweise</div>
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
          href="/dienstleistungen"
          className="block rounded-lg border bg-white p-5 hover:shadow"
        >
          <div className="font-medium">Dienstleistungen</div>
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
