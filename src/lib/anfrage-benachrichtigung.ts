import type { createClient } from "@/lib/supabase/server";
import { sendeMail } from "@/lib/email";
import { APP_URL } from "@/lib/app-url";

// Benachrichtigt eine Person per E-Mail, wenn ihr eine Anfrage zugewiesen
// wurde – wird sowohl beim Erstellen (Zuweisung direkt bei Erfassung) als
// auch beim Bearbeiten (Zuweisung geändert) aufgerufen. Läuft mit dem
// request-gebundenen Client (nicht Service-Role): Kolleg:innen-Namen/-Mails
// unter RLS zu lesen ist bereits an anderer Stelle (Zuweisen-Auswahlliste,
// Mitarbeitenden-Seite) erlaubt, ein eigener Admin-Client ist hier nicht
// nötig.
//
// Bewusst fehlertolerant: ein SMTP-Ausfall darf das eigentliche Speichern
// der Anfrage nicht verhindern – Fehler werden geloggt, nicht geworfen.
export async function benachrichtigeZuweisung({
  supabase,
  anfrageId,
  titel,
  zugewiesenAnId,
  zugewiesenVonId,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  anfrageId: string;
  titel: string;
  zugewiesenAnId: string;
  zugewiesenVonId: string | null;
}) {
  // Selbstzuweisung (z.B. über "Übernehmen"): keine Mail, das wäre nur
  // eine Benachrichtigung an sich selbst über die eigene Aktion.
  if (zugewiesenAnId === zugewiesenVonId) return;

  try {
    const [{ data: empfaenger }, { data: absender }] = await Promise.all([
      supabase.from("profiles").select("name, email").eq("id", zugewiesenAnId).single(),
      zugewiesenVonId
        ? supabase.from("profiles").select("name").eq("id", zugewiesenVonId).single()
        : Promise.resolve({ data: null }),
    ]);

    if (!empfaenger?.email) return;

    const zugewiesenVonName = absender?.name ?? "jemand";
    const url = `${APP_URL}/anfragen/${anfrageId}`;

    await sendeMail({
      an: empfaenger.email,
      systemAntwort: true,
      betreff: `Dir wurde eine Anfrage zugewiesen: ${titel}`,
      html: `
        <div style="font-family:sans-serif;color:#111827;">
          <p>Hallo ${empfaenger.name},</p>
          <p><strong>${zugewiesenVonName}</strong> hat dir in ArcoTime die Anfrage
          <strong>"${titel}"</strong> zugewiesen.</p>
          <p><a href="${url}" style="color:#457B9D;">Anfrage öffnen</a></p>
        </div>`,
    });
  } catch (fehler) {
    console.error("Zuweisungs-Mail konnte nicht versendet werden:", fehler);
  }
}
