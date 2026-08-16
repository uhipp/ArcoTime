import Image from "next/image";
import { RegistrierungFormular } from "@/components/registrierung-formular";
import { RechtsFussbereich } from "@/components/rechts-fussbereich";

export default async function RegistrierenPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; abgebrochen?: string }>;
}) {
  const { error, abgebrochen } = await searchParams;

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="max-w-2xl mx-auto">
        <div className="flex flex-col items-center mb-8">
          <Image src="/arcotime-logo.png" alt="ArcoTime" width={286} height={197} className="h-16 w-auto" priority />
          <p className="text-sm text-gray-500 mt-1">Smart planen. Besser arbeiten.</p>
        </div>

        <h1 className="text-2xl font-semibold text-center mb-2">Jetzt registrieren</h1>
        <p className="text-sm text-gray-500 text-center mb-8">
          Wähle die Anzahl Benutzer – der Preis wird sofort berechnet.
        </p>

        {error && (
          <div className="rounded bg-red-50 text-red-700 text-sm px-3 py-2 mb-4">{error}</div>
        )}
        {abgebrochen && (
          <div className="rounded bg-amber-50 text-amber-800 text-sm px-3 py-2 mb-4">
            Zahlung abgebrochen – deine Angaben kannst du unten einfach erneut eingeben.
          </div>
        )}

        <div className="bg-white rounded-lg border p-6 sm:p-8">
          <RegistrierungFormular />
        </div>
        <RechtsFussbereich className="mt-8" />
      </div>
    </div>
  );
}
