"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { mitErfolg } from "@/lib/erfolg";
import { getCurrentOrganisation } from "@/lib/get-profile";
import { normalisiereZeit } from "@/lib/zeit";

// Gemeinsamer Nenner aller Auswahllisten: bearbeiten, speichern, zurück auf
// die Einstellungsseite. Die Listen unterscheiden sich nur in ihren Feldern,
// nicht im Ablauf – ohne diesen Helfer stünde derselbe Fünfzeiler fünfmal da.
async function speichereListeneintrag(
  tabelle: string,
  id: string,
  werte: Record<string, unknown>,
  erfolgsmeldung: string
) {
  const supabase = await createClient();
  const { error } = await supabase.from(tabelle).update(werte).eq("id", id);
  if (error) {
    redirect(`/einstellungen?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath("/einstellungen");
  redirect(mitErfolg("/einstellungen", erfolgsmeldung));
}

// Sortierung aus dem Formular lesen. Leer oder unsinnig -> unverändert
// lassen, statt still auf 0 zu setzen.
function sortierungAus(formData: FormData): number | undefined {
  const roh = String(formData.get("sortierung") ?? "").trim();
  if (roh === "") return undefined;
  const zahl = Number(roh);
  return Number.isFinite(zahl) ? zahl : undefined;
}

// Nächster freier Sortierwert: höchster vorhandener + 10.
//
// Der Spaltendefault 0 wäre falsch – ein neuer Eintrag landete damit ganz
// oben, vor allen bestehenden. Erwartet wird aber, dass er hinten
// angehängt wird. Der Abstand von 10 lässt Platz, um später etwas
// dazwischenzuschieben, ohne die ganze Liste neu zu nummerieren.
async function naechsteSortierung(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tabelle: string
): Promise<number> {
  const { data } = await supabase
    .from(tabelle)
    .select("sortierung")
    .order("sortierung", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (Number(data?.sortierung) || 0) + 10;
}

// ---------------------------------------------------------
// Organisation (Mandant) – Titel, der im Header statt eines fixen
// Kunden-Logos angezeigt wird.
// ---------------------------------------------------------
export async function updateOrganisation(formData: FormData) {
  const supabase = await createClient();
  const name = String(formData.get("name") ?? "").trim();
  const zeigeAufLogin = formData.get("zeige_auf_login") === "on";
  if (!name) {
    redirect(`/einstellungen?error=${encodeURIComponent("Bitte einen Namen angeben.")}`);
  }

  const organisation = await getCurrentOrganisation();
  if (!organisation) {
    redirect(`/einstellungen?error=${encodeURIComponent("Organisation nicht gefunden.")}`);
  }

  // Schwellen für die Tagesarbeitszeit. Leeres Feld = Schwelle aus.
  const alsMinuten = (feld: string): number | null => {
    const roh = String(formData.get(feld) ?? "").trim();
    if (roh === "") return null;
    const stunden = Number(roh);
    if (!Number.isFinite(stunden) || stunden <= 0) return null;
    return Math.round(stunden * 60);
  };

  const text = (feld: string): string | null =>
    String(formData.get(feld) ?? "").trim() || null;

  const uhrzeitAlsMinuten = (feld: string): number | null => {
    const zeit = normalisiereZeit(String(formData.get(feld) ?? ""));
    if (!zeit) return null;
    const [h, m] = zeit.split(":").map(Number);
    return h * 60 + m;
  };

  const { error } = await supabase
    .from("organisationen")
    .update({
      name,
      zeige_auf_login: zeigeAufLogin,
      // Grundlage des Tages-Solls im Zeitkonto (0054). Die Felder fehlen
      // im Formular, wenn das Modul nicht gebucht ist – dann bleiben sie
      // unangetastet, wie bei den Planzeiten des Rapports.
      ...(formData.has("wochenstunden")
        ? {
            wochenstunden: Number(String(formData.get("wochenstunden") ?? "42").replace(",", ".")) || 42,
            arbeitstage_pro_woche:
              Number(String(formData.get("arbeitstage_pro_woche") ?? "5").replace(",", ".")) || 5,
            feiertage_im_sollstunden_enthalten:
              formData.get("feiertage_im_sollstunden_enthalten") === "on",
          }
        : {}),
      warnung_ab_minuten_pro_tag: alsMinuten("warnung_ab_stunden"),
      // Arbeitszeitfenster: Rahmen für die Vorschläge freier Zeiten in der
      // Disposition. Als Uhrzeit erfasst, in Minuten gespeichert – so lässt
      // sich damit rechnen, ohne Text zu zerlegen.
      arbeitstag_von_minuten: uhrzeitAlsMinuten("arbeitstag_von") ?? 420,
      arbeitstag_bis_minuten: uhrzeitAlsMinuten("arbeitstag_bis") ?? 1080,
      sperre_ab_minuten_pro_tag: alsMinuten("sperre_ab_stunden"),
      // Absenderangaben für Dokumente, die beim Kunden bleiben (0042).
      strasse: text("strasse"),
      hausnummer: text("hausnummer"),
      plz: text("plz"),
      ort: text("ort"),
      telefon: text("telefon"),
      email: text("email"),
      webseite: text("webseite"),
    })
    .eq("id", organisation.id);

  if (error) {
    // Verletzt den "höchstens eine Organisation"-Unique-Index (0017), wenn
    // bereits eine andere Organisation als Login-Anzeige markiert ist.
    const meldung = error.code === "23505"
      ? "Es kann nur eine Organisation gleichzeitig auf der Login-Seite angezeigt werden. Bitte zuerst bei der anderen Organisation deaktivieren."
      : error.message;
    redirect(`/einstellungen?error=${encodeURIComponent(meldung)}`);
  }

  revalidatePath("/", "layout");
  revalidatePath("/login");
  redirect(mitErfolg("/einstellungen", "Name gespeichert."));
}

export async function createKlasse(formData: FormData) {
  const supabase = await createClient();
  const bezeichnung = String(formData.get("bezeichnung") ?? "").trim();
  if (!bezeichnung) return;

  await supabase.from("dienstleistungsklassen").insert({
    bezeichnung,
    sortierung: await naechsteSortierung(supabase, "dienstleistungsklassen"),
  });
  revalidatePath("/einstellungen");
  redirect(mitErfolg("/einstellungen?fokus=neue_klasse", "Klasse hinzugefügt."));
}

export async function updateKlasse(id: string, formData: FormData) {
  const bezeichnung = String(formData.get("bezeichnung") ?? "").trim();
  if (!bezeichnung) {
    redirect(`/einstellungen?error=${encodeURIComponent("Die Bezeichnung darf nicht leer sein.")}`);
  }
  await speichereListeneintrag(
    "dienstleistungsklassen",
    id,
    { bezeichnung, sortierung: sortierungAus(formData) },
    "Klasse gespeichert."
  );
}

export async function toggleKlasse(id: string, aktiv: boolean) {
  const supabase = await createClient();
  await supabase.from("dienstleistungsklassen").update({ aktiv }).eq("id", id);
  revalidatePath("/einstellungen");
  redirect(mitErfolg("/einstellungen", aktiv ? "Klasse aktiviert." : "Klasse deaktiviert."));
}

export async function createMwstCode(formData: FormData) {
  const supabase = await createClient();
  const code = String(formData.get("code") ?? "").trim();
  const bezeichnung = String(formData.get("bezeichnung") ?? "").trim();
  const satz = Number(formData.get("satz") ?? 0);
  if (!code || !bezeichnung) return;

  await supabase.from("mwst_codes").insert({ code, bezeichnung, satz });
  revalidatePath("/einstellungen");
  redirect(mitErfolg("/einstellungen?fokus=neuer_mwst_code", "MWSt-Code hinzugefügt."));
}

// Korrigiert Code, Bezeichnung oder Satz eines bestehenden MWSt-Codes.
//
// Rückwirkungsfrei: Seit 0021_zeiteintraege_mwst_snapshot.sql frieren
// Zeiteinträge Code und Satz beim Erfassen ein (analog zum Preis aus 0003).
// Eine Änderung hier wirkt deshalb nur auf künftige Einträge – bestehende
// behalten den Satz, der beim Erfassen galt.
export async function updateMwstCode(id: string, formData: FormData) {
  const supabase = await createClient();
  const code = String(formData.get("code") ?? "").trim();
  const bezeichnung = String(formData.get("bezeichnung") ?? "").trim();
  const satz = Number(formData.get("satz") ?? NaN);

  if (!code || !bezeichnung) {
    redirect(
      `/einstellungen?error=${encodeURIComponent("Code und Bezeichnung dürfen nicht leer sein.")}`
    );
  }
  if (Number.isNaN(satz) || satz < 0 || satz > 100) {
    redirect(
      `/einstellungen?error=${encodeURIComponent("Der MWSt-Satz muss zwischen 0 und 100% liegen.")}`
    );
  }

  const { error } = await supabase
    .from("mwst_codes")
    .update({ code, bezeichnung, satz })
    .eq("id", id);
  if (error) {
    redirect(`/einstellungen?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/einstellungen");
  redirect(mitErfolg("/einstellungen", `MWSt-Code ${code} gespeichert.`));
}

export async function toggleMwstCode(id: string, aktiv: boolean) {
  const supabase = await createClient();
  await supabase.from("mwst_codes").update({ aktiv }).eq("id", id);
  revalidatePath("/einstellungen");
  redirect(mitErfolg("/einstellungen", aktiv ? "MWSt-Code aktiviert." : "MWSt-Code deaktiviert."));
}

// ---------------------------------------------------------
// Einheiten (Auswahlliste für den Dienstleistungskatalog)
// ---------------------------------------------------------
export async function createEinheit(formData: FormData) {
  const supabase = await createClient();
  const bezeichnung = String(formData.get("bezeichnung") ?? "").trim();
  if (!bezeichnung) return;

  const { error } = await supabase.from("einheiten").insert({
    bezeichnung,
    sortierung: await naechsteSortierung(supabase, "einheiten"),
  });
  if (error) {
    redirect(`/einstellungen?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath("/einstellungen");
  redirect(mitErfolg("/einstellungen?fokus=neue_einheit", "Einheit hinzugefügt."));
}

// Umbenennen ist gefahrlos: dienstleistungen.einheit speichert den Text,
// nicht eine Referenz. Bestehende Dienstleistungen behalten also ihren
// bisherigen Wert – er taucht dann nur nicht mehr in der Auswahl auf.
export async function updateEinheit(id: string, formData: FormData) {
  const bezeichnung = String(formData.get("bezeichnung") ?? "").trim();
  if (!bezeichnung) {
    redirect(`/einstellungen?error=${encodeURIComponent("Die Bezeichnung darf nicht leer sein.")}`);
  }
  await speichereListeneintrag(
    "einheiten",
    id,
    { bezeichnung, sortierung: sortierungAus(formData) },
    "Einheit gespeichert."
  );
}

export async function toggleEinheit(id: string, aktiv: boolean) {
  const supabase = await createClient();
  await supabase.from("einheiten").update({ aktiv }).eq("id", id);
  revalidatePath("/einstellungen");
  redirect(mitErfolg("/einstellungen", aktiv ? "Einheit aktiviert." : "Einheit deaktiviert."));
}

// ---------------------------------------------------------
// Rabattsätze (Auswahlliste für Zeiterfassung & Anfrage-Erledigung)
// ---------------------------------------------------------
export async function createRabattsatz(formData: FormData) {
  const supabase = await createClient();
  const prozent = Number(formData.get("prozent") ?? NaN);
  const bezeichnung = String(formData.get("bezeichnung") ?? "").trim() || null;
  if (Number.isNaN(prozent) || prozent < 0 || prozent > 100) {
    redirect(
      `/einstellungen?error=${encodeURIComponent("Rabatt muss zwischen 0 und 100% liegen.")}`
    );
  }

  const { error } = await supabase.from("rabattsaetze").insert({
    prozent,
    bezeichnung,
    sortierung: await naechsteSortierung(supabase, "rabattsaetze"),
  });
  if (error) {
    redirect(`/einstellungen?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath("/einstellungen");
  redirect(mitErfolg("/einstellungen?fokus=neuer_rabatt", "Rabattsatz hinzugefügt."));
}

export async function updateRabattsatz(id: string, formData: FormData) {
  const prozent = Number(formData.get("prozent") ?? NaN);
  const bezeichnung = String(formData.get("bezeichnung") ?? "").trim() || null;
  if (Number.isNaN(prozent) || prozent < 0 || prozent > 100) {
    redirect(
      `/einstellungen?error=${encodeURIComponent("Rabatt muss zwischen 0 und 100% liegen.")}`
    );
  }
  await speichereListeneintrag(
    "rabattsaetze",
    id,
    { prozent, bezeichnung, sortierung: sortierungAus(formData) },
    "Rabattsatz gespeichert."
  );
}

export async function toggleRabattsatz(id: string, aktiv: boolean) {
  const supabase = await createClient();
  await supabase.from("rabattsaetze").update({ aktiv }).eq("id", id);
  revalidatePath("/einstellungen");
  redirect(mitErfolg("/einstellungen", aktiv ? "Rabattsatz aktiviert." : "Rabattsatz deaktiviert."));
}

// ---------------------------------------------------------
// Anfrage-Kanäle (Auswahlliste für Anfragen)
// ---------------------------------------------------------
export async function createAnfrageKanal(formData: FormData) {
  const supabase = await createClient();
  const bezeichnung = String(formData.get("bezeichnung") ?? "").trim();
  const symbol = String(formData.get("symbol") ?? "").trim() || "•";
  if (!bezeichnung) return;

  // Interner Wert wird aus der Bezeichnung abgeleitet (z.B. für Filter/Export),
  // ist für Anwendende aber nicht relevant – sie sehen nur die Bezeichnung.
  const wert = bezeichnung
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  const { error } = await supabase
    .from("anfrage_kanaele")
    .insert({
      wert: wert || bezeichnung,
      bezeichnung,
      symbol,
      sortierung: await naechsteSortierung(supabase, "anfrage_kanaele"),
    });
  if (error) {
    redirect(`/einstellungen?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath("/einstellungen");
  redirect(mitErfolg("/einstellungen?fokus=neuer_kanal", "Kanal hinzugefügt."));
}

// Bezeichnung und Symbol sind frei änderbar, der interne "wert" bewusst
// NICHT: Er steht als Fremdschlüssel-Ersatz in anfragen.kanal. Würde er hier
// mitgeändert, verlören alle bestehenden Anfragen ihren Kanal. Dasselbe gilt
// für Prioritäten (anfragen.prioritaet).
export async function updateAnfrageKanal(id: string, formData: FormData) {
  const bezeichnung = String(formData.get("bezeichnung") ?? "").trim();
  const symbol = String(formData.get("symbol") ?? "").trim() || "•";
  if (!bezeichnung) {
    redirect(`/einstellungen?error=${encodeURIComponent("Die Bezeichnung darf nicht leer sein.")}`);
  }
  await speichereListeneintrag(
    "anfrage_kanaele",
    id,
    { bezeichnung, symbol, sortierung: sortierungAus(formData) },
    "Kanal gespeichert."
  );
}

export async function toggleAnfrageKanal(id: string, aktiv: boolean) {
  const supabase = await createClient();
  await supabase.from("anfrage_kanaele").update({ aktiv }).eq("id", id);
  revalidatePath("/einstellungen");
  redirect(mitErfolg("/einstellungen", aktiv ? "Kanal aktiviert." : "Kanal deaktiviert."));
}

// ---------------------------------------------------------
// Anfrage-Prioritäten (Auswahlliste für Anfragen)
// ---------------------------------------------------------
export async function createAnfragePrioritaet(formData: FormData) {
  const supabase = await createClient();
  const bezeichnung = String(formData.get("bezeichnung") ?? "").trim();
  const farbe = String(formData.get("farbe") ?? "").trim() || "bg-gray-300";
  if (!bezeichnung) return;

  const wert = bezeichnung
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  const { error } = await supabase
    .from("anfrage_prioritaeten")
    .insert({
      wert: wert || bezeichnung,
      bezeichnung,
      farbe,
      sortierung: await naechsteSortierung(supabase, "anfrage_prioritaeten"),
    });
  if (error) {
    redirect(`/einstellungen?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath("/einstellungen");
  redirect(mitErfolg("/einstellungen?fokus=neue_prioritaet", "Priorität hinzugefügt."));
}

export async function updateAnfragePrioritaet(id: string, formData: FormData) {
  const bezeichnung = String(formData.get("bezeichnung") ?? "").trim();
  const farbe = String(formData.get("farbe") ?? "").trim() || "bg-gray-300";
  if (!bezeichnung) {
    redirect(`/einstellungen?error=${encodeURIComponent("Die Bezeichnung darf nicht leer sein.")}`);
  }
  await speichereListeneintrag(
    "anfrage_prioritaeten",
    id,
    { bezeichnung, farbe, sortierung: sortierungAus(formData) },
    "Priorität gespeichert."
  );
}

export async function toggleAnfragePrioritaet(id: string, aktiv: boolean) {
  const supabase = await createClient();
  await supabase.from("anfrage_prioritaeten").update({ aktiv }).eq("id", id);
  revalidatePath("/einstellungen");
  redirect(mitErfolg("/einstellungen", aktiv ? "Priorität aktiviert." : "Priorität deaktiviert."));
}

// ---------------------------------------------------------
// Dokument-Kategorien (Auswahlliste für die Dokumentenablage)
// ---------------------------------------------------------
export async function createDokumentKategorie(formData: FormData) {
  const supabase = await createClient();
  const bezeichnung = String(formData.get("bezeichnung") ?? "").trim();
  if (!bezeichnung) return;

  const { error } = await supabase.from("dokument_kategorien").insert({
    bezeichnung,
    sortierung: await naechsteSortierung(supabase, "dokument_kategorien"),
  });
  if (error) {
    redirect(`/einstellungen?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath("/einstellungen");
  redirect(mitErfolg("/einstellungen?fokus=neue_kategorie", "Kategorie hinzugefügt."));
}

export async function updateDokumentKategorie(id: string, formData: FormData) {
  const bezeichnung = String(formData.get("bezeichnung") ?? "").trim();
  if (!bezeichnung) {
    redirect(`/einstellungen?error=${encodeURIComponent("Die Bezeichnung darf nicht leer sein.")}`);
  }
  await speichereListeneintrag(
    "dokument_kategorien",
    id,
    { bezeichnung, sortierung: sortierungAus(formData) },
    "Kategorie gespeichert."
  );
}

export async function toggleDokumentKategorie(id: string, aktiv: boolean) {
  const supabase = await createClient();
  await supabase.from("dokument_kategorien").update({ aktiv }).eq("id", id);
  revalidatePath("/einstellungen");
  redirect(mitErfolg("/einstellungen", aktiv ? "Kategorie aktiviert." : "Kategorie deaktiviert."));
}


// ---------------------------------------------------------
// Schliesstage (Feiertage, Betriebsferien)
// ---------------------------------------------------------
// Als Zeitraum erfasst: Betriebsferien sind zwei Wochen, ein Feiertag der
// Sonderfall von = bis. Das Formular füllt "bis" automatisch mit "von",
// wenn es leer bleibt.
export async function createSchliesstag(formData: FormData) {
  const supabase = await createClient();
  const von = String(formData.get("von") ?? "").trim();
  const bis = String(formData.get("bis") ?? "").trim() || von;
  const bezeichnung = String(formData.get("bezeichnung") ?? "").trim();

  if (!von || !bezeichnung) {
    redirect(
      `/einstellungen?error=${encodeURIComponent("Bitte Datum und Bezeichnung angeben.")}`
    );
  }
  if (bis < von) {
    redirect(
      `/einstellungen?error=${encodeURIComponent("Das Enddatum liegt vor dem Startdatum.")}`
    );
  }

  const { error } = await supabase.from("schliesstage").insert({
    von,
    bis,
    bezeichnung,
    // Betriebsferien gehen vom Ferienanspruch ab (Art. 329c Abs. 2 OR),
    // Feiertage nicht (0056).
    belastet_ferien: formData.get("belastet_ferien") === "on",
  });
  if (error) {
    redirect(`/einstellungen?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath("/einstellungen");
  redirect(mitErfolg("/einstellungen?fokus=neuer_schliesstag", "Schliesstag gespeichert."));
}

export async function loescheSchliesstag(id: string) {
  const supabase = await createClient();
  await supabase.from("schliesstage").delete().eq("id", id);
  revalidatePath("/einstellungen");
  redirect(mitErfolg("/einstellungen", "Schliesstag entfernt."));
}

// ---------------------------------------------------------
// Abwesenheitsarten
// ---------------------------------------------------------
export async function createAbwesenheitsart(formData: FormData) {
  const supabase = await createClient();
  const bezeichnung = String(formData.get("bezeichnung") ?? "").trim();
  const farbe = String(formData.get("farbe") ?? "").trim() || "bg-gray-300";
  if (!bezeichnung) return;

  // Interner Schlüssel wie bei Kanälen und Prioritäten: aus der Bezeichnung
  // abgeleitet und danach unveränderlich, damit ein Umbenennen bestehende
  // Abwesenheiten nicht von ihrer Art abschneidet.
  const wert =
    bezeichnung
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || bezeichnung;

  const { error } = await supabase.from("abwesenheitsarten").insert({
    wert,
    bezeichnung,
    farbe,
    blockiert: formData.get("blockiert") === "on",
    sortierung: await naechsteSortierung(supabase, "abwesenheitsarten"),
  });
  if (error) {
    redirect(`/einstellungen?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath("/einstellungen");
  redirect(mitErfolg("/einstellungen?fokus=neue_abwesenheitsart", "Abwesenheitsart hinzugefügt."));
}

export async function updateAbwesenheitsart(id: string, formData: FormData) {
  const bezeichnung = String(formData.get("bezeichnung") ?? "").trim();
  if (!bezeichnung) {
    redirect(`/einstellungen?error=${encodeURIComponent("Die Bezeichnung darf nicht leer sein.")}`);
  }
  await speichereListeneintrag(
    "abwesenheitsarten",
    id,
    {
      bezeichnung,
      farbe: String(formData.get("farbe") ?? "").trim() || "bg-gray-300",
      blockiert: formData.get("blockiert") === "on",
      // Wirkung auf das Zeitkonto (0055). Die Felder fehlen im Formular,
      // wenn das Modul nicht gebucht ist – dann bleiben sie unangetastet.
      ...(formData.has("wirkung_erfasst")
        ? {
            reduziert_soll: formData.get("reduziert_soll") === "on",
            belastet_ferien: formData.get("belastet_ferien") === "on",
            belastet_zeitsaldo: formData.get("belastet_zeitsaldo") === "on",
          }
        : {}),
      sortierung: sortierungAus(formData),
    },
    "Abwesenheitsart gespeichert."
  );
}

export async function toggleAbwesenheitsart(id: string, aktiv: boolean) {
  const supabase = await createClient();
  await supabase.from("abwesenheitsarten").update({ aktiv }).eq("id", id);
  revalidatePath("/einstellungen");
  redirect(
    mitErfolg("/einstellungen", aktiv ? "Art aktiviert." : "Art deaktiviert.")
  );
}

// Logo der Organisation hochladen.
//
// Bewusst als Server Action mit der Datei im Formular statt über eine
// signierte Upload-Adresse wie bei den Dokumenten: Ein Logo ist klein und
// wird einmal im Jahr gewechselt. Der aufwendigere Weg lohnt dort, wo
// grosse Dateien häufig hochgeladen werden – hier wäre er nur mehr
// Bauteile für denselben Zweck.
export async function ladeLogoHoch(formData: FormData) {
  const datei = formData.get("logo");
  if (!(datei instanceof File) || datei.size === 0) {
    redirect(`/einstellungen?error=${encodeURIComponent("Bitte eine Datei auswählen.")}`);
  }
  if (datei.size > 1_000_000) {
    redirect(
      `/einstellungen?error=${encodeURIComponent(
        "Das Logo ist zu gross (maximal 1 MB). Ein Bild mit 400 Pixel Breite genügt für Druck und PDF."
      )}`
    );
  }

  const endung = (datei.name.split(".").pop() ?? "").toLowerCase();
  if (!["png", "jpg", "jpeg", "svg", "webp"].includes(endung)) {
    redirect(
      `/einstellungen?error=${encodeURIComponent(
        "Nur PNG, JPG, SVG oder WebP. PNG mit durchsichtigem Hintergrund sieht auf dem Rapport am besten aus."
      )}`
    );
  }

  const organisation = await getCurrentOrganisation();
  if (!organisation) {
    redirect(`/einstellungen?error=${encodeURIComponent("Organisation nicht gefunden.")}`);
  }

  const admin = createAdminClient();
  // Zeitstempel im Namen, damit ein neues Logo nicht am zwischengespeicherten
  // alten Bild hängen bleibt.
  const pfad = `${organisation.id}/logo-${Date.now()}.${endung}`;

  const { error: uploadFehler } = await admin.storage
    .from("logos")
    .upload(pfad, datei, { upsert: true, contentType: datei.type || undefined });

  if (uploadFehler) {
    redirect(`/einstellungen?error=${encodeURIComponent(uploadFehler.message)}`);
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("organisationen")
    .update({ logo_pfad: pfad })
    .eq("id", organisation.id);

  if (error) {
    redirect(`/einstellungen?error=${encodeURIComponent(error.message)}`);
  }

  // Das alte Bild erst jetzt wegräumen: Wäre es vorher weg und der neue
  // Eintrag scheiterte, stünde die Organisation ganz ohne Logo da.
  if (organisation.logo_pfad && organisation.logo_pfad !== pfad) {
    await admin.storage.from("logos").remove([organisation.logo_pfad]);
  }

  revalidatePath("/einstellungen");
  redirect(mitErfolg("/einstellungen", "Logo gespeichert."));
}

export async function entferneLogo() {
  const organisation = await getCurrentOrganisation();
  if (!organisation?.logo_pfad) {
    redirect("/einstellungen");
  }

  const supabase = await createClient();
  await supabase.from("organisationen").update({ logo_pfad: null }).eq("id", organisation.id);

  const admin = createAdminClient();
  await admin.storage.from("logos").remove([organisation.logo_pfad]);

  revalidatePath("/einstellungen");
  redirect(mitErfolg("/einstellungen", "Logo entfernt."));
}

// ---------------------------------------------------------
// Gruppen von Mitarbeitenden (0049)
// ---------------------------------------------------------
// Eine Gruppe ist eine Sicht, keine Berechtigung: Sie bündelt die
// Spalten der Disposition und stellt ein Team in einem Zug zusammen. Wer
// in keiner Gruppe ist, verliert dadurch nichts.

export async function createGruppe(formData: FormData) {
  const supabase = await createClient();
  const bezeichnung = String(formData.get("bezeichnung") ?? "").trim();
  if (!bezeichnung) return;

  const { error } = await supabase.from("gruppen").insert({
    bezeichnung,
    sortierung: await naechsteSortierung(supabase, "gruppen"),
  });
  if (error) {
    redirect(`/einstellungen?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath("/einstellungen");
  revalidatePath("/disposition");
  redirect(mitErfolg("/einstellungen?fokus=neue_gruppe", "Gruppe hinzugefügt."));
}

export async function updateGruppe(id: string, formData: FormData) {
  const bezeichnung = String(formData.get("bezeichnung") ?? "").trim();
  if (!bezeichnung) {
    redirect(`/einstellungen?error=${encodeURIComponent("Die Bezeichnung darf nicht leer sein.")}`);
  }
  revalidatePath("/disposition");
  await speichereListeneintrag(
    "gruppen",
    id,
    { bezeichnung, sortierung: sortierungAus(formData) },
    "Gruppe gespeichert."
  );
}

export async function toggleGruppe(id: string, aktiv: boolean) {
  const supabase = await createClient();
  await supabase.from("gruppen").update({ aktiv }).eq("id", id);
  revalidatePath("/einstellungen");
  revalidatePath("/disposition");
  redirect(mitErfolg("/einstellungen", aktiv ? "Gruppe aktiviert." : "Gruppe deaktiviert."));
}

// Mitglieder einer Gruppe setzen.
//
// Bewusst als Ganzes und nicht Person für Person: Das Formular schickt
// alle Häkchen, und ein Vergleich Zeile für Zeile wäre nur dann nötig,
// wenn an einer Mitgliedschaft mehr hinge als die Zugehörigkeit. Zuerst
// löschen, dann einfügen – die Tabelle hat keine weiteren Angaben, die
// dabei verloren gehen könnten.
export async function setzeGruppenMitglieder(gruppeId: string, formData: FormData) {
  const supabase = await createClient();
  const mitglieder = formData.getAll("mitarbeiter_id").map(String).filter(Boolean);

  const { error: loeschFehler } = await supabase
    .from("gruppen_mitglieder")
    .delete()
    .eq("gruppe_id", gruppeId);

  if (loeschFehler) {
    redirect(`/einstellungen?error=${encodeURIComponent(loeschFehler.message)}`);
  }

  if (mitglieder.length > 0) {
    const { error } = await supabase.from("gruppen_mitglieder").insert(
      // organisation_id setzt der Trigger aus 0049.
      mitglieder.map((id) => ({ gruppe_id: gruppeId, mitarbeiter_id: id }))
    );
    if (error) {
      redirect(`/einstellungen?error=${encodeURIComponent(error.message)}`);
    }
  }

  revalidatePath("/einstellungen");
  revalidatePath("/disposition");
  redirect(mitErfolg("/einstellungen", "Gruppe gespeichert."));
}

// ---------------------------------------------------------
// Standardpositionen für neue Rapporte (0051)
// ---------------------------------------------------------
// Womit ein Einsatz beginnt, ist in vielen Betrieben immer dasselbe:
// Anfahrt, Fahrzeit, manchmal eine Kleinmaterialpauschale. Diese Liste
// sagt es einmal, statt dass es jemand bei jedem Rapport tippt.

export async function createStandardposition(formData: FormData) {
  const supabase = await createClient();
  const dienstleistungId = String(formData.get("dienstleistung_id") ?? "").trim();
  const vorgabe = Number(formData.get("vorgabe") ?? 0);

  if (!dienstleistungId) return;
  if (!(vorgabe > 0)) {
    redirect(
      `/einstellungen?error=${encodeURIComponent(
        "Bitte eine Menge grösser als null angeben – ohne Wert lässt sich keine Position anlegen."
      )}`
    );
  }

  // Freundlich statt roher Datenbankfehler: Die Bedingung unique
  // (organisation_id, dienstleistung_id) verhindert Dubletten, und eine
  // bereits deaktivierte Zeile ist der wahrscheinlichere Fall.
  const { data: bestehend } = await supabase
    .from("rapport_standardpositionen")
    .select("id, aktiv")
    .eq("dienstleistung_id", dienstleistungId)
    .maybeSingle();

  if (bestehend) {
    redirect(
      `/einstellungen?error=${encodeURIComponent(
        bestehend.aktiv
          ? "Diese Leistung steht bereits in der Liste."
          : "Diese Leistung steht bereits in der Liste – sie ist nur deaktiviert."
      )}`
    );
  }

  const { error } = await supabase.from("rapport_standardpositionen").insert({
    dienstleistung_id: dienstleistungId,
    vorgabe,
    sortierung: await naechsteSortierung(supabase, "rapport_standardpositionen"),
  });
  if (error) {
    redirect(`/einstellungen?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath("/einstellungen");
  redirect(mitErfolg("/einstellungen?fokus=neue_standardposition", "Standardposition hinzugefügt."));
}

export async function updateStandardposition(id: string, formData: FormData) {
  const vorgabe = Number(formData.get("vorgabe") ?? 0);
  if (!(vorgabe > 0)) {
    redirect(
      `/einstellungen?error=${encodeURIComponent("Die Menge muss grösser als null sein.")}`
    );
  }
  await speichereListeneintrag(
    "rapport_standardpositionen",
    id,
    { vorgabe, sortierung: sortierungAus(formData) },
    "Standardposition gespeichert."
  );
}

export async function toggleStandardposition(id: string, aktiv: boolean) {
  const supabase = await createClient();
  await supabase.from("rapport_standardpositionen").update({ aktiv }).eq("id", id);
  revalidatePath("/einstellungen");
  redirect(
    mitErfolg(
      "/einstellungen",
      aktiv ? "Standardposition aktiviert." : "Standardposition deaktiviert."
    )
  );
}


// Betriebsferien oder Feiertag? Das Häkchen entscheidet, ob die Tage vom
// Ferienanspruch der Mitarbeitenden abgehen. Umgeschaltet wird es direkt
// in der Zeile – ein Schliesstag hat sonst nichts zu bearbeiten.
export async function toggleSchliesstagFerien(id: string, belastetFerien: boolean) {
  const supabase = await createClient();
  await supabase
    .from("schliesstage")
    .update({ belastet_ferien: belastetFerien })
    .eq("id", id);
  revalidatePath("/einstellungen");
  redirect(
    mitErfolg(
      "/einstellungen",
      belastetFerien
        ? "Gilt neu als Betriebsferien – die Tage gehen vom Ferienanspruch ab."
        : "Gilt neu als Feiertag – die Tage kosten keine Ferientage."
    )
  );
}

// ---------------------------------------------------------
// Begriffe: wie der Betrieb die Dinge nennt (0073)
// ---------------------------------------------------------
//
// Eine Struktur, viele Sprachen. Der Maler sagt Auftrag und Liegenschaft, der
// IT-Dienstleister Projekt und Standort, und aus der Anfrage wird bei ihm ein
// Ticket. Zwei Datenmodelle wären der falsche Weg – jede neue Funktion müsste
// zweimal gedacht werden.
export async function speichereBegriff(schluessel: string, formData: FormData) {
  const supabase = await createClient();

  const einzahl = String(formData.get("einzahl") ?? "").trim();
  const mehrzahl = String(formData.get("mehrzahl") ?? "").trim();
  const genus = String(formData.get("genus") ?? "").trim();

  if (!einzahl || !mehrzahl) {
    redirect(
      `/einstellungen?error=${encodeURIComponent(
        "Einzahl und Mehrzahl sind beide nötig – die Mehrzahl lässt sich im Deutschen nicht ableiten."
      )}`
    );
  }
  if (!["m", "f", "n"].includes(genus)) {
    redirect(`/einstellungen?error=${encodeURIComponent("Bitte das Geschlecht wählen.")}`);
  }

  const organisation = await getCurrentOrganisation();
  if (!organisation) {
    redirect(`/einstellungen?error=${encodeURIComponent("Organisation nicht gefunden.")}`);
  }

  // upsert statt update: Fehlt die Zeile (neuer Schlüssel, den eine spätere
  // Fassung eingeführt hat), soll sie entstehen und nicht stillschweigend
  // nichts passieren.
  const { error } = await supabase.from("begriffe").upsert(
    {
      organisation_id: organisation.id,
      schluessel,
      einzahl,
      mehrzahl,
      genus,
    },
    { onConflict: "organisation_id,schluessel" }
  );

  if (error) {
    redirect(`/einstellungen?error=${encodeURIComponent(error.message)}`);
  }

  // Die Beschriftungen stehen in der Navigation jeder Seite – deshalb nicht
  // nur diese Seite neu aufbauen, sondern das ganze Layout.
  revalidatePath("/", "layout");
  redirect(mitErfolg("/einstellungen", "Bezeichnung gespeichert."));
}

// Alle Bezeichnungen auf eine Branchenvorlage setzen. Bei der Einrichtung
// sind das sechs Felder weniger von Hand.
export async function uebernehmeBegriffVorlage(formData: FormData) {
  const supabase = await createClient();
  const branche = String(formData.get("branche") ?? "").trim();
  if (!branche) {
    redirect(`/einstellungen?error=${encodeURIComponent("Bitte eine Vorlage wählen.")}`);
  }

  const organisation = await getCurrentOrganisation();
  if (!organisation) {
    redirect(`/einstellungen?error=${encodeURIComponent("Organisation nicht gefunden.")}`);
  }

  const { data: vorlage, error: ladeFehler } = await supabase
    .from("begriff_vorlagen")
    .select("schluessel, einzahl, mehrzahl, genus")
    .eq("branche", branche);

  if (ladeFehler || !vorlage?.length) {
    redirect(
      `/einstellungen?error=${encodeURIComponent(
        ladeFehler?.message ?? `Zur Vorlage „${branche}“ sind keine Bezeichnungen hinterlegt.`
      )}`
    );
  }

  const { error } = await supabase.from("begriffe").upsert(
    vorlage.map((v) => ({ ...v, organisation_id: organisation.id })),
    { onConflict: "organisation_id,schluessel" }
  );

  if (error) {
    redirect(`/einstellungen?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/", "layout");
  redirect(mitErfolg("/einstellungen", `Bezeichnungen der Vorlage „${branche}“ übernommen.`));
}
