export type Rolle = "admin" | "mitarbeiter";

export type Profile = {
  id: string;
  name: string;
  vorname: string | null;
  nachname: string | null;
  email: string | null;
  role: Rolle;
  farbe: string;
  ist_platform_admin: boolean;
};

export type Kunde = {
  id: string;
  adress_schluessel: string | null;
  anrede: string | null;
  vorname: string | null;
  name: string;
  adresse_zusatz: string | null;
  strasse: string | null;
  hausnummer: string | null;
  postfach: string | null;
  plz: string | null;
  ort: string | null;
  land: string;
  email: string | null;
  telefon: string | null;
  waehrung: string;
  zahlungskondition_tage: number;
  notizen: string | null;
  // Vorbelegung des Rabatts bei neuen Zeiteinträgen dieses Kunden. Wirkt
  // nicht rückwirkend – der Rabatt wird pro Eintrag gespeichert.
  standard_rabatt_prozent: number;
  // Zu verrechnende Kilometer je Einsatz – Vorschlag beim Erfassen (0050).
  anreise_km: number | null;
  // Stand des Datensatzes – trägt die Konfliktprüfung (0039).
  updated_at?: string;
};

export type ProjektStatus = "aktiv" | "inaktiv";

export type Projekt = {
  id: string;
  kunde_id: string;
  bezeichnung: string;
  status: ProjektStatus;
  kostenstelle: string | null;
  startdatum: string;
  notizen: string | null;
  sichtbar_fuer_alle: boolean;
  naechste_belegnummer: number;
  kunden?: Pick<Kunde, "id" | "name" | "vorname">;
  // Stand des Datensatzes – trägt die Konfliktprüfung (0039).
  updated_at?: string;
  // Verantwortliche Person des Projekts (0044).
  projektleiter_id: string | null;
};

export type Dienstleistungsklasse = {
  id: string;
  bezeichnung: string;
  sortierung: number;
  aktiv: boolean;
};

export type MwstCode = {
  id: string;
  code: string;
  satz: number;
  bezeichnung: string;
  aktiv: boolean;
};

// Frei wählbar (Stunde, Pauschale, Stück, km, …) – die Einheit ist nur
// Beschriftung. Ob nach Dauer oder nach Menge erfasst wird, entscheidet
// allein "zaehlt_als_arbeitszeit".
export type Einheit = string;

export type Dienstleistung = {
  id: string;
  bezeichnung: string;
  beschreibung: string | null;
  klasse_id: string;
  preis: number;
  einheit: Einheit;
  // true = Erfassung über Dauer, zählt in Stundenauswertungen.
  // false = Mengenartikel (Stück, km, Spesen) – verrechenbar, aber nie
  // Arbeitszeit.
  zaehlt_als_arbeitszeit: boolean;
  // false = kein Teilrabatt möglich (Reisespesen o.ä.). 100% bleibt
  // erlaubt, damit nicht verrechnete Arbeit erfassbar bleibt.
  rabatt_erlaubt: boolean;
  // Schlägt die Anreise-Kilometer des Kunden als Menge vor (0050).
  menge_aus_anreise: boolean;
  konto: string | null;
  mwst_code_id: string | null;
  aktiv: boolean;
  dienstleistungsklassen?: Pick<Dienstleistungsklasse, "id" | "bezeichnung">;
  mwst_codes?: Pick<MwstCode, "id" | "code">;
  // Stand des Datensatzes – trägt die Konfliktprüfung (0039).
  updated_at?: string;
};

export type Kundenpreis = {
  id: string;
  kunde_id: string;
  dienstleistung_id: string;
  ab_menge: number;
  preis: number;
  dienstleistungen?: Pick<Dienstleistung, "id" | "bezeichnung" | "einheit">;
};

// Rabatt eines Kunden auf eine ganze Dienstleistungsklasse. Hat bei der
// Vorbelegung Vorrang vor kunden.standard_rabatt_prozent.
export type Kundenrabatt = {
  id: string;
  kunde_id: string;
  klasse_id: string;
  rabatt_prozent: number;
  dienstleistungsklassen?: Pick<Dienstleistungsklasse, "id" | "bezeichnung">;
};

export type Zeiteintrag = {
  id: string;
  projekt_id: string;
  dienstleistung_id: string;
  user_id: string;
  mitarbeiter_id: string;
  datum: string;
  start_zeit: string | null;
  end_zeit: string | null;
  dauer_minuten: number | null;
  // Verrechnete Menge bei Mengenartikeln (Stück, km, …). Bei Zeit-Einträgen
  // null – dort gilt dauer_minuten.
  menge: number | null;
  timer_gestartet_um: string | null;
  beschreibung: string | null;
  rabatt_prozent: number;
  referenz: string | null;
  beleg_id: string | null;
  preis: number | null;
  // Stand des Datensatzes – trägt die Konfliktprüfung (0039).
  updated_at?: string;
};

// Zeile aus der View v_zeiteintraege (inkl. berechnetem Betrag & Stammdaten)
export type ZeiteintragMitDetails = Zeiteintrag & {
  // Nur Arbeitszeit – bei Mengenartikeln null, damit Auswertungen keine
  // Kilometer zu Stunden addieren.
  menge_stunden: number | null;
  // Die Grösse, mit der gerechnet und exportiert wird: Stunden ODER Menge.
  menge_verrechnet: number | null;
  einheit: string;
  zaehlt_als_arbeitszeit: boolean;
  rabatt_erlaubt: boolean;
  betrag: number | null;
  projekt_bezeichnung: string;
  kostenstelle: string | null;
  kunde_id: string;
  kunde_name: string;
  vorname: string | null;
  dienstleistung_bezeichnung: string;
  mitarbeiter_name: string;
  klasse_id: string | null;
  klasse_bezeichnung: string | null;
  adress_schluessel: string | null;
  anrede: string | null;
  adresse_zusatz: string | null;
  strasse: string | null;
  postfach: string | null;
  plz: string | null;
  ort: string | null;
  land: string;
  email: string | null;
  telefon: string | null;
  waehrung: string;
  zahlungskondition_tage: number;
  konto: string | null;
  mwst_code: string | null;
  // Vorläufig = gehört zu einem Rapport, der noch nicht signiert oder
  // abgeschlossen ist. Zählt weder in Auswertungen noch im Export – siehe
  // Migration 0036.
  vorlaeufig: boolean;
  rapport_status: string | null;
};

