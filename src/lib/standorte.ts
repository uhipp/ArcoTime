import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganisation } from "@/lib/get-profile";

/**
 * Ist die Ortsebene für diesen Betrieb eingeschaltet? (organisationen.standorte_aktiv, 0076)
 *
 * Warum der Schalter überhaupt existiert: Ein Einmannbetrieb mit einem Ort je
 * Kunde soll keinen Reiter und kein Auswahlfeld pflegen, das für ihn immer
 * dasselbe sagt. Ist er aus, füllt der Trigger aus 0077 den Standardstandort
 * am Auftrag von selbst – die Daten stimmen also auch dann.
 *
 * Warum die Abfrage nicht in getCurrentOrganisation steht: Die läuft im
 * Layout über JEDER Seite. Eine Spalte, die es vor der Migration noch nicht
 * gibt, würde dort die ganze Anwendung anhalten. Hier kostet ein Fehlschlag
 * nichts – dann ist die Ortsebene eben aus.
 *
 * cache() je Anfrage: Die Kundenmaske und das Auftragsformular fragen beide.
 */
export const standorteAktiv = cache(async (): Promise<boolean> => {
  const organisation = await getCurrentOrganisation();
  if (!organisation) return false;
  const supabase = await createClient();
  const { data } = await supabase
    .from("organisationen")
    .select("standorte_aktiv")
    .eq("id", organisation.id)
    .maybeSingle();
  return data?.standorte_aktiv === true;
});
