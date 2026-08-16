import Link from "next/link";
import { RECHTS_DOKUMENTE } from "@/content/recht";

/**
 * Fussbereich für die öffentlichen Seiten (Anmeldung, Registrierung).
 * Impressum und Datenschutzerklärung müssen ohne Anmeldung erreichbar sein –
 * sonst nützen sie niemandem, der sich erst überlegt, ob er hier bucht.
 */
export function RechtsFussbereich({ className = "" }: { className?: string }) {
  return (
    <nav
      className={`flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-gray-400 ${className}`}
    >
      {RECHTS_DOKUMENTE.map((d) => (
        <Link key={d.slug} href={`/${d.slug}`} className="hover:text-arcos-steel">
          {d.titel}
        </Link>
      ))}
    </nav>
  );
}
