import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/get-profile";
import { ZeiterfassungForm } from "@/components/zeiterfassung-form";
import { erfasseZeiteintrag } from "@/app/actions/zeiteintraege";
import { zeitraumFuer, heuteIso } from "@/lib/date-utils";
import type { ZeiteintragMitDetails } from "@/lib/types";
import { mengeLabel } from "@/lib/menge";
import { DatumFeld } from "@/components/datum-feld";
import { ListenTabelle } from "@/components/listen-tabelle";
import { SpaltenWahl } from "@/components/spalten-wahl";
import { speichereSpaltenwahl } from "@/app/actions/spaltenwahl";
import { sichtbareSpalten, sortiere, type Spalte } from "@/lib/listen-spalten";

const SPALTEN: Spalte<ZeiteintragMitDetails>[] = [
  {
    key: "datum",
    titel: "Datum",
    fest: true,
    wert: (z) => z.datum,
    klasse: "px-4 py-2 whitespace-nowrap",
    zelle: (z) => new Date(z.datum).toLocaleDateString("de-CH"),
  },
  {
    key: "zeit",
    titel: "Von–bis",
    aus: true,
    wert: (z) => z.start_zeit,
    klasse: "px-4 py-2 whitespace-nowrap",
    zelle: (z) =>
      z.start_zeit ? `${z.start_zeit.slice(0, 5)}–${z.end_zeit?.slice(0, 5) ?? ""}` : "–",
  },
  {
    key: "kunde",
    titel: "Kunde / Projekt",
    wert: (z) =>
      [z.vorname, z.kunde_name, z.projekt_bezeichnung].filter(Boolean).join(" ") || null,
    zelle: (z) =>
      `${z.vorname ? `${z.vorname} ` : ""}${z.kunde_name} – ${z.projekt_bezeichnung}`,
  },
  {
    key: "kostenstelle",
    titel: "Kostenstelle",
    aus: true,
    wert: (z) => z.kostenstelle,
    zelle: (z) => z.kostenstelle ?? "–",
  },
  {
    key: "artikel",
    titel: "Artikel",
    wert: (z) => z.artikel_bezeichnung,
    zelle: (z) => z.artikel_bezeichnung,
  },
  {
    key: "beschreibung",
    titel: "Beschreibung",
    aus: true,
    wert: (z) => z.beschreibung,
    zelle: (z) => z.beschreibung ?? "–",
  },
  {
    key: "menge",
    titel: "Dauer",
    // Nach der verrechneten Menge, nicht nach dem angezeigten Text: "45 min"
    // und "2 Stk" liessen sich als Zeichenkette nicht sinnvoll vergleichen.
    wert: (z) => Number(z.menge_verrechnet ?? 0),
    klasse: "px-4 py-2 whitespace-nowrap",
    zelle: (z) =>
      z.timer_gestartet_um ? (
        <span className="font-medium text-red-700">⏱ Timer aktiv</span>
      ) : (
        mengeLabel(z)
      ),
    // Nur Arbeitszeit summieren – Kilometer und Stück gehören nicht dazu.
    fuss: (zeilen) =>
      `${zeilen.reduce((s, z) => s + Number(z.menge_stunden ?? 0), 0).toFixed(2)} h`,
  },
  {
    key: "rabatt",
    titel: "Rabatt",
    aus: true,
    wert: (z) => Number(z.rabatt_prozent ?? 0),
    klasse: "px-4 py-2 whitespace-nowrap",
    zelle: (z) => (z.rabatt_prozent ? `${z.rabatt_prozent} %` : "–"),
  },
  {
    key: "betrag",
    titel: "Betrag",
    wert: (z) => Number(z.betrag ?? 0),
    klasse: "px-4 py-2 whitespace-nowrap",
    zelle: (z) =>
      z.timer_gestartet_um ? "–" : `CHF ${Number(z.betrag).toFixed(2)}`,
    fuss: (zeilen) =>
      `CHF ${zeilen.reduce((s, z) => s + Number(z.betrag ?? 0), 0).toFixed(2)}`,
  },
  {
    key: "aktion",
    titel: "",
    fest: true,
    klasse: "px-4 py-2 text-right",
    zelle: (z) =>
      z.beleg_id ? (
        <span className="text-xs text-gray-400">exportiert</span>
      ) : (
        <Link
          href={`/zeiterfassung/${z.id}`}
          className={
            z.timer_gestartet_um
              ? "font-medium text-red-700 hover:underline"
              : "text-arcos-steel hover:underline"
          }
        >
          {z.timer_gestartet_um ? "Stoppen" : "Bearbeiten"}
        </Link>
      ),
  },
];

