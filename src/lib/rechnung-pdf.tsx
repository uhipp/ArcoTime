import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { FIRMA } from "@/content/recht";
import type { RechnungsDaten } from "@/lib/rechnung-daten";

// Rechnung der Arcos Group an eine Kundin.
//
// Aufbau bewusst nach demselben Muster wie der Arbeitsrapport (0026 ff.):
// gleiche Masse, gleiche Kopfzone, gleiche Farben. Die Kundin soll die
// beiden Dokumente als Geschwister erkennen – und der Kopf ist am echten
// Ausdruck ausgemessen, passt also ins Fensterkuvert.
//
// Der Absender ist hier IMMER die Arcos Group, nicht die Organisation:
// Rechnungssteller ist der Anbieter, nicht der Mandant. Deshalb kommen
// die Angaben aus FIRMA und nicht aus den Absendereinstellungen.

const CM = 28.35;

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
  kopf: { height: 7 * CM, position: "relative" },
  absender: { position: "absolute", top: 0, right: 0, width: 7 * CM, alignItems: "flex-end" },
  logo: { width: 4.5 * CM, objectFit: "contain", marginBottom: 8 },
  absenderName: { fontFamily: "Helvetica-Bold", color: "#1D3557", textAlign: "right" },
  absenderZeile: { color: "#555555", fontSize: 9, textAlign: "right" },
  anschrift: { position: "absolute", top: 3.5 * CM, left: 0, width: 8 * CM },
  absenderzeileKlein: { fontSize: 7, textDecoration: "underline", marginBottom: 4, color: "#333333" },
  empfaengerName: { fontFamily: "Helvetica-Bold" },

  titel: { marginBottom: 20 },
  titelText: { fontSize: 18, fontFamily: "Helvetica-Bold", color: "#1D3557" },

  // Kopfangaben als zweispaltige Liste: links die Beschriftung, rechts
  // der Wert. Kein Raster – bei vier Zeilen wäre das übertrieben.
  angaben: { marginBottom: 24 },
  angabenZeile: { flexDirection: "row", marginBottom: 2 },
  angabenBezeichnung: { width: 4 * CM, color: "#666666" },

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
    paddingVertical: 6,
  },
  spalteLeistung: { width: "52%", paddingRight: 6 },
  spalteMenge: { width: "12%", textAlign: "right" },
  spaltePreis: { width: "18%", textAlign: "right" },
  spalteBetrag: { width: "18%", textAlign: "right" },

  summen: { marginTop: 10, alignItems: "flex-end" },
  summenZeile: { flexDirection: "row", width: 8 * CM, justifyContent: "space-between", paddingVertical: 2 },
  summenTotal: {
    flexDirection: "row",
    width: 8 * CM,
    justifyContent: "space-between",
    borderTopWidth: 1.5,
    borderTopColor: "#1D3557",
    paddingTop: 5,
    marginTop: 4,
    fontFamily: "Helvetica-Bold",
  },

  hinweis: { marginTop: 28, fontSize: 9, color: "#333333" },
  fuss: {
    position: "absolute",
    bottom: 1 * CM,
    left: 2.5 * CM,
    right: 2 * CM,
    borderTopWidth: 0.5,
    borderTopColor: "#DDDDDD",
    paddingTop: 6,
    fontSize: 7.5,
    color: "#666666",
    textAlign: "center",
  },
});

// Eigene Datumsformatierung statt formatDatumCH: Auf einem Beleg gehören
// führende Nullen hin (17.08.2026, nicht 17.8.2026). Die Anwendung zeigt
// Daten sonst bewusst kurz an – das hier ist ein Dokument, kein Bildschirm.
function datumCH(wert: string) {
  const d = new Date(wert);
  const zwei = (n: number) => String(n).padStart(2, "0");
  return `${zwei(d.getDate())}.${zwei(d.getMonth() + 1)}.${d.getFullYear()}`;
}

function betrag(wert: number, waehrung: string) {
  return `${waehrung} ${wert.toFixed(2)}`;
}

