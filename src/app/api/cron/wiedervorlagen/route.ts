import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { heuteIso } from "@/lib/date-utils";
import { sendeMail } from "@/lib/email";
import { erinnereAnOffeneRapporte } from "@/lib/cron/offene-rapporte";
import { APP_URL } from "@/lib/app-url";

// Die täglichen Meldungen von ArcoTime (über Vercel Cron, siehe
// vercel.json): fällige Wiedervorlagen und offene Rapporte vergangener
// Tage.
//
// Beide teilen sich bewusst EINEN Lauf und diesen Pfad. Der Name ist
// historisch – als die Erinnerung an offene Rapporte dazukam, wäre ein
// zweiter Cron-Eintrag der sauberere Name gewesen, hätte aber das
// Kontingent des Hosting-Tarifs beansprucht und den Sommer-/Winterzeit-
// Guard unten ein zweites Mal gebraucht. Eine Meldung am Morgen ist
// ohnehin genug. Läuft ohne Nutzer-Session -> Service-Role-Client nötig, da
// RLS sonst alles blockiert. Es werden bewusst ALLE Organisationen in einem
// Lauf abgedeckt (jede Anfrage bleibt über zugewiesen_an/Mitarbeiter-E-Mail
// korrekt zugeordnet).
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const header = request.headers.get("authorization");
    if (header !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
    }
  }

  // Vercel Cron kennt nur feste UTC-Zeiten (keine Zeitzone/Sommerzeit). Damit
  // der Versand ganzjährig am Morgen Schweizer Ortszeit bleibt, feuern in
  // vercel.json zwei Einträge (06:30 UTC für die Winterzeit, 05:30 UTC für
  // die Sommerzeit) – hier wird anhand der aktuellen Zürcher Ortszeit
  // entschieden, welcher der beiden gerade "der richtige" ist. Der jeweils
  // falsche Aufruf bricht einfach ohne Versand ab.
  //
  // Geprüft wird nur die STUNDE, nicht die Minute: Auf dem Hobby-Tarif löst
  // Vercel Cron-Jobs nur stundengenau aus (dokumentiert als "Per-hour, ±59
  // min"). Ein Fenster von 07:15 bis 07:45 hätte die Erinnerung an rund der
  // Hälfte der Tage still verschluckt – ohne Fehler, ohne Meldung. Über die
  // Stunde kann ohnehin nur einer der beiden Einträge treffen, der andere
  // liegt garantiert eine Stunde daneben.
  const zuercherZeit = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Zurich",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const stunde = Number(zuercherZeit.find((t) => t.type === "hour")?.value ?? "0");
  const minute = Number(zuercherZeit.find((t) => t.type === "minute")?.value ?? "0");
  const istZielzeit = stunde === 7;

  // Manueller Test-Aufruf (z.B. zum Prüfen, ob SMTP-Variablen in der
  // aktuellen Produktions-Version ankommen): überspringt NUR den
  // Zeitfenster-Guard, nicht die Secret-Prüfung oben.
  const erzwungen = request.nextUrl.searchParams.get("force") === "true";

  if (!istZielzeit && !erzwungen) {
    return NextResponse.json({
      uebersprungen: true,
      grund: "Ausserhalb des 07:30-Zeitfensters (Sommer-/Winterzeit-Guard).",
      lokaleZeitZuerich: `${String(stunde).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
    });
  }

  const supabase = createAdminClient();
  const heute = heuteIso();

  // Bewusst OHNE "zugewiesen_an is not null"-Filter: auch nicht zugewiesene
  // Anfragen sollen bei Fälligkeit ins Kanban-Board-Spalte "Wiedervorlage"
  // wandern, auch wenn dafür (mangels Zuständigem) keine Mail rausgeht.
  const { data: anfragen, error } = await supabase
    .from("anfragen")
    .select("id, titel, status, wiedervorlage_am, zugewiesen_an, kunden(name, vorname), projekte(bezeichnung)")
    .neq("status", "erledigt")
    .not("wiedervorlage_am", "is", null)
    .lte("wiedervorlage_am", heute)
    .order("wiedervorlage_am", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  type Zeile = {
    id: string;
    titel: string;
    status: string;
    wiedervorlage_am: string;
    zugewiesen_an: string | null;
    kunden: { name: string; vorname: string | null } | null;
    projekte: { bezeichnung: string } | null;
  };

  const zeilen = (anfragen ?? []) as unknown as Zeile[];

  // Kanban-Board: eine fällige Wiedervorlage wandert automatisch in die
  // Spalte "Wiedervorlage" – dieselbe Regel, die im Board für den roten
  // Rahmen sorgt, wird hier einmal täglich in einen echten Status-Wechsel
  // umgesetzt. Bereits dort liegende Anfragen werden nicht nochmals
  // angefasst (kein unnötiges Update, kein Zurücksetzen einer manuellen
  // Rückverschiebung durch die Mitarbeitenden).
  const zuVerschieben = zeilen.filter((z) => z.status !== "wiedervorlage").map((z) => z.id);
  if (zuVerschieben.length > 0) {
    await supabase.from("anfragen").update({ status: "wiedervorlage" }).in("id", zuVerschieben);
    revalidatePath("/anfragen");
  }

  // Kein früher Ausstieg mehr, wenn es keine Wiedervorlagen gibt: Die
  // Rapport-Erinnerung hängt nicht an ihnen und lief sonst nie.
  if (zeilen.length === 0) {
    const rapporte = await erinnereAnOffeneRapporte(APP_URL);
    return NextResponse.json({
      versendet: 0,
      verschoben: 0,
      mitarbeitendeOhneEmail: [],
      rapporte,
    });
  }

  const zeilenMitZustaendigem = zeilen.filter((z) => z.zugewiesen_an);
  const mitarbeiterIds = [...new Set(zeilenMitZustaendigem.map((z) => z.zugewiesen_an as string))];
  const { data: mitarbeitende } = await supabase
    .from("profiles")
    .select("id, name, email")
    .in("id", mitarbeiterIds);

  let versendet = 0;
  const mitarbeitendeOhneEmail: string[] = [];

  for (const mitarbeiter of mitarbeitende ?? []) {
    const eigene = zeilenMitZustaendigem.filter((z) => z.zugewiesen_an === mitarbeiter.id);
    if (eigene.length === 0) continue;

    if (!mitarbeiter.email) {
      mitarbeitendeOhneEmail.push(mitarbeiter.name);
      continue;
    }

    const zeilenHtml = eigene
      .map((z) => {
        const kunde = z.kunden
          ? `${z.kunden.vorname ? `${z.kunden.vorname} ` : ""}${z.kunden.name}`
          : "";
        const projekt = z.projekte ? ` · ${z.projekte.bezeichnung}` : "";
        const ueberfaellig = z.wiedervorlage_am < heute;
        const datum = new Date(z.wiedervorlage_am).toLocaleDateString("de-CH");
        return `
          <tr style="border-bottom:1px solid #e5e7eb;">
            <td style="padding:8px 12px;">
              <a href="${APP_URL}/anfragen/${z.id}" style="color:#1D3557;text-decoration:none;font-weight:600;">${z.titel}</a>
              <div style="color:#6b7280;font-size:13px;">${kunde}${projekt}</div>
            </td>
            <td style="padding:8px 12px;white-space:nowrap;color:${ueberfaellig ? "#b91c1c" : "#6b7280"};font-weight:${ueberfaellig ? "600" : "400"};">
              ${ueberfaellig ? "Überfällig: " : ""}${datum}
            </td>
          </tr>`;
      })
      .join("");

    const html = `
      <div style="font-family:sans-serif;color:#111827;">
        <p>Hallo ${mitarbeiter.name},</p>
        <p>du hast ${eigene.length} fällige Wiedervorlage${eigene.length > 1 ? "n" : ""} in ArcoTime:</p>
        <table style="width:100%;border-collapse:collapse;margin:12px 0;">${zeilenHtml}</table>
        <p><a href="${APP_URL}/" style="color:#457B9D;">Zur Übersicht öffnen</a></p>
      </div>`;

    await sendeMail({
      an: mitarbeiter.email,
      systemAntwort: true,
      betreff: `${eigene.length} fällige Wiedervorlage${eigene.length > 1 ? "n" : ""} in ArcoTime`,
      html,
    });
    versendet += 1;
  }

  const rapporte = await erinnereAnOffeneRapporte(APP_URL);

  return NextResponse.json({
    versendet,
    verschoben: zuVerschieben.length,
    mitarbeitendeOhneEmail,
    rapporte,
  });
}
