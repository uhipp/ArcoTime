"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type ArtikelEintrag = {
  slug: string;
  titel: string;
  kategorie: string;
  vorschau: string;
  korpus: string;
};

export function HilfeSuche({ artikel }: { artikel: ArtikelEintrag[] }) {
  const [suchbegriff, setSuchbegriff] = useState("");

  const treffer = useMemo(() => {
    const begriff = suchbegriff.trim().toLowerCase();
    if (!begriff) return artikel;
    return artikel.filter((a) => a.korpus.includes(begriff));
  }, [artikel, suchbegriff]);

  const kategorien = useMemo(() => {
    const gruppen = new Map<string, ArtikelEintrag[]>();
    for (const a of treffer) {
      const liste = gruppen.get(a.kategorie) ?? [];
      liste.push(a);
      gruppen.set(a.kategorie, liste);
    }
    return [...gruppen.entries()];
  }, [treffer]);

  return (
    <div>
      <input
        type="search"
        value={suchbegriff}
        onChange={(e) => setSuchbegriff(e.target.value)}
        placeholder="Stichwort suchen, z.B. „Belegnummer“ oder „Timer“…"
        autoFocus
        className="w-full rounded border border-gray-300 px-4 py-2.5 text-sm mb-6 focus:outline-none focus:ring-2 focus:ring-arcos-steel"
      />

      {kategorien.length === 0 && (
        <p className="text-sm text-gray-400">Keine Treffer für „{suchbegriff}“.</p>
      )}

      <div className="space-y-8">
        {kategorien.map(([kategorie, liste]) => (
          <div key={kategorie}>
            <h2 className="text-sm font-semibold text-arcos-steel uppercase tracking-wide mb-3">
              {kategorie}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {liste.map((a) => (
                <Link
                  key={a.slug}
                  href={`/hilfe/${a.slug}`}
                  className="block bg-white rounded-lg border p-4 hover:shadow hover:border-arcos-steel/40"
                >
                  <div className="font-medium text-arcos-navy mb-1">{a.titel}</div>
                  <div className="text-sm text-gray-500">{a.vorschau}</div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
