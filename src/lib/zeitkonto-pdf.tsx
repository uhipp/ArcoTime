import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { Jahresauswertung } from "@/lib/zeitkonto";

const MONATE = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
];

// react-pdf rechnet in Punkten: 1 cm = 28,35 pt. Dieselbe Konstante wie
// beim Arbeitsrapport – dort steht auch die Erklärung, warum Blöcke ohne
// ausdrückliche Breite über die ganze Seite laufen.
const CM = 28.35;

const stil = StyleSheet.create({
  seite: { paddingTop: 1.5 * CM, paddingBottom: 1.5 * CM, paddingHorizontal: 1.5 * CM, fontSize: 9 },
  titel: { fontSize: 16, marginBottom: 2 },
  untertitel: { fontSize: 9, color: "#555", marginBottom: 12 },
  kopfzeile: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#333", paddingBottom: 3, marginBottom: 3 },
  zeile: { flexDirection: "row", paddingVertical: 2.5, borderBottomWidth: 0.5, borderBottomColor: "#ddd" },
  summenzeile: { flexDirection: "row", paddingVertical: 4, borderTopWidth: 1, borderTopColor: "#333", marginTop: 2 },
  zellLinks: { textAlign: "left" },
  zellRechts: { textAlign: "right" },
  fett: { fontWeight: "bold" },
  kasten: { flexDirection: "row", gap: 12, marginBottom: 14 },
  kachel: { borderWidth: 0.5, borderColor: "#ccc", padding: 8, width: 5.5 * CM },
  kachelWert: { fontSize: 14, marginTop: 2 },
  klein: { fontSize: 7, color: "#666" },
  fuss: { marginTop: 16, fontSize: 7, color: "#666" },
  unterschrift: { flexDirection: "row", gap: 24, marginTop: 28 },
  linie: { borderTopWidth: 0.5, borderTopColor: "#333", width: 6 * CM, paddingTop: 3 },
});

const z = (n: number) => n.toFixed(2);
const vz = (n: number) => `${n > 0 ? "+" : ""}${n.toFixed(2)}`;

