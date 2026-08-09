"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { mitErfolg } from "@/lib/erfolg";
import { siteOrigin } from "@/lib/site-origin";
import { getCurrentProfile } from "@/lib/get-profile";

export async function updateMitarbeiter(id: string, formData: FormData) {
  const supabase = await createClient();

  const vorname = String(formData.get("vorname") ?? "").trim() || null;
  const nachname = String(formData.get("nachname") ?? "").trim() || null;
  const role = String(formData.get("role") ?? "mitarbeiter");

  const { error } = await supabase
    .from("profiles")
    .update({ vorname, nachname, role })
    .eq("id", id);

  if (error) {
    redirect(`/mitarbeiter?error=${encodeURIComponent(error.message)}`);
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
