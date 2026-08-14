import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { formatDatumCH } from "@/lib/date-utils";
import { mengeLabel } from "@/lib/menge";
import { rapportNummer } from "@/lib/types";
import type { RapportDokument } from "@/lib/rapport-dokument-daten";

// PDF-Fassung des Arbeitsrapports.
//
// Aufbau und Masse entsprechen der Druckansicht – sie wurde zuerst gebaut
// und am echten Ausdruck ausgemessen. Was hier steht, ist die Übertragung
// dieses geprüften Layouts, keine Neuerfindung.
//
// Bewusst ohne eigene Schriftart: Die eingebaute Helvetica deckt Umlaute
// ab, und eine mitgelieferte Schrift würde das PDF unnötig schwer machen
// und beim Bauen eine weitere Fehlerquelle eröffnen.
//
// Keine Preise – der Rapport ist ein Leistungsnachweis, keine Rechnung.

const CM = 28.35; // Punkte je Zentimeter, das Mass des PDF-Formats.

const stil = StyleSheet.create({
  seite: {
    paddingTop: 1.5 * CM,
    paddingBottom: 2 * CM,
    paddingLeft: 2.5 * CM,
    paddingRight: 2 * CM,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#0E0C19",
  },
  // Kopfbereich mit fester Höhe: Der Absender darf die Lage der Anschrift
  // nicht verschieben, sonst passt sie nicht mehr ins Fensterkuvert.
  kopf: { height: 7 * CM, position: "relative" },
  // Feste Breite ist hier Pflicht, nicht Geschmack: Ein Block ohne Breite
  // zieht sich in react-pdf über die ganze Zeile – der Absender legte
  // sich damit über die Anschrift. Rechtsbündig wird über alignItems
  // gesetzt und zusätzlich an jedem Text, weil textAlign vom Block nicht
  // zuverlässig auf die Kinder durchschlägt.
  absender: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 7 * CM,
    alignItems: "flex-end",
  },
  // Bilder brauchen eine ausdrückliche Breite. maxHeight steuert in
  // react-pdf nichts – ohne Breite füllt das Logo die ganze Zeile.
  logo: { width: 4 * CM, objectFit: "contain", marginBottom: 6 },
  absenderName: { fontFamily: "Helvetica-Bold", color: "#1D3557", textAlign: "right" },
  absenderZeile: { color: "#555555", fontSize: 9, textAlign: "right" },
  anschrift: { position: "absolute", top: 3.5 * CM, left: 0, width: 8 * CM },
  absenderzeileKlein: { fontSize: 7, textDecoration: "underline", marginBottom: 4, color: "#333333" },
  empfaengerName: { fontFamily: "Helvetica-Bold" },
  titel: { textAlign: "center", marginBottom: 20 },
  titelText: { fontSize: 18, fontFamily: "Helvetica-Bold", color: "#1D3557" },
  titelZusatz: { fontSize: 10, color: "#666666", marginTop: 3 },
  abschnitt: { marginBottom: 18 },
  beschriftung: {
    fontSize: 8,
    color: "#888888",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  tabellenKopf: {
    flexDirection: "row",
    borderBottomWidth: 1.5,
    borderBottomColor: "#1D3557",
    paddingBottom: 4,
    marginBottom: 2,
  },
  zeile: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#DDDDDD",
    paddingVertical: 4,
  },
  spalteLeistung: { width: "28%", paddingRight: 6 },
  spalteBeschreibung: { width: "56%", paddingRight: 6 },
  spalteMenge: { width: "16%", textAlign: "right" },
  total: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1.5,
    borderTopColor: "#1D3557",
    paddingTop: 5,
    marginTop: 2,
    marginBottom: 24,
    fontFamily: "Helvetica-Bold",
  },
  unterschriftBereich: { marginTop: 30 },
  // Ebenfalls mit fester Breite – siehe Logo.
  unterschriftBild: { width: 6 * CM, objectFit: "contain", marginBottom: 2 },
  linie: { borderTopWidth: 0.5, borderTopColor: "#888888", width: 200, paddingTop: 3 },
  klein: { fontSize: 8, color: "#666666" },
});

