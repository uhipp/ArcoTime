/**
 * Das Datenmodell als A3-Diagramm zum Aufhängen.
 *
 * Aufruf (aus dem Repo, wegen der Modulauflösung):
 *   node scripts/datenmodell-diagramm.mjs [zieldatei.pdf]
 *
 * Warum als Skript und nicht als einmalig gezeichnetes Bild: Ein Diagramm,
 * das man nicht neu erzeugen kann, ist nach der dritten Migration falsch –
 * und ein falsches Diagramm an der Wand ist schlimmer als keines. Die
 * Tabellen stehen unten als Datenstruktur; wer eine Spalte ergänzt, ändert
 * eine Zeile und lässt das Skript neu laufen.
 *
 * Stand des abgebildeten Entwurfs: 21.08.2026 (docs/plan-parteien-standorte.md).
 */
import { existsSync } from "node:fs";
import React from "react";
import {
  renderToFile,
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Font,
  Svg,
  Polyline,
  Text as SvgText,
} from "@react-pdf/renderer";

const e = React.createElement;
Font.registerHyphenationCallback((w) => [w]);

const NAVY = "#1D3557";
const STAHL = "#457B9D";
const INK = "#0E0C19";
const GRAU = "#333333";
const HELLGRAU = "#6B7280";
const LINIE = "#B9BFC9";
const FLAECHE = "#F4F6F8";
// Das Logo liegt ausserhalb des Repos (Corporate-Design-Skill). Fehlt es,
// entsteht das Diagramm ohne Logo statt gar nicht.
const LOGO_PFAD = `${process.env.HOME}/.claude/skills/arcos-corporate-design/assets/logo/arcos-group-logo.png`;
const LOGO = existsSync(LOGO_PFAD) ? LOGO_PFAD : null;

// A3 quer
const B = 1191;
const H = 842;

// Spalten
const SP = [30, 268, 506, 744, 982];
const BOX = 196;
const ZEILE = 10.4;
const KOPF = 19;
const PAD = 4;

const boxHoehe = (n) => KOPF + n * ZEILE + PAD * 2;

