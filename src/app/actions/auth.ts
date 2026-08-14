"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { mitErfolg } from "@/lib/erfolg";
import { siteOrigin } from "@/lib/site-origin";

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(`Anmeldung fehlgeschlagen: ${error.message}`)}`);
  }

  redirect("/");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) {
    redirect(`/passwort-vergessen?error=${encodeURIComponent("Bitte E-Mail-Adresse eingeben.")}`);
  }

  const supabase = await createClient();
  const origin = await siteOrigin();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/confirm`,
  });

  // Bewusst KEINE Fehlermeldung anzeigen, wenn die Adresse nicht existiert
  // (sonst könnte man erraten, welche E-Mails registriert sind). Echte
  // Fehler (z.B. Rate-Limit) landen ohnehin im Supabase-Log.
  if (error) {
    console.error("resetPasswordForEmail:", error.message);
  }

  redirect("/passwort-vergessen?gesendet=1");
}

export async function setzeNeuesPasswort(formData: FormData) {
  const passwort = String(formData.get("passwort") ?? "");
  const passwortWiederholung = String(formData.get("passwort_wiederholung") ?? "");

  if (passwort.length < 8) {
    redirect(
      `/passwort-setzen?error=${encodeURIComponent("Passwort muss mindestens 8 Zeichen haben.")}`
    );
  }
  if (passwort !== passwortWiederholung) {
    redirect(`/passwort-setzen?error=${encodeURIComponent("Passwörter stimmen nicht überein.")}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: passwort });

  if (error) {
    console.error("Passwort setzen fehlgeschlagen", {
      code: (error as { code?: string }).code,
      meldung: error.message,
    });

    // Supabase antwortet hier auf Englisch. "same_password" ist dabei die
    // einzige Meldung, die einen Anwender ratlos zurücklässt: Wer gerade
    // erst eingeladen wurde, hat aus seiner Sicht gar kein altes Passwort.
    const code = (error as { code?: string }).code;
    const text =
      code === "same_password"
        ? "Dieses Passwort ist für dein Konto bereits hinterlegt. Wähle bitte ein anderes – oder melde dich direkt damit an, falls du es zuvor schon gesetzt hast."
        : error.message;

    redirect(`/passwort-setzen?error=${encodeURIComponent(text)}`);
  }

  redirect(mitErfolg("/", "Passwort erfolgreich geändert."));
}