export type RapportStatus = "offen" | "signiert" | "abgeschlossen" | "storniert";

// Klammer um die Positionen eines Kundeneinsatzes. Positionen sind
// gewöhnliche Zeiteinträge mit gesetzter rapport_id – siehe
// docs/phase8-arbeitsrapport-plan.md.
// Der Kunde, wie ihn ein Rapport zum Anzeigen braucht. Er steht am Projekt,
// nicht am Rapport – siehe Migration 0071.
export type KundeAmRapport = Pick<
  Kunde,
  | "id"
  | "name"
  | "vorname"
  | "email"
  | "anreise_km"
  // Für Navigation und Anruf vom Rapport aus (Phase 11, Etappe D).
  | "strasse"
  | "hausnummer"
  | "plz"
  | "ort"
  | "land"
  | "telefon"
>;

export type Rapport = {
  id: string;
  jahr: number | null;
  nummer: number | null;
  // Pflicht seit 0071: Der Rapport hängt am Auftrag, und der Auftrag kennt
  // den Kunden. Ein kunde_id am Rapport gab es bis dahin zusätzlich – zwei
  // Wege zum selben Kunden.
  projekt_id: string;
  datum: string;
  mitarbeiter_id: string;
  status: RapportStatus;
  unterschrift_png: string | null;
  unterzeichner_name: string | null;
  signiert_am: string | null;
  abschluss_vermerk: string | null;
  versendet_an: string | null;
  versendet_am: string | null;
  bemerkung: string | null;
  // Planung, nur mit Zusatzmodul Disposition genutzt (siehe 0029).
  geplant_von: string | null;
  geplant_bis: string | null;
  geplant_fuer: string | null;
  storniert_am: string | null;
  storno_grund: string | null;
  projekte?:
    | (Pick<Projekt, "id" | "bezeichnung"> & { kunden?: KundeAmRapport | null })
    | null;
  // Abgeleitet, NICHT gespeichert: gesetzt von mitKunde() (lib/rapport-kunde).
  // Bewusst Einzahl und anders benannt als die frühere Einbettung "kunden" –
  // so meldet der Compiler jede Stelle, die noch den alten Weg nimmt, statt
  // dass dort still "undefined" steht und ein Kundenname fehlt.
  kunde?: KundeAmRapport | null;
  profiles?: { id: string; name: string } | null;
  // Stand des Datensatzes – trägt die Konfliktprüfung (0039).
  updated_at?: string;
};

// Anzeigeform der Rapportnummer: 2026-0001. Vor dem Abschliessen gibt es
// noch keine – dann steht "Entwurf".
export function rapportNummer(r: Pick<Rapport, "jahr" | "nummer">): string {
  if (r.jahr == null || r.nummer == null) return "Entwurf";
  return `${r.jahr}-${String(r.nummer).padStart(4, "0")}`;
}

export type AnfrageKanal ="telefon" | "email" | "whatsapp" | "brief" | "persoenlich" | "sonstiges";
export type AnfrageStatus = "neu" | "in_bearbeitung" | "wiedervorlage" | "erledigt";
export type AnfragePrioritaet = "tief" | "normal" | "hoch";

export type Anfrage = {
  id: string;
  kunde_id: string;
  projekt_id: string | null;
  titel: string;
  beschreibung: string | null;
  kanal: AnfrageKanal;
  status: AnfrageStatus;
  prioritaet: AnfragePrioritaet;
  zugewiesen_an: string | null;
  wiedervorlage_am: string | null;
  erledigt_am: string | null;
  zeiteintrag_id: string | null;
  rapport_id: string | null;
  erstellt_von: string | null;
  created_at: string;
  kunden?: Pick<Kunde, "id" | "name" | "vorname"> | null;
  projekte?: Pick<Projekt, "id" | "bezeichnung"> | null;
  zugewiesen?: Pick<Profile, "id" | "name"> | null;
  // Stand des Datensatzes – trägt die Konfliktprüfung (0039).
  updated_at?: string;
};

export type BelegExport = {
  id: string;
  belegnummer: number;
  projekt_id: string;
  zeitraum_von: string;
  zeitraum_bis: string;
  anzahl_positionen: number;
  erstellt_am: string;
  projekte?: { bezeichnung: string; kunden?: { name: string; vorname: string | null } | null } | null;
};

export type DokumentBereich =
  | "kunde"
  | "projekt"
  | "mitarbeitende"
  | "anfrage"
  | "zeiteintrag"
  | "rapport";

export type Dokument = {
  id: string;
  bereich: DokumentBereich;
  bezug_id: string;
  dateiname: string;
  speicherpfad: string;
  mime_type: string | null;
  groesse_bytes: number | null;
  kategorie_id: string | null;
  notiz: string | null;
  hochgeladen_von: string | null;
  created_at: string;
  dokument_kategorien?: { bezeichnung: string } | null;
  hochgeladen?: { name: string } | null;
};
