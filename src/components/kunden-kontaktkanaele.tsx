import { speichereKontakt, loescheKontakt } from "@/app/actions/kunden";
import { DeleteButton } from "@/components/delete-button";

// Kontaktkanäle (0074) – geteilt zwischen zwei Stellen der Kundenmaske:
//
//   Reiter „Adresse"            die Kanäle des BETRIEBS (die Zentrale)
//   Reiter „Ansprechpersonen"   die Kanäle je PERSON
//
// Die Trennung kam aus einer Rückmeldung vom 22.08.2026: Der Block „Betrieb"
// stand im Reiter Ansprechpersonen, obwohl er die Adresse des Kunden
// betrifft und keine Person. „Wenn das so ist, dann gehört es nicht in das
// Register Ansprechpersonen." – richtig.
//
// Serverkomponenten ohne eigenen Zustand: Jede Zeile ist ein Formular, das
// seine Server Action ruft. Mehr HTML, aber es funktioniert ohne Javascript
// und hält nichts doppelt.

export type KontaktArt = {
  id: string;
  bezeichnung: string;
  art: "text" | "email" | "telefon";
};

export type KontaktZeile = {
  id: string;
  wert: string;
  bemerkung: string | null;
  art_id: string;
  kunde_id: string | null;
  ansprechperson_id: string | null;
};

// Eine Mailadresse gehört anklickbar, eine Nummer auch – auf dem Handy ist
// das der Unterschied zwischen „Kontakt sehen" und „Kunden anrufen".
export function KontaktWert({ art, wert }: { art: KontaktArt | undefined; wert: string }) {
  if (art?.art === "email") {
    return (
      <a href={`mailto:${wert}`} className="text-arcos-steel hover:underline">
        {wert}
      </a>
    );
  }
  if (art?.art === "telefon") {
    return (
      <a href={`tel:${wert.replace(/[^\d+]/g, "")}`} className="text-arcos-steel hover:underline">
        {wert}
      </a>
    );
  }
  return <span>{wert}</span>;
}

export function KontaktListe({
  kundeId,
  kontakte,
  arten,
  istAdmin,
}: {
  kundeId: string;
  kontakte: KontaktZeile[];
  arten: KontaktArt[];
  istAdmin: boolean;
}) {
  if (kontakte.length === 0) {
    return <p className="text-xs text-gray-400">Keine Kontaktangaben.</p>;
  }
  const artVon = new Map(arten.map((a) => [a.id, a]));
  return (
    <ul className="space-y-1">
      {kontakte.map((k) => (
        <li key={k.id} className="flex items-baseline gap-2 text-sm">
          <span className="text-xs text-gray-500 w-20 shrink-0">
            {artVon.get(k.art_id)?.bezeichnung ?? "Kontakt"}
          </span>
          <span className="flex-1 min-w-0 flex flex-wrap items-baseline gap-2">
            <KontaktWert art={artVon.get(k.art_id)} wert={k.wert} />
            {k.bemerkung && <span className="text-xs text-gray-400">({k.bemerkung})</span>}
          </span>
          {/* Rechtsbündig und untereinander, wie „Kunde löschen" in der
              Bereichsleiste. Vorher stand das rote „entfernen" direkt hinter
              dem Wert und damit auf jeder Zeile an einer anderen Stelle – auf
              einer Maske mit zwölf Zeilen sieht das nach Alarm aus. */}
          {istAdmin && (
            <span className="shrink-0">
              <DeleteButton
                action={loescheKontakt.bind(
                  null,
                  kundeId,
                  k.id,
                  k.ansprechperson_id ? "personen" : "adresse"
                )}
                label="entfernen"
                confirmText={`Kontakt „${k.wert}“ entfernen?`}
              />
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

export function KontaktFormular({
  kundeId,
  arten,
  ansprechpersonId,
  fokusId,
}: {
  kundeId: string;
  arten: KontaktArt[];
  ansprechpersonId?: string;
  fokusId?: string;
}) {
  return (
    <form
      action={speichereKontakt.bind(null, kundeId)}
      className="flex flex-wrap items-end gap-2 mt-2"
    >
      {ansprechpersonId && (
        <input type="hidden" name="ansprechperson_id" value={ansprechpersonId} />
      )}
      <select
        name="art_id"
        required
        defaultValue=""
        className="rounded border border-gray-300 px-2 py-1.5 text-sm"
      >
        <option value="" disabled>
          Art…
        </option>
        {arten.map((a) => (
          <option key={a.id} value={a.id}>
            {a.bezeichnung}
          </option>
        ))}
      </select>
      <input
        id={fokusId}
        name="wert"
        required
        placeholder="Nummer oder Adresse"
        className="flex-1 min-w-[10rem] rounded border border-gray-300 px-2 py-1.5 text-sm"
      />
      <input
        name="bemerkung"
        placeholder="Bemerkung"
        className="w-32 rounded border border-gray-300 px-2 py-1.5 text-sm"
      />
      {/* „+ Kontakt" hiess es bis zum 22.08.2026, und der Nutzer hat den
          Finger auf die Stelle gelegt: „er hat ja in der Zeile bereits Daten
          eingegeben und will die jetzt speichern – ,+irgendwas' heisst für
          mich, es kommt ein neuer Datensatz." */}
      <button type="submit" className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50">
        Kontakt speichern
      </button>
    </form>
  );
}

/**
 * Die Kontaktkanäle des Betriebs – auf dem Reiter „Adresse", weil sie zur
 * Adresse des Kunden gehören und zu keiner Person.
 */
export function KundenBetriebKontakt({
  kundeId,
  kontakte,
  arten,
  istAdmin,
}: {
  kundeId: string;
  kontakte: KontaktZeile[];
  arten: KontaktArt[];
  istAdmin: boolean;
}) {
  return (
    <section className="rounded-lg border bg-white p-4">
      <h2 className="text-sm font-medium mb-1">Weitere Kontaktangaben des Betriebs</h2>
      <p className="text-xs text-gray-500 mb-3">
        Die Zentrale – Angaben, die dem Kunden als Ganzem gehören: Direktwahl, Mobil,
        WhatsApp, eine zweite Mailadresse. E-Mail und Telefon oben im Adressblock stehen
        auch hier; sie sind beim Umstellen auf die Kanäle kopiert und nicht verschoben
        worden.
      </p>
      <KontaktListe
        kundeId={kundeId}
        kontakte={kontakte}
        arten={arten}
        istAdmin={istAdmin}
      />
      <KontaktFormular kundeId={kundeId} arten={arten} fokusId="neuer_kontakt" />
    </section>
  );
}
