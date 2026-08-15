import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, getCurrentOrganisation } from "@/lib/get-profile";
import { updateMitarbeiter, ladeMitarbeitendeEin, deaktiviereMitarbeiter } from "@/app/actions/mitarbeiter";
import { DeleteButton } from "@/components/delete-button";
import type { Profile } from "@/lib/types";
import { ListenTabelle } from "@/components/listen-tabelle";
import { SpaltenWahl } from "@/components/spalten-wahl";
import { speichereSpaltenwahl } from "@/app/actions/spaltenwahl";
import { sichtbareSpalten, sortiere, type Spalte } from "@/lib/listen-spalten";
import { darf } from "@/lib/berechtigungen";

type MitarbeiterZeile = Profile & { deaktiviert_am: string | null };

// Diese Liste ist zugleich das Bearbeitungsformular: Jede Zeile trägt ein
// eigenes <form>, die Felder der übrigen Zellen hängen über form={id}
// daran. Deshalb steht das Formular in der ersten Spalte, und diese ist
// nicht abwählbar – ohne sie hätten die Felder kein Formular mehr.
function spalten(eigeneId: string): Spalte<MitarbeiterZeile>[] {
  return [
    {
      key: "vorname",
      titel: "Vorname",
      fest: true,
      wert: (m) => m.vorname,
      klasse: "px-2 py-2",
      zelle: (m) => (
        <form action={updateMitarbeiter.bind(null, m.id)} id={`form-${m.id}`} className="contents">
          <input
            name="vorname"
            defaultValue={m.vorname ?? ""}
            placeholder="Vorname"
            form={`form-${m.id}`}
            className="w-full rounded border border-gray-300 px-2 py-1.5"
          />
        </form>
      ),
    },
    {
      key: "nachname",
      titel: "Nachname",
      wert: (m) => m.nachname,
      klasse: "px-2 py-2",
      zelle: (m) => (
        <input
          name="nachname"
          defaultValue={m.nachname ?? ""}
          placeholder="Nachname"
          form={`form-${m.id}`}
          className="w-full rounded border border-gray-300 px-2 py-1.5"
        />
      ),
    },
    {
      key: "email",
      titel: "E-Mail",
      wert: (m) => m.email,
      klasse: "px-2 py-2 text-gray-500",
      zelle: (m) => m.email ?? "–",
    },
    {
      key: "rolle",
      titel: "Rolle",
      wert: (m) => m.role,
      klasse: "px-2 py-2",
      zelle: (m) => (
        <select
          name="role"
          defaultValue={m.role}
          form={`form-${m.id}`}
          className="rounded border border-gray-300 px-2 py-1.5"
        >
          <option value="mitarbeiter">Mitarbeitende</option>
          <option value="admin">Admin</option>
        </select>
      ),
    },
    {
      // Farbe hat keine sinnvolle Reihenfolge, deshalb ohne Sortierwert.
      key: "farbe",
      titel: "Farbe",
      klasse: "px-2 py-2",
      zelle: (m) => (
        <input
          type="color"
          name="farbe"
          defaultValue={m.farbe ?? "#457B9D"}
          form={`form-${m.id}`}
          title="Farbe im Kalender"
          className="h-9 w-12 rounded border border-gray-300 cursor-pointer"
        />
      ),
    },
    {
      key: "status",
      titel: "Status",
      // Aktive zuerst: "aktiv" vor "deaktiviert" ist auch alphabetisch die
      // gewünschte Reihenfolge, hier aber bewusst über das Datum, damit
      // zuletzt deaktivierte Konten beieinander stehen.
      wert: (m) => m.deaktiviert_am ?? "",
      klasse: "px-2 py-2 whitespace-nowrap text-xs",
      zelle: (m) =>
        m.deaktiviert_am ? (
          <span title="Nur durch Arcos reaktivierbar">
            Deaktiviert seit {new Date(m.deaktiviert_am).toLocaleDateString("de-CH")}
          </span>
        ) : (
          <span className="text-green-700">Aktiv</span>
        ),
    },
    {
      key: "speichern",
      titel: "",
      fest: true,
      klasse: "px-2 py-2 text-right",
      zelle: (m) => (
        <button
          type="submit"
          form={`form-${m.id}`}
          disabled={Boolean(m.deaktiviert_am)}
          className="rounded bg-arcos-steel text-white text-sm font-medium px-3 py-1.5 hover:bg-arcos-navy disabled:opacity-40"
        >
          Speichern
        </button>
      ),
    },
    {
      key: "details",
      titel: "",
      fest: true,
      klasse: "px-2 py-2 text-right whitespace-nowrap",
      zelle: (m) => (
        <>
          {/* Hinter der Detailseite liegen Dokumente UND Abwesenheiten –
              "Dokumente" als Linktext hat den Kalender unauffindbar
              gemacht. */}
          <Link href={`/mitarbeiter/${m.id}`} className="text-arcos-steel hover:underline text-sm mr-3">
            Details
          </Link>
          {!m.deaktiviert_am && m.id !== eigeneId && (
            <DeleteButton
              action={deaktiviereMitarbeiter.bind(null, m.id)}
              label="Deaktivieren"
              confirmText={`"${m.name}" deaktivieren? Die Lizenz wird frei, das Konto kann danach nur noch von Arcos reaktiviert werden.`}
            />
          )}
        </>
      ),
    },
  ];
}

