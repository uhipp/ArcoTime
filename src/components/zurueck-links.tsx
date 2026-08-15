import Link from "next/link";

// Rückwege am Kopf einer Detailseite.
//
// Wer einen Datensatz von irgendwoher öffnet, will danach dorthin
// zurück. Ohne Rückweg bleibt nur der Browser-Knopf – und der ist auf
// dem Telefon je nach Ansicht gar nicht sichtbar.
//
// Woher jemand kam, steht in der Adresse (?von=…) und nicht im
// Referrer: Die Seiten werden auf dem Server gerendert, und ein
// Lesezeichen oder ein weitergegebener Link soll denselben Rückweg
// zeigen wie der Klick, aus dem er entstanden ist.
export function ZurueckLinks({
  links,
}: {
  links: { href: string; text: string }[];
}) {
  if (links.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
      {links.map((l) => (
        <Link
          key={l.href + l.text}
          href={l.href}
          className="text-sm text-arcos-steel hover:underline whitespace-nowrap"
        >
          ← {l.text}
        </Link>
      ))}
    </div>
  );
}
