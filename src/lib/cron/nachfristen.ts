import { createAdminClient } from "@/lib/supabase/admin";
import { sendeMail } from "@/lib/email";
import { formatDatumCH, heuteIso } from "@/lib/date-utils";
import { APP_URL } from "@/lib/app-url";
import { FIRMA } from "@/content/recht";
import { SUPPORT_MAIL } from "@/lib/kontakt";

// Tägliche Prüfung der Nachfristen (AGB Ziffer 10).
//
// Zwei Adressaten, zwei verschiedene Anlässe:
//
//   Der KUNDE wird sieben Tage vor Ablauf gewarnt, solange er noch etwas
//   tun kann. Eine Löschzusage, von der niemand rechtzeitig weiss, ist
//   eine Falle.
//
//   ARCOS erfährt, welche Mandanten zur Löschung anstehen. Gelöscht wird
//   hier NICHTS. Das ist eine bewusste Entscheidung: Eine unumkehrbare
//   Löschung fremder Betriebsdaten gehört nicht in einen Zeitplan, der um
//   sechs Uhr morgens ohne Zeugen läuft. Diese Prüfung meldet, ein Mensch
//   entscheidet, und der Knopf liegt unter /plattform.

const WARNUNG_TAGE_VORHER = 7;

type Zeile = {
  id: string;
  name: string;
  nachfrist_bis: string;
  nachfrist_warnung_am: string | null;
};

function inTagen(tage: number): string {
  const d = new Date();
  d.setDate(d.getDate() + tage);
  return d.toISOString().slice(0, 10);
}

export async function pruefeNachfristen(): Promise<{
  gewarnt: number;
  faellig: number;
  gemeldet: boolean;
}> {
  const admin = createAdminClient();
  const heute = heuteIso();

  const { data, error } = await admin
    .from("organisationen")
    .select("id, name, nachfrist_bis, nachfrist_warnung_am")
    .not("nachfrist_bis", "is", null)
    .neq("status", "aktiv")
    .order("nachfrist_bis");

  if (error) throw new Error(`Nachfristen nicht lesbar: ${error.message}`);

  const zeilen = (data ?? []) as Zeile[];
  const faellig = zeilen.filter((z) => z.nachfrist_bis < heute);
  const baldFaellig = zeilen.filter(
    (z) =>
      z.nachfrist_bis >= heute &&
      z.nachfrist_bis <= inTagen(WARNUNG_TAGE_VORHER) &&
      !z.nachfrist_warnung_am
  );

  // ---------------------------------------------------------------
  // 1) Kunden warnen
  // ---------------------------------------------------------------
  let gewarnt = 0;
  for (const organisation of baldFaellig) {
    const { data: admins } = await admin
      .from("profiles")
      .select("name, email")
      .eq("organisation_id", organisation.id)
      .eq("role", "admin");

    let zugestellt = false;
    for (const person of admins ?? []) {
      if (!person.email) continue;
      try {
        await sendeMail({
          an: person.email,
          systemAntwort: true,
          betreff: `Letzte Gelegenheit: Daten von ${organisation.name} bis ${formatDatumCH(organisation.nachfrist_bis)}`,
          html: `
            <div style="font-family:sans-serif;color:#111827;">
              <p>Hallo ${person.name},</p>
              <p>Das Abonnement von <strong>${organisation.name}</strong> ist beendet. Eure
              Daten sind noch bis zum
              <strong>${formatDatumCH(organisation.nachfrist_bis)}</strong> abrufbar.</p>
              <p>Danach werden sie gelöscht und lassen sich nicht mehr zurückholen. Wenn ihr
              etwas davon behalten wollt, ladet es bitte vorher herunter:</p>
              <p><a href="${APP_URL}/export">Alle Daten herunterladen</a></p>
              <p style="font-size:13px;color:#4b5563;">Dort stehen drei Downloads: eine
              Excel-Datei zum Anschauen, eine JSON-Datei mit allen Daten verlustfrei – und
              ein ZIP mit den hochgeladenen Dateien aus dem Bereich Dokumente. Nehmt alle
              drei mit; die Dateien sind sonst nicht dabei.</p>
              <p>Möchtet ihr weitermachen oder braucht ihr mehr Zeit? Eine kurze Nachricht an
              ${SUPPORT_MAIL} genügt.</p>
              <p>Freundliche Grüsse<br>${FIRMA.name}</p>
            </div>`,
        });
        zugestellt = true;
      } catch (fehler) {
        console.error(`Warnung an ${person.email} nicht versendet:`, fehler);
      }
    }

    // Der Vermerk wird nur gesetzt, wenn die Warnung wirklich rausging.
    // Sonst gilt sie als erledigt, ohne dass jemand sie bekommen hat – und
    // der Kunde verlöre seine Daten, ohne je gewarnt worden zu sein.
    if (zugestellt) {
      await admin
        .from("organisationen")
        .update({ nachfrist_warnung_am: new Date().toISOString() })
        .eq("id", organisation.id);
      gewarnt++;
    }
  }

  // ---------------------------------------------------------------
  // 2) Arcos melden, was zur Löschung ansteht
  // ---------------------------------------------------------------
  // Nur melden, wenn es etwas zu melden gibt. Eine tägliche Mail
  // "nichts zu tun" wird nach einer Woche ungelesen weggeklickt – und
  // dann fällt auch die eine Mail nicht mehr auf, die wichtig war.
  let gemeldet = false;
  if (faellig.length > 0) {
    const liste = faellig
      .map(
        (o) =>
          `<li><a href="${APP_URL}/plattform/${o.id}">${o.name}</a> – Nachfrist abgelaufen am ${formatDatumCH(o.nachfrist_bis)}</li>`
      )
      .join("");

    const { data: platformAdmins } = await admin
      .from("profiles")
      .select("email")
      .eq("ist_platform_admin", true);

    for (const person of platformAdmins ?? []) {
      if (!person.email) continue;
      try {
        await sendeMail({
          an: person.email,
          systemAntwort: true,
          betreff: `ArcoTime: ${faellig.length} Mandant${faellig.length === 1 ? "" : "en"} zur Löschung fällig`,
          html: `
            <div style="font-family:sans-serif;color:#111827;">
              <p>Bei folgenden Organisationen ist die 30-tägige Nachfrist nach Vertragsende
              abgelaufen. Nach AGB Ziffer 10 sind ihre Daten damit zu löschen:</p>
              <ul>${liste}</ul>
              <p>Gelöscht wird <strong>nicht automatisch</strong>. Auf der jeweiligen Seite
              unter Plattform steht der Umfang der Löschung, und dort lässt sie sich auch
              auslösen.</p>
            </div>`,
        });
        gemeldet = true;
      } catch (fehler) {
        console.error(`Fälligkeitsmeldung an ${person.email} nicht versendet:`, fehler);
      }
    }
  }

  return { gewarnt, faellig: faellig.length, gemeldet };
}
