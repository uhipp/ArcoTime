export type Rolle = "admin" | "mitarbeiter";

export type Profile = {
  id: string;
  name: string;
  role: Rolle;
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

export type MandatStatus = "aktiv" | "inaktiv";

export type Mandat = {
  id: string;
  kunde_id: string;
  bezeichnung: string;
  status: MandatStatus;
  kostenstelle: string | null;
  startdatum: string;
  notizen: string | null;
  sichtbar_fuer_alle: boolean;
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
  mandat_id: string;
  dienstleistung_id: string;
  user_id: string;
  datum: string;
  start_zeit: string | null;
  end_zeit: string | null;
  dauer_minuten: number;
  beschreibung: string | null;
  rabatt_prozent: number;
  referenz: string | null;
  beleg_id: string | null;
  preis: number | null;
};

// Zeile aus der View v_zeiteintraege (inkl. berechnetem Betrag & Stammdaten)
export type ZeiteintragMitDetails = Zeiteintrag & {
  menge_stunden: number;
  betrag: number;
  mandat_bezeichnung: string;
  kostenstelle: string | null;
  kunde_id: string;
  kunde_name: string;
  vorname: string | null;
  dienstleistung_bezeichnung: string;
  mitarbeiter_name: string;
};