// Zeitkonto einer Person, A4 quer.
//
// Querformat, weil die Auswertung acht Zahlenspalten je Monat hat – im
// Hochformat stünden sie zusammengequetscht, und dieses Blatt wird bei
// der Jahresbesprechung gemeinsam gelesen.
export function ZeitkontoPdf({
  name,
  jahr,
  konto,
  organisation,
}: {
  name: string;
  jahr: number;
  konto: Jahresauswertung;
  organisation: string;
}) {
  // Eine eigene Spalte statt eines Hakens im Monatsnamen: Zeichen wie
  // "✓" gibt es in der Standardschrift des PDF-Erzeugers nicht, und er
  // lässt sie wortlos weg – der Abschluss war im PDF damit unsichtbar.
  // Klartext ist hier ohnehin besser: Das Blatt wird unterschrieben.
  const spalten = [2.6, 1.9, 1.9, 1.6, 1.9, 1.9, 1.9, 1.6, 3.2];
  const kopf = [
    "Monat",
    "Soll",
    "Ist",
    "Abbau",
    "Buchungen",
    "Differenz",
    "Saldo",
    "Ferien",
    "Status",
  ];

  const summeSoll = konto.zeilen.reduce((s, x) => s + x.soll, 0);
  const summeIst = konto.zeilen.reduce((s, x) => s + x.ist, 0);

  return (
    <Document title={`Zeitkonto ${name} ${jahr}`} author={organisation}>
      <Page size="A4" orientation="landscape" style={stil.seite}>
        <Text style={stil.titel}>Zeitkonto {jahr}</Text>
        <Text style={stil.untertitel}>
          {name} · {organisation}
        </Text>

        <View style={stil.kasten}>
          <View style={stil.kachel}>
            <Text style={stil.klein}>Saldo Ende {jahr}</Text>
            <Text style={stil.kachelWert}>{vz(konto.endsaldo)} h</Text>
            <Text style={stil.klein}>Start ins Jahr {vz(konto.startsaldo)} h</Text>
          </View>
          <View style={stil.kachel}>
            <Text style={stil.klein}>Ferien Rest</Text>
            <Text style={stil.kachelWert}>{konto.ferienRest.toFixed(1)} Tage</Text>
            <Text style={stil.klein}>
              Anspruch {konto.ferienAnspruch.toFixed(1)} + Übertrag{" "}
              {konto.ferienUebertrag.toFixed(1)} − bezogen {konto.ferienBezogen.toFixed(1)}
            </Text>
          </View>
          <View style={stil.kachel}>
            <Text style={stil.klein}>Jahr</Text>
            <Text style={stil.kachelWert}>{summeIst.toFixed(1)} h</Text>
            <Text style={stil.klein}>von {summeSoll.toFixed(1)} h Soll</Text>
          </View>
        </View>

        <View style={stil.kopfzeile}>
          {kopf.map((t, i) => {
            // Die Statusspalte enthält Text und ist deshalb linksbündig –
            // die Überschrift muss es auch sein, samt demselben Abstand.
            // Rechtsbündig stand sie drei Zentimeter neben ihrem Inhalt.
            const textspalte = i === 0 || i === kopf.length - 1;
            return (
              <Text
                key={t}
                style={[
                  textspalte ? stil.zellLinks : stil.zellRechts,
                  stil.fett,
                  {
                    width: spalten[i] * CM,
                    paddingLeft: i === kopf.length - 1 ? 6 : 0,
                  },
                ]}
              >
                {t}
              </Text>
            );
          })}
        </View>

        {konto.zeilen.map((m) => (
          <View key={m.monat} style={stil.zeile}>
            <Text style={[stil.zellLinks, { width: spalten[0] * CM }]}>
              {MONATE[m.monat - 1]}
            </Text>
            <Text style={[stil.zellRechts, { width: spalten[1] * CM }]}>{z(m.soll)}</Text>
            <Text style={[stil.zellRechts, { width: spalten[2] * CM }]}>{z(m.ist)}</Text>
            <Text style={[stil.zellRechts, { width: spalten[3] * CM }]}>
              {m.kompensation ? z(m.kompensation) : "–"}
            </Text>
            <Text style={[stil.zellRechts, { width: spalten[4] * CM }]}>
              {m.buchungen ? vz(m.buchungen) : "–"}
            </Text>
            <Text style={[stil.zellRechts, { width: spalten[5] * CM }]}>{vz(m.bewegung)}</Text>
            <Text style={[stil.zellRechts, stil.fett, { width: spalten[6] * CM }]}>
              {vz(m.saldo)}
            </Text>
            <Text style={[stil.zellRechts, { width: spalten[7] * CM }]}>
              {m.ferienTage ? m.ferienTage.toFixed(1) : "–"}
            </Text>
            <Text style={[stil.zellLinks, { width: spalten[8] * CM, paddingLeft: 6 }]}>
              {m.abgeschlossenAm
                ? `abgeschlossen ${new Date(m.abgeschlossenAm).toLocaleDateString("de-CH")}`
                : ""}
            </Text>
          </View>
        ))}

        <View style={stil.summenzeile}>
          <Text style={[stil.zellLinks, stil.fett, { width: spalten[0] * CM }]}>Jahr</Text>
          <Text style={[stil.zellRechts, stil.fett, { width: spalten[1] * CM }]}>
            {z(summeSoll)}
          </Text>
          <Text style={[stil.zellRechts, stil.fett, { width: spalten[2] * CM }]}>
            {z(summeIst)}
          </Text>
          <Text style={[stil.zellRechts, { width: spalten[3] * CM }]}> </Text>
          <Text style={[stil.zellRechts, { width: spalten[4] * CM }]}> </Text>
          <Text style={[stil.zellRechts, { width: spalten[5] * CM }]}> </Text>
          <Text style={[stil.zellRechts, stil.fett, { width: spalten[6] * CM }]}>
            {vz(konto.endsaldo)}
          </Text>
          <Text style={[stil.zellRechts, stil.fett, { width: spalten[7] * CM }]}>
            {konto.ferienBezogen.toFixed(1)}
          </Text>
          <Text style={[stil.zellLinks, { width: spalten[8] * CM }]}> </Text>
        </View>

        <Text style={stil.fuss}>
          „Abgeschlossen“ bedeutet: Die Zahlen dieses Monats sind
          festgehalten und die Zeiteinträge gesperrt. Soll = Sollstunden des Monats, auf die Arbeitstage
          verteilt und mit dem Pensum gerechnet, abzüglich bezahlter Absenzen.
          Ist = erfasste Arbeitszeit; Positionen offener Rapporte zählen erst
          mit deren Abschluss. Abbau = Stunden aus Abwesenheiten, die den Saldo
          belasten.
        </Text>

        <View style={stil.unterschrift}>
          <Text style={stil.linie}>Datum, Unterschrift Mitarbeitende/r</Text>
          <Text style={stil.linie}>Datum, Unterschrift Vorgesetzte/r</Text>
        </View>
      </Page>
    </Document>
  );
}

