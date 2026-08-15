"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { mitErfolg } from "@/lib/erfolg";
import { getCurrentProfile } from "@/lib/get-profile";
import { darf } from "@/lib/berechtigungen";

// Grundlagen des Zeitkontos: Monats-Soll, Pensen, Ferienanspruch,
// Anstellungsdaten (Phase 12, Etappe A).
//
// Alles Personaldaten – gepflegt wird ausschliesslich vom Admin. Die
// Regeln in 0054 sagen dasselbe; hier steht es nochmals, damit die
// Meldung verständlich bleibt statt technisch zu werden.
async function nurAdmin(pfad: string) {
  const profil = await getCurrentProfile();
  if (!darf(profil, "mitarbeitende.verwalten")) {
    redirect(`${pfad}?error=${encodeURIComponent("Dafür braucht es Administratorrechte.")}`);
  }
}

function zahl(formData: FormData, feld: string): number | null {
  const roh = String(formData.get(feld) ?? "").trim().replace(",", ".");
  if (roh === "") return null;
  const wert = Number(roh);
  return Number.isFinite(wert) ? wert : null;
}

// ---------------------------------------------------------
// Monats-Soll je Jahr
// ---------------------------------------------------------
// Zwölf Zeilen auf einmal: Wer die Tabelle vom Treuhänder abtippt, tut
// das für ein ganzes Jahr und nicht Monat für Monat.
export async function speichereSollMonate(jahr: number, formData: FormData) {
  await nurAdmin("/einstellungen/zeitkonto");
  const supabase = await createClient();

  const zeilen = [];
  for (let monat = 1; monat <= 12; monat++) {
    const wert = zahl(formData, `monat_${monat}`);
    // Leer heisst "nicht erfasst" und nicht "null Stunden" – die Zeile
    // wird dann entfernt statt auf 0 gesetzt. Ein Monat mit 0 Sollstunden
    // wäre eine Aussage, die niemand treffen wollte.
    if (wert === null) {
      await supabase.from("soll_monate").delete().eq("jahr", jahr).eq("monat", monat);
      continue;
    }
    if (wert < 0) continue;
    zeilen.push({ jahr, monat, sollstunden: wert });
  }

  if (zeilen.length > 0) {
    const { error } = await supabase
      .from("soll_monate")
      .upsert(zeilen, { onConflict: "organisation_id,jahr,monat" });
    if (error) {
      redirect(`/einstellungen/zeitkonto?jahr=${jahr}&error=${encodeURIComponent(error.message)}`);
    }
  }

  revalidatePath("/einstellungen/zeitkonto");
  redirect(
    mitErfolg(`/einstellungen/zeitkonto?jahr=${jahr}`, `Sollstunden ${jahr} gespeichert.`)
  );
}

// ---------------------------------------------------------
// Anstellung
// ---------------------------------------------------------
export async function speichereAnstellung(mitarbeiterId: string, formData: FormData) {
  const pfad = `/mitarbeiter/${mitarbeiterId}`;
  await nurAdmin(pfad);
  const supabase = await createClient();

  const datum = (feld: string) => String(formData.get(feld) ?? "").trim() || null;

  const { data: geaendert, error } = await supabase
    .from("profiles")
    .update({ eintritt: datum("eintritt"), austritt: datum("austritt") })
    .eq("id", mitarbeiterId)
    .select("id");

  if (error) redirect(`${pfad}?error=${encodeURIComponent(error.message)}`);
  if (!geaendert || geaendert.length === 0) {
    redirect(
      `${pfad}?error=${encodeURIComponent(
        "Die Änderung wurde nicht übernommen – dafür fehlen dir die Rechte."
      )}`
    );
  }

  revalidatePath(pfad);
  redirect(mitErfolg(pfad, "Anstellungsdaten gespeichert."));
}

// ---------------------------------------------------------
// Pensum
// ---------------------------------------------------------
// Ein neues Pensum ersetzt das alte nicht, es beginnt an einem Datum.
// Die Geschichte bleibt stehen, damit eine Auswertung des Vorjahres
// weiterhin mit dem Pensum rechnet, das damals galt.
export async function erfassePensum(mitarbeiterId: string, formData: FormData) {
  const pfad = `/mitarbeiter/${mitarbeiterId}`;
  await nurAdmin(pfad);
  const supabase = await createClient();

  const abDatum = String(formData.get("ab_datum") ?? "").trim();
  const prozent = zahl(formData, "pensum_prozent");

  if (!abDatum || prozent === null || prozent <= 0 || prozent > 100) {
    redirect(
      `${pfad}?error=${encodeURIComponent(
        "Bitte ein Datum und ein Pensum zwischen 1 und 100 Prozent angeben."
      )}`
    );
  }

  const { error } = await supabase.from("pensen").upsert(
    {
      mitarbeiter_id: mitarbeiterId,
      ab_datum: abDatum,
      pensum_prozent: prozent,
      arbeitstage_pro_woche: zahl(formData, "arbeitstage_pro_woche"),
      bemerkung: String(formData.get("bemerkung") ?? "").trim() || null,
    },
    { onConflict: "mitarbeiter_id,ab_datum" }
  );

  if (error) redirect(`${pfad}?error=${encodeURIComponent(error.message)}`);

  revalidatePath(pfad);
  redirect(mitErfolg(`${pfad}?fokus=neues_pensum`, "Pensum gespeichert."));
}

