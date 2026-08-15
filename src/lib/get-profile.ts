import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

// react-cache: innerhalb EINES Requests (Layout + Page + evtl. weitere
// Komponenten, die alle denselben eingeloggten Nutzer brauchen) wird
// supabase.auth.getUser() dadurch nur EINMAL wirklich über das Netz zu
// Supabase Auth geschickt, statt bei jedem Aufruf erneut – das war die
// Hauptursache für das spürbar langsame Laden/Speichern (jeder Seitenaufbau
// hat bisher 2-4 einzelne Auth-Roundtrips ausgelöst, weil Layout, Page und
// teilweise die Seite selbst je einmal separat nachgefragt haben).
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
});

// Lädt Profil (Name + Rolle) des eingeloggten Nutzers.
// Middleware garantiert bereits, dass ein Nutzer eingeloggt ist.
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, name, vorname, nachname, email, role, ist_platform_admin")
    .eq("id", user.id)
    .single();

  return profile as Profile | null;
});

// Lädt Name der Organisation (Mandant) des eingeloggten Nutzers – wird im
// Header statt eines fixen Kunden-Logos angezeigt, da ArcoTime an mehrere
// Organisationen (Mandanten) vergeben werden kann und das Arcos-Group-Logo
// dafür nicht (mehr) passend ist.
export type OrganisationDaten = {
  id: string;
  name: string;
  zeige_auf_login: boolean;
  warnung_ab_minuten_pro_tag: number | null;
  sperre_ab_minuten_pro_tag: number | null;
  modul_disposition: boolean;
  // Zusatzmodul Zeitkonto (0054) und die Grundlagen des Tages-Solls.
  modul_zeitkonto: boolean;
  wochenstunden: number;
  arbeitstage_pro_woche: number;
  feiertage_im_sollstunden_enthalten: boolean;
  arbeitstag_von_minuten: number;
  arbeitstag_bis_minuten: number;
  // Absenderangaben für Dokumente, die beim Kunden bleiben (0042).
  strasse: string | null;
  hausnummer: string | null;
  plz: string | null;
  ort: string | null;
  telefon: string | null;
  email: string | null;
  webseite: string | null;
  logo_pfad: string | null;
};

export const getCurrentOrganisation = cache(
  async (): Promise<OrganisationDaten | null> => {
    const user = await getCurrentUser();
    if (!user) return null;

    const supabase = await createClient();
    const { data } = await supabase
      .from("profiles")
      .select("*, organisationen(id, name, zeige_auf_login, warnung_ab_minuten_pro_tag, sperre_ab_minuten_pro_tag, modul_disposition, modul_zeitkonto, wochenstunden, arbeitstage_pro_woche, feiertage_im_sollstunden_enthalten, arbeitstag_von_minuten, arbeitstag_bis_minuten, strasse, hausnummer, plz, ort, telefon, email, webseite, logo_pfad)")
      .eq("id", user.id)
      .single();

    return (
      (data?.organisationen as OrganisationDaten | null) ?? null
    );
  }
);
