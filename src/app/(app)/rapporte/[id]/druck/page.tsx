import Link from "next/link";
import { notFound } from "next/navigation";
import { ladeRapportDokument } from "@/lib/rapport-dokument-daten";
import { formatDatumCH } from "@/lib/date-utils";
import { mengeLabel } from "@/lib/menge";
import { HilfeDruckenButton } from "@/components/hilfe-drucken-button";
import { rapportNummer } from "@/lib/types";

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
  const daten = await ladeRapportDokument(id);
  if (!daten) notFound();

  const { rapport, positionen, kunde, absender, summeStunden } = daten;
  const strasse = [kunde?.strasse, kunde?.hausnummer].filter(Boolean).join(" ");

  return (
    // Zusätzlicher linker Rand im Druck: Der Standardrand des Browsers
    // ist knapp, und ein gelochtes Blatt verliert links weitere Millimeter.
    <div className="max-w-2xl print:pl-[0.5cm]">
      <div className="flex items-center justify-between mb-6 print:hidden">
        <Link href={`/rapporte/${id}`} className="text-sm text-arcos-steel hover:underline">
          ← Zurück zum Rapport
        </Link>
        <div className="flex items-center gap-3">
          <a
            href={`/rapporte/${id}/pdf`}
            target="_blank"
            rel="noopener"
            className="text-sm text-arcos-steel hover:underline"
          >
            Als PDF öffnen
          </a>
          <HilfeDruckenButton label="Rapport drucken" />
        </div>
      </div>

      {/* Kopfbereich mit FESTER Höhe. Der Absender steht darin absolut
          positioniert – sonst schiebt jede zusätzliche Zeile im Absender
          die Empfängeranschrift nach unten, und die muss für das
          Fensterkuvert immer an derselben Stelle stehen. Genau das ist
          passiert, als die Adresse der Organisation dazukam.
          
          Die beiden Masse sind am Kuvert ausgemessen und die einzigen
          Stellschrauben für die Lage von Anschrift und Titel:
          
            top-[3.5cm]  Oberkante der Anschrift
            h-[7cm]      Höhe des Kopfbereichs – bestimmt zugleich, wo der
                         Titel beginnt (Höhe plus der Abstand mb-6)
          
          Wer die Anschrift verschiebt, verschiebt nur die erste Zahl; wer
          den Titel verschiebt, nur die zweite. */}
      <div className="relative h-[7cm] mb-6">
        {/* Absender: Logo und Anschrift der eigenen Organisation. Das
            Dokument bleibt beim Kunden – ohne Absender ist es wertlos.
            Gepflegt wird das unter Einstellungen (0042). */}
        <div className="absolute right-0 top-0 text-right text-sm">
          {absender.logoAdresse && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={absender.logoAdresse}
              alt={absender.name ?? "Logo"}
              className="max-h-16 ml-auto mb-2"
            />
          )}
          {absender.name && (
            <p className="font-medium text-arcos-navy">{absender.name}</p>
          )}
          {absender.strasse && <p className="text-gray-600">{absender.strasse}</p>}
          {(absender.plz || absender.ort) && (
            <p className="text-gray-600">
              {absender.plz} {absender.ort}
            </p>
          )}
          {absender.telefon && <p className="text-gray-600">{absender.telefon}</p>}
          {absender.email && <p className="text-gray-600">{absender.email}</p>}
          {absender.webseite && <p className="text-gray-600">{absender.webseite}</p>}
        </div>

        {/* Empfängerblock an fester Höhe. Darüber die Absenderzeile in
            7 Punkt und unterstrichen – die Zeile, die im Fensterkuvert
            über der Anschrift steht. */}
        <div className="absolute left-0 top-[3.5cm] text-sm">
          {absender.zeile && (
            <p className="text-[7pt] underline mb-1 text-gray-700">{absender.zeile}</p>
          )}
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
      </div>

      <div className="text-center mb-8">
        <h1 className="text-2xl font-semibold text-arcos-navy">Arbeitsrapport</h1>
        <p className="text-sm text-gray-500 mt-1">
          {rapportNummer(rapport)} · {formatDatumCH(rapport.datum)}
        </p>
      </div>

      <div className="mb-8 text-sm">
        <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Projekt</p>
        {rapport.projekte?.bezeichnung && <p>{rapport.projekte.bezeichnung}</p>}
        {rapport.profiles?.name && <p>Ausgeführt von {rapport.profiles.name}</p>}
      </div>

      {rapport.bemerkung && (
        <div className="mb-8 text-sm">
          <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Bemerkung</p>
          <p className="whitespace-pre-line">{rapport.bemerkung}</p>
        </div>
      )}

      <table className="w-full text-sm mb-2">
        <thead>
          <tr className="border-b-2 border-arcos-navy text-left">
            <th className="py-2 pr-3">Leistung</th>
            <th className="py-2 pr-3">Beschreibung</th>
            <th className="py-2 text-right whitespace-nowrap">Menge</th>
          </tr>
        </thead>
        <tbody>
          {positionen.map((z) => (
            <tr key={z.id} className="border-b align-top break-inside-avoid">
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
      </table>

      {/* Das Total steht bewusst NEBEN der Tabelle und nicht in einem
          tfoot: Browser wiederholen Kopf- und Fussgruppen einer Tabelle
          auf jeder Druckseite, und dann steht die Summe zweimal da – auf
          der ersten Seite sogar mitten im Dokument. */}
      {summeStunden > 0 && (
        <div className="flex justify-between text-sm font-medium border-t-2 border-arcos-navy pt-2 mb-8 break-inside-avoid">
          <span>Total Arbeitszeit</span>
          <span>{summeStunden.toFixed(2)} h</span>
        </div>
      )}

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