// status: "bestand" | "geaendert" | "neu"
// felder: [name, typ, marke]  marke: "" | "PK" | "FK" | "neu" | "weg"
const E = {
  organisationen: {
    titel: "organisationen",
    unter: "Mandant",
    status: "geaendert",
    sp: 0,
    y: 96,
    felder: [
      ["id", "uuid", "PK"],
      ["name", "text", ""],
      ["…", "bestehend", ""],
      ["standorte_aktiv", "bool", "neu"],
    ],
  },
  begriffe: {
    titel: "begriffe",
    unter: "Beschriftungen je Betrieb",
    status: "neu",
    sp: 0,
    y: 200,
    felder: [
      ["organisation_id", "uuid", "PK/FK"],
      ["schluessel", "text", "PK"],
      ["einzahl", "text", ""],
      ["mehrzahl", "text", ""],
    ],
  },
  partner: {
    titel: "kunden",
    unter: "Geschäftspartner · Adressbuch",
    status: "geaendert",
    sp: 1,
    y: 96,
    felder: [
      ["id", "uuid", "PK"],
      ["organisation_id", "uuid", "FK"],
      ["anrede / vorname", "text", ""],
      ["name", "text", ""],
      ["strasse / hausnr.", "text", ""],
      ["plz / ort / land", "text", ""],
      ["waehrung", "text", ""],
      ["zahlungskond_tage", "int", ""],
      ["standard_rabatt", "num", ""],
      ["adress_schluessel", "text", ""],
      ["ist_kunde", "bool", "neu"],
      ["anreise_km", "num", "weg"],
    ],
  },
  personen: {
    titel: "ansprechpersonen",
    unter: "Person bei Partner ODER Standort",
    status: "neu",
    sp: 1,
    y: 320,
    felder: [
      ["id", "uuid", "PK"],
      ["organisation_id", "uuid", "FK"],
      ["kunde_id", "uuid", "FK opt"],
      ["standort_id", "uuid", "FK opt"],
      ["anrede / vorname", "text", ""],
      ["name", "text", ""],
      ["funktion", "text", ""],
      ["ist_standard", "bool", ""],
      ["aktiv", "bool", ""],
    ],
    fuss: "check num_nonnulls(kunde_id, standort_id) = 1",
  },
  kontakte: {
    titel: "kontakte",
    unter: "Mail · Telefon · Mobil · WhatsApp",
    status: "neu",
    sp: 1,
    y: 528,
    felder: [
      ["id", "uuid", "PK"],
      ["organisation_id", "uuid", "FK"],
      ["kunde_id", "uuid", "FK opt"],
      ["standort_id", "uuid", "FK opt"],
      ["ansprechperson_id", "uuid", "FK opt"],
      ["art_id", "uuid", "FK"],
      ["wert", "text", ""],
      ["ist_standard", "bool", ""],
    ],
    fuss: "check num_nonnulls(…) = 1",
  },
  kontaktarten: {
    titel: "kontakt_arten",
    unter: "Auswahlliste",
    status: "neu",
    sp: 1,
    y: 668,
    felder: [
      ["id", "uuid", "PK"],
      ["organisation_id", "uuid", "FK"],
      ["bezeichnung", "text", ""],
      ["sortierung / aktiv", "", ""],
    ],
  },
  standorte: {
    titel: "standorte",
    unter: "Liegenschaft · Filiale · Objekt",
    status: "neu",
    sp: 2,
    y: 96,
    felder: [
      ["id", "uuid", "PK"],
      ["organisation_id", "uuid", "FK"],
      ["bezeichnung", "text", ""],
      ["strasse / hausnr.", "text", ""],
      ["adresse_zusatz", "text", ""],
      ["plz / ort / land", "text", ""],
      ["anreise_km", "num", "neu"],
      ["zugang", "text", ""],
      ["notiz", "text", ""],
      ["ist_standard", "bool", ""],
      ["aktiv", "bool", ""],
    ],
    fuss: "KEIN kunde_id – gehört dem Mandanten",
  },
  beteiligte: {
    titel: "beteiligte",
    unter: "Rolle einer Partei an Ort / Auftrag / Beleg",
    status: "neu",
    sp: 2,
    y: 330,
    felder: [
      ["id", "uuid", "PK"],
      ["organisation_id", "uuid", "FK"],
      ["rolle_id", "uuid", "FK"],
      ["partner_id", "uuid", "FK"],
      ["ansprechperson_id", "uuid", "FK opt"],
      ["standort_id", "uuid", "FK opt"],
      ["projekt_id", "uuid", "FK opt"],
      ["rapport_id", "uuid", "FK opt"],
      ["gueltig_von", "date", "opt"],
      ["gueltig_bis", "date", "opt"],
    ],
    fuss: "check num_nonnulls(standort/projekt/rapport) = 1",
  },
  rollen: {
    titel: "beteiligten_rollen",
    unter: "Auswahlliste je Betrieb",
    status: "neu",
    sp: 2,
    y: 570,
    felder: [
      ["id", "uuid", "PK"],
      ["organisation_id", "uuid", "FK"],
      ["bezeichnung", "text", ""],
      ["sortierung", "int", ""],
      ["aktiv", "bool", ""],
    ],
    fuss: "Eigentümer · Verwaltung · Hauswart ·\nArchitekt · Bauleitung · Subunternehmer",
  },
  projekte: {
    titel: "projekte",
    unter: "Auftrag · Mandat · Projekt",
    status: "geaendert",
    sp: 3,
    y: 200,
    felder: [
      ["id", "uuid", "PK"],
      ["organisation_id", "uuid", "FK"],
      ["kunde_id", "uuid", "FK"],
      ["standort_id", "uuid", "FK neu"],
      ["verantwortlich_id", "uuid", "FK neu opt"],
      ["bezeichnung", "text", ""],
      ["status", "text", ""],
      ["kostenstelle", "text", ""],
      ["startdatum", "date", ""],
      ["naechste_belegnr", "int", ""],
      ["sichtbar_fuer_alle", "bool", ""],
    ],
    fuss: "kunde_id = WER bestellt · standort_id = WO",
  },
  rapporte: {
    titel: "rapporte",
    unter: "Nachweis beim Kunden",
    status: "geaendert",
    sp: 4,
    y: 96,
    felder: [
      ["id", "uuid", "PK"],
      ["organisation_id", "uuid", "FK"],
      ["projekt_id", "uuid", "FK neu"],
      ["kunde_id", "uuid", "weg"],
      ["jahr / nummer", "int", ""],
      ["datum", "date", ""],
      ["mitarbeiter_id", "uuid", "FK"],
      ["status", "text", ""],
      ["unterschrift_png", "text", ""],
      ["unterzeichner_name", "text", ""],
      ["adressat_partner_id", "uuid", "FK neu opt"],
      ["adressat_person_id", "uuid", "FK neu opt"],
    ],
    fuss: "projekt_id war NULL-fähig → Pflicht",
  },
  zeiteintraege: {
    titel: "zeiteintraege",
    unter: "Position · Leistung · Zeit",
    status: "geaendert",
    sp: 4,
    y: 400,
    felder: [
      ["id", "uuid", "PK"],
      ["organisation_id", "uuid", "FK"],
      ["projekt_id", "uuid", "FK"],
      ["rapport_id", "uuid", "FK opt"],
      ["dienstleistung_id", "uuid", "FK"],
      ["mitarbeiter_id", "uuid", "FK"],
      ["datum", "date", ""],
      ["start_zeit / end_zeit", "time", ""],
      ["dauer_minuten / menge", "num", ""],
      ["timer_gestartet_um", "tstz", ""],
      ["preis / mwst / rabatt", "num", "Snapshot"],
      ["quelle", "text", "neu"],
      ["idempotenz_schl.", "text", "neu opt"],
    ],
    fuss: "unique Timer je Person · keine Überlappung",
  },
};

