import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { renderHilfeMarkdown } from "@/lib/hilfe";
import { RECHTS_DOKUMENTE, rechtsDokument } from "@/content/recht";

/**
 * Gemeinsame Darstellung der vier Rechtsseiten. Die Texte selbst stehen in
 * src/content/recht – eine Quelle, aus der auch die Fassung für die
 * anwaltliche Prüfung erzeugt wird.
 */
export function RechtsSeite({ slug }: { slug: string }) {
  const dokument = rechtsDokument(slug);
  if (!dokument) notFound();

  const html = renderHilfeMarkdown(dokument.markdown);

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="flex flex-col items-center mb-8">
          <Image
            src="/arcotime-logo.png"
            alt="ArcoTime"
            width={286}
            height={197}
            className="h-14 w-auto"
            priority
          />
        </Link>

        <div className="bg-white rounded-lg border p-6 sm:p-10">
          <h1 className="text-2xl font-semibold text-arcos-navy mb-1">{dokument.titel}</h1>
          <p className="text-xs text-gray-400 mb-8">
            Fassung {dokument.version} · Stand {dokument.stand}
          </p>

          <div
            className="text-sm text-gray-700 leading-relaxed
              [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-arcos-navy [&_h2]:mt-8 [&_h2]:mb-3
              [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-arcos-navy [&_h3]:mt-6 [&_h3]:mb-2
              [&_p]:mb-4 [&_ul]:mb-4 [&_ul]:pl-5 [&_ul]:list-disc [&_ul_li]:mb-1.5
              [&_ol]:mb-4 [&_ol]:pl-5 [&_ol]:list-decimal [&_ol_li]:mb-1.5
              [&_strong]:text-gray-900 [&_strong]:font-semibold
              [&_a]:text-arcos-steel [&_a]:hover:underline
              [&_table]:w-full [&_table]:mb-4 [&_table]:text-xs
              [&_th]:text-left [&_th]:font-semibold [&_th]:text-gray-900 [&_th]:border-b [&_th]:py-1.5 [&_th]:pr-3
              [&_td]:align-top [&_td]:border-b [&_td]:border-gray-100 [&_td]:py-1.5 [&_td]:pr-3
              [&_code]:bg-gray-100 [&_code]:rounded [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>

        <nav className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs text-gray-500 mt-8">
          {RECHTS_DOKUMENTE.map((d) => (
            <Link
              key={d.slug}
              href={`/${d.slug}`}
              className={
                d.slug === slug ? "text-arcos-navy font-medium" : "hover:text-arcos-steel"
              }
            >
              {d.titel}
            </Link>
          ))}
          <Link href="/login" className="hover:text-arcos-steel">
            Anmelden
          </Link>
        </nav>
      </div>
    </div>
  );
}
