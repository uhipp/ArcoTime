import Link from "next/link";
import {
  speichereStandort,
  loescheStandort,
  speichereBeteiligten,
  loescheBeteiligten,
} from "@/app/actions/standorte";
import { DeleteButton } from "@/components/delete-button";
import { KundenKontakt } from "@/components/kunden-kontakt";
import { OptionalesDatumFeld } from "@/components/optionales-datum-feld";
import type { Beteiligter, BeteiligtenRolle, Standort } from "@/lib/types";

// Die Standorte eines Kunden (0076/0077) – Liste links, Detail rechts, wie
// docs/masken-leitlinie.md es für Nebenobjekte vorsieht.
//
// Warum es diese Ebene gibt: Eine Verwaltung hat vierzig Liegenschaften mit
// vierzig Adressen, vierzig Anfahrten und je eigenem Hauswart. Bis 0076 gab
// es dafür nur die Adresse des Kunden – der Monteur bekam die Adresse der
// Verwaltung aufs Rapport-PDF und stand vor dem falschen Haus.
//
// Der Kunde selbst steht NICHT als Spalte am Standort, sondern als
// Beteiligtenzeile mit der Rolle „Kunde“. Das ist der Grund, warum
// derselbe Ort dem Eigentümer y und der Verwaltung x gehören kann, ohne
// zweimal erfasst zu werden.

export type PartnerOption = {
  id: string;
  name: string;
  vorname: string | null;
  ort: string | null;
};

const feld =
  "w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-arcos-steel";
const beschriftung = "block text-xs text-gray-500 mb-1";

function partnerName(p: { name: string; vorname?: string | null; ort?: string | null }) {
  const name = [p.vorname, p.name].filter(Boolean).join(" ");
  return p.ort ? `${name}, ${p.ort}` : name;
}

/** Ein Standort in der Liste – zwei Zeilen, damit der Ort ohne Klick lesbar ist. */
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
          aktiv
            ? "border-arcos-steel bg-arcos-steel/10"
            : "border-transparent hover:bg-gray-50"
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
              inaktiv
            </span>
          )}
        </span>
        <span className="block text-xs text-gray-400 truncate">{ort || "ohne Ort"}</span>
      </Link>
    </li>
  );
}

/** Adress- und Zugangsangaben eines Standorts. */
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

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className={beschriftung}>Adresszusatz</label>
          <input
            name="adresse_zusatz"
            defaultValue={standort?.adresse_zusatz ?? ""}
            placeholder="Hintereingang, 3. Stock"
            className={feld}
          />
        </div>
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
        <div>
          <label className={beschriftung}>Anfahrt km</label>
          {/* Die Anfahrt gehört zum Ort, nicht zum Kunden (0077). Leer
              bleibt leer – eine 0 wäre die Aussage „null Kilometer“. */}
          <input
            name="anreise_km"
            type="number"
            step="0.1"
            min="0"
            defaultValue={standort?.anreise_km ?? ""}
            className={feld}
          />
        </div>
      </div>

      <div>
        <label className={beschriftung}>Zugang</label>
        <input
          name="zugang"
          defaultValue={standort?.zugang ?? ""}
          placeholder="Schlüsselkasten Code 1234, Hauswart Meier 079…"
          className={feld}
        />
      </div>

      <div>
        <label className={beschriftung}>Notizen</label>
        <textarea
          name="notizen"
          rows={2}
          defaultValue={standort?.notizen ?? ""}
          className={feld}
        />
      </div>

      <div className="flex flex-wrap items-center gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="ist_standard"
            defaultChecked={standort ? standort.ist_standard : anzahl === 0}
            className="rounded border-gray-300"
          />
          <span>Standardstandort</span>
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

      {/* Jeder Knopf nennt sein Objekt – auf einer Maske mit mehreren
          Blöcken sagt ein nacktes „Speichern“ nicht, was gespeichert wird. */}
      <div className="flex items-center gap-2 pt-1">
        <button
          type="submit"
          className="rounded bg-arcos-steel text-white text-sm font-medium px-4 py-2 hover:bg-arcos-navy"
        >
          Standort speichern
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

