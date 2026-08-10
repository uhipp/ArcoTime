import { LinkBestaetigenClient } from "@/components/link-bestaetigen-client";

// Ziel der E-Mail-Vorlagen "Invite user" und "Reset Password" im Supabase
// Dashboard (statt des rohen {{ .ConfirmationURL }}-Einmal-Links, der von
// E-Mail-Sicherheitsscannern automatisch abgerufen und dadurch verbraucht
// werden kann, bevor die Person selbst klickt). Erwartet:
//   {{ .SiteURL }}/link-bestaetigen?token_hash={{ .TokenHash }}&type=invite
//   {{ .SiteURL }}/link-bestaetigen?token_hash={{ .TokenHash }}&type=recovery
export default async function LinkBestaetigenPage({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string; type?: string }>;
}) {
  const { token_hash, type } = await searchParams;

  return <LinkBestaetigenClient tokenHash={token_hash ?? ""} type={type ?? ""} />;
}
