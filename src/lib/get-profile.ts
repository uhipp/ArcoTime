import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

// Lädt Profil (Name + Rolle) des eingeloggten Nutzers.
// Middleware garantiert bereits, dass ein Nutzer eingeloggt ist.
export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, name, role")
    .eq("id", userData.user.id)
    .single();

  return profile as Profile | null;
}
