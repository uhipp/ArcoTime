import Link from "next/link";
import { alleHilfeArtikel, renderHilfeMarkdown } from "@/lib/hilfe";
import { HilfeDruckenButton } from "@/components/hilfe-drucken-button";

export default function HilfeDruckenPage() {
  const artikel = alleHilfeArtikel();

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6 print:hidden">
        <Link href="/hilfe" className="text-sm text-arcos-steel hover:underline">
          ← Zur Hilfe-Übersicht
        </Link>
        <HilfeDruckenButton label="Komplette Anleitung drucken" />
      </div>

      <h1 className="text-2xl font-semibold mb-1">ArcoTime – Benutzeranleitung</h1>
      <p className="text-sm text-gray-400 mb-10 print:mb-8">
        Vollständige Anleitung, {artikel.length} Themen
      </p>

      {artikel.map((a, i) => (
        <div key={a.slug} className={i > 0 ? "break-before-page" : ""}>
          <p className="text-xs text-gray-400 mb-1">{a.kategorie}</p>
          <h2 className="text-xl font-semibold text-arcos-navy mb-4">{a.titel}</h2>
          <div
            className="text-sm text-gray-700 leading-relaxed mb-10
              [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-arcos-navy [&_h2]:mt-6 [&_h2]:mb-3
              [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-arcos-navy [&_h3]:mt-5 [&_h3]:mb-2
              [&_p]:mb-4 [&_ul]:mb-4 [&_ul]:pl-5 [&_ul]:list-disc [&_ul_li]:mb-1.5
              [&_ol]:mb-4 [&_ol]:pl-5 [&_ol]:list-decimal [&_ol_li]:mb-1.5
              [&_strong]:text-gray-900 [&_strong]:font-semibold
              [&_a]:text-arcos-steel [&_a]:hover:underline
              [&_img]:rounded [&_img]:border [&_img]:my-4 [&_img]:max-w-full
              [&_code]:bg-gray-100 [&_code]:rounded [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs"
            dangerouslySetInnerHTML={{ __html: renderHilfeMarkdown(a.inhalt) }}
          />
        </div>
      ))}
    </div>
  );
}
