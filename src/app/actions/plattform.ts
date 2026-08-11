"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/get-profile";
import { mitErfolg } from "@/lib/erfolg";
import { siteOrigin } from "@/lib/site-origin";

// Alle Aktionen hier sind ausschliesslich Platform-Admins vorbehalten
// (Arcos Group selbst) – nicht den Admins einzelner Kunden-Organisationen.
// Der Rollen-Check läuft bewusst in JEDER Aktion einzeln (nicht nur auf
// Seitenebene), falls eine Aktion direkt aufgerufen wird.
async function pruefePlatformAdmin() {
  const profil = await getCurrentProfile();
  if (!profil?.ist_platform_admin) {
    redirect(`/plattform?error=${encodeURIComponent("Nur für Arcos-Mitarbeitende zugänglich.")}`);
  }
  return profil;
}

// Neue Kunden-Organisation anlegen (oder den Demo-Mandanten) inkl. erstem
// Admin-Konto. Nutzt den Service-Role-Client für die Einladung – identisch
// zur bestehenden Mitarbeitenden-Einladung (ladeMitarbeitendeEin).
export async function erstelleOrganisation(formData: FormData) {
  await pruefePlatformAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const lizenzenGebucht = Number(formData.get("lizenzen_gebucht") ?? 0);
  const abrechnungszyklus = String(formData.get("abrechnungszyklus") ?? "monatlich");
  const preisProZyklus = String(formData.get("preis_pro_zyklus") ?? "").trim();
  const adminVorname = String(formData.get("admin_vorname") ?? "").trim();
  const adminNachname = String(formData.get("admin_nachname") ?? "").trim();
  const adminEmail = String(formData.get("admin_email") ?? "").trim();
  const istDemo = formData.get("ist_demo") === "on";

  if (!name || !lizenzenGebucht || !adminVorname || !adminNachname || !adminEmail) {
    redirect(
      `/plattform?error=${encodeURIComponent(
        "Bitte Name, Anzahl Lizenzen und die Angaben zum ersten Admin-Konto ausfüllen."
      )}`
    );
  }

  const supabase = await createClient();
  const { data: neueOrg, error } = await supabase
    .from("organisationen")
    .insert({
      name,
      lizenzen_gebucht: lizenzenGebucht,
      abrechnungszyklus,
      preis_pro_zyklus: preisProZyklus ? Number(preisProZyklus) : null,
      // Demo-Mandanten testen üblicherweise unbefristet, nicht über die
      // reguläre 14-Tage-Testphase – status bleibt daher "aktiv".
      status: "aktiv",
    })
    .select("id")
    .single();

  if (error || !neueOrg) {
    redirect(`/plattform?error=${encodeURIComponent(error?.message ?? "Unbekannter Fehler.")}`);
  }

  const origin = await siteOrigin();
  const admin = createAdminClient();
  const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(adminEmail, {
    redirectTo: `${origin}/auth/confirm`,
    data: {
      vorname: adminVorname,
      nachname: adminNachname,
      organisation_id: neueOrg.id,
      // Direkt als Admin ihrer neuen Organisation anlegen – ohne das müsste
      // erst manuell die Rolle nachträglich hochgestuft werden.
      rolle_bei_einladung: "admin",
    },
  });

  if (inviteError) {
    redirect(
      `/plattform?error=${encodeURIComponent(
        `Organisation "${name}" angelegt, aber Einladung fehlgeschlagen: ${inviteError.message}`
      )}`
    );
  }

  revalidatePath("/plattform");
  redirect(
    mitErfolg(
      "/plattform",
      istDemo
        ? `Demo-Organisation "${name}" angelegt, Einladung an ${adminEmail} gesendet.`
        : `Organisation "${name}" angelegt, Einladung an ${adminEmail} gesendet.`
    )
  );
}

// Lizenz-/Abo-Felder einer bestehenden Organisation anpassen (Korrektur bei
// Erfassungsfehlern, Testphase manuell verlängern, Status ändern, ...).
export async function aktualisiereOrganisation(id: string, formData: FormData) {
  await pruefePlatformAdmin();

  const status = String(formData.get("status") ?? "aktiv");
  const lizenzenGebuchtRoh = String(formData.get("lizenzen_gebucht") ?? "").trim();
  const abrechnungszyklus = String(formData.get("abrechnungszyklus") ?? "monatlich");
  const preisProZyklusRoh = String(formData.get("preis_pro_zyklus") ?? "").trim();
  const testEndetAmRoh = String(formData.get("test_endet_am") ?? "").trim();
  const naechsterZahlterminRoh = String(formData.get("naechster_zahltermin") ?? "").trim();

  const supabase = await createClient();
  const { error } = await supabase
    .from("organisationen")
    .update({
      status,
      // Leeres Feld -> unbegrenzt (NULL), wie bei der eigenen Organisation.
      lizenzen_gebucht: lizenzenGebuchtRoh ? Number(lizenzenGebuchtRoh) : null,
      abrechnungszyklus,
      preis_pro_zyklus: preisProZyklusRoh ? Number(preisProZyklusRoh) : null,
      test_endet_am: testEndetAmRoh || null,
      naechster_zahltermin: naechsterZahlterminRoh || null,
      // Ein manuelles Speichern im Platform-Admin-Bereich gilt als bewusste
      // Entscheidung – ein evtl. vorher gesetzter automatischer Sperrgrund
      // (Testphase abgelaufen, Zahlung fehlgeschlagen) wird zurückgesetzt,
      // wenn der Status dabei auf "aktiv" gesetzt wird.
      sperrgrund: status === "aktiv" ? null : formData.get("sperrgrund") || null,
    })
    .eq("id", id);

  if (error) {
    redirect(`/plattform?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/plattform");
  redirect(mitErfolg("/plattform", "Organisation gespeichert."));
}

// QR-Rechnung/klassische Rechnung: Zahlungseingang kann nicht automatisch
// erkannt werden, daher bestätigt hier ein Arcos-Mitarbeiter den Eingang
// manuell und schaltet die Organisation damit frei.
export async function alsBezahltMarkieren(id: string) {
  await pruefePlatformAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("organisationen")
    .update({ status: "aktiv", sperrgrund: null })
    .eq("id", id);

  revalidatePath("/plattform");
  if (error) throw new Error(error.message);
}

// Reaktiviert ein von einer Kundenorganisation selbst deaktiviertes Konto
// (Lizenz wieder "belegt"). Bewusst NICHT über die reguläre, organisations-
// beschränkte Update-Policy möglich – nur Platform-Admins, deshalb über den
// Service-Role-Client (die Policy "profiles_update_own_or_admin" deckt
// fremde Organisationen nicht ab, absichtlich).
export async function reaktiviereMitarbeiter(profilId: string) {
  await pruefePlatformAdmin();
  const admin = createAdminClient();

  const { error } = await admin
    .from("profiles")
    .update({ deaktiviert_am: null, deaktiviert_von: null })
    .eq("id", profilId);

  revalidatePath("/plattform");
  if (error) throw new Error(error.message);
}