export function RechnungPdf({ daten }: { daten: RechnungsDaten }) {
  const { nummer, ausgestelltAm, bezahltAm, empfaenger, position, summen, reverseCharge, logoAdresse } =
    daten;

  return (
    <Document title={`Rechnung ${nummer}`} author={FIRMA.name}>
      <Page size="A4" style={stil.seite}>
        <View style={stil.kopf}>
          <View style={stil.absender}>
            {logoAdresse && (
              // eslint-disable-next-line jsx-a11y/alt-text
              <Image src={logoAdresse} style={stil.logo} />
            )}
            <Text style={stil.absenderName}>{FIRMA.name}</Text>
            <Text style={stil.absenderZeile}>{FIRMA.strasse}</Text>
            <Text style={stil.absenderZeile}>{FIRMA.plzOrt}</Text>
            <Text style={stil.absenderZeile}>{FIRMA.supportEmail}</Text>
            <Text style={stil.absenderZeile}>arcotime.ch</Text>
          </View>

          <View style={stil.anschrift}>
            <Text style={stil.absenderzeileKlein}>
              {FIRMA.name} · {FIRMA.strasse} · {FIRMA.plzOrt}
            </Text>
            <Text style={stil.empfaengerName}>{empfaenger.name}</Text>
            {empfaenger.strasse && <Text>{empfaenger.strasse}</Text>}
            {(empfaenger.plz || empfaenger.ort) && (
              <Text>{[empfaenger.plz, empfaenger.ort].filter(Boolean).join(" ")}</Text>
            )}
            {empfaenger.land && empfaenger.land !== "CH" && <Text>{empfaenger.landName}</Text>}
          </View>
        </View>

        <View style={stil.titel}>
          <Text style={stil.titelText}>Rechnung {nummer}</Text>
        </View>

        <View style={stil.angaben}>
          <View style={stil.angabenZeile}>
            <Text style={stil.angabenBezeichnung}>Rechnungsdatum</Text>
            <Text>{datumCH(ausgestelltAm)}</Text>
          </View>
          {bezahltAm && (
            <View style={stil.angabenZeile}>
              <Text style={stil.angabenBezeichnung}>Bezahlt am</Text>
              <Text>{datumCH(bezahltAm)}</Text>
            </View>
          )}
          <View style={stil.angabenZeile}>
            <Text style={stil.angabenBezeichnung}>MWST-Nr. Arcos</Text>
            <Text>{FIRMA.mwstNummer}</Text>
          </View>
          {empfaenger.steuernummer && (
            <View style={stil.angabenZeile}>
              <Text style={stil.angabenBezeichnung}>MWST-Nr. Kunde</Text>
              <Text>{empfaenger.steuernummer}</Text>
            </View>
          )}
        </View>

        <View style={stil.tabellenKopf}>
          <Text style={stil.spalteLeistung}>Leistung</Text>
          <Text style={stil.spalteMenge}>Benutzer</Text>
          <Text style={stil.spaltePreis}>Einzelpreis</Text>
          <Text style={stil.spalteBetrag}>Betrag</Text>
        </View>

        <View style={stil.zeile}>
          <View style={stil.spalteLeistung}>
            <Text>{position.bezeichnung}</Text>
            {position.zeitraum && (
              <Text style={{ fontSize: 9, color: "#666666", marginTop: 2 }}>{position.zeitraum}</Text>
            )}
          </View>
          <Text style={stil.spalteMenge}>{position.menge}</Text>
          <Text style={stil.spaltePreis}>{betrag(position.einzelpreis, summen.waehrung)}</Text>
          <Text style={stil.spalteBetrag}>{betrag(summen.netto, summen.waehrung)}</Text>
        </View>

        <View style={stil.summen}>
          <View style={stil.summenZeile}>
            <Text>Total netto</Text>
            <Text>{betrag(summen.netto, summen.waehrung)}</Text>
          </View>
          <View style={stil.summenZeile}>
            <Text>
              {reverseCharge
                ? "MWST (Steuerschuld beim Empfänger)"
                : `MWST ${summen.mwstSatz.toFixed(1).replace(".", ",")} %`}
            </Text>
            <Text>{betrag(summen.mwstBetrag, summen.waehrung)}</Text>
          </View>
          <View style={stil.summenTotal}>
            <Text>Total</Text>
            <Text>{betrag(summen.brutto, summen.waehrung)}</Text>
          </View>
        </View>

        <View style={stil.hinweis}>
          {reverseCharge ? (
            <Text>
              Steuerschuldnerschaft des Leistungsempfängers (Reverse Charge). Der Leistungsort
              liegt am Sitz des Empfängers; die Umsatzsteuer ist von diesem selbst zu deklarieren.
            </Text>
          ) : (
            <Text>Der Betrag wurde über den Zahlungsdienstleister Stripe belastet.</Text>
          )}
          <Text style={{ marginTop: 6 }}>
            Diese Rechnung wurde maschinell erstellt und ist ohne Unterschrift gültig.
          </Text>
        </View>

        <Text style={stil.fuss} fixed>
          {FIRMA.name} · {FIRMA.strasse} · {FIRMA.plzOrt} · {FIRMA.mwstNummer} ·{" "}
          {FIRMA.supportEmail}
        </Text>
      </Page>
    </Document>
  );
}