export function RapportPdf({ daten }: { daten: RapportDokument }) {
  const { rapport, positionen, kunde, absender, summeStunden } = daten;
  const kundenStrasse = [kunde?.strasse, kunde?.hausnummer].filter(Boolean).join(" ");

  return (
    <Document
      title={`Arbeitsrapport ${rapportNummer(rapport)}`}
      author={absender.name ?? undefined}
    >
      <Page size="A4" style={stil.seite}>
        <View style={stil.kopf}>
          <View style={stil.absender}>
            {absender.logoAdresse && (
              // eslint-disable-next-line jsx-a11y/alt-text -- Image stammt
              // aus @react-pdf/renderer und kennt kein alt; ein PDF hat
              // keine Vorlesehilfe, die es auswerten könnte.
              <Image src={absender.logoAdresse} style={stil.logo} />
            )}
            {absender.name && <Text style={stil.absenderName}>{absender.name}</Text>}
            {absender.strasse && <Text style={stil.absenderZeile}>{absender.strasse}</Text>}
            {(absender.plz || absender.ort) && (
              <Text style={stil.absenderZeile}>
                {[absender.plz, absender.ort].filter(Boolean).join(" ")}
              </Text>
            )}
            {absender.telefon && <Text style={stil.absenderZeile}>{absender.telefon}</Text>}
            {absender.email && <Text style={stil.absenderZeile}>{absender.email}</Text>}
            {absender.webseite && <Text style={stil.absenderZeile}>{absender.webseite}</Text>}
          </View>

          <View style={stil.anschrift}>
            {absender.zeile && <Text style={stil.absenderzeileKlein}>{absender.zeile}</Text>}
            <Text style={stil.empfaengerName}>
              {[kunde?.vorname, kunde?.name].filter(Boolean).join(" ")}
            </Text>
            {kunde?.adresse_zusatz && <Text>{kunde.adresse_zusatz}</Text>}
            {kundenStrasse !== "" && <Text>{kundenStrasse}</Text>}
            {(kunde?.plz || kunde?.ort) && (
              <Text>{[kunde?.plz, kunde?.ort].filter(Boolean).join(" ")}</Text>
            )}
          </View>
        </View>

        <View style={stil.titel}>
          <Text style={stil.titelText}>Arbeitsrapport</Text>
          <Text style={stil.titelZusatz}>
            {rapportNummer(rapport)} · {formatDatumCH(rapport.datum)}
          </Text>
        </View>

        <View style={stil.abschnitt}>
          <Text style={stil.beschriftung}>Projekt</Text>
          {rapport.projekte?.bezeichnung && <Text>{rapport.projekte.bezeichnung}</Text>}
          {rapport.profiles?.name && <Text>Ausgeführt von {rapport.profiles.name}</Text>}
        </View>

        {rapport.bemerkung && (
          <View style={stil.abschnitt}>
            <Text style={stil.beschriftung}>Bemerkung</Text>
            <Text>{rapport.bemerkung}</Text>
          </View>
        )}

        {/* fixed sorgt dafür, dass die Kopfzeile der Tabelle auf jeder
            Folgeseite wiederholt wird – anders als beim Drucken im
            Browser ist das hier ausdrücklich gewollt und betrifft nur den
            Kopf, nicht das Total. */}
        <View style={stil.tabellenKopf} fixed>
          <Text style={stil.spalteLeistung}>Leistung</Text>
          <Text style={stil.spalteBeschreibung}>Beschreibung</Text>
          <Text style={stil.spalteMenge}>Menge</Text>
        </View>

        {positionen.map((z) => (
          // wrap={false}: Eine Position mit mehrzeiliger Beschreibung wird
          // nicht über zwei Seiten zerrissen.
          <View key={z.id} style={stil.zeile} wrap={false}>
            <Text style={stil.spalteLeistung}>{z.dienstleistung_bezeichnung}</Text>
            <Text style={stil.spalteBeschreibung}>{z.beschreibung ?? ""}</Text>
            <Text style={stil.spalteMenge}>{mengeLabel(z)}</Text>
          </View>
        ))}

        {positionen.length === 0 && (
          <Text style={{ ...stil.klein, marginTop: 8 }}>Keine Positionen erfasst.</Text>
        )}

        {summeStunden > 0 && (
          <View style={stil.total} wrap={false}>
            <Text>Total Arbeitszeit</Text>
            <Text>{summeStunden.toFixed(2)} h</Text>
          </View>
        )}

        <View style={stil.unterschriftBereich} wrap={false}>
          <Text style={stil.beschriftung}>Bestätigung des Kunden</Text>

          {rapport.unterschrift_png ? (
            <>
              {/* eslint-disable-next-line jsx-a11y/alt-text -- siehe oben */}
              <Image src={rapport.unterschrift_png} style={stil.unterschriftBild} />
              <Text style={stil.linie}>
                {[
                  rapport.unterzeichner_name,
                  rapport.signiert_am
                    ? new Date(rapport.signiert_am).toLocaleDateString("de-CH")
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </Text>
            </>
          ) : rapport.abschluss_vermerk ? (
            <Text style={stil.klein}>
              Ohne Unterschrift abgeschlossen. Vermerk: {rapport.abschluss_vermerk}
            </Text>
          ) : (
            <View style={{ marginTop: 45 }}>
              <Text style={{ ...stil.linie, ...stil.klein }}>Datum und Unterschrift</Text>
            </View>
          )}
        </View>
      </Page>
    </Document>
  );
}
