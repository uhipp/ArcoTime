import { createAdminClient } from "@/lib/supabase/admin";
import { sendeMail } from "@/lib/email";
import { siteOrigin } from "@/lib/site-origin";
import { FIRMA } from "@/content/recht";
import { SUPPORT_MAIL } from "@/lib/kontakt";

// Einladung eines neuen Kontos – von ArcoTime selbst versendet.
//
// Vorher übernahm das Supabase Auth (inviteUserByEmail). Das funktionierte,
// aber die erste Einladung an ein iCloud-Postfach landete im Spam. Die
// Kopfzeilen der abgewiesenen Mail sagen, warum es NICHT lag: SPF, DKIM
// (zweifach RSA) und DMARC bestanden alle. Übrig blieben drei Merkmale,
// die alle aus dem fremden Versand stammten:
//
//   Content-Type: text/html   – reines HTML ohne Textteil, ein klassisches
//                               Spam-Merkmal; Supabase kann keinen Textteil
//   helo=<projekt>.supabase.co – die Mail kam sichtbar von fremder Stelle
//   X-Pm-Metadata-Project-Ref  – Kopfzeilen eines fremden Dienstes
//
// Deshalb erzeugt Supabase den Link nur noch (generateLink), versendet ihn
// aber nicht. Die Mail kommt von hier: mit Textteil, mit unserem Absender,
// im selben Ton wie Rechnung und Kündigung – und mit einem Link auf
// arcotime.ch statt auf die Projektadresse von Supabase.
//
// Das ist kein Schönheitsthema. Eine bezahlte Registrierung, deren
// Einladung im Spam liegt, ist der schlimmste Zustand im ganzen Ablauf:
// Die Kundin hat bezahlt und kommt nicht hinein.

type Einladung = {
  email: string;
  vorname: string;
  nachname: string;
  organisationId: string;
  rolle: "admin" | "mitarbeiter";
  /** Für die Anrede im Mail – der Betrieb, in den eingeladen wird. */
  organisationName?: string | null;
};

export async function sendeEinladung({
  email,
  vorname,
  nachname,
  organisationId,
  rolle,
  organisationName,
}: Einladung): Promise<{ fehler: string | null }> {
  const admin = createAdminClient();
  const origin = await siteOrigin();

  // generateLink legt das Konto an – wie inviteUserByEmail – verschickt
  // aber nichts. Die Benutzerdaten landen wie bisher in den Metadaten und
  // werden beim ersten Anmelden vom Trigger ins Profil übernommen.
  const { data, error } = await admin.auth.admin.generateLink({
    type: "invite",
    email,
    options: {
      redirectTo: `${origin}/auth/confirm`,
      data: {
        vorname,
        nachname,
        organisation_id: organisationId,
        rolle_bei_einladung: rolle,
      },
    },
  });

  if (error || !data?.properties?.hashed_token) {
    return { fehler: error?.message ?? "Einladungslink konnte nicht erzeugt werden." };
  }

  // Eigener Link auf unsere Domain statt data.properties.action_link (der
  // zeigt auf die Supabase-Adresse des Projekts). /auth/confirm löst den
  // Token dort ein.
  const link = `${origin}/auth/confirm?token_hash=${encodeURIComponent(
    data.properties.hashed_token
  )}&type=invite`;

  const betrieb = organisationName ? `<strong>${organisationName}</strong>` : "eurem Betrieb";

  const html = `
    <div style="font-family:sans-serif;color:#111827;line-height:1.5;">
      <p>Hallo ${vorname}</p>
      <p>
        Für dich wurde bei ${betrieb} ein Zugang zu <strong>ArcoTime</strong> eingerichtet –
        der Anwendung für Zeiterfassung, Arbeitsrapporte und Auswertungen.
      </p>
      <p>Über den folgenden Link setzt du dein Passwort und meldest dich zum ersten Mal an:</p>
      <p style="margin:24px 0;">
        <a href="${link}" style="background:#1D3557;color:#ffffff;padding:12px 20px;border-radius:6px;text-decoration:none;display:inline-block;">
          Passwort setzen und starten
        </a>
      </p>
      <p style="font-size:13px;color:#555555;">
        Der Link ist 24 Stunden gültig. Funktioniert der Knopf nicht, kopiere diese Adresse
        in den Browser:<br>${link}
      </p>
      <p style="font-size:13px;color:#555555;">
        Du erwartest keine Einladung? Dann ignoriere diese Nachricht – ohne den Link
        passiert nichts. Bei Fragen: ${SUPPORT_MAIL}
      </p>
      <p>Freundliche Grüsse<br>${FIRMA.name}</p>
    </div>`;

  try {
    await sendeMail({
      an: email,
      systemAntwort: true,
      betreff: organisationName
        ? `Dein Zugang zu ArcoTime für ${organisationName}`
        : "Dein Zugang zu ArcoTime",
      html,
    });
  } catch (fehler) {
    // Das Konto existiert jetzt, die Mail nicht. Das muss der aufrufenden
    // Stelle als Fehler zurück – sonst glaubt jemand, die Person sei
    // eingeladen, und wartet auf eine Mail, die nie kommt.
    return { fehler: `Konto angelegt, aber die Einladung konnte nicht versendet werden: ${(fehler as Error).message}` };
  }

  return { fehler: null };
}