export default async function MitarbeitendePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sort?: string; richtung?: string }>;
}) {
  const profile = await getCurrentProfile();
  if (!profile || !darf(profile, "mitarbeitende.verwalten")) redirect("/");

  const params = await searchParams;
  const { error, sort, richtung } = params;
  const supabase = await createClient();

  const [{ data: mitarbeitende }, organisation] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, name, vorname, nachname, email, role, farbe, deaktiviert_am")
      .order("nachname"),
    getCurrentOrganisation(),
  ]);

  const SPALTEN = spalten(profile.id);
  const sortierteMitarbeitende = sortiere(
    (mitarbeitende as MitarbeiterZeile[] | null) ?? [],
    SPALTEN,
    sort,
    richtung
  );

  const { sichtbar, gewaehlt } = await sichtbareSpalten("mitarbeiter", SPALTEN);

  const { data: lizenzInfo } = organisation
    ? await supabase.from("organisationen").select("lizenzen_gebucht").eq("id", organisation.id).single()
    : { data: null };

  const genutzteLizenzen = (mitarbeitende ?? []).filter((m) => !m.deaktiviert_am).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <h1 className="text-2xl font-semibold">Mitarbeitende</h1>
        <span className="text-sm text-gray-500">
          {lizenzInfo?.lizenzen_gebucht != null
            ? `${genutzteLizenzen} von ${lizenzInfo.lizenzen_gebucht} Lizenzen genutzt`
            : `${genutzteLizenzen} Lizenzen genutzt (unbegrenzt)`}
        </span>
      </div>

      {error && (
        <div className="rounded bg-red-50 text-red-700 text-sm px-3 py-2 mb-4">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg border p-5 mb-8">
        <h2 className="text-lg font-medium mb-1">Neue Person einladen</h2>
        <p className="text-sm text-gray-500 mb-4">
          Legt direkt einen Login an und sendet eine E-Mail mit einem Link,
          über den die Person selbst ihr Passwort festlegt.
        </p>
        <form action={ladeMitarbeitendeEin} className="flex flex-wrap items-end gap-3 text-sm">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Vorname</label>
            <input
              name="vorname"
              required
              className="rounded border border-gray-300 px-3 py-2 min-w-[9rem]"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Nachname</label>
            <input
              name="nachname"
              required
              className="rounded border border-gray-300 px-3 py-2 min-w-[9rem]"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">E-Mail</label>
            <input
              name="email"
              type="email"
              required
              className="rounded border border-gray-300 px-3 py-2 min-w-[14rem]"
            />
          </div>
          <button
            type="submit"
            className="rounded bg-arcos-steel text-white text-sm font-medium px-4 py-2 hover:bg-arcos-navy"
          >
            Einladungslink senden
          </button>
        </form>
      </div>

      <div className="mb-3 flex items-start justify-between gap-3">
        <p className="text-sm text-gray-500">
          Vorname, Nachname, Rolle und Farbe lassen sich direkt in der Zeile
        ändern – der Knopf „Speichern“ steht rechts in derselben Zeile. Unter
        „Details“ liegen Dokumente und Abwesenheiten der Person.
        </p>
        <SpaltenWahl
          alle={SPALTEN.map(({ key, titel, fest }) => ({
            key,
            titel: titel || "Aktionen",
            fest,
          }))}
          gewaehlt={gewaehlt}
          action={speichereSpaltenwahl.bind(null, "mitarbeiter", "/mitarbeiter")}
        />
      </div>
      <ListenTabelle
        spalten={sichtbar}
        zeilen={sortierteMitarbeitende}
        basis="/mitarbeiter"
        params={params}
        leerText="Keine Mitarbeitenden gefunden."
        zeilenKlasse={(m) => (m.deaktiviert_am ? "bg-gray-50 text-gray-400" : "")}
      />
    </div>
  );
}
