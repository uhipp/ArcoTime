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
    .select("id, name, vorname, nachname, email, role")
    .eq("id", user.id)
    .single();

  return profile as Profile | null;
});

// Lädt Name der Organisation (Mandant) des eingeloggten Nutzers – wird im
// Header statt eines fixen Kunden-Logos angezeigt, da ArcoTime an mehrere
// Organisationen (Mandanten) vergeben werden kann und das Arcos-Group-Logo
// dafür nicht (mehr) passend ist.
export const getCurrentOrganisation = cache(
  async (): Promise<{ id: string; name: string; zeige_auf_login: boolean } | null> => {
    const user = await getCurrentUser();
    if (!user) return null;

    const supabase = await createClient();
    const { data } = await supabase
      .from("profiles")
      .select("*, organisationen(id, name, zeige_auf_login)")
      .eq("id", user.id)
      .single();

    return (
      (data?.organisationen as { id: string; name: string; zeige_auf_login: boolean } | null) ?? null
    );
  }
);