// Kanten mit ausdrücklichen Wegpunkten (x,y) – nichts dem Zufall überlassen.
const rechts = (k) => SP[E[k].sp] + BOX;
const links = (k) => SP[E[k].sp];
const oben = (k) => E[k].y;
const unten = (k) => E[k].y + boxHoehe(E[k].felder.length) + (E[k].fuss ? 14 : 0);
const mitteY = (k) => (oben(k) + unten(k)) / 2;

const KANTEN = [
  // Mandant → Beschriftungen
  { punkte: [[SP[0] + 30, unten("organisationen")], [SP[0] + 30, oben("begriffe")]], stil: "voll" },

  // Partner → Personen  (gleiche Spalte, kurz)
  { punkte: [[SP[1] + 40, unten("partner")], [SP[1] + 40, oben("personen")]], stil: "voll", label: "1:n" },
  // Standort → Personen (Hauswart) – von links in die Personen-Box
  {
    punkte: [
      [links("standorte"), mitteY("standorte") + 40],
      [links("standorte") - 20, mitteY("standorte") + 40],
      [links("standorte") - 20, oben("personen") + 30],
      [rechts("personen"), oben("personen") + 30],
    ],
    stil: "gestrichelt",
    label: "Hauswart",
    labelAn: [478, 336],
  },
  // Personen → Kontakte
  { punkte: [[SP[1] + 40, unten("personen")], [SP[1] + 40, oben("kontakte")]], stil: "voll" },
  // Partner → Kontakte (links aussen herum)
  {
    punkte: [
      [links("partner"), unten("partner") - 20],
      [links("partner") - 14, unten("partner") - 20],
      [links("partner") - 14, oben("kontakte") + 24],
      [links("kontakte"), oben("kontakte") + 24],
    ],
    stil: "voll",
  },
  // Kontakte → Kontaktarten
  { punkte: [[SP[1] + 40, unten("kontakte")], [SP[1] + 40, oben("kontaktarten")]], stil: "voll" },

  // Standort → Beteiligte (gleiche Spalte)
  { punkte: [[SP[2] + 50, unten("standorte")], [SP[2] + 50, oben("beteiligte")]], stil: "voll", label: "Eigentümer / Verwaltung" },
  // Beteiligte → Rollen
  { punkte: [[SP[2] + 50, unten("beteiligte")], [SP[2] + 50, oben("rollen")]], stil: "voll" },
  // Partner → Beteiligte (partner_id)
  {
    punkte: [
      [rechts("partner"), unten("partner") - 14],
      [links("beteiligte") - 16, unten("partner") - 14],
      [links("beteiligte") - 16, oben("beteiligte") + 42],
      [links("beteiligte"), oben("beteiligte") + 42],
    ],
    stil: "voll",
    label: "ist beteiligt",
    labelAn: [470, 366],
  },
  // Projekt → Beteiligte
  {
    punkte: [
      [links("projekte"), unten("projekte") - 16],
      [rechts("beteiligte") + 16, unten("projekte") - 16],
      [rechts("beteiligte") + 16, oben("beteiligte") + 60],
      [rechts("beteiligte"), oben("beteiligte") + 60],
    ],
    stil: "voll",
    label: "Architekt / Subunt.",
  },

  // Partner → Projekt (Vertragspartner) – durch den Korridor zwischen Standort und Beteiligte
  {
    punkte: [
      [rechts("partner"), oben("partner") + 46],
      [rechts("partner") + 18, oben("partner") + 46],
      [rechts("partner") + 18, unten("standorte") + 14],
      [links("projekte") - 16, unten("standorte") + 14],
      [links("projekte") - 16, oben("projekte") + 30],
      [links("projekte"), oben("projekte") + 30],
    ],
    stil: "voll",
    label: "Vertragspartner",
    labelAn: [560, 290],
  },
  // Standort → Projekt (Einsatzort)
  {
    punkte: [
      [rechts("standorte"), oben("standorte") + 60],
      [links("projekte"), oben("projekte") + 48],
    ],
    stil: "voll",
    label: "Einsatzort",
    labelAn: [712, 190],
  },
  // Person → Projekt (verantwortlich)
  //
  // Bewusst unter der Beteiligten-Box durch: Der direkte Weg läuft hinter ihr
  // vorbei, und eine Linie, die in eine Box hinein- und wieder herausführt,
  // liest sich als Beziehung zu dieser Box.
  {
    punkte: [
      [rechts("personen"), unten("personen") - 12],
      [rechts("personen") + 10, unten("personen") - 12],
      [rechts("personen") + 10, 502],
      [links("projekte") - 26, 502],
      [links("projekte") - 26, oben("projekte") + 62],
      [links("projekte"), oben("projekte") + 62],
    ],
    stil: "gestrichelt",
    label: "verantwortlich",
    labelAn: [580, 496],
  },

  // Projekt → Rapporte
  {
    punkte: [
      [rechts("projekte"), oben("projekte") + 26],
      [links("rapporte") - 18, oben("projekte") + 26],
      [links("rapporte") - 18, oben("rapporte") + 46],
      [links("rapporte"), oben("rapporte") + 46],
    ],
    stil: "voll",
    label: "1:n",
  },
  // Projekt → Zeiteinträge
  {
    punkte: [
      [rechts("projekte"), unten("projekte") - 30],
      [links("zeiteintraege") - 34, unten("projekte") - 30],
      [links("zeiteintraege") - 34, oben("zeiteintraege") + 34],
      [links("zeiteintraege"), oben("zeiteintraege") + 34],
    ],
    stil: "voll",
    label: "1:n",
  },
  // Rapport → Zeiteinträge (klammert)
  { punkte: [[SP[4] + 60, unten("rapporte")], [SP[4] + 60, oben("zeiteintraege")]], stil: "voll", label: "klammert" },
];

