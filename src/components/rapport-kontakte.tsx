import type { DokumentKontakt } from "@/lib/rapport-dokument-daten";

// Wer bei diesem Einsatz erreichbar ist – Ansprechperson beim Kunden,
// Eigentümer, Hauswart, Architekt.
//
// Das ist der Punkt der ganzen Ortsebene. Aus dem Gespräch vom 22.08.2026:
// „Eigentlich benötigen sie lediglich den Rapport mit allen Informationen."
// Bis dahin standen die Menschen in der Datenbank und nicht auf dem Blatt –
// und wer vor verschlossener Tür steht, ruft an.
//
// Nummer und Mailadresse sind anklickbar: Auf dem Handy ist das der
// Unterschied zwischen „Kontakt sehen" und „anrufen".
export function RapportKontakte({ kontakte }: { kontakte: DokumentKontakt[] }) {
  if (kontakte.length === 0) return null;

  return (
    <section className="bg-white rounded-lg border p-4">
      <h2 className="text-sm font-semibold text-gray-500 mb-2">Erreichbar vor Ort</h2>
      <ul className="space-y-1.5">
        {kontakte.map((k, i) => (
          <li key={i} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
            <span className="text-xs text-gray-500 w-28 shrink-0">{k.rolle}</span>
            <span className="font-medium">{k.name}</span>
            {k.zusatz && <span className="text-xs text-gray-400">{k.zusatz}</span>}
            {k.telefon && (
              <a
                href={`tel:${k.telefon.replace(/[^\d+]/g, "")}`}
                className="text-arcos-steel hover:underline"
              >
                {k.telefon}
              </a>
            )}
            {k.email && (
              <a href={`mailto:${k.email}`} className="text-arcos-steel hover:underline">
                {k.email}
              </a>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
