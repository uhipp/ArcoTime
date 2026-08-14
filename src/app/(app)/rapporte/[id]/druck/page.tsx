import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganisation } from "@/lib/get-profile";
import { formatDatumCH } from "@/lib/date-utils";
import { mengeLabel } from "@/lib/menge";
import { HilfeDruckenButton } from "@/components/hilfe-drucken-button";
import { rapportNummer, type Rapport, type ZeiteintragMitDetails } from "@/lib/types";

type Adresse = {
  name: string;
  vorname: string | null;
  adresse_zusatz: string | null;
  strasse: string | null;
  hausnummer: string | null;
  postfach: string | null;
  plz: string | null;
  ort: string | null;
};

// Druckansicht eines Rapports – die Fassung, die der Kunde bekommt.
//
// Bewusst OHNE Preise. Der Rapport ist ein Leistungsnachweis, keine
// Rechnung: Vor Ort unterschreibt in aller Regel jemand ohne
// Zahlungskompetenz, und eine Unterschrift unter einen Betrag hätte dort
// eine Verbindlichkeit suggeriert, die sie nicht hat. Verrechnet wird
// über den Export.
//
// Diese Seite ist zugleich die Vorlage für das spätere PDF. Was hier
// steht, steht dann auch dort – deshalb hier zuerst, damit sich das
// Layout ansehen lässt, bevor eine Bibliothek dafür ins Projekt kommt.
export default async function RapportDruckPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [organisation, { data: rapportRoh }, { data: positionenRoh }] = await Promise.all([
    getCurrentOrganisation(),
    supabase
      .from("rapporte")
      .select(
        "*, kunden(name, vorname, adresse_zusatz, strasse, hausnummer, postfach, plz, ort), projekte(bezeichnung, kostenstelle), profiles!rapporte_mitarbeiter_id_fkey(name)"
      )
      .eq("id", id)
      .single(),
    supabase
      .from("v_zeiteintraege")
      .select("*")
      .eq("rapport_id", id)
      .order("start_zeit", { ascending: true, nullsFirst: false }),
  ]);

  if (!rapportRoh) notFound();

  const rapport = rapportRoh as Rapport;
  const positionen = (positionenRoh as ZeiteintragMitDetails[] | null) ?? [];

  // Der Rapport-Typ kennt beim Kunden nur die Felder, die die Detailseite
  // braucht. Hier wird die volle Adresse geladen, deshalb eigens getypt.
  const kunde = (rapportRoh as { kunden?: Adresse | null }).kunden ?? null;

  const strasse = [kunde?.strasse, kunde?.hausnummer].filter(Boolean).join(" ");

  // Nur Arbeitszeit summieren – Mengenartikel wie Kilometer oder Material
  // haben keine Dauer und dürfen die Stundensumme nicht aufblähen.
  const summeStunden = positionen.reduce((s, z) => s + Number(z.menge_stunden ?? 0), 0);

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6 print:hidden">
        <Link href={`/rapporte/${id}`} className="text-sm text-arcos-steel hover:underline">
          ← Zurück zum Rapport
        </Link>
        <HilfeDruckenButton label="Rapport drucken" />
      </div>

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-arcos-navy">Arbeitsrapport</h1>
          <p className="text-sm text-gray-500 mt-1">
            {rapportNummer(rapport)} · {formatDatumCH(rapport.datum)}
          </p>
        </div>
        {organisation?.name && (
          <p className="text-sm font-medium text-arcos-navy text-right">{organisation.name}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-8 mb-8 text-sm">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Kunde</p>
          <p className="font-medium">
            {kunde?.vorname ? `${kunde.vorname} ` : ""}
            {kunde?.name}
          </p>
          {kunde?.adresse_zusatz && <p>{kunde.adresse_zusatz}</p>}
          {strasse && <p>{strasse}</p>}
          {(kunde?.plz || kunde?.ort) && (
            <p>
              {kunde?.plz} {kunde?.ort}
            </p>
          )}
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Einsatz</p>
          {rapport.projekte?.bezeichnung && <p>{rapport.projekte.bezeichnung}</p>}
          {rapport.profiles?.name && <p>Ausgeführt von {rapport.profiles.name}</p>}
        </div>
      </div>

      {rapport.bemerkung && (
        <div className="mb-8 text-sm">
          <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Bemerkung</p>
          <p className="whitespace-pre-line">{rapport.bemerkung}</p>
        </div>
      )}

      <table className="w-full text-sm mb-8">
        <thead>
          <tr className="border-b-2 border-arcos-navy text-left">
            <th className="py-2 pr-3">Leistung</th>
            <th className="py-2 pr-3">Beschreibung</th>
            <th className="py-2 text-right whitespace-nowrap">Menge</th>
          </tr>
        </thead>
        <tbody>
          {positionen.map((z) => (
            <tr key={z.id} className="border-b align-top">
              <td className="py-2 pr-3 whitespace-nowrap">{z.dienstleistung_bezeichnung}</td>
              <td className="py-2 pr-3 whitespace-pre-line">{z.beschreibung ?? ""}</td>
              <td className="py-2 text-right whitespace-nowrap">{mengeLabel(z)}</td>
            </tr>
          ))}
          {positionen.length === 0 && (
            <tr>
              <td colSpan={3} className="py-4 text-gray-400">
                Keine Positionen erfasst.
              </td>
            </tr>
          )}
        </tbody>
        {summeStunden > 0 && (
          <tfoot>
            <tr className="font-medium">
              <td className="py-2" colSpan={2}>
                Total Arbeitszeit
              </td>
              <td className="py-2 text-right whitespace-nowrap">
                {summeStunden.toFixed(2)} h
              </td>
            </tr>
          </tfoot>
        )}
      </table>

      {/* Unterschrift oder Vermerk. Die Linie bleibt auch dann stehen,
          wenn noch nicht unterschrieben ist – so lässt sich der Rapport
          ausdrucken und von Hand unterschreiben. */}
      <div className="mt-12 break-inside-avoid">
        <p className="text-xs uppercase tracking-wide text-gray-400 mb-2">
          Bestätigung des Kunden
        </p>

        {rapport.unterschrift_png ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={rapport.unterschrift_png}
              alt={`Unterschrift von ${rapport.unterzeichner_name ?? "Kunde"}`}
              className="max-h-24"
            />
            <div className="border-t border-gray-400 w-64 mt-1 pt-1 text-sm">
              {rapport.unterzeichner_name}
              {rapport.signiert_am
                ? ` · ${new Date(rapport.signiert_am).toLocaleDateString("de-CH")}`
                : ""}
            </div>
          </>
        ) : rapport.abschluss_vermerk ? (
          <p className="text-sm text-gray-600">
            Ohne Unterschrift abgeschlossen. Vermerk: {rapport.abschluss_vermerk}
          </p>
        ) : (
          <div className="border-t border-gray-400 w-64 mt-16 pt-1 text-xs text-gray-500">
            Datum und Unterschrift
          </div>
        )}
      </div>
    </div>
  );
}
