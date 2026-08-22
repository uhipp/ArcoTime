import { Readable } from "node:stream";
import { ZipArchive, type Archiver } from "archiver";
import type { SupabaseClient } from "@supabase/supabase-js";

// Die hochgeladenen Dateien aus dem Bereich Dokumente – als ZIP zum
// Mitnehmen, und als Liste zum Wegräumen.
//
// AGB Ziffer 10 sagt zu, dass die Kundin ihre Daten jederzeit selbst
// exportieren kann und dass gelöscht wird, was ihr gehört. Der Vollexport
// (0067) löst das für die Datenbankzeilen. Die Dateien selbst blieben auf
// beiden Seiten liegen: Im Export standen sie nur mit Namen und Zuordnung,
// beim Löschen des Mandanten blieben sie im Speicher zurück – als verwaiste
// Bilder und Verträge, zu denen es keine Zeile mehr gibt, die erklärt, wem
// sie gehören.
//
// Beide Wege lesen deshalb aus derselben Quelle: den dokumente-Zeilen der
// Organisation. Was hier aufgezählt wird, wandert ins Archiv – und genau das
// wird beim Löschen entfernt. Zwei getrennte Listen würden auseinanderlaufen,
// und auffallen würde es erst, wenn die Dateien schon weg sind.

export type DokumentZeile = {
  id: string;
  bereich: string;
  bezug_id: string;
  dateiname: string;
  speicherpfad: string;
  mime_type: string | null;
  groesse_bytes: number | null;
  notiz: string | null;
  created_at: string;
  dokument_kategorien: { bezeichnung: string } | null;
  hochgeladen: { name: string } | null;
};

export type ArchivDatei = DokumentZeile & {
  /** Bezeichnung des Kunden/Projekts/…, an dem die Datei hängt. */
  bezug: string;
  /** Wo die Datei im ZIP liegt – lesbar, nicht als UUID. */
  pfadImArchiv: string;
};

export const BEREICH_ORDNER: Record<string, string> = {
  kunde: "Kunden",
  standort: "Standorte",
  projekt: "Projekte",
  mitarbeitende: "Mitarbeitende",
  anfrage: "Anfragen",
  zeiteintrag: "Zeiteinträge",
  rapport: "Rapporte",
};

// Ein Bereich, der hier fehlt, wandert unter seinem technischen Namen ins
// Archiv ("unterschrift/…") – der Ordner heisst dann unschön, aber keine
// Datei bleibt zurück. Das ist die Reihenfolge, in der es falsch sein darf:
// Vollständigkeit vor Schönheit.

// Ein Ordner- oder Dateiname, der auf Windows und macOS ohne Murren aufgeht.
// Umlaute bleiben – das ZIP wird als UTF-8 geschrieben –, aber die unter
// Windows verbotenen Zeichen und ein Punkt am Ende müssen weg, sonst lässt
// sich das Archiv dort nicht auspacken.
function sichererName(text: string, ersatz: string): string {
  const bereinigt = text
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[. ]+$/, "")
    .slice(0, 80)
    .trim();
  return bereinigt || ersatz;
}

// Gleiche Dateinamen im gleichen Ordner sind der Normalfall, nicht die
// Ausnahme ("Foto.jpg" bei jedem zweiten Kunden). Ohne diesen Schritt
// überschreibt das Auspacken die eine Datei mit der anderen, und niemand
// merkt es. Verglichen wird ohne Gross-/Kleinschreibung, weil Windows und
// macOS "Foto.jpg" und "foto.JPG" für dieselbe Datei halten.
function eindeutig(pfad: string, vergeben: Set<string>): string {
  const merken = (kandidat: string) => {
    vergeben.add(kandidat.toLowerCase());
    return kandidat;
  };
  if (!vergeben.has(pfad.toLowerCase())) return merken(pfad);

  const punkt = pfad.lastIndexOf(".");
  const hatEndung = punkt > pfad.lastIndexOf("/");
  const stamm = hatEndung ? pfad.slice(0, punkt) : pfad;
  const endung = hatEndung ? pfad.slice(punkt) : "";

  for (let n = 2; ; n++) {
    const kandidat = `${stamm} (${n})${endung}`;
    if (!vergeben.has(kandidat.toLowerCase())) return merken(kandidat);
  }
}

