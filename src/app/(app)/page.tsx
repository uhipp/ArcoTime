import Link from "next/link";
import { getCurrentProfile } from "@/lib/get-profile";

export default async function DashboardPage() {
  const profile = await getCurrentProfile();
  const isAdmin = profile?.role === "admin";

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Übersicht</h1>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          href="/zeiterfassung"
          className="block rounded-lg border bg-white p-5 hover:shadow"
        >
          <div className="font-medium">Zeiterfassung</div>
          <div className="text-sm text-gray-500">Zeit erfassen & eigene Einträge</div>
        </Link>
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
            href="/export"
            className="block rounded-lg border bg-white p-5 hover:shadow"
          >
            <div className="font-medium">Export</div>
            <div className="text-sm text-gray-500">Positionen als Excel exportieren</div>
          </Link>
        )}
      </div>
    </div>
  );
}
