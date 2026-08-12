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
  let personenname: string | null = null;
  let email: string | null = null;
  let testEndetAm: string | null = null;

  if (session_id) {
    try {
      // Abo mitladen: Nur daran ist erkennbar, ob gerade wirklich bezahlt
      // wurde oder ob die 14-tägige Testphase läuft (Status "trialing", die
      // Belastung erfolgt dann erst zum Testende).
      const session = await stripe.checkout.sessions.retrieve(session_id, {
        expand: ["subscription"],
      });
      firmenname = (session.metadata?.firmenname as string) ?? null;
      personenname =
        [session.metadata?.admin_vorname, session.metadata?.admin_nachname]
          .filter(Boolean)
          .join(" ")
          .trim() || null;
      email = session.customer_email ?? null;

      const abo = typeof session.subscription === "object" ? session.subscription : null;
      if (abo?.status === "trialing" && abo.trial_end) {
        testEndetAm = new Date(abo.trial_end * 1000).toLocaleDateString("de-CH", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
      }
    } catch {
      // Ungültige/abgelaufene Session-ID – Seite bleibt trotzdem nutzbar,
      // nur ohne personalisierte Angaben.
    }
  }

  // Angesprochen wird die Person, nicht die Firma: Wer bei der Registrierung
  // seinen Namen einträgt, erwartet ihn auch in der Begrüssung. Der
  // Firmenname wandert in den Satz darunter – dort ist er die nützlichere
  // Information (Bestätigung, dass die Organisation korrekt angelegt wurde).
  const begruessung = personenname ?? firmenname;

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
        {/* Bei aktiver Testphase wurde noch nichts belastet – "Zahlung
            erfolgreich" wäre schlicht falsch und verunsichert genau die
            Kundinnen, die bewusst erst testen wollten. */}
        <h1 className="text-lg font-semibold text-arcos-navy mb-2">
          {testEndetAm ? "Testphase gestartet 🎉" : "Zahlung erfolgreich 🎉"}
        </h1>
        <p className="text-sm text-gray-600 mb-4">
          {begruessung ? `Willkommen bei ArcoTime, ${begruessung}!` : "Willkommen bei ArcoTime!"}
        </p>
        <p className="text-sm text-gray-500 mb-6">
          {firmenname ? `Die Organisation ${firmenname} ist eingerichtet. ` : ""}
          Du erhältst in Kürze eine E-Mail{email ? ` an ${email}` : ""} mit einem Link,
          über den du dein Passwort festlegst und direkt losstarten kannst.
        </p>
        {testEndetAm && (
          <p className="text-sm text-gray-500 mb-6">
            Deine Testphase läuft bis zum <strong>{testEndetAm}</strong>. Erst danach
            wird das hinterlegte Zahlungsmittel belastet – vorher kannst du jederzeit
            kündigen.
          </p>
        )}
        <Link href="/login" className="text-sm text-arcos-steel hover:underline">
          Zur Anmeldeseite
        </Link>
      </div>
    </div>
  );
}
