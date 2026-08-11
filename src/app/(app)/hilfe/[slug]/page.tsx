import Link from "next/link";
import { notFound } from "next/navigation";
import { hilfeArtikelNachSlug, renderHilfeMarkdown } from "@/lib/hilfe";
import { HilfeDruckenButton } from "@/components/hilfe-drucken-button";

// Der Inhalt kommt aus statisch importierten Markdown-Strings (siehe
// src/content/hilfe/) – kein weiteres Escaping nötig, dangerouslySetInnerHTML
// ist hier unbedenklich, da wir selbst der Autor des Inhalts sind.
export default async function HilfeArtikelPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const artikel = hilfeArtikelNachSlug(slug);
  if (!artikel) notFound();

  const html = renderHilfeMarkdown(artikel.inhalt);

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-1 print:hidden">
        <Link href="/hilfe" className="text-sm text-arcos-steel hover:underline">
          ← Zur Hilfe-Übersicht
        </Link>
        <HilfeDruckenButton />
      </div>
      <p className="text-xs text-gray-400 mb-4 print:hidden">{artikel.kategorie}</p>

      <h1 className="text-2xl font-semibold mb-6">{artikel.titel}</h1>

      <div
        className="text-sm text-gray-700 leading-relaxed
          [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-arcos-navy [&_h2]:mt-8 [&_h2]:mb-3
          [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-arcos-navy [&_h3]:mt-6 [&_h3]:mb-2
          [&_p]:mb-4 [&_ul]:mb-4 [&_ul]:pl-5 [&_ul]:list-disc [&_ul_li]:mb-1.5
          [&_ol]:mb-4 [&_ol]:pl-5 [&_ol]:list-decimal [&_ol_li]:mb-1.5
          [&_strong]:text-gray-900 [&_strong]:font-semibold
          [&_a]:text-arcos-steel [&_a]:hover:underline
          [&_img]:rounded [&_img]:border [&_img]:my-4 [&_img]:max-w-full
          [&_code]:bg-gray-100 [&_code]:rounded [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
