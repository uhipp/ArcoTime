import Link from "next/link";
import { alleHilfeArtikel, hilfeSuchkorpus, hilfeVorschau } from "@/lib/hilfe";
import { HilfeSuche } from "@/components/hilfe-suche";

export default function HilfePage() {
  const artikel = alleHilfeArtikel().map((a) => ({
    slug: a.slug,
    titel: a.titel,
    kategorie: a.kategorie,
    vorschau: hilfeVorschau(a.inhalt),
    korpus: hilfeSuchkorpus(a),
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-semibold">Hilfe</h1>
        <Link href="/hilfe/drucken" className="text-sm text-arcos-steel hover:underline">
          Komplette Anleitung drucken
        </Link>
      </div>
      <HilfeSuche artikel={artikel} />
    </div>
  );
}