export async function loeschePensum(mitarbeiterId: string, pensumId: string) {
  const pfad = `/mitarbeiter/${mitarbeiterId}`;
  await nurAdmin(pfad);
  const supabase = await createClient();

  const { data: geloescht, error } = await supabase
    .from("pensen")
    .delete()
    .eq("id", pensumId)
    .select("id");

  if (error) redirect(`${pfad}?error=${encodeURIComponent(error.message)}`);
  if (!geloescht || geloescht.length === 0) {
    redirect(
      `${pfad}?error=${encodeURIComponent("Der Eintrag wurde nicht entfernt – dafür fehlen dir die Rechte.")}`
    );
  }

  revalidatePath(pfad);
  redirect(mitErfolg(pfad, "Pensum entfernt."));
}

// ---------------------------------------------------------
// Ferienanspruch
// ---------------------------------------------------------
export async function speichereFerienanspruch(mitarbeiterId: string, formData: FormData) {
  const pfad = `/mitarbeiter/${mitarbeiterId}`;
  await nurAdmin(pfad);
  const supabase = await createClient();

  const jahr = zahl(formData, "jahr");
  const tage = zahl(formData, "tage");

  if (jahr === null || jahr < 2000 || jahr > 2100 || tage === null || tage < 0) {
    redirect(
      `${pfad}?error=${encodeURIComponent("Bitte ein Jahr und die Anzahl Ferientage angeben.")}`
    );
  }

  const { error } = await supabase.from("ferienanspruch").upsert(
    {
      mitarbeiter_id: mitarbeiterId,
      jahr,
      tage,
      uebertrag_tage: zahl(formData, "uebertrag_tage") ?? 0,
      bemerkung: String(formData.get("bemerkung") ?? "").trim() || null,
    },
    { onConflict: "mitarbeiter_id,jahr" }
  );

  if (error) redirect(`${pfad}?error=${encodeURIComponent(error.message)}`);

  revalidatePath(pfad);
  redirect(mitErfolg(`${pfad}?fokus=neuer_anspruch`, "Ferienanspruch gespeichert."));
}

// ---------------------------------------------------------
// Manuelle Buchungen im Zeitkonto (0057)
// ---------------------------------------------------------
export async function erfasseZeitkontoBuchung(mitarbeiterId: string, formData: FormData) {
  const pfad = `/mitarbeiter/${mitarbeiterId}/zeitkonto`;
  await nurAdmin(pfad);
  const supabase = await createClient();

  const datum = String(formData.get("datum") ?? "").trim();
  const stunden = zahl(formData, "stunden");
  const grund = String(formData.get("grund") ?? "").trim();

  if (!datum || stunden === null || stunden === 0 || !grund) {
    redirect(
      `${pfad}?error=${encodeURIComponent(
        "Bitte Datum, eine Stundenzahl ungleich null und einen Grund angeben."
      )}`
    );
  }

  const { error } = await supabase.from("zeitkonto_buchungen").insert({
    mitarbeiter_id: mitarbeiterId,
    datum,
    stunden,
    grund,
  });

  if (error) redirect(`${pfad}?error=${encodeURIComponent(error.message)}`);

  revalidatePath(pfad);
  redirect(
    mitErfolg(
      `${pfad}?jahr=${datum.slice(0, 4)}&fokus=buchung_datum`,
      "Buchung erfasst."
    )
  );
}

export async function loescheZeitkontoBuchung(mitarbeiterId: string, buchungId: string) {
  const pfad = `/mitarbeiter/${mitarbeiterId}/zeitkonto`;
  await nurAdmin(pfad);
  const supabase = await createClient();

  const { data: geloescht, error } = await supabase
    .from("zeitkonto_buchungen")
    .delete()
    .eq("id", buchungId)
    .select("id");

  if (error) redirect(`${pfad}?error=${encodeURIComponent(error.message)}`);
  if (!geloescht || geloescht.length === 0) {
    redirect(
      `${pfad}?error=${encodeURIComponent("Die Buchung wurde nicht entfernt – dafür fehlen dir die Rechte.")}`
    );
  }

  revalidatePath(pfad);
  redirect(mitErfolg(pfad, "Buchung entfernt."));
}
