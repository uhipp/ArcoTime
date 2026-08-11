import Image from "next/image";
import Link from "next/link";
import { stripe } from "@/lib/stripe";

export default async function RegistrierungErfolgPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;

  let firmenname: string | null = null;
  let email: string | null = null;

  if (session_id) {
    try {
      const session = await stripe.checkout.sessions.retrieve(session_id);
      firmenname = (session.metadata?.firmenname as string) ?? null;
      email = session.customer_email ?? null;
    } catch {
      // Ungültige/abgelaufene Session-ID – Seite bleibt trotzdem nutzbar,
      // nur ohne personalisierte Angaben.
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-lg shadow p-8 text-center">
        <Image
          src="/arcotime-logo.png"
          alt="ArcoTime"
          width={286}
          height={197}
          className="h-16 w-auto mx-auto block mb-4"
          priority
        />
        <h1 className="text-lg font-semibold text-arcos-navy mb-2">Zahlung erfolgreich 🎉</h1>
        <p className="text-sm text-gray-600 mb-4">
          {firmenname ? `Willkommen bei ArcoTime, ${firmenname}!` : "Willkommen bei ArcoTime!"}
        </p>
        <p className="text-sm text-gray-500 mb-6">
          Du erhältst in Kürze eine E-Mail{email ? ` an ${email}` : ""} mit einem Link,
          über den du dein Passwort festlegst und direkt losstarten kannst.
        </p>
        <Link href="/login" className="text-sm text-arcos-steel hover:underline">
          Zur Anmeldeseite
        </Link>
      </div>
    </div>
  );
}
