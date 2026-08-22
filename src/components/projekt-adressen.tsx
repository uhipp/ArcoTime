import Link from "next/link";
import {
  speichereProjektAdresse,
  loescheProjektAdresse,
} from "@/app/actions/projekt-adressen";
import { DeleteButton } from "@/components/delete-button";
import { OptionalesDatumFeld } from "@/components/optionales-datum-feld";
import type { AdressRolle, ProjektAdresse } from "@/lib/types";

// Die zusätzlichen Adressen an einem Auftrag (0079).
//
// Aus dem Gespräch mit den Handwerkern: „Der Maler muss auseinanderhalten
// können, welche Liegenschaft der Verwaltung x dem Eigentümer y gehört. Bei
// grösseren Bauvorhaben gibt es dann noch den Architekten, den
// Subunternehmer etc."
//
// Der Gewinn ist die einmalige Erfassung: Der Architekt steht genau einmal im
// Adressbuch und ist an zehn Aufträgen beteiligt. Zieht sein Büro um, wird
// eine Adresse geändert und es stimmt überall. Vorher hätte dieselbe Adresse
// zehnmal dagestanden – und beim Umzug wäre sie neunmal falsch geblieben.

export type AdressOption = {
  id: string;
  name: string;
  vorname: string | null;
  ort: string | null;
};

const feld =
  "w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-arcos-steel";
const beschriftung = "block text-xs text-gray-500 mb-1";

function adressName(p: { name: string; vorname?: string | null; ort?: string | null }) {
  const name = [p.vorname, p.name].filter(Boolean).join(" ");
  return p.ort ? `${name}, ${p.ort}` : name;
}

export function ProjektAdressen({
  projektId,
  adressen,
  rollen,
  auswahl,
  istAdmin,
}: {
  projektId: string;
  adressen: ProjektAdresse[];
  rollen: AdressRolle[];
  auswahl: AdressOption[];
  istAdmin: boolean;
}) {
  return (
    <div className="max-w-3xl">
      <h3 className="font-medium mb-1">Zusätzliche Adressen</h3>
      <p className="text-sm text-gray-500 mb-4">
        Wer sonst an diesem Auftrag beteiligt ist – Eigentümer, Verwaltung, Hauswart,
        Architekt, Bauleitung, Subunternehmer, Behörde. Jede Adresse steht einmal im
        Adressbuch; zieht sie um, stimmt es in allen Aufträgen.
      </p>

      {adressen.length === 0 ? (
        <p className="text-sm text-gray-400 mb-4">
          Noch niemand erfasst. Unten kommt die erste Adresse dazu – sie erscheint
          danach auch auf dem Arbeitsrapport, damit der Ausführende weiss, wen er vor
          Ort erreicht.
        </p>
      ) : (
        <ul className="divide-y border rounded bg-white mb-4">
          {adressen.map((a) => {
            const partner = a.kunden;
            return (
              <li key={a.id} className="flex items-baseline gap-2 px-3 py-2 text-sm">
                <span className="text-xs text-gray-500 w-28 shrink-0">
                  {a.adress_rollen?.bezeichnung ?? "Rolle"}
                </span>
                <span className="flex-1 min-w-0 flex flex-wrap items-baseline gap-2">
                  {partner ? (
                    <Link
                      href={`/kunden/${partner.id}`}
                      className="text-arcos-steel hover:underline"
                    >
                      {adressName(partner)}
                    </Link>
                  ) : (
                    "–"
                  )}
                  {/* Die Nummer gehört hierher und nicht in eine Notiz: Wer vor
                      verschlossener Tür steht, ruft an. */}
                  {partner?.telefon && (
                    <a
                      href={`tel:${partner.telefon.replace(/[^\d+]/g, "")}`}
                      className="text-arcos-steel hover:underline text-xs"
                    >
                      {partner.telefon}
                    </a>
                  )}
                  {partner?.email && (
                    <a
                      href={`mailto:${partner.email}`}
                      className="text-arcos-steel hover:underline text-xs"
                    >
                      {partner.email}
                    </a>
                  )}
                  {(a.gueltig_von || a.gueltig_bis) && (
                    <span className="text-xs text-gray-400">
                      {a.gueltig_von ? `ab ${a.gueltig_von}` : ""}
                      {a.gueltig_bis ? ` bis ${a.gueltig_bis}` : ""}
                    </span>
                  )}
                  {a.notiz && <span className="text-xs text-gray-400">({a.notiz})</span>}
                </span>
                {istAdmin && (
                  <span className="shrink-0">
                    <DeleteButton
                      action={loescheProjektAdresse.bind(null, projektId, a.id)}
                      label="entfernen"
                      leise
                      confirmText="Adresse von diesem Auftrag entfernen? Die Adresse selbst bleibt im Adressbuch."
                    />
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <form
        action={speichereProjektAdresse.bind(null, projektId)}
        className="flex flex-wrap items-end gap-2"
      >
        <div>
          <label className={beschriftung}>Rolle</label>
          <select name="rolle_id" required id="neue_projekt_adresse" className={feld}>
            <option value="">wählen…</option>
            {rollen.map((r) => (
              <option key={r.id} value={r.id}>
                {r.bezeichnung}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-64">
          <label className={beschriftung}>Adresse</label>
          <select name="partner_id" required className={feld}>
            <option value="">wählen…</option>
            {auswahl.map((p) => (
              <option key={p.id} value={p.id}>
                {adressName(p)}
              </option>
            ))}
          </select>
        </div>
        {/* Ein Rollenwechsel braucht ein Datum: Wer bis gestern Eigentümer
            war, war es für die Rapporte von damals trotzdem. */}
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
          Adresse speichern
        </button>
      </form>

      <p className="text-xs text-gray-400 mt-2">
        Fehlt eine Adresse in der Auswahl, wird sie unter{" "}
        <Link href="/kunden/neu" className="text-arcos-steel hover:underline">
          Neue Adresse
        </Link>{" "}
        einmal erfasst – ohne Häkchen „ist Kunde“, wenn kein Auftrag an sie geht.
      </p>
    </div>
  );
}