/**
 * Alle Dokumentdateien einer Organisation, mit lesbarem Pfad im Archiv.
 *
 * Zeilen mit dem Platzhalter-Speicherpfad "pending" sind abgebrochene
 * Uploads – zu ihnen gibt es keine Datei (siehe bereiteDokumentUploadVor).
 */
export async function sammleDokumentDateien(
  admin: SupabaseClient,
  organisationId: string
): Promise<ArchivDatei[]> {
  const { data, error } = await admin
    .from("dokumente")
    .select(
      "id, bereich, bezug_id, dateiname, speicherpfad, mime_type, groesse_bytes, notiz, created_at, dokument_kategorien(bezeichnung), hochgeladen:profiles!hochgeladen_von(name)"
    )
    .eq("organisation_id", organisationId)
    .neq("speicherpfad", "pending")
    .order("bereich")
    .order("created_at");

  if (error) {
    throw new Error(`Dokumente liessen sich nicht lesen: ${error.message}`);
  }

  const zeilen = (data ?? []) as unknown as DokumentZeile[];
  if (zeilen.length === 0) return [];

  const idsFuer = (bereich: string) => [
    ...new Set(zeilen.filter((z) => z.bereich === bereich).map((z) => z.bezug_id)),
  ];

  // Der Name des Bezugs kommt aus der jeweiligen Tabelle. bezug_id trägt
  // keinen Fremdschlüssel (die Ablage ist polymorph), es gibt also Dateien an
  // Anfragen und Rapporten, die längst gelöscht sind – im Demo-Mandanten vier
  // von neun. Sie kommen trotzdem mit, unter "Ohne Zuordnung": Sie gehören
  // dem Betrieb, und weglassen wäre stiller Datenverlust.
  const [kunden, standorte, projekte, personen, anfragen, zeiteintraege, rapporte] =
    await Promise.all([
      holeNamen(admin, "kunden", "id, name, vorname", idsFuer("kunde")),
      // Läuft nur an, wenn es Dokumente dieses Bereichs gibt (holeNamen kehrt
      // bei leerer Liste sofort um) – die Tabelle darf also noch fehlen.
      holeNamen(admin, "standorte", "id, bezeichnung, ort", idsFuer("standort")),
      holeNamen(admin, "projekte", "id, bezeichnung", idsFuer("projekt")),
      holeNamen(admin, "profiles", "id, name", idsFuer("mitarbeitende")),
      holeNamen(admin, "anfragen", "id, titel", idsFuer("anfrage")),
      holeNamen(admin, "zeiteintraege", "id, datum, beschreibung", idsFuer("zeiteintrag")),
      holeNamen(admin, "rapporte", "id, jahr, nummer, datum", idsFuer("rapport")),
    ]);

  const bezeichnung = (zeile: DokumentZeile): string => {
    switch (zeile.bereich) {
      case "kunde": {
        const k = kunden.get(zeile.bezug_id) as
          | { name: string; vorname: string | null }
          | undefined;
        return k ? `${k.vorname ? `${k.vorname} ` : ""}${k.name}` : "";
      }
      case "standort": {
        const o = standorte.get(zeile.bezug_id) as
          | { bezeichnung: string; ort: string | null }
          | undefined;
        return o ? `${o.bezeichnung}${o.ort ? `, ${o.ort}` : ""}` : "";
      }
      case "projekt":
        return (
          (projekte.get(zeile.bezug_id) as { bezeichnung: string } | undefined)?.bezeichnung ?? ""
        );
      case "mitarbeitende":
        return (personen.get(zeile.bezug_id) as { name: string } | undefined)?.name ?? "";
      case "anfrage":
        return (anfragen.get(zeile.bezug_id) as { titel: string } | undefined)?.titel ?? "";
      case "zeiteintrag": {
        const z = zeiteintraege.get(zeile.bezug_id) as
          | { datum: string; beschreibung: string | null }
          | undefined;
        return z ? `${z.datum}${z.beschreibung ? ` ${z.beschreibung}` : ""}` : "";
      }
      case "rapport": {
        const r = rapporte.get(zeile.bezug_id) as
          | { jahr: number | null; nummer: number | null; datum: string }
          | undefined;
        if (!r) return "";
        // Dieselbe Anzeigeform wie in der Anwendung (rapportNummer in
        // types.ts); ein Entwurf hat noch keine Nummer, dafür ein Datum.
        return r.jahr != null && r.nummer != null
          ? `Rapport ${r.jahr}-${String(r.nummer).padStart(4, "0")}`
          : `Rapport (Entwurf) ${r.datum}`;
      }
      default:
        return "";
    }
  };

  const vergeben = new Set<string>();
  return zeilen.map((zeile) => {
    const bezug = bezeichnung(zeile);
    const ordner = BEREICH_ORDNER[zeile.bereich] ?? sichererName(zeile.bereich, "Sonstiges");
    const pfad = `Dokumente/${ordner}/${sichererName(bezug, "Ohne Zuordnung")}/${sichererName(
      zeile.dateiname,
      `${zeile.id}.dat`
    )}`;
    return { ...zeile, bezug, pfadImArchiv: eindeutig(pfad, vergeben) };
  });
}