const s = StyleSheet.create({
  seite: { paddingTop: 0, paddingBottom: 0, fontFamily: "Helvetica", color: GRAU },
  band: {
    backgroundColor: NAVY,
    paddingVertical: 11,
    paddingHorizontal: 30,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  titel: { fontFamily: "Helvetica-Bold", fontSize: 15, color: "#FFFFFF" },
  unter: { fontSize: 7.5, color: "#FFFFFF", opacity: 0.85, marginTop: 2 },
  spaltenKopf: {
    position: "absolute",
    fontFamily: "Helvetica-Bold",
    fontSize: 7,
    color: STAHL,
    letterSpacing: 1.1,
  },
  box: { position: "absolute", width: BOX, borderWidth: 0.9, backgroundColor: "#FFFFFF" },
  boxKopf: { paddingHorizontal: PAD + 1, paddingTop: 3.5, paddingBottom: 3 },
  boxTitel: { fontFamily: "Helvetica-Bold", fontSize: 8.4, color: "#FFFFFF" },
  boxUnter: { fontSize: 5.6, color: "#FFFFFF", opacity: 0.9, marginTop: 0.8 },
  feldZeile: { flexDirection: "row", paddingHorizontal: PAD + 1, height: ZEILE, alignItems: "center" },
  fName: { width: 100, fontSize: 7 },
  fTyp: { width: 56, fontSize: 6.3, color: HELLGRAU },
  fMarke: { width: 30, fontSize: 5.9, color: STAHL, textAlign: "right" },
  boxFuss: {
    fontSize: 5.7,
    color: STAHL,
    paddingHorizontal: PAD + 1,
    paddingTop: 2,
    paddingBottom: 3,
    borderTopWidth: 0.5,
    borderTopColor: LINIE,
    lineHeight: 1.25,
  },
  legende: { position: "absolute", left: 30, top: H - 84, right: 30, flexDirection: "row", alignItems: "flex-start" },
  legTitel: { fontFamily: "Helvetica-Bold", fontSize: 6.6, color: STAHL, letterSpacing: 1, marginBottom: 3 },
  legText: { fontSize: 6.5, color: GRAU, lineHeight: 1.45 },
  fuss: {
    position: "absolute",
    bottom: 10,
    left: 30,
    right: 30,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 6,
    color: HELLGRAU,
  },
});

const farbe = {
  bestand: { rand: LINIE, kopf: HELLGRAU },
  geaendert: { rand: NAVY, kopf: NAVY },
  neu: { rand: STAHL, kopf: STAHL },
};

function box(key) {
  const b = E[key];
  const f = farbe[b.status];
  return e(
    View,
    {
      key,
      style: [s.box, { left: SP[b.sp], top: b.y, borderColor: f.rand }],
    },
    e(
      View,
      { style: [s.boxKopf, { backgroundColor: f.kopf }] },
      e(Text, { style: s.boxTitel }, b.titel),
      e(Text, { style: s.boxUnter }, b.unter)
    ),
    e(
      View,
      { style: { paddingVertical: PAD } },
      ...b.felder.map(([n, t, m], i) =>
        e(
          View,
          {
            key: i,
            style: [
              s.feldZeile,
              i % 2 === 1 ? { backgroundColor: FLAECHE } : {},
            ],
          },
          e(
            Text,
            {
              style: [
                s.fName,
                m === "weg"
                  ? { textDecoration: "line-through", color: HELLGRAU }
                  : m.includes("neu")
                  ? { color: STAHL, fontFamily: "Helvetica-Bold" }
                  : { color: INK },
              ],
            },
            n
          ),
          e(Text, { style: s.fTyp }, t),
          e(Text, { style: s.fMarke }, m)
        )
      )
    ),
    b.fuss ? e(Text, { style: s.boxFuss }, b.fuss) : null
  );
}

function kante(k, i) {
  const punkte = k.punkte.map(([x, y]) => `${x},${y}`).join(" ");
  const mitte = k.labelAn ?? k.punkte[Math.floor(k.punkte.length / 2)];
  return [
    e(Polyline, {
      key: `p${i}`,
      points: punkte,
      stroke: k.stil === "gestrichelt" ? HELLGRAU : STAHL,
      strokeWidth: k.stil === "gestrichelt" ? 0.7 : 0.9,
      strokeDasharray: k.stil === "gestrichelt" ? "2 2" : undefined,
      fill: "none",
    }),
    k.label
      ? e(
          SvgText,
          {
            key: `t${i}`,
            x: mitte[0] + 3,
            y: mitte[1] - 3,
            style: { fontSize: 5.8, fontFamily: "Helvetica" },
            fill: k.stil === "gestrichelt" ? HELLGRAU : STAHL,
          },
          k.label
        )
      : null,
  ];
}

const SPALTENKOEPFE = [
  ["MANDANT · BESCHRIFTUNG", 0],
  ["PARTEIEN", 1],
  ["ORT UND ROLLEN", 2],
  ["AUFTRAG", 3],
  ["NACHWEIS", 4],
];

const seite = e(
  Page,
  { size: "A3", orientation: "landscape", style: s.seite },

  e(
    View,
    { style: s.band },
    e(
      View,
      null,
      e(Text, { style: s.titel }, "ArcoTime · Datenmodell Parteien, Standorte und Aufträge"),
      e(
        Text,
        { style: s.unter },
        "Entwurf 21.08.2026 · beschlossen: Standort gehört dem Mandanten, Vertragspartner am Auftrag · noch nicht umgesetzt"
      )
    ),
    LOGO ? e(Image, { src: LOGO, style: { width: 96 } }) : null
  ),

  // Spaltenköpfe
  ...SPALTENKOEPFE.map(([t, i]) =>
    e(Text, { key: t, style: [s.spaltenKopf, { left: SP[i], top: 76 }] }, t)
  ),

  // Kanten hinter den Boxen
  e(
    Svg,
    // Höhe bewusst kleiner als die Seite: Ein SVG, das höher ist als der
    // verbleibende Platz, erzwingt bei react-pdf einen Seitenumbruch – dann
    // landen alle folgenden Boxen auf Seite 2.
    { style: { position: "absolute", left: 0, top: 0 }, width: B, height: 740 },
    ...KANTEN.flatMap(kante)
  ),

  // Boxen
  ...Object.keys(E).map(box),

  // Legende
  e(
    View,
    { style: s.legende },
    e(
      View,
      { style: { width: 250 } },
      e(Text, { style: s.legTitel }, "LEGENDE"),
      e(
        Text,
        { style: s.legText },
        "Blauer Rahmen = neue Tabelle · dunkler Rahmen = bestehende Tabelle, geändert\n" +
          "Blaues Feld = neu · durchgestrichen = entfällt · opt = optional · Snapshot = eingefroren"
      )
    ),
    e(
      View,
      { style: { width: 300, marginLeft: 26 } },
      e(Text, { style: s.legTitel }, "GILT FÜR JEDE TABELLE"),
      e(
        Text,
        { style: s.legText },
        "organisation_id → organisationen ist Pflicht – nicht aus Bequemlichkeit:\n" +
          "Vollexport (0067), Umfangszählung (0064) und Löschung (0063) lesen die\n" +
          "abhängigen Tabellen aus dem Katalog. Ohne diesen Fremdschlüssel fällt eine\n" +
          "Tabelle still aus Export und Löschung. Dazu created_at, updated_at,\n" +
          "geaendert_von, RLS auf current_organisation_id()."
      )
    ),
    e(
      View,
      { style: { width: 290, marginLeft: 26 } },
      e(Text, { style: s.legTitel }, "DIE ZWEI ACHSEN"),
      e(
        Text,
        { style: s.legText },
        "Kette: Kunde bestellt · Standort ist der Ort · Auftrag klammert · Rapport\n" +
          "weist nach. Beteiligte sind die zweite Achse: WER redet mit und WER\n" +
          "bekommt welchen Beleg. Der Standort trägt kein kunde_id – nur so\n" +
          "überlebt die Historie einen Wechsel der Verwaltung."
      )
    ),
    e(
      View,
      { style: { width: 240, marginLeft: 26 } },
      e(Text, { style: s.legTitel }, "BESCHRIFTUNG STATT STRUKTUR"),
      e(
        Text,
        { style: s.legText },
        "begriffe hält je Betrieb Einzahl und Mehrzahl: Standort/Filiale/\n" +
          "Liegenschaft/Objekt/Anlage, Auftrag/Projekt/Mandat, Anfrage/Ticket,\n" +
          "Rapport/Serviceschein. Wer keine Standorte kennt, sieht die Ebene nie –\n" +
          "der Standardstandort entsteht automatisch aus dem Kunden."
      )
    )
  ),

  e(
    View,
    { style: s.fuss },
    e(Text, null, "Arcos Informatik GmbH · ArcoTime · Feldnamen sind Arbeitstitel · Plan: docs/plan-parteien-standorte.md"),
    e(Text, null, "A3 · 21.08.2026")
  )
);

const ziel =
  process.argv[2] ??
  `${process.env.HOME}/Library/CloudStorage/OneDrive-ArcosInformatikGmbH/ArcoSoftware/ArcoTime-Datenmodell-A3.pdf`;

await renderToFile(
  e(
    Document,
    { title: "ArcoTime – Datenmodell Parteien, Standorte und Aufträge", author: "Arcos Informatik GmbH" },
    seite
  ),
  ziel
);
console.log("geschrieben:", ziel);
