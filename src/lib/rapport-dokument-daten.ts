import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganisation } from "@/lib/get-profile";
import { logoAdresseVon } from "@/lib/logo-adresse";
import type { Rapport, ZeiteintragMitDetails } from "@/lib/types";

export type DokumentAdresse = {
  name: string;
  vorname: string | null;
  adresse_zusatz: string | null;
  strasse: string | null;
  hausnummer: string | null;
  postfach: string | null;
  plz: string | null;
  ort: string | null;
};

export type RapportDokument = {
  rapport: Rapport;
  positionen: ZeiteintragMitDetails[];
  kunde: DokumentAdresse | null;
  absender: {
    name: string | null;
    strasse: string | null;
    plz: string | null;
    ort: string | null;
    telefon: string | null;
    email: string | null;
    webseite: string | null;
    logoAdresse: string | null;
    // Name – Strasse Nr – PLZ Ort, für die Zeile über der Anschrift.
    zeile: string | null;
  };
  summeStunden: number;
};

// Lädt alles, was ein Rapportdokument braucht – für die Druckansicht wie
// für das PDF.
//
// Bewusst gemeinsam: Beide zeigen dasselbe Dokument, und zwei getrennte
// Abfragen würden über kurz oder lang Verschiedenes zeigen. Genau diese
// Art von doppelt geführter Wahrheit hat in diesem Projekt schon mehrfach
// Fehler erzeugt.
export async function ladeRapportDokument(id: string): Promise<RapportDokument | null> {
  const supabase = await createClient();

  const [organisation, { data: rapportRoh }, { data: positionenRoh }] = await Promise.all([
    getCurrentOrganisation(),
    supabase
      .from("rapporte")
      .select(
        // Der Kunde hängt seit 0071 am Projekt, nicht am Rapport – die
        // Anschrift des Rapport-PDF kommt deshalb verschachtelt.
        "*, projekte(bezeichnung, kostenstelle, kunden(name, vorname, adresse_zusatz, strasse, hausnummer, postfach, plz, ort)), profiles!rapporte_mitarbeiter_id_fkey(name)"
      )
      .eq("id", id)
      .single(),
    supabase
      .from("v_zeiteintraege")
      .select("*")
      .eq("rapport_id", id)
      .order("start_zeit", { ascending: true, nullsFirst: false }),
  ]);

  if (!rapportRoh) return null;

  const kunde =
    (rapportRoh as { projekte?: { kunden?: DokumentAdresse | null } | null })
      .projekte?.kunden ?? null;
  const absenderStrasse =
    [organisation?.strasse, organisation?.hausnummer].filter(Boolean).join(" ") || null;

  const zeile =
    [
      organisation?.name,
      absenderStrasse,
      [organisation?.plz, organisation?.ort].filter(Boolean).join(" ") || null,
    ]
      .filter(Boolean)
      .join(" – ") || null;

  const positionen = (positionenRoh as ZeiteintragMitDetails[] | null) ?? [];

  return {
    rapport: rapportRoh as Rapport,
    positionen,
    kunde,
    absender: {
      name: organisation?.name ?? null,
      strasse: absenderStrasse,
      plz: organisation?.plz ?? null,
      ort: organisation?.ort ?? null,
      telefon: organisation?.telefon ?? null,
      email: organisation?.email ?? null,
      webseite: organisation?.webseite ?? null,
      logoAdresse: logoAdresseVon(organisation?.logo_pfad),
      zeile,
    },
    // Nur Arbeitszeit – Mengenartikel wie Kilometer oder Material haben
    // keine Dauer und dürfen die Stundensumme nicht aufblähen.
    summeStunden: positionen.reduce((s, z) => s + Number(z.menge_stunden ?? 0), 0),
  };
}
