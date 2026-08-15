"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { mitErfolg } from "@/lib/erfolg";
import { getCurrentProfile } from "@/lib/get-profile";
import { fuehreAus, macheRueckgaengig, type AufgabenSchluessel } from "@/lib/datenpflege";
import { darf } from "@/lib/berechtigungen";

const PFAD = "/einstellungen/datenpflege";

// Auslösen und Rückgängigmachen liegen beim Admin der Organisation.
//
// Die Regel in der Datenbank sagt dasselbe (0052); geprüft wird trotzdem
// auch hier, damit die Meldung verständlich ist statt technisch.
async function nurAdmin() {
  const profile = await getCurrentProfile();
  if (!darf(profile, "datenpflege.verwalten")) {
    redirect(`${PFAD}?error=${encodeURIComponent("Dafür braucht es Administratorrechte.")}`);
  }
}

export async function starteAufgabe(aufgabe: AufgabenSchluessel) {
  await nurAdmin();
  const supabase = await createClient();

  const { anzahl, fehler } = await fuehreAus(supabase, aufgabe);

  if (fehler) {
    redirect(`${PFAD}?error=${encodeURIComponent(fehler)}`);
  }

  revalidatePath(PFAD);
  revalidatePath("/kunden");
  redirect(
    mitErfolg(
      PFAD,
      anzahl > 0
        ? `${anzahl} Datensätze angepasst. Der Lauf lässt sich unten rückgängig machen.`
        : "Es gab nichts anzupassen."
    )
  );
}

export async function widerrufeLauf(laufId: string) {
  await nurAdmin();
  const supabase = await createClient();

  const { anzahl, fehler } = await macheRueckgaengig(supabase, laufId);

  if (fehler) {
    redirect(`${PFAD}?error=${encodeURIComponent(fehler)}`);
  }

  revalidatePath(PFAD);
  revalidatePath("/kunden");
  redirect(mitErfolg(PFAD, `${anzahl} Datensätze auf den Stand davor zurückgesetzt.`));
}