async function holeNamen(
  admin: SupabaseClient,
  tabelle: string,
  spalten: string,
  ids: string[]
): Promise<Map<string, Record<string, unknown>>> {
  if (ids.length === 0) return new Map();
  const { data } = await admin.from(tabelle).select(spalten).in("id", ids);
  return new Map(
    ((data ?? []) as unknown as { id: string }[]).map((z) => [z.id, z as Record<string, unknown>])
  );
}

export type DateienEinerOrganisation = {
  /** Die hochgeladenen Dokumente – Pfad und Grösse, ohne Namensauflösung. */
  dokumente: { id: string; speicherpfad: string; groesse_bytes: number | null }[];
  /** Das Firmenlogo liegt in einem eigenen, öffentlich lesbaren Eimer. */
  logoPfad: string | null;
};

/**
 * Was einer Organisation im Speicher gehört – für die Anzeige des Umfangs
 * VOR der Löschung und für die Löschung selbst.
 *
 * Bewusst eine Funktion für beides: Eine Vorschau, die weniger anzeigt als
 * die Löschung entfernt, ist schlimmer als keine (siehe Migration 0064).
 * Was hier nicht auftaucht, bleibt im Speicher liegen – und dann gibt es
 * keine Zeile mehr, die erklärt, wem die Datei gehörte.
 *
 * Nicht dabei sind die Rechnungs-PDF der Arcos Group: Sie sind Belege und
 * zehn Jahre aufzubewahren (Art. 958f OR), genau wie die Zeilen in
 * "rechnungen", die den Mandanten überleben.
 */
export async function dateienEinerOrganisation(
  admin: SupabaseClient,
  organisationId: string
): Promise<DateienEinerOrganisation> {
  const [{ data: dokumente, error }, { data: organisation }] = await Promise.all([
    admin
      .from("dokumente")
      .select("id, speicherpfad, groesse_bytes")
      .eq("organisation_id", organisationId)
      .neq("speicherpfad", "pending"),
    admin.from("organisationen").select("logo_pfad").eq("id", organisationId).single(),
  ]);

  if (error) {
    throw new Error(`Dokumente liessen sich nicht lesen: ${error.message}`);
  }

  return {
    dokumente: (dokumente ?? []) as DateienEinerOrganisation["dokumente"],
    logoPfad: (organisation as { logo_pfad: string | null } | null)?.logo_pfad ?? null,
  };
}

