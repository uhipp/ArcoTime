"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { hilfeSlugFuerRoute } from "@/lib/hilfe";

// Kontextsensitives Hilfe-Icon: verlinkt je nach aktueller Seite direkt auf
// den passenden Hilfe-Artikel statt nur auf die allgemeine Übersicht.
// Braucht usePathname() (Client-Hook) – deshalb eine eigene kleine
// Client-Komponente statt Teil des (Server-)Layouts.
export function KontextHilfeLink() {
  const pathname = usePathname();
  const slug = hilfeSlugFuerRoute(pathname);
  const href = slug ? `/hilfe/${slug}` : "/hilfe";

  return (
    <Link
      href={href}
      title="Hilfe zu dieser Seite"
      className="hover:text-arcos-navy inline-flex items-center gap-1"
    >
      <span aria-hidden>❓</span> Hilfe
    </Link>
  );
}
