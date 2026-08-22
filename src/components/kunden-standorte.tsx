import Link from "next/link";
import { speichereStandort, loescheStandort } from "@/app/actions/standorte";
import { DeleteButton } from "@/components/delete-button";
import { KundenKontakt } from "@/components/kunden-kontakt";
import type { Standort } from "@/lib/types";

// Die Adressen eines Kunden (0079) – Liste links, Detail rechts, wie
// docs/masken-leitlinie.md es für Nebenobjekte vorsieht.
//
// Der Standort ist eine POSTADRESSE und nichts weiter. Das ist die
// Entscheidung vom 22.08.2026, und sie hält diese Maske klein: sieben Felder,
// ein Häkchen für die vorgeschlagene Adresse, eines für die Stilllegung.
//
// Alles, was ein Einsatz braucht – Anfahrt, Zugang, die zusätzlichen Adressen
// wie Architekt oder Hauswart –, steht am AUFTRAG. Nur so kann ein Betrieb
// ohne Standorte genau dasselbe wie einer mit: Die Ortsebene gibt ihm zwei
// Dinge und nicht mehr, mehrere Adressen je Kunde und Auswertungen je Adresse.
//
// 0076 hatte hier einen Block „Beteiligte an diesem Standort". Er ist mit 0079
// an den Auftrag gezogen; wäre er hier geblieben, hätte der Rapport zwei
// Listen zusammenführen müssen und Variante B hätte gar keine gehabt.

const feld =
  "w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-arcos-steel";
const beschriftung = "block text-xs text-gray-500 mb-1";

/** Eine Adresse in der Liste – zwei Zeilen, damit der Ort ohne Klick lesbar ist. */
function StandortZeile({
  kundeId,
  standort,
  aktiv,
}: {
  kundeId: string;
  standort: Standort;
  aktiv: boolean;
}) {
  const ort = [standort.plz, standort.ort].filter(Boolean).join(" ");
  return (
    <li>
      <Link
        href={`/kunden/${kundeId}?reiter=standorte&standort=${standort.id}`}
        className={`block border-l-2 px-3 py-2 text-sm ${
          aktiv ? "border-arcos-steel bg-arcos-steel/10" : "border-transparent hover:bg-gray-50"
        }`}
      >
        <span className="flex items-center gap-1.5">
          <span className={`truncate ${aktiv ? "font-medium text-arcos-navy" : ""}`}>
            {standort.bezeichnung}
          </span>
          {standort.ist_standard && (
            <span
              title="Wird beim Anlegen eines Auftrags vorgeschlagen"
              className="shrink-0 rounded bg-gray-100 text-gray-500 text-[10px] px-1 py-0.5"
            >
              Standard
            </span>
          )}
          {!standort.aktiv && (
            <span className="shrink-0 rounded bg-amber-100 text-amber-800 text-[10px] px-1 py-0.5">
              stillgelegt
            </span>
          )}
        </span>
        <span className="block text-xs text-gray-400 truncate">{ort || "ohne Ort"}</span>
      </Link>
    </li>
  );
}

