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
 * Stand des abgebildeten Modells: 23.08.2026, UMGESETZT (Migrationen 0071 bis
 * 0084). Siehe docs/plan-ablauf-standorte.md.
 *
 * Die Marke "neu" zeigt, was seit dem Ausdruck vom 21.08.2026 dazugekommen
 * oder anders geworden ist – so liest man die Änderung, ohne zwei Blätter
 * zu vergleichen.
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
      ["standorte_aktiv", "bool", ""],
      ["vortrag_* (7)", "bool", "neu"],
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
    unter: "Adressbuch · Kunden und Beteiligte",
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
      ["ist_kunde", "bool", ""],
    ],
  },
  personen: {
    titel: "ansprechpersonen",
    unter: "Person beim Partner",
    status: "neu",
    sp: 1,
    y: 320,
    felder: [
      ["id", "uuid", "PK"],
      ["organisation_id", "uuid", "FK"],
      ["kunde_id", "uuid", "FK"],
      ["anrede / vorname", "text", ""],
      ["name", "text", ""],
      ["funktion", "text", ""],
      ["ist_standard", "bool", ""],
      ["aktiv", "bool", ""],
    ],
    fuss: "standort_id gefallen (0079)",
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
      ["ansprechperson_id", "uuid", "FK opt"],
      ["art_id", "uuid", "FK"],
      ["wert", "text", ""],
      ["ist_standard", "bool", ""],
    ],
    fuss: "check num_nonnulls(kunde, person) = 1",
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
      ["kunde_id", "uuid", "FK neu"],
      ["bezeichnung", "text", ""],
      ["strasse / hausnr.", "text", ""],
      ["adresse_zusatz", "text", ""],
      ["plz / ort / land", "text", ""],
      ["ist_standard", "bool", ""],
      ["aktiv", "bool", ""],
    ],
    fuss: "NUR die Postadresse (0079).\nanreise_km, zugang, notiz → am Auftrag",
  },
  beteiligte: {
    titel: "projekt_adressen",
    unter: "Zusätzliche Adresse am Auftrag, mit Rolle",
    status: "neu",
    sp: 2,
    y: 330,
    felder: [
      ["id", "uuid", "PK"],
      ["organisation_id", "uuid", "FK"],
      ["projekt_id", "uuid", "FK"],
      ["partner_id", "uuid", "FK"],
      ["rolle_id", "uuid", "FK"],
      ["ansprechperson_id", "uuid", "FK opt"],
      ["gueltig_von", "date", "opt"],
      ["gueltig_bis", "date", "opt"],
      ["notiz", "text", "opt"],
    ],
    fuss: "hiess beteiligte und hing am Standort (0079).\nVerknüpfung, keine Kopie: Adresse steht 1×",
  },
  rollen: {
    titel: "adress_rollen",
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
    fuss: "Eigentümer · Verwaltung · Mieter · Hauswart ·\nArchitekt · Bauleitung · Subunt. · Behörde",
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
      ["standort_id", "uuid", "FK"],
      ["projektleiter_id", "uuid", "FK opt"],
      ["bezeichnung", "text", ""],
      ["status", "text", ""],
      ["anreise_km", "num", "neu"],
      ["zugang", "text", "neu"],
      ["kostenstelle", "text", ""],
      ["startdatum", "date", ""],
      ["naechste_belegnr", "int", ""],
      ["sichtbar_fuer_alle", "bool", ""],
    ],
    fuss: "kunde_id = WER bestellt · standort_id = WO.\nHIER hängt alles Betriebswissen (0080)",
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
      ["projekt_id", "uuid", "FK"],
      ["jahr / nummer", "int", ""],
      ["datum", "date", ""],
      ["mitarbeiter_id", "uuid", "FK"],
      ["status", "text", ""],
      ["unterschrift_png", "text", ""],
      ["unterzeichner_name", "text", ""],
    ],
    fuss: "kunde_id gefallen (0080): der Kunde\nergibt sich aus dem Auftrag",
  },
  artikel: {
    titel: "artikel",
    unter: "Artikelstamm · Arbeit, Material, Spesen",
    status: "geaendert",
    sp: 3,
    y: 400,
    felder: [
      ["id", "uuid", "PK"],
      ["organisation_id", "uuid", "FK"],
      ["klasse_id", "uuid", "FK"],
      ["mwst_code_id", "uuid", "FK opt"],
      ["bezeichnung", "text", ""],
      ["einheit", "text", ""],
      ["preis", "num", ""],
      ["konto", "text", ""],
      ["zaehlt_als_arbeitszeit", "bool", ""],
      ["rabatt_erlaubt", "bool", ""],
      ["menge_aus_anreise", "bool", ""],
      ["aktiv", "bool", ""],
    ],
    fuss: "hiess dienstleistungen (0078) – der Name war\nfalsch, seit auch Material darin steht",
  },
  artikelklassen: {
    titel: "artikelklassen",
    unter: "Gruppierung für Rabatte und Auswertungen",
    status: "geaendert",
    sp: 3,
    y: 620,
    felder: [
      ["id", "uuid", "PK"],
      ["organisation_id", "uuid", "FK"],
      ["bezeichnung", "text", ""],
      ["menge_summieren", "bool", "neu"],
      ["sortierung / aktiv", "", ""],
    ],
    fuss: "menge_summieren aus = die Auswertung zeigt\nnur den Betrag (gemischte Einheiten)",
  },
  zeiteintraege: {
    titel: "zeiteintraege",
    unter: "Position · Artikel · Zeit",
    status: "geaendert",
    sp: 4,
    y: 400,
    felder: [
      ["id", "uuid", "PK"],
      ["organisation_id", "uuid", "FK"],
      ["projekt_id", "uuid", "FK"],
      ["rapport_id", "uuid", "FK opt"],
      ["artikel_id", "uuid", "FK neu"],
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

  // Standort → Partner: der Standort gehört genau einem Kunden (0079). Bis
  // dahin lief das über eine Beteiligtenzeile mit der Rolle „Kunde"; seit die
  // zusätzlichen Adressen am Auftrag hängen, ist es eine Spalte.
  {
    punkte: [
      [links("standorte"), oben("standorte") + 40],
      [rechts("partner"), oben("partner") + 30],
    ],
    stil: "voll",
    label: "gehört",
    labelAn: [472, 118],
  },
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
  // Es gibt KEINE Kante von den Ansprechpersonen zum Auftrag: Die
  // Projektleitung ist eine Mitarbeitende (projekte.projektleiter_id →
  // profiles), keine Person beim Kunden. Der Entwurf vom 21.08. hatte hier
  // eine Linie – sie war falsch und ist mit dem Ausdruck vom 23.08. weg.

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
  // Position → Artikel und Artikel → Klasse
  {
    punkte: [
      [links("zeiteintraege"), oben("zeiteintraege") + 54],
      [links("zeiteintraege") - 16, oben("zeiteintraege") + 54],
      [links("zeiteintraege") - 16, oben("artikel") + 40],
      [rechts("artikel"), oben("artikel") + 40],
    ],
    stil: "voll",
    label: "Artikel",
  },
  { punkte: [[SP[3] + 60, unten("artikel")], [SP[3] + 60, oben("artikelklassen")]], stil: "voll" },

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
      e(Text, { style: s.titel }, "ArcoTime · Datenmodell Adressen, Standorte und Aufträge"),
      e(
        Text,
        { style: s.unter },
        "Stand 23.08.2026 · UMGESETZT (0071–0084) · Der Standort ist eine Postadresse; alles Betriebswissen hängt am Auftrag"
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
          "Blaues Feld = neu seit dem Ausdruck vom 21.08. · opt = optional · Snapshot = eingefroren"
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
        "Der Auftrag hat ZWEI Eltern: kunde_id sagt WER bestellt und schuldet,\n" +
          "standort_id sagt WO gearbeitet wird. Dieselbe Liegenschaft kann einen\n" +
          "Auftrag mit der Verwaltung und einen mit dem Eigentümer tragen –\n" +
          "deshalb können Kunden- und Standortauswertung auseinanderfallen,\n" +
          "ohne dass eine falsch ist."
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
    e(Text, null, "Arcos Informatik GmbH · ArcoTime · Plan und Begründungen: docs/plan-ablauf-standorte.md"),
    e(Text, null, "A3 · 23.08.2026")
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
