"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/get-profile";
import { mitErfolg } from "@/lib/erfolg";
import { sendeMail } from "@/lib/email";
import { sendeEinladung } from "@/lib/einladung";
import { emailFehler, versandFehlerText } from "@/lib/email-pruefung";

// Alle Aktionen hier sind ausschliesslich Platform-Admins vorbehalten
// (Arcos Group selbst) – nicht den Admins einzelner Kunden-Organisationen.
// Der Rollen-Check läuft bewusst in JEDER Aktion einzeln (nicht nur auf
// Seitenebene), falls eine Aktion direkt aufgerufen wird.
async function pruefePlatformAdmin() {
  const profil = await getCurrentProfile();
  if (!profil?.ist_platform_admin) {
    redirect(`/plattform?error=${encodeURIComponent("Nur für Arcos-Mitarbeitende zugänglich.")}`);
  }
  return profil;
}

// Neue Kunden-Organisation anlegen (oder den Demo-Mandanten) inkl. erstem
// Admin-Konto. Nutzt den Service-Role-Client für die Einladung – identisch
// zur bestehenden Mitarbeitenden-Einladung (ladeMitarbeitendeEin).
export async function erstelleOrganisation(formData: FormData) {
  await pruefePlatformAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const lizenzenGebucht = Number(formData.get("lizenzen_gebucht") ?? 0);
  const abrechnungszyklus = String(formData.get("abrechnungszyklus") ?? "monatlich");
  const preisProZyklus = String(formData.get("preis_pro_zyklus") ?? "").trim();
  const adminVorname = String(formData.get("admin_vorname") ?? "").trim();
  const adminNachname = String(formData.get("admin_nachname") ?? "").trim();
  const adminEmail = String(formData.get("admin_email") ?? "").trim();
  const istDemo = formData.get("ist_demo") === "on";

  if (!name || !lizenzenGebucht || !adminVorname || !adminNachname || !adminEmail) {
    redirect(
      `/plattform?error=${encodeURIComponent(
        "Bitte Name, Anzahl Lizenzen und die Angaben zum ersten Admin-Konto ausfüllen."
      )}`
    );
  }

  // Vor dem Anlegen prüfen, nicht danach: Scheitert die Einladung, steht
  // sonst eine Organisation ohne Admin-Konto da.
  const adminAdressFehler = emailFehler(adminEmail);
  if (adminAdressFehler) {
    redirect(`/plattform?error=${encodeURIComponent(adminAdressFehler)}`);
  }

  const supabase = await createClient();
  const { data: neueOrg, error } = await supabase
    .from("organisationen")
    .insert({
      name,
      lizenzen_gebucht: lizenzenGebucht,
      abrechnungszyklus,
      preis_pro_zyklus: preisProZyklus ? Number(preisProZyklus) : null,
      // Demo-Mandanten testen üblicherweise unbefristet, nicht über die
      // reguläre 14-Tage-Testphase – status bleibt daher "aktiv".
      status: "aktiv",
    })
    .select("id")
    .single();

  if (error || !neueOrg) {
    redirect(`/plattform?error=${encodeURIComponent(error?.message ?? "Unbekannter Fehler.")}`);
  }

  const { fehler: inviteError } = await sendeEinladung({
    email: adminEmail,
    vorname: adminVorname,
    nachname: adminNachname,
    organisationId: neueOrg.id,
    // Direkt als Admin ihrer neuen Organisation anlegen – ohne das müsste
    // erst manuell die Rolle nachträglich hochgestuft werden.
    rolle: "admin",
    organisationName: name,
  });

  if (inviteError) {
    console.error("Einladung fehlgeschlagen", { email: adminEmail, fehler: inviteError });
    redirect(
      `/plattform?error=${encodeURIComponent(
        `Organisation "${name}" angelegt, aber ` +
          versandFehlerText(inviteError, adminEmail)
      )}`
    );
  }

  revalidatePath("/plattform");
  redirect(
    mitErfolg(
      "/plattform",
      istDemo
        ? `Demo-Organisation "${name}" angelegt, Einladung an ${adminEmail} gesendet.`
        : `Organisation "${name}" angelegt, Einladung an ${adminEmail} gesendet.`
    )
  );
}

