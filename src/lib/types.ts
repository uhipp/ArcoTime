export type Rolle = "admin" | "mitarbeiter";

export type Profile = {
  id: string;
  name: string;
  vorname: string | null;
  nachname: string | null;
  email: string | null;
  role: Rolle;
  farbe: string;
};

export type Kunde = {
  id: string;
  adress_schluessel: string | null;
  anrede: string | null;
  vorname: string | null;
  name: string;
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
  notizen: string | null;
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

export type Einheit = "Stunde" | "Pauschale";

export type Dienstleistung = {
  id: string;
  bezeichnung: string;
  beschreibung: string | null;
  klasse_id: string;
  preis: number;
  einheit: Einheit;
  konto: string | null;
  mwst_code_id: string | null;
  aktiv: boolean;
  dienstleistungsklassen?: Pick<Dienstleistungsklasse, "id" | "bezeichnung">;
  mwst_codes?: Pick<MwstCode, "id" | "code">;
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
  timer_gestartet_um: string | null;
  beschreibung: string | null;
  rabatt_prozent: number;
  referenz: string | null;
  beleg_id: string | null;
  preis: number | null;
};

// Zeile aus der View v_zeiteintraege (inkl. berechnetem Betrag & Stammdaten)
export type ZeiteintragMitDetails = Zeiteintrag & {
  menge_stunden: number | null;
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
};

export type AnfrageKanal = "telefon" | "email" | "whatsapp" | "brief" | "persoenlich" | "sonstiges";
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
  erstellt_von: string | null;
  created_at: string;
  kunden?: Pick<Kunde, "id" | "name" | "vorname"> | null;
  projekte?: Pick<Projekt, "id" | "bezeichnung"> | null;
  zugewiesen?: Pick<Profile, "id" | "name"> | null;
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

export type DokumentBereich = "kunde" | "projekt" | "mitarbeitende" | "anfrage" | "zeiteintrag";

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
