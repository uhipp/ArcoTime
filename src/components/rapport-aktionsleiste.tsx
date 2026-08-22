import { navigationsZiele } from "@/components/kunden-kontakt";

// Die drei Handlungen, die unterwegs zählen, in Daumenreichweite.
//
// Aus der Masken-Leitlinie, Abschnitt 6: „Die wichtigste Aktion (anrufen,
// navigieren, Timer) gehört nach unten." Oben rechts ist auf einem Telefon
// die am schlechtesten erreichbare Ecke, und genau dort lagen diese Knöpfe.
//
// Nur auf dem Telefon: Am Arbeitsplatz steht dieselbe Karte oben, wo sie
// beim Planen hingehört. Die Ziele kommen aus derselben Funktion – zwei
// Stellen, die eine Adresse verschieden zusammenbauen, wären zwei
// verschiedene Ziele.
//
// Der Timer fehlt hier bewusst: Er hängt an einer POSITION, nicht am
// Rapport. Ein Knopf, der nicht sagen kann, welche Zeit er startet, wäre
// eine Falle statt einer Abkürzung.
export function RapportAktionsleiste({
  ziel,
}: {
  ziel: Parameters<typeof navigationsZiele>[0];
}) {
  const ziele = navigationsZiele(ziel);
  if (!ziele) return null;

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-20 border-t bg-white/95 backdrop-blur px-3 py-2 flex gap-2 print:hidden">
      {ziele.google && (
        <a
          href={ziele.google}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 inline-flex min-h-[48px] items-center justify-center gap-2 rounded bg-arcos-steel px-4 text-base font-medium text-white"
        >
          <span aria-hidden>➤</span>
          Navigation
        </a>
      )}
      {ziele.telefon && (
        <a
          href={`tel:${ziele.telefon.replace(/\s+/g, "")}`}
          className="flex-1 inline-flex min-h-[48px] items-center justify-center gap-2 rounded border border-arcos-steel px-4 text-base font-medium text-arcos-steel"
        >
          <span aria-hidden>☎</span>
          Anrufen
        </a>
      )}
    </div>
  );
}
