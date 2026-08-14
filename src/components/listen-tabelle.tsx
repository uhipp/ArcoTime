import { SortierKopf } from "@/components/sortier-kopf";
import type { Spalte } from "@/lib/listen-spalten";

// Eine Liste aus einem Spaltenkatalog.
//
// Alle fünf Listen der Anwendung sahen gleich aus und waren fünfmal von
// Hand geschrieben – Kopfzeile, Zellen und Sortierwerte je an einer
// anderen Stelle. Mit der Spaltenauswahl kam dazu, dass die Zahl der
// Spalten nicht mehr fest ist: colSpan der Leerzeile und die Zuordnung
// Kopf/Zelle müssten dann von Hand mitwandern.
export function ListenTabelle<T extends { id: string }>({
  spalten,
  zeilen,
  basis,
  params,
  leerText,
  fussTitel,
  zeilenKlasse,
}: {
  spalten: Spalte<T>[];
  zeilen: T[];
  // Pfad der Seite, für die Sortier-Links.
  basis: string;
  params: Record<string, string | undefined>;
  leerText: string;
  // Beschriftung der Fusszeile, z.B. "Summe". Steht in der ersten Spalte;
  // die Werte liefern die Spalten selbst über fuss().
  fussTitel?: string;
  zeilenKlasse?: (z: T) => string;
}) {
  const mitFuss = fussTitel && zeilen.length > 0 && spalten.some((s) => s.fuss);

  return (
    <div className="bg-white rounded-lg border overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-left text-gray-500">
          <tr>
            {spalten.map((s) =>
              s.wert ? (
                <SortierKopf key={s.key} spalte={s.key} basis={basis} params={params}>
                  {s.titel}
                </SortierKopf>
              ) : (
                <th key={s.key} className="px-4 py-2 font-medium">
                  {s.titel}
                </th>
              )
            )}
          </tr>
        </thead>
        <tbody className="divide-y">
          {zeilen.map((z) => (
            <tr key={z.id} className={zeilenKlasse?.(z) ?? "hover:bg-gray-50"}>
              {spalten.map((s) => (
                <td key={s.key} className={s.klasse ?? "px-4 py-2"}>
                  {s.zelle(z)}
                </td>
              ))}
            </tr>
          ))}
          {zeilen.length === 0 && (
            <tr>
              <td colSpan={spalten.length} className="px-4 py-6 text-center text-gray-400">
                {leerText}
              </td>
            </tr>
          )}
        </tbody>
        {mitFuss && (
          <tfoot>
            <tr className="border-t bg-gray-50 font-medium">
              {spalten.map((s, i) => (
                <td key={s.key} className={s.klasse ?? "px-4 py-2"}>
                  {i === 0 ? fussTitel : s.fuss?.(zeilen)}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