// Lizenz-/Abo-Felder einer bestehenden Organisation anpassen (Korrektur bei
// Erfassungsfehlern, Testphase manuell verlängern, Status ändern, ...).
export async function aktualisiereOrganisation(id: string, formData: FormData) {
  await pruefePlatformAdmin();

  const status = String(formData.get("status") ?? "aktiv");
  const lizenzenGebuchtRoh = String(formData.get("lizenzen_gebucht") ?? "").trim();
  const abrechnungszyklus = String(formData.get("abrechnungszyklus") ?? "monatlich");
  const preisProZyklusRoh = String(formData.get("preis_pro_zyklus") ?? "").trim();
  const testEndetAmRoh = String(formData.get("test_endet_am") ?? "").trim();
  const naechsterZahlterminRoh = String(formData.get("naechster_zahltermin") ?? "").trim();

  const supabase = await createClient();
  const { error } = await supabase
    .from("organisationen")
    .update({
      status,
      // Leeres Feld -> unbegrenzt (NULL), wie bei der eigenen Organisation.
      lizenzen_gebucht: lizenzenGebuchtRoh ? Number(lizenzenGebuchtRoh) : null,
      abrechnungszyklus,
      preis_pro_zyklus: preisProZyklusRoh ? Number(preisProZyklusRoh) : null,
      test_endet_am: testEndetAmRoh || null,
      // Kostenpflichtiges Zusatzmodul. Freischaltung vorerst nur hier durch
      // Arcos – die Selbstbuchung über Stripe folgt als eigenes Paket.
      modul_disposition: formData.get("modul_disposition") === "on",
      modul_zeitkonto: formData.get("modul_zeitkonto") === "on",
      naechster_zahltermin: naechsterZahlterminRoh || null,
      // Ein manuelles Speichern im Platform-Admin-Bereich gilt als bewusste
      // Entscheidung – ein evtl. vorher gesetzter automatischer Sperrgrund
      // (Testphase abgelaufen, Zahlung fehlgeschlagen) wird zurückgesetzt,
      // wenn der Status dabei auf "aktiv" gesetzt wird.
      sperrgrund: status === "aktiv" ? null : formData.get("sperrgrund") || null,
    })
    .eq("id", id);

  if (error) {
    redirect(`/plattform?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/plattform");
  redirect(mitErfolg("/plattform", "Organisation gespeichert."));
}

// QR-Rechnung/klassische Rechnung: Zahlungseingang kann nicht automatisch
// erkannt werden, daher bestätigt hier ein Arcos-Mitarbeiter den Eingang
// manuell und schaltet die Organisation damit frei.
export async function alsBezahltMarkieren(id: string) {
  await pruefePlatformAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("organisationen")
    .update({ status: "aktiv", sperrgrund: null })
    .eq("id", id);

  revalidatePath("/plattform");
  if (error) throw new Error(error.message);
}

const MAX_ADMINS_PRO_ORGANISATION = 2;

// Bearbeitet eine beliebige Person in einer beliebigen Organisation –
// Name, E-Mail (inkl. Login-E-Mail in auth.users, nicht nur die Anzeige in
// profiles) und Rolle. Braucht den Service-Role-Client, weil die reguläre
// Update-Policy ("profiles_update_own_or_admin") auf die eigene
// Organisation beschränkt ist und Platform-Admins bewusst nicht einschliesst
// (das wird hier stattdessen per Rollen-Prüfung im Code sichergestellt).
export async function bearbeiteMitarbeiterPlattform(id: string, formData: FormData) {
  await pruefePlatformAdmin();
  const admin = createAdminClient();

  const vorname = String(formData.get("vorname") ?? "").trim() || null;
  const nachname = String(formData.get("nachname") ?? "").trim() || null;
  const email = String(formData.get("email") ?? "").trim();
  const role = String(formData.get("role") ?? "mitarbeiter");

  const { data: bestehend } = await admin
    .from("profiles")
    .select("organisation_id, email")
    .eq("id", id)
    .single();

  if (role === "admin" && bestehend?.organisation_id) {
    const { count } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("organisation_id", bestehend.organisation_id)
      .eq("role", "admin")
      .neq("id", id);

    if ((count ?? 0) >= MAX_ADMINS_PRO_ORGANISATION) {
      redirect(
        `/plattform?error=${encodeURIComponent(
          `Maximal ${MAX_ADMINS_PRO_ORGANISATION} Admin-Konten pro Organisation erlaubt.`
        )}`
      );
    }
  }

  // Login-E-Mail nur anfassen, wenn sie sich tatsächlich ändert – ein
  // unveränderter, aber erneut übermittelter Wert soll keinen unnötigen
  // Auth-API-Aufruf (und keine erneute Bestätigungs-Mail) auslösen.
  if (email && email !== bestehend?.email) {
    const { error: authError } = await admin.auth.admin.updateUserById(id, { email });
    if (authError) {
      redirect(`/plattform?error=${encodeURIComponent(`E-Mail konnte nicht geändert werden: ${authError.message}`)}`);
    }
  }

  const { error } = await admin
    .from("profiles")
    .update({ vorname, nachname, email: email || null, role })
    .eq("id", id);

  if (error) {
    redirect(`/plattform?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/plattform");
  redirect(mitErfolg("/plattform", "Person gespeichert."));
}

// Lädt eine neue Person direkt in eine BESTEHENDE Organisation ein (z.B.
// wenn die bisherige Admin-Person eines Kunden wechselt und niemand
// Passendes vorhanden ist). Prüft dieselben Regeln wie eine reguläre
// Einladung durch den Kunden selbst (Lizenzlimit, max. 2 Admins).
export async function ladePersonEinPlattform(organisationId: string, formData: FormData) {
  await pruefePlatformAdmin();

  const vorname = String(formData.get("vorname") ?? "").trim();
  const nachname = String(formData.get("nachname") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const role = String(formData.get("role") ?? "mitarbeiter");

  if (!vorname || !nachname || !email) {
    redirect(`/plattform?error=${encodeURIComponent("Bitte Vorname, Nachname und E-Mail ausfüllen.")}`);
  }

  const admin = createAdminClient();

  const { data: organisation } = await admin
    .from("organisationen")
    .select("name, lizenzen_gebucht")
    .eq("id", organisationId)
    .single();

  if (organisation?.lizenzen_gebucht != null) {
    const { count } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("organisation_id", organisationId)
      .is("deaktiviert_am", null);

    if ((count ?? 0) >= organisation.lizenzen_gebucht) {
      redirect(
        `/plattform?error=${encodeURIComponent(
          `Lizenzlimit dieser Organisation erreicht (${organisation.lizenzen_gebucht}).`
        )}`
      );
    }
  }

  if (role === "admin") {
    const { count } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("organisation_id", organisationId)
      .eq("role", "admin");

    if ((count ?? 0) >= MAX_ADMINS_PRO_ORGANISATION) {
      redirect(
        `/plattform?error=${encodeURIComponent(
          `Maximal ${MAX_ADMINS_PRO_ORGANISATION} Admin-Konten pro Organisation erlaubt.`
        )}`
      );
    }
  }

  const adressFehler = emailFehler(email);
  if (adressFehler) {
    redirect(`/plattform/${organisationId}?error=${encodeURIComponent(adressFehler)}`);
  }

  const { fehler } = await sendeEinladung({
    email,
    vorname,
    nachname,
    organisationId,
    rolle: role as "admin" | "mitarbeiter",
    organisationName: organisation?.name,
  });

  if (fehler) {
    redirect(`/plattform?error=${encodeURIComponent(fehler)}`);
  }

  revalidatePath("/plattform");
  redirect(mitErfolg("/plattform", `Einladung an ${email} gesendet.`));
}

// Reaktiviert ein von einer Kundenorganisation selbst deaktiviertes Konto
// (Lizenz wieder "belegt"). Bewusst NICHT über die reguläre, organisations-
// beschränkte Update-Policy möglich – nur Platform-Admins, deshalb über den
// Service-Role-Client (die Policy "profiles_update_own_or_admin" deckt
// fremde Organisationen nicht ab, absichtlich).
export async function reaktiviereMitarbeiter(profilId: string) {
  await pruefePlatformAdmin();
  const admin = createAdminClient();

  const { error } = await admin
    .from("profiles")
    .update({ deaktiviert_am: null, deaktiviert_von: null })
    .eq("id", profilId);

  revalidatePath("/plattform");
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------
// Mandant löschen
// ---------------------------------------------------------------------
//
// AGB Ziffer 10 und AVV Ziffer 9 sagen zu, dass die Daten einer Kundin nach
// Vertragsende gelöscht werden. Die Löschung selbst ist bewusst KEIN
// Automatismus: Ein täglicher Auftrag, der ohne Zeugen fremde Betriebsdaten
// entfernt, ist eine Fehlkonstruktion – ein falsch gesetzter Status, ein
// verspätetes Stripe-Ereignis, und die Arbeit eines Jahres ist weg. Die
// tägliche Prüfung meldet nur; hier entscheidet ein Mensch.
//
// Drei Sicherungen, die zusammengehören:
//   1. Der Umfang steht vorher da, gezählt aus derselben Quelle, aus der
//      gelöscht wird (0064) – keine Vorschau, die zu wenig anzeigt.
//   2. Der Name muss abgetippt werden. Gegen den Griff auf die falsche
//      Zeile hilft keine Rückfrage mit "OK", sondern nur etwas, das man
//      nicht aus Versehen tut.
//   3. Die Sicherungskopie liegt einen Klick daneben.
export async function loescheOrganisationPlattform(
  organisationId: string,
  formData: FormData
) {
  const profil = await pruefePlatformAdmin();
  const admin = createAdminClient();
  const zurueck = `/plattform/${organisationId}`;

  const { data: organisation } = await admin
    .from("organisationen")
    .select("id, name, status, nachfrist_bis")
    .eq("id", organisationId)
    .single();

  if (!organisation) {
    redirect(`/plattform?error=${encodeURIComponent("Organisation nicht gefunden.")}`);
  }

  const bestaetigung = String(formData.get("bestaetigung") ?? "").trim();
  if (bestaetigung !== organisation.name) {
    redirect(
      `${zurueck}?error=${encodeURIComponent(
        `Der eingegebene Name stimmt nicht mit "${organisation.name}" überein. Es wurde nichts gelöscht.`
      )}`
    );
  }

  // Konten zuerst: Die Datenbankfunktion kann auth.users nicht anfassen,
  // und ein Konto ohne Organisation wäre ein Zugang ins Nichts.
  const { data: konten } = await admin
    .from("profiles")
    .select("id, email")
    .eq("organisation_id", organisationId);

  for (const konto of konten ?? []) {
    const { error } = await admin.auth.admin.deleteUser(konto.id);
    if (error) {
      redirect(
        `${zurueck}?error=${encodeURIComponent(
          `Das Konto ${konto.email} liess sich nicht entfernen (${error.message}). Es wurde nichts weiter gelöscht.`
        )}`
      );
    }
  }

  const { data: ergebnis, error: loeschFehler } = await admin.rpc("loesche_organisation", {
    p_organisation: organisationId,
  });

  if (loeschFehler) {
    redirect(
      `${zurueck}?error=${encodeURIComponent(
        `Die Organisation liess sich nicht löschen: ${loeschFehler.message}`
      )}`
    );
  }

  const zeilen = (ergebnis ?? []) as { tabelle: string; anzahl: number }[];
  const summe = zeilen.reduce((s, z) => s + Number(z.anzahl), 0);

  // Nachweis für uns selbst: Das Änderungsprotokoll der Organisation ist
  // mitgelöscht worden, es kann also nichts mehr festhalten. Ohne diese
  // Mail gäbe es keinerlei Spur, wer wann welchen Mandanten entfernt hat.
  try {
    await sendeMail({
      an: profil.email ?? "",
      systemAntwort: true,
      betreff: `Mandant gelöscht: ${organisation.name}`,
      html: `
        <div style="font-family:sans-serif;color:#111827;">
          <p><strong>${organisation.name}</strong> wurde von ${profil.name} gelöscht.</p>
          <p>Entfernt wurden ${konten?.length ?? 0} Benutzerkonten und ${summe} Datensätze:</p>
          <ul>${zeilen.map((z) => `<li>${z.tabelle}: ${z.anzahl}</li>`).join("")}</ul>
          <p>Die Rechnungen der Arcos Group an diese Kundin bleiben als Belege bestehen
          (Art. 958f OR).</p>
        </div>`,
    });
  } catch (fehler) {
    console.error("Meldung über die Löschung nicht versendet:", fehler);
  }

  revalidatePath("/plattform");
  redirect(
    mitErfolg(
      "/plattform",
      `"${organisation.name}" wurde gelöscht: ${konten?.length ?? 0} Konten und ${summe} Datensätze.`
    )
  );
}