/** Summe der bekannten Dateigrössen – für die Anzeige vor dem Download. */
export function summeBytes(dateien: { groesse_bytes: number | null }[]): number {
  return dateien.reduce((s, d) => s + Number(d.groesse_bytes ?? 0), 0);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} Bytes`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function csvFeld(wert: unknown): string {
  const text = wert === null || wert === undefined ? "" : String(wert);
  return `"${text.replace(/"/g, '""')}"`;
}

/**
 * Das Verzeichnis, das dem Archiv beiliegt – zweimal dieselbe Wahrheit für
 * zwei verschiedene Leser: die CSV für den Menschen (Excel öffnet sie mit
 * Semikolon und Byte-Order-Mark ohne Rückfrage), die JSON für ein Programm,
 * das die Dateien später wieder den Zeilen des Vollexports zuordnen muss.
 */
export function verzeichnisDateien(
  dateien: ArchivDatei[],
  organisationName: string
): { name: string; inhalt: string }[] {
  const kopf = [
    "Datei im Archiv",
    "Originalname",
    "Bereich",
    "Zugeordnet zu",
    "Kategorie",
    "Notiz",
    "Hochgeladen von",
    "Hochgeladen am",
    "Grösse (Bytes)",
    "Dokument-ID",
  ];

  const csv =
    // Byte-Order-Mark: ohne es zeigt Excel Umlaute als Kauderwelsch.
    "\ufeff" +
    [
      kopf.map(csvFeld).join(";"),
      ...dateien.map((d) =>
        [
          d.pfadImArchiv,
          d.dateiname,
          BEREICH_ORDNER[d.bereich] ?? d.bereich,
          d.bezug,
          d.dokument_kategorien?.bezeichnung ?? "",
          d.notiz ?? "",
          d.hochgeladen?.name ?? "",
          d.created_at,
          d.groesse_bytes ?? "",
          d.id,
        ]
          .map(csvFeld)
          .join(";")
      ),
    ].join("\r\n");

  const json = JSON.stringify(
    {
      format: "arcotime-dokumente",
      fassung: 1,
      erstellt_am: new Date().toISOString(),
      organisation: organisationName,
      anzahl: dateien.length,
      dateien: dateien.map((d) => ({
        dokument_id: d.id,
        pfad_im_archiv: d.pfadImArchiv,
        dateiname: d.dateiname,
        bereich: d.bereich,
        bezug_id: d.bezug_id,
        bezug: d.bezug,
        kategorie: d.dokument_kategorien?.bezeichnung ?? null,
        notiz: d.notiz,
        mime_type: d.mime_type,
        groesse_bytes: d.groesse_bytes,
        created_at: d.created_at,
        speicherpfad: d.speicherpfad,
      })),
    },
    null,
    2
  );

  return [
    { name: "Dokumentenliste.csv", inhalt: csv },
    { name: "dokumente.json", inhalt: json },
  ];
}

// Einen Eintrag anhängen und warten, bis er geschrieben ist.
//
// Das Warten ist der Punkt: Ohne es lädt die Schleife alle Dateien herunter,
// so schnell Supabase sie hergibt, und legt sie in der Warteschlange des
// Archivs ab – bei einer langsamen Leitung der Kundin liegt dann der ganze
// Mandant im Arbeitsspeicher. So ist immer nur eine Datei unterwegs.
function anhaengen(
  archiv: Archiver,
  inhalt: Buffer,
  name: string,
  datum?: Date
): Promise<void> {
  return new Promise((resolve, reject) => {
    const fertig = () => {
      archiv.off("error", gescheitert);
      resolve();
    };
    const gescheitert = (fehler: Error) => {
      archiv.off("entry", fertig);
      reject(fehler);
    };
    archiv.once("entry", fertig);
    archiv.once("error", gescheitert);
    archiv.append(inhalt, { name, date: datum });
  });
}

/**
 * Streamt die Dateien einer Organisation als ZIP.
 *
 * Ohne Komprimierung ("store"): Das Archiv enthält PDF, JPG und Office-
 * Dateien, die alle schon gepackt sind. Komprimieren würde nur Rechenzeit
 * kosten und den Download später beginnen lassen.
 *
 * Gestreamt und nicht zwischengespeichert, weil diese Route auch in der
 * Nachfrist funktionieren muss: Sie schreibt nichts – kein Archiv im
 * Speicher, keine Zeile in der Datenbank.
 */
