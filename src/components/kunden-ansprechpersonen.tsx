import {
  speichereAnsprechperson,
  loescheAnsprechperson,
  speichereKontakt,
  loescheKontakt,
} from "@/app/actions/kunden";
import { DeleteButton } from "@/components/delete-button";

// Ansprechpersonen und Kontaktkanäle eines Kunden (0074).
//
// Sobald ein Kunde grösser ist, gibt es dort mehrere Personen, die für den
// Betrieb wichtig sind: die Sachbearbeiterin der Verwaltung, der Hauswart,
// die Filialleitung – mit eigener Nummer und eigener Mailadresse. Bis 0074
// standen sie in einer Notiz, und beim Rapport wurde der Name jedes Mal neu
// getippt.
//
// Bewusst eine Serverkomponente ohne eigenen Zustand: Jede Zeile ist ein
// Formular, das seine Server Action ruft. Das ist mehr HTML, aber es
// funktioniert ohne Javascript, hält nichts doppelt und braucht keine
// Synchronisation zwischen Browser und Datenbank.

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

export type AnsprechpersonZeile = {
  id: string;
  anrede: string | null;
  vorname: string | null;
  name: string;
  funktion: string | null;
  notiz: string | null;
  ist_standard: boolean;
  aktiv: boolean;
};

// Eine Mailadresse gehört anklickbar, eine Nummer auch – auf dem Handy ist
// das der Unterschied zwischen "Kontakt sehen" und "Kunden anrufen".
function KontaktWert({ art, wert }: { art: KontaktArt | undefined; wert: string }) {
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

function KontaktListe({
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
        <li key={k.id} className="flex flex-wrap items-baseline gap-2 text-sm">
          <span className="text-xs text-gray-500 w-20 shrink-0">
            {artVon.get(k.art_id)?.bezeichnung ?? "Kontakt"}
          </span>
          <KontaktWert art={artVon.get(k.art_id)} wert={k.wert} />
          {k.bemerkung && <span className="text-xs text-gray-400">({k.bemerkung})</span>}
          {istAdmin && (
            <DeleteButton
              action={loescheKontakt.bind(null, kundeId, k.id)}
              label="entfernen"
              confirmText={`Kontakt „${k.wert}“ entfernen?`}
            />
          )}
        </li>
      ))}
    </ul>
  );
}

function KontaktFormular({
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
      <button type="submit" className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50">
        + Kontakt
      </button>
    </form>
  );
}

export function KundenAnsprechpersonen({
  kundeId,
  personen,
  kontakte,
  arten,
  istAdmin,
}: {
  kundeId: string;
  personen: AnsprechpersonZeile[];
  kontakte: KontaktZeile[];
  arten: KontaktArt[];
  istAdmin: boolean;
}) {
  const kontakteDesKunden = kontakte.filter((k) => k.kunde_id === kundeId);
  const kontakteDerPerson = (personId: string) =>
    kontakte.filter((k) => k.ansprechperson_id === personId);

  return (
    <div>
      <h2 className="text-lg font-medium mb-1">Ansprechpersonen und Kontakt</h2>
      <p className="text-sm text-gray-500 mb-4">
        Wer beim Kunden zuständig ist – mit eigener Nummer und eigener Adresse.
        Die Angaben ohne Person gehören dem Betrieb als Ganzem (die Zentrale).
      </p>

      {/* Kontakt des Betriebs selbst */}
      <div className="rounded-lg border bg-white p-4 mb-4">
        <h3 className="text-sm font-medium mb-2">Betrieb</h3>
        <KontaktListe
          kundeId={kundeId}
          kontakte={kontakteDesKunden}
          arten={arten}
          istAdmin={istAdmin}
        />
        <KontaktFormular kundeId={kundeId} arten={arten} fokusId="neuer_kontakt" />
      </div>

      {/* Personen */}
      {personen.map((p) => (
        <div
          key={p.id}
          className={`rounded-lg border bg-white p-4 mb-3 ${p.aktiv ? "" : "opacity-60"}`}
        >
          <form action={speichereAnsprechperson.bind(null, kundeId)} className="space-y-2">
            <input type="hidden" name="id" value={p.id} />
            <div className="flex flex-wrap items-end gap-2">
              <input
                name="anrede"
                defaultValue={p.anrede ?? ""}
                placeholder="Anrede"
                className="w-20 rounded border border-gray-300 px-2 py-1.5 text-sm"
              />
              <input
                name="vorname"
                defaultValue={p.vorname ?? ""}
                placeholder="Vorname"
                className="w-32 rounded border border-gray-300 px-2 py-1.5 text-sm"
              />
              <input
                name="name"
                required
                defaultValue={p.name}
                placeholder="Name"
                className="w-40 rounded border border-gray-300 px-2 py-1.5 text-sm"
              />
              <input
                name="funktion"
                defaultValue={p.funktion ?? ""}
                placeholder="Funktion"
                className="flex-1 min-w-[8rem] rounded border border-gray-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <input
                name="notiz"
                defaultValue={p.notiz ?? ""}
                placeholder="Notiz"
                className="flex-1 min-w-[10rem] rounded border border-gray-300 px-2 py-1.5 text-sm"
              />
              <label className="flex items-center gap-1.5 text-xs text-gray-600">
                <input type="checkbox" name="ist_standard" defaultChecked={p.ist_standard} />
                Standard
              </label>
              <label className="flex items-center gap-1.5 text-xs text-gray-600">
                <input
                  type="checkbox"
                  name="aktiv"
                  value="on"
                  defaultChecked={p.aktiv}
                />
                aktiv
              </label>
              <button
                type="submit"
                className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50"
              >
                Person speichern
              </button>
              {istAdmin && (
                <DeleteButton
                  action={loescheAnsprechperson.bind(null, kundeId, p.id)}
                  label="Person entfernen"
                  confirmText={`„${p.vorname ? `${p.vorname} ` : ""}${p.name}" entfernen? Die Kontaktangaben dieser Person gehen mit.`}
                />
              )}
            </div>
          </form>

          <div className="mt-3 pt-3 border-t">
            <KontaktListe
              kundeId={kundeId}
              kontakte={kontakteDerPerson(p.id)}
              arten={arten}
              istAdmin={istAdmin}
            />
            <KontaktFormular kundeId={kundeId} arten={arten} ansprechpersonId={p.id} />
          </div>
        </div>
      ))}

      {/* Neue Person */}
      <form
        action={speichereAnsprechperson.bind(null, kundeId)}
        className="rounded-lg border border-dashed bg-white p-4 flex flex-wrap items-end gap-2"
      >
        <input
          name="anrede"
          placeholder="Anrede"
          className="w-20 rounded border border-gray-300 px-2 py-1.5 text-sm"
        />
        <input
          name="vorname"
          placeholder="Vorname"
          className="w-32 rounded border border-gray-300 px-2 py-1.5 text-sm"
        />
        <input
          id="neue_ansprechperson"
          name="name"
          required
          placeholder="Name"
          className="w-40 rounded border border-gray-300 px-2 py-1.5 text-sm"
        />
        <input
          name="funktion"
          placeholder="Funktion"
          className="flex-1 min-w-[8rem] rounded border border-gray-300 px-2 py-1.5 text-sm"
        />
        <button
          type="submit"
          className="rounded bg-arcos-steel text-white text-sm font-medium px-4 py-1.5 hover:bg-arcos-navy"
        >
          + Person
        </button>
        <p className="basis-full text-xs text-gray-500">
          Kontaktangaben lassen sich hinzufügen, sobald die Person erfasst ist.
        </p>
      </form>
    </div>
  );
}
