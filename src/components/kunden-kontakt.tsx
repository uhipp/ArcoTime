type Adresse = {
  name?: string | null;
  vorname?: string | null;
  strasse?: string | null;
  hausnummer?: string | null;
  plz?: string | null;
  ort?: string | null;
  land?: string | null;
  telefon?: string | null;
};

// Eine Adresse als Zeile, wie man sie in ein Navigationsgerät tippt.
export function adresseEinzeilig(k: Adresse): string {
  const strasse = [k.strasse, k.hausnummer].filter(Boolean).join(" ");
  const ort = [k.plz, k.ort].filter(Boolean).join(" ");
  // Das Land nur, wenn es nicht die Schweiz ist: "Bahnhofstrasse 12, 4123
  // Allschwil, CH" führt bei Schweizer Karten-Apps zu keinem besseren
  // Treffer, macht die Zeile aber länger.
  const land = k.land && k.land !== "CH" ? k.land : null;
  return [strasse, ort, land].filter(Boolean).join(", ");
}

// Navigation und Anruf zum Kunden – der Moment vor der Abfahrt.
//
// Bewusst nur Links und keine Programmschnittstelle: kein Schlüssel,
// keine laufenden Kosten, kein fremder Code auf der Seite. Die Adresse
// verlässt ArcoTime erst, wenn jemand tippt.
//
// Auf dem Telefon öffnet der erste Link die Google-Maps-App, sofern
// installiert, sonst den Browser; der zweite führt zu Apple Karten. Wird
// die Navigation dort gestartet, läuft sie auf CarPlay weiter – dafür
// braucht es hier nichts.
export function KundenKontakt({ kunde }: { kunde: Adresse | null | undefined }) {
  if (!kunde) return null;

  const adresse = adresseEinzeilig(kunde);
  const telefon = kunde.telefon?.trim();

  // Ohne Adresse kein Knopf: Ein Navigationslink, der auf "Musterfirma"
  // navigiert, führt irgendwohin.
  if (!adresse && !telefon) return null;

  const ziel = encodeURIComponent(adresse);

  return (
    <div className="rounded-lg border bg-white p-4">
      <p className="text-xs text-gray-500 mb-2">
        {adresse || "Keine Adresse hinterlegt"}
      </p>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {adresse && (
          <>
            {/* Ein grosser Knopf, nicht zwei: Im Auto zählt jede
                Berührung, und eine Auswahl zwischen zwei gleich grossen
                Zielen ist eine zu viel. */}
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${ziel}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded bg-arcos-steel px-5 py-2 text-base font-medium text-white hover:bg-arcos-navy"
            >
              <span aria-hidden>➤</span>
              Navigation
            </a>
            <a
              href={`https://maps.apple.com/?daddr=${ziel}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gray-500 hover:text-arcos-navy hover:underline"
            >
              Apple Karten
            </a>
          </>
        )}

        {telefon && (
          <a
            href={`tel:${telefon.replace(/\s+/g, "")}`}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded border border-arcos-steel px-5 py-2 text-base font-medium text-arcos-steel hover:bg-arcos-steel hover:text-white"
          >
            <span aria-hidden>☎</span>
            {telefon}
          </a>
        )}
      </div>
    </div>
  );
}
