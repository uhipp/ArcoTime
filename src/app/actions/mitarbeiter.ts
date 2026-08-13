"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { mitErfolg } from "@/lib/erfolg";
import { siteOrigin } from "@/lib/site-origin";
import { getCurrentProfile } from "@/lib/get-profile";

// Maximal erlaubte Admin-Konten je Organisation (Geschäftsregel, nicht
// technisch nötig) – begrenzt das Risiko, dass beliebig viele Konten
// Verwaltungsrechte erhalten.
const MAX_ADMINS_PRO_ORGANISATION = 2;

export async function updateMitarbeiter(id: string, formData: FormData) {
  const supabase = await createClient();

  const vorname = String(formData.get("vorname") ?? "").trim() || null;
  const nachname = String(formData.get("nachname") ?? "").trim() || null;
  const role = String(formData.get("role") ?? "mitarbeiter");
  const farbe = String(formData.get("farbe") ?? "").trim() || null;

  if (role === "admin") {
    const { data: bestehend } = await supabase
      .from("profiles")
      .select("organisation_id")
      .eq("id", id)
      .single();

    if (bestehend?.organisation_id) {
      const { count } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("organisation_id", bestehend.organisation_id)
        .eq("role", "admin")
        .neq("id", id);

      if ((count ?? 0) >= MAX_ADMINS_PRO_ORGANISATION) {
        redirect(
          `/mitarbeiter?error=${encodeURIComponent(
            `Maximal ${MAX_ADMINS_PRO_ORGANISATION} Admin-Konten pro Organisation erlaubt.`
          )}`
        );
      }
    }
  }

  // Bewusst mit .select(): Verweigert RLS das Update (fremde Organisation,
  // fehlende Adminrolle), liefert Postgres KEINEN Fehler, sondern schlicht
  // null betroffene Zeilen. Ohne diese Prüfung meldete die Seite dann
  // "gespeichert", obwohl nichts geändert wurde – nicht unterscheidbar von
  // "die Bearbeitung funktioniert nicht".
  const { data: geaendert, error } = await supabase
    .from("profiles")
    .update({ vorname, nachname, role, farbe })
    .eq("id", id)
    .select("id");

  if (error) {
    redirect(`/mitarbeiter?error=${encodeURIComponent(error.message)}`);
  }

  if (!geaendert || geaendert.length === 0) {
    redirect(
      `/mitarbeiter?error=${encodeURIComponent(
        "Änderung wurde nicht übernommen – für diese Person fehlen dir die Rechte. Nur Admins der eigenen Organisation dürfen Mitarbeitende bearbeiten."
      )}`
    );
  }

  revalidatePath("/mitarbeiter");
  redirect(mitErfolg("/mitarbeiter", "Mitarbeitende gespeichert."));
}

// Lädt eine neue Person per E-Mail ein: legt den Login direkt an (statt nur
// eine Einladung "vorzumerken") und verknüpft sie sofort mit der eigenen
// Organisation. Braucht den Service-Role-Key, weil das Anlegen von Logins
// über die normale (RLS-beschränkte) Verbindung nicht möglich ist.
export async function ladeMitarbeitendeEin(formData: FormData) {
  const profil = await getCurrentProfile();
  if (profil?.role !== "admin") {
    redirect(`/mitarbeiter?error=${encodeURIComponent("Nur Admins können Mitarbeitende einladen.")}`);
  }

  const vorname = String(formData.get("vorname") ?? "").trim();
  const nachname = String(formData.get("nachname") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();

  if (!vorname || !nachname || !email) {
    redirect(
      `/mitarbeiter?error=${encodeURIComponent("Bitte Vorname, Nachname und E-Mail ausfüllen.")}`
    );
  }

  const supabase = await createClient();
  const { data: eigenesProfil } = await supabase
    .from("profiles")
    .select("organisation_id")
    .eq("id", (await supabase.auth.getUser()).data.user?.id ?? "")
    .single();

  if (!eigenesProfil?.organisation_id) {
    redirect(`/mitarbeiter?error=${encodeURIComponent("Keine Organisation gefunden.")}`);
  }

  // Lizenzlimit prüfen: NULL = unbegrenzt (eigene, nicht-zahlende
  // Organisation). Gezählt werden nur AKTIVE (nicht deaktivierte) Konten –
  // eine deaktivierte Lizenz gilt als wieder frei.
  const { data: organisation } = await supabase
    .from("organisationen")
    .select("lizenzen_gebucht")
    .eq("id", eigenesProfil.organisation_id)
    .single();

  if (organisation?.lizenzen_gebucht != null) {
    const { count } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("organisation_id", eigenesProfil.organisation_id)
      .is("deaktiviert_am", null);

    if ((count ?? 0) >= organisation.lizenzen_gebucht) {
      redirect(
        `/mitarbeiter?error=${encodeURIComponent(
          `Lizenzlimit erreicht (${organisation.lizenzen_gebucht} gebuchte Lizenzen). ` +
            "Bitte ein nicht mehr benötigtes Konto deaktivieren oder weitere Lizenzen buchen."
        )}`
      );
    }
  }

  const origin = await siteOrigin();
  const admin = createAdminClient();

  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${origin}/auth/confirm`,
    data: {
      vorname,
      nachname,
      organisation_id: eigenesProfil.organisation_id,
    },
  });

  if (error) {
    redirect(`/mitarbeiter?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/mitarbeiter");
  redirect(mitErfolg("/mitarbeiter", `Einladung an ${email} gesendet.`));
}

// Einmalige Selbst-Deaktivierung: gibt die Lizenz wieder frei, ohne den
// Datensatz zu löschen (Zeiteinträge/Anfragen/Dokumente blieben sonst ohne
// gültige Referenz). Reaktivieren kann danach nur noch ein Arcos-
// Platform-Admin (siehe src/app/actions/plattform.ts) – bewusst nicht
// selbst rückgängig machbar, sonst liesse sich das Lizenzlimit durch
// Deaktivieren/Reaktivieren im Kreis umgehen.
export async function deaktiviereMitarbeiter(id: string) {
  const profil = await getCurrentProfile();
  if (profil?.role !== "admin") {
    redirect(`/mitarbeiter?error=${encodeURIComponent("Nur Admins können Konten deaktivieren.")}`);
  }
  if (profil.id === id) {
    redirect(`/mitarbeiter?error=${encodeURIComponent("Das eigene Konto kann nicht deaktiviert werden.")}`);
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ deaktiviert_am: new Date().toISOString(), deaktiviert_von: profil.id })
    .eq("id", id);

  if (error) {
    redirect(`/mitarbeiter?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/mitarbeiter");
  redirect(
    mitErfolg(
      "/mitarbeiter",
      "Konto deaktiviert, Lizenz freigegeben. Eine Reaktivierung ist nur durch Arcos möglich."
    )
  );
}