// Übersicht über alle Mitarbeitenden für einen Monat, A4 quer.
export function AbschlussUebersichtPdf({
  jahr,
  monat,
  organisation,
  zeilen,
}: {
  jahr: number;
  monat: number;
  organisation: string;
  zeilen: {
    name: string;
    soll: number;
    ist: number;
    saldo: number;
    ferienRest: number;
    abgeschlossen: boolean;
    offeneRapporte: number;
  }[];
}) {
  const spalten = [7, 3, 3, 3, 3, 4.5];
  const kopf = ["Person", "Soll", "Ist", "Saldo Ende", "Ferien Rest", "Status"];

  return (
    <Document title={`Zeitkonten ${MONATE[monat - 1]} ${jahr}`} author={organisation}>
      <Page size="A4" orientation="landscape" style={stil.seite}>
        <Text style={stil.titel}>
          Zeitkonten {MONATE[monat - 1]} {jahr}
        </Text>
        <Text style={stil.untertitel}>{organisation}</Text>

        <View style={stil.kopfzeile}>
          {kopf.map((t, i) => (
            <Text
              key={t}
              style={[
                i === 0 || i === 5 ? stil.zellLinks : stil.zellRechts,
                stil.fett,
                { width: spalten[i] * CM },
              ]}
            >
              {t}
            </Text>
          ))}
        </View>

        {zeilen.map((r) => (
          <View key={r.name} style={stil.zeile}>
            <Text style={[stil.zellLinks, { width: spalten[0] * CM }]}>{r.name}</Text>
            <Text style={[stil.zellRechts, { width: spalten[1] * CM }]}>{z(r.soll)}</Text>
            <Text style={[stil.zellRechts, { width: spalten[2] * CM }]}>{z(r.ist)}</Text>
            <Text style={[stil.zellRechts, stil.fett, { width: spalten[3] * CM }]}>
              {vz(r.saldo)}
            </Text>
            <Text style={[stil.zellRechts, { width: spalten[4] * CM }]}>
              {r.ferienRest.toFixed(1)}
            </Text>
            <Text style={[stil.zellLinks, { width: spalten[5] * CM }]}>
              {r.abgeschlossen ? "abgeschlossen" : "offen"}
              {r.offeneRapporte > 0 ? ` · ${r.offeneRapporte} Rapporte offen` : ""}
            </Text>
          </View>
        ))}

        <Text style={stil.fuss}>
          Erstellt am {new Date().toLocaleDateString("de-CH")}. „Offen“ heisst,
          dass der Monat für diese Person noch nicht eingefroren ist – die
          Zahlen können sich also noch ändern.
        </Text>
      </Page>
    </Document>
  );
}
