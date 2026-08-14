import Link from "next/link";

// Anklickbarer Spaltenkopf für sortierbare Tabellen.
//
// Verhalten wie überall sonst gewohnt: Erster Klick sortiert aufsteigend,
// ein zweiter Klick auf dieselbe Spalte dreht auf absteigend. Ein Klick
// auf eine andere Spalte beginnt wieder aufsteigend.
//
// Der Zustand steht in der Adresse (?sort=…&richtung=…) und nicht im
// Browser: Die Seite ist serverseitig gerendert, und so überlebt eine
// Sortierung das Neuladen, lässt sich als Lesezeichen ablegen und
// weitergeben. Bestehende Parameter – etwa ein Statusfilter – bleiben
// dabei erhalten.
export function SortierKopf({
  spalte,
  children,
  basis,
  params,
  className,
}: {
  // Schlüssel dieser Spalte, wie ihn die Seite beim Sortieren erwartet.
  spalte: string;
  children: React.ReactNode;
  // Pfad der Seite, z.B. "/rapporte".
  basis: string;
  // Alle aktuellen Parameter der Seite, damit Filter erhalten bleiben.
  params: Record<string, string | undefined>;
  className?: string;
}) {
  const aktiv = params.sort === spalte;
  const absteigend = aktiv && params.richtung === "ab";

  const ziel = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v && k !== "sort" && k !== "richtung") ziel.set(k, v);
  });
  ziel.set("sort", spalte);
  // Nur die aktive Spalte dreht um; eine neue beginnt aufsteigend.
  if (aktiv && !absteigend) ziel.set("richtung", "ab");

  return (
    <th className={className ?? "px-4 py-2"}>
      <Link
        href={`${basis}?${ziel.toString()}`}
        className="inline-flex items-center gap-1 hover:text-arcos-steel"
        // Ohne Vorlesehilfe wäre nur der Pfeil ein Hinweis auf die
        // aktuelle Richtung.
        aria-sort={aktiv ? (absteigend ? "descending" : "ascending") : "none"}
      >
        {children}
        <span className={aktiv ? "text-arcos-steel" : "text-gray-300"} aria-hidden>
          {aktiv ? (absteigend ? "▼" : "▲") : "↕"}
        </span>
      </Link>
    </th>
  );
}