export default async function ZeiterfassungPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    von?: string;
    bis?: string;
    sort?: string;
    richtung?: string;
  }>;
}) {
  const params = await searchParams;
  const { error, von, bis, sort, richtung } = params;
  const [defaultVon, defaultBis] = zeitraumFuer("woche", heuteIso());
  const vonDatum = von ?? defaultVon;
  const bisDatum = bis ?? defaultBis;

  const supabase = await createClient();
  const user = await getCurrentUser();
  const aktuellerUserId = user?.id ?? "";

  const [
    { data: projekte },
    { data: artikel },
    { data: mitarbeitende },
    { data: kunden },
    { data: rabattsaetze },
    { data: klassenRabatte },
    { data: eintraege, error: listError },
  ] = await Promise.all([
    supabase
      .from("projekte")
      .select("*, kunden(name, vorname, standard_rabatt_prozent, anreise_km)")
      .order("bezeichnung"),
    supabase
      .from("artikel")
      .select("id, bezeichnung, beschreibung, aktiv, einheit, zaehlt_als_arbeitszeit, rabatt_erlaubt, klasse_id, menge_aus_anreise")
      .order("bezeichnung"),
    supabase.from("profiles").select("id, name").order("name"),
    supabase
      .from("kunden")
      .select("id, name, vorname")
      // Nur echte Kunden: Filter für die Auftragsauswahl. Ein Eigentümer oder Architekt
      // steht im Adressbuch, gehört aber nicht hierher (0074).
      .eq("ist_kunde", true)
      .order("name"),
    supabase.from("rabattsaetze").select("id, prozent, bezeichnung, aktiv").order("sortierung"),
    supabase.from("kundenrabatte").select("kunde_id, klasse_id, rabatt_prozent"),
    supabase
      .from("v_zeiteintraege")
      .select("*")
      // Positionen offener Rapporte gehören hier nicht hin: Sie sind
      // Auftragsinhalt, oft mit einem Datum in der Zukunft, und werden im
      // Rapport bearbeitet. Erst mit dem Abschluss werden sie zu erfasster
      // Zeit – siehe 0036.
      .eq("vorlaeufig", false)
      .eq("mitarbeiter_id", aktuellerUserId)
      .gte("datum", vonDatum)
      .lte("datum", bisDatum)
      .order("datum", { ascending: false })
      .order("start_zeit", { ascending: false }),
  ]);

  const zeilen = sortiere(
    (eintraege as ZeiteintragMitDetails[] | null) ?? [],
    SPALTEN,
    sort,
    richtung
  );

  const { sichtbar, gewaehlt } = await sichtbareSpalten("zeiterfassung", SPALTEN);

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Zeiterfassung</h1>

      <div className="mb-8">
        <ZeiterfassungForm
          projekte={projekte ?? []}
          artikel={artikel ?? []}
          mitarbeitende={mitarbeitende ?? []}
          kunden={kunden ?? []}
          rabattsaetze={rabattsaetze ?? []}
          klassenRabatte={klassenRabatte ?? []}
          aktuellerUserId={aktuellerUserId}
          action={erfasseZeiteintrag}
          timerMoeglich
          error={error}
        />
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium">Meine Einträge</h2>
        <div className="flex items-center gap-2">
        <form className="flex items-center gap-2 text-sm">
          <DatumFeld
            name="von"
            defaultValue={vonDatum}
            className="rounded border border-gray-300 px-2 py-1.5"
          />
          <span className="text-gray-400">bis</span>
          <DatumFeld
            name="bis"
            defaultValue={bisDatum}
            className="rounded border border-gray-300 px-2 py-1.5"
          />
          {/* Zeitraum wechseln darf die Sortierung nicht verwerfen. */}
          {sort && <input type="hidden" name="sort" value={sort} />}
          {richtung && <input type="hidden" name="richtung" value={richtung} />}
          <button type="submit" className="rounded border px-3 py-1.5 hover:bg-gray-50">
            Filtern
          </button>
        </form>
        {/* Die Spaltenwahl steht NEBEN dem Filterformular, nicht darin: Sie
            bringt ihr eigenes <form> mit, und verschachtelte Formulare sind
            in HTML verboten – der Browser wirft das innere weg, und dann
            filtert das Speichern der Spaltenwahl statt zu speichern. */}
        <SpaltenWahl
          alle={SPALTEN.map(({ key, titel, fest }) => ({ key, titel, fest }))}
          gewaehlt={gewaehlt}
          action={speichereSpaltenwahl.bind(null, "zeiterfassung", "/zeiterfassung")}
        />
        </div>
      </div>

      {listError && (
        <div className="rounded bg-red-50 text-red-700 text-sm px-3 py-2 mb-4">
          {listError.message}
        </div>
      )}

      <div className="mb-3">
        <ListenTabelle
          spalten={sichtbar}
          zeilen={zeilen}
          basis="/zeiterfassung"
          params={params}
          leerText="Keine Einträge im gewählten Zeitraum."
          fussTitel="Summe"
          zeilenKlasse={(z) =>
            z.timer_gestartet_um ? "bg-red-50 hover:bg-red-100" : "hover:bg-gray-50"
          }
        />
      </div>
      <p className="text-xs text-gray-400">
        Zeigt Einträge, die dir zugeordnet sind — auch wenn jemand anders sie
        für dich erfasst hat. Ausführlichere Auswertungen über alle
        Mitarbeitenden findest du unter „Auswertungen“.
      </p>
    </div>
  );
}