/** Die sieben Adressfelder, mehr nicht. */
function StandortFormular({
  kundeId,
  standort,
  anzahl,
}: {
  kundeId: string;
  standort?: Standort;
  anzahl: number;
}) {
  const neu = !standort;
  return (
    <form action={speichereStandort.bind(null, kundeId)} className="space-y-3">
      {standort && <input type="hidden" name="id" value={standort.id} />}

      <div>
        <label className={beschriftung}>Bezeichnung *</label>
        <input
          name="bezeichnung"
          required
          defaultValue={standort?.bezeichnung ?? ""}
          placeholder="Liegenschaft Bahnhofstrasse 12"
          id={neu ? "neuer_standort" : undefined}
          className={feld}
        />
      </div>

      <div>
        <label className={beschriftung}>Adresszusatz</label>
        <input
          name="adresse_zusatz"
          defaultValue={standort?.adresse_zusatz ?? ""}
          placeholder="Hintereingang, 3. Stock"
          className={feld}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={beschriftung}>Strasse</label>
          <input name="strasse" defaultValue={standort?.strasse ?? ""} className={feld} />
        </div>
        <div>
          <label className={beschriftung}>Nummer</label>
          <input name="hausnummer" defaultValue={standort?.hausnummer ?? ""} className={feld} />
        </div>
        <div>
          <label className={beschriftung}>PLZ</label>
          <input name="plz" defaultValue={standort?.plz ?? ""} className={feld} />
        </div>
        <div>
          <label className={beschriftung}>Ort</label>
          <input name="ort" defaultValue={standort?.ort ?? ""} className={feld} />
        </div>
        <div>
          <label className={beschriftung}>Land</label>
          <input name="land" defaultValue={standort?.land ?? "CH"} className={feld} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-sm pt-1">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="ist_standard"
            defaultChecked={standort ? standort.ist_standard : anzahl === 0}
            className="rounded border-gray-300"
          />
          <span>Wird beim Auftrag vorgeschlagen</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="aktiv"
            defaultChecked={standort ? standort.aktiv : true}
            className="rounded border-gray-300"
          />
          <span>aktiv</span>
        </label>
      </div>

      <p className="text-xs text-gray-400">
        Anfahrt, Zugang und die zusätzlichen Adressen (Eigentümer, Architekt,
        Hauswart) stehen am Auftrag – dort werden sie vom letzten Auftrag an
        dieser Adresse vorgeschlagen.
      </p>

      <div className="flex items-center gap-2 pt-1">
        <button
          type="submit"
          className="rounded bg-arcos-steel text-white text-sm font-medium px-4 py-2 hover:bg-arcos-navy"
        >
          Adresse speichern
        </button>
        <Link
          href={`/kunden/${kundeId}?reiter=standorte`}
          className="rounded border border-gray-300 text-sm px-3 py-2 hover:bg-gray-50"
        >
          Verwerfen
        </Link>
      </div>
    </form>
  );
}

export function KundenStandorte({
  kundeId,
  standorte,
  gewaehlt,
  istAdmin,
}: {
  kundeId: string;
  standorte: Standort[];
  gewaehlt: Standort | null;
  istAdmin: boolean;
}) {
  return (
    <div className="flex h-full min-h-0">
      <div className="w-56 shrink-0 border-r flex flex-col min-h-0">
        <div className="px-3 py-2 border-b flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-gray-500">
            {standorte.length} {standorte.length === 1 ? "Adresse" : "Adressen"}
          </span>
          <Link
            href={`/kunden/${kundeId}?reiter=standorte&standort=neu`}
            className="text-xs text-arcos-steel hover:underline"
          >
            + Neue Adresse
          </Link>
        </div>
        <ul className="flex-1 min-h-0 overflow-y-auto divide-y">
          {standorte.map((s) => (
            <StandortZeile
              key={s.id}
              kundeId={kundeId}
              standort={s}
              aktiv={gewaehlt?.id === s.id}
            />
          ))}
          {standorte.length === 0 && (
            <li className="px-3 py-4 text-xs text-gray-400">
              Noch keine Adresse erfasst – „+ Neue Adresse“ legt eine an.
            </li>
          )}
        </ul>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        <div className="max-w-2xl space-y-6">
          <div>
            <div className="flex items-start justify-between gap-3 mb-3">
              <h3 className="font-medium">
                {gewaehlt ? gewaehlt.bezeichnung : "Neue Adresse"}
              </h3>
              {gewaehlt && istAdmin && (
                <DeleteButton
                  action={loescheStandort.bind(null, kundeId, gewaehlt.id)}
                  label="Adresse löschen"
                  confirmText={`Adresse „${gewaehlt.bezeichnung}“ löschen? Das geht nur, solange kein Auftrag daran hängt.`}
                />
              )}
            </div>
            {gewaehlt && <KundenKontakt kunde={gewaehlt} />}
            <div className="mt-3">
              <StandortFormular
                kundeId={kundeId}
                standort={gewaehlt ?? undefined}
                anzahl={standorte.length}
              />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
