import Link from "next/link";

export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Übersicht</h1>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          href="/kunden"
          className="block rounded-lg border bg-white p-5 hover:shadow"
        >
          <div className="font-medium">Kunden</div>
          <div className="text-sm text-gray-500">Adressen verwalten</div>
        </Link>
        <Link
          href="/mandate"
          className="block rounded-lg border bg-white p-5 hover:shadow"
        >
          <div className="font-medium">Mandate</div>
          <div className="text-sm text-gray-500">Mandate je Kunde</div>
        </Link>
        <Link
          href="/dienstleistungen"
          className="block rounded-lg border bg-white p-5 hover:shadow"
        >
          <div className="font-medium">Dienstleistungen</div>
          <div className="text-sm text-gray-500">Katalog & Preise</div>
        </Link>
      </div>
      <p className="text-sm text-gray-500 mt-8">
        Zeiterfassung, Auswertungen, Kalender und Export folgen in Phase 2–4.
      </p>
    </div>
  );
}