/** Wer sonst noch an diesem Ort beteiligt ist: Eigentümer, Architekt, Amt. */
function Beteiligte({
  kundeId,
  standortId,
  beteiligte,
  rollen,
  partner,
  istAdmin,
}: {
  kundeId: string;
  standortId: string;
  beteiligte: Beteiligter[];
  rollen: BeteiligtenRolle[];
  partner: PartnerOption[];
  istAdmin: boolean;
}) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-gray-500 mb-2">Beteiligte an diesem Standort</h4>

      {beteiligte.length === 0 ? (
        <p className="text-xs text-gray-400 mb-2">
          Noch niemand erfasst. Eigentümer, Verwaltung, Architekt oder Hauswart kommen
          unten dazu – jede Adresse einmal, nicht bei jedem Standort neu.
        </p>
      ) : (
        <ul className="divide-y border rounded bg-white mb-3">
          {beteiligte.map((b) => (
            <li key={b.id} className="flex flex-wrap items-baseline gap-2 px-3 py-2 text-sm">
              <span className="text-xs text-gray-500 w-28 shrink-0">
                {b.beteiligten_rollen?.bezeichnung ?? "Rolle"}
              </span>
              <span>
                {b.kunden ? (
                  <Link
                    href={`/kunden/${b.kunden.id}`}
                    className="text-arcos-steel hover:underline"
                  >
                    {partnerName(b.kunden)}
                  </Link>
                ) : (
                  "–"
                )}
              </span>
              {/* Ein Rollenwechsel braucht ein Datum: Wer bis gestern
                  Eigentümer war, war es für die Rapporte von damals
                  trotzdem. */}
              {(b.gueltig_von || b.gueltig_bis) && (
                <span className="text-xs text-gray-400">
                  {b.gueltig_von ? `ab ${b.gueltig_von}` : ""}
                  {b.gueltig_bis ? ` bis ${b.gueltig_bis}` : ""}
                </span>
              )}
              {b.notiz && <span className="text-xs text-gray-400">({b.notiz})</span>}
              {istAdmin && (
                <span className="ml-auto">
                  <DeleteButton
                    action={loescheBeteiligten.bind(null, kundeId, b.id, standortId)}
                    label="entfernen"
                    confirmText="Beteiligung entfernen? Die Adresse selbst bleibt bestehen."
                  />
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      <form
        action={speichereBeteiligten.bind(null, kundeId)}
        className="flex flex-wrap items-end gap-2"
      >
        <input type="hidden" name="standort_id" value={standortId} />
        <div>
          <label className={beschriftung}>Rolle</label>
          <select name="rolle_id" required id="neuer_beteiligter" className={feld}>
            <option value="">wählen…</option>
            {rollen.map((r) => (
              <option key={r.id} value={r.id}>
                {r.bezeichnung}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-56">
          <label className={beschriftung}>Adresse</label>
          <select name="partner_id" required className={feld}>
            <option value="">wählen…</option>
            {partner.map((p) => (
              <option key={p.id} value={p.id}>
                {partnerName(p)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={beschriftung}>ab</label>
          <OptionalesDatumFeld name="gueltig_von" />
        </div>
        <div>
          <label className={beschriftung}>bis</label>
          <OptionalesDatumFeld name="gueltig_bis" />
        </div>
        <button
          type="submit"
          className="rounded border border-gray-300 text-sm px-3 py-1.5 hover:bg-gray-50"
        >
          Beteiligung speichern
        </button>
      </form>
      <p className="text-xs text-gray-400 mt-2">
        Fehlt eine Adresse in der Auswahl, wird sie unter{" "}
        <Link href="/kunden/neu" className="text-arcos-steel hover:underline">
          Neue Adresse
        </Link>{" "}
        einmal erfasst – ohne Häkchen „ist Kunde“, wenn sie nur beteiligt ist.
      </p>
    </div>
  );
}

export function KundenStandorte({
  kundeId,
  standorte,
  gewaehlt,
  beteiligte,
  rollen,
  partner,
  istAdmin,
}: {
  kundeId: string;
  standorte: Standort[];
  gewaehlt: Standort | null;
  beteiligte: Beteiligter[];
  rollen: BeteiligtenRolle[];
  partner: PartnerOption[];
  istAdmin: boolean;
}) {
  return (
    <div className="flex h-full min-h-0">
      {/* Liste der Orte */}
      <div className="w-56 shrink-0 border-r flex flex-col min-h-0">
        <div className="px-3 py-2 border-b flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-gray-500">
            {standorte.length} {standorte.length === 1 ? "Standort" : "Standorte"}
          </span>
          <Link
            href={`/kunden/${kundeId}?reiter=standorte&standort=neu`}
            className="text-xs text-arcos-steel hover:underline"
          >
            + Neuer Standort
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
              Noch kein Standort erfasst – „+ Neuer Standort“ legt einen an.
            </li>
          )}
        </ul>
      </div>

      {/* Detail des gewählten Orts */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        <div className="max-w-2xl space-y-6">
          <div>
            <div className="flex items-start justify-between gap-3 mb-3">
              <h3 className="font-medium">
                {gewaehlt ? gewaehlt.bezeichnung : "Neuer Standort"}
              </h3>
              {gewaehlt && istAdmin && (
                <DeleteButton
                  action={loescheStandort.bind(null, kundeId, gewaehlt.id)}
                  label="Standort löschen"
                  confirmText={`Standort „${gewaehlt.bezeichnung}“ löschen? Das geht nur, solange kein Auftrag daran hängt.`}
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

          {gewaehlt && (
            <Beteiligte
              kundeId={kundeId}
              standortId={gewaehlt.id}
              beteiligte={beteiligte}
              rollen={rollen}
              partner={partner}
              istAdmin={istAdmin}
            />
          )}
        </div>
      </div>
    </div>
  );
}