export function erzeugeDokumentArchiv(
  admin: SupabaseClient,
  dateien: ArchivDatei[],
  verzeichnis: { name: string; inhalt: string }[]
): ReadableStream<Uint8Array> {
  const archiv = new ZipArchive({ store: true });

  void (async () => {
    const fehlende: string[] = [];
    try {
      for (const eintrag of verzeichnis) {
        await anhaengen(archiv, Buffer.from(eintrag.inhalt, "utf8"), eintrag.name);
      }

      for (const datei of dateien) {
        const { data, error } = await admin.storage
          .from("dokumente")
          .download(datei.speicherpfad);

        if (error || !data) {
          // Eine Zeile ohne Datei ist möglich (abgebrochener Upload, von Hand
          // aufgeräumter Speicher). Der Download bricht deswegen nicht ab –
          // aber er schweigt auch nicht darüber: Ein Archiv, in dem
          // stillschweigend Dateien fehlen, ist schlimmer als eines, das die
          // Lücke benennt.
          fehlende.push(`${datei.pfadImArchiv}  (${error?.message ?? "keine Daten"})`);
          console.error("Dokument nicht lesbar", {
            dokument: datei.id,
            pfad: datei.speicherpfad,
            fehler: error?.message,
          });
          continue;
        }

        await anhaengen(
          archiv,
          Buffer.from(await data.arrayBuffer()),
          datei.pfadImArchiv,
          new Date(datei.created_at)
        );
      }

      if (fehlende.length > 0) {
        await anhaengen(
          archiv,
          Buffer.from(
            `Diese ${fehlende.length} von ${dateien.length} Dateien liessen sich nicht lesen\r\n` +
              "und fehlen deshalb in diesem Archiv. Bitte melden Sie sich bei support@arcos.ch.\r\n\r\n" +
              fehlende.join("\r\n") +
              "\r\n",
            "utf8"
          ),
          // Das Ausrufezeichen stellt die Datei in jeder Ansicht nach oben –
          // ein Hinweis, den man erst nach dem Auspacken findet, kommt zu spät.
          "!FEHLENDE-DATEIEN.txt"
        );
      }

      await archiv.finalize();
    } catch (fehler) {
      // Der Download läuft bereits, die Kopfzeilen sind längst beim Browser.
      // Ein halbes Archiv als "fertig" auszugeben wäre das Schlimmste: Es
      // sieht heil aus. Abbrechen lässt den Download sichtbar scheitern.
      console.error("Dokumentenarchiv abgebrochen:", fehler);
      archiv.destroy(fehler instanceof Error ? fehler : new Error(String(fehler)));
    }
  })();

  return Readable.toWeb(archiv) as ReadableStream<Uint8Array>;
}

/**
 * Entfernt Dateien aus einem Speicher-Eimer.
 *
 * In Blöcken, weil die Storage-API eine Liste je Aufruf nur bis zu einer
 * gewissen Länge annimmt. Der Aufruf ist wiederholbar: Eine Datei, die schon
 * weg ist, ist kein Fehler – ein abgebrochener Durchgang lässt sich damit
 * einfach nochmals starten.
 */
export async function entferneDateienAusSpeicher(
  admin: SupabaseClient,
  eimer: string,
  pfade: string[]
): Promise<{ entfernt: number; fehler: string | null }> {
  const BLOCK = 100;
  let entfernt = 0;

  for (let i = 0; i < pfade.length; i += BLOCK) {
    const block = pfade.slice(i, i + BLOCK);
    const { data, error } = await admin.storage.from(eimer).remove(block);
    if (error) {
      return { entfernt, fehler: `${eimer}: ${error.message}` };
    }
    entfernt += (data ?? []).length;
  }

  return { entfernt, fehler: null };
}
