import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDatumCH } from "@/lib/date-utils";
import { rapportNummer, type Rapport, type RapportStatus } from "@/lib/types";
import { ListenTabelle } from "@/components/listen-tabelle";
import { SpaltenWahl } from "@/components/spalten-wahl";
import { speichereSpaltenwahl } from "@/app/actions/spaltenwahl";
import { sichtbareSpalten, sortiere, type Spalte } from "@/lib/listen-spalten";
import { getCurrentProfile } from "@/lib/get-profile";
import { mitKunde } from "@/lib/rapport-kunde";

const STATUS_STIL: Record<RapportStatus, string> = {
  offen: "bg-amber-100 text-amber-800",
  signiert: "bg-green-100 text-green-800",
  abgeschlossen: "bg-blue-100 text-blue-800",
  storniert: "bg-gray-200 text-gray-600",
};

const STATUS_TEXT: Record<RapportStatus, string> = {
  offen: "Entwurf",
  signiert: "Signiert",
  abgeschlossen: "Abgeschlossen",
  storniert: "Storniert",
};

function uhrzeit(zeitstempel: string | null): string | null {
  if (!zeitstempel) return null;
  const d = new Date(zeitstempel);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// Der Katalog braucht den laufenden Timer, deshalb eine Funktion –
// dasselbe Muster wie in der Mitarbeitendenliste.
function spalten(timerSeit: Map<string, string>): Spalte<Rapport>[] {
  return [
  {
    key: "nummer",
    titel: "Nummer",
    fest: true,
    wert: (r) => (r.jahr && r.nummer ? r.jahr * 100000 + r.nummer : null),
    klasse: "px-4 py-2 whitespace-nowrap",
    // Der Hinweis steht in der Nummernspalte, weil die immer sichtbar
    // ist: Sie lässt sich nicht abwählen.
    zelle: (r) => (
      <span className="inline-flex items-center gap-2">
        <Link href={`/rapporte/${r.id}`} className="text-arcos-steel hover:underline">
          {rapportNummer(r)}
        </Link>
        {timerSeit.has(r.id) && (
          <span
            title={`Timer läuft seit ${new Date(timerSeit.get(r.id)!).toLocaleTimeString("de-CH", { hour: "2-digit", minute: "2-digit" })} Uhr`}
            className="inline-flex items-center rounded bg-red-600 px-1.5 py-0.5 text-xs font-medium text-white"
          >
            ⏱ läuft
          </span>
        )}
      </span>
    ),
  },
  {
    key: "datum",
    titel: "Datum",
    wert: (r) => r.datum,
    klasse: "px-4 py-2 whitespace-nowrap",
    zelle: (r) => formatDatumCH(r.datum),
  },
  {
    key: "zeit",
    titel: "Geplante Zeit",
    aus: true,
    wert: (r) => r.geplant_von,
    klasse: "px-4 py-2 whitespace-nowrap",
    zelle: (r) => {
      const von = uhrzeit(r.geplant_von);
      const bis = uhrzeit(r.geplant_bis);
      return von ? `${von}–${bis ?? ""}` : "–";
    },
  },
  {
    key: "kunde",
    titel: "Kunde",
    wert: (r) => [r.kunde?.vorname, r.kunde?.name].filter(Boolean).join(" ") || null,
    zelle: (r) =>
      `${r.kunde?.vorname ? `${r.kunde.vorname} ` : ""}${r.kunde?.name ?? "–"}`,
  },
  {
    key: "projekt",
    titel: "Projekt",
    wert: (r) => r.projekte?.bezeichnung ?? null,
    zelle: (r) => r.projekte?.bezeichnung ?? "–",
  },
  {
    key: "mitarbeiter",
    titel: "Ausgeführt von",
    wert: (r) => r.profiles?.name ?? null,
    zelle: (r) => r.profiles?.name ?? "–",
  },
  {
    key: "bemerkung",
    titel: "Bemerkung",
    aus: true,
    wert: (r) => r.bemerkung,
    zelle: (r) => r.bemerkung ?? "–",
  },
  {
    key: "unterzeichner",
    titel: "Unterzeichnet von",
    aus: true,
    wert: (r) => r.unterzeichner_name,
    // Ohne Unterschrift steht der Grund da – so ist auf einen Blick zu
    // sehen, welche Rapporte ohne Beleg abgeschlossen wurden.
    zelle: (r) =>
      r.unterzeichner_name ??
      (r.abschluss_vermerk ? (
        <span className="text-gray-400">{r.abschluss_vermerk}</span>
      ) : (
        "–"
      )),
  },
  {
    key: "versand",
    titel: "Versendet",
    aus: true,
    wert: (r) => r.versendet_am,
    klasse: "px-4 py-2 whitespace-nowrap",
    zelle: (r) =>
      r.versendet_am ? formatDatumCH(r.versendet_am.slice(0, 10)) : "–",
  },
  {
    key: "status",
    titel: "Status",
    wert: (r) => r.status,
    klasse: "px-4 py-2 whitespace-nowrap",
    zelle: (r) => (
      <span className={`rounded px-2 py-0.5 text-xs ${STATUS_STIL[r.status]}`}>
        {STATUS_TEXT[r.status]}
      </span>
    ),
  },
  ];
}

export default async function RapportePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; status?: string; sort?: string; richtung?: string }>;
}) {
  const params = await searchParams;
  const { error, status, sort, richtung } = params;
  const supabase = await createClient();
  const profile = await getCurrentProfile();

  let query = supabase
    .from("rapporte")
    .select(
      "*, projekte(id, bezeichnung, kunden(id, name, vorname, email)), profiles!rapporte_mitarbeiter_id_fkey(id, name)"
    )
    .order("datum", { ascending: false })
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);

  // Welcher Rapport hat einen laufenden Timer? Das rote Zeichen in der
  // Navigation sagt, DASS einer läuft – wer ihn stoppen will, muss aber
  // wissen, welcher. In der Liste zu suchen hiesse, jeden Rapport zu
  // öffnen.
  const { data: laufende } = await supabase
    .from("zeiteintraege")
    .select("id, rapport_id, timer_gestartet_um, mitarbeiter_id, dienstleistung_id")
    .not("timer_gestartet_um", "is", null)
    .not("rapport_id", "is", null);

  const timerJeRapport = new Map<string, string>();
  for (const z of laufende ?? []) {
    if (z.rapport_id) timerJeRapport.set(z.rapport_id, z.timer_gestartet_um);
  }

  const SPALTEN = spalten(timerJeRapport);

  const { data } = await query;
  // Ohne Sortierwunsch bleibt die Reihenfolge der Abfrage: neueste zuerst.
  // Der Kunde kommt seit 0071 über das Projekt – mitKunde() legt ihn für
  // die Anzeige eine Ebene höher.
  const rapporte = sortiere(
    ((data as Rapport[] | null) ?? []).map(mitKunde),
    SPALTEN,
    sort,
    richtung
  );

  const { sichtbar, gewaehlt } = await sichtbareSpalten("rapporte", SPALTEN);

  // Der eigene laufende Timer bekommt ein Band über der Liste: Er ist
  // der einzige, den man von hier aus stoppen würde.
  const eigenerTimer = (laufende ?? []).find((z) => z.mitarbeiter_id === profile?.id);
  const eigenerRapport = eigenerTimer
    ? rapporte.find((r) => r.id === eigenerTimer.rapport_id)
    : undefined;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-semibold">Arbeitsrapporte</h1>
        <Link
          href="/rapporte/neu"
          className="rounded bg-arcos-steel text-white text-sm font-medium px-4 py-2 hover:bg-arcos-navy"
        >
          + Neuer Rapport
        </Link>
      </div>

      {error && (
        <div className="rounded bg-red-50 text-red-700 text-sm px-3 py-2 mb-4">{error}</div>
      )}

      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex flex-wrap gap-2 text-sm">
          <Link
            href={`/rapporte?${new URLSearchParams(
              Object.entries({ sort, richtung }).filter(([, v]) => v) as [string, string][]
            ).toString()}`}
            className={`rounded border px-3 py-1.5 ${!status ? "bg-arcos-steel text-white" : "bg-white hover:bg-gray-50"}`}
          >
            Alle
          </Link>
          {(["offen", "signiert", "abgeschlossen", "storniert"] as RapportStatus[]).map((s) => (
            <Link
              key={s}
              href={`/rapporte?${new URLSearchParams(
                Object.entries({ status: s, sort, richtung }).filter(([, v]) => v) as [
                  string,
                  string,
                ][]
              ).toString()}`}
              className={`rounded border px-3 py-1.5 ${status === s ? "bg-arcos-steel text-white" : "bg-white hover:bg-gray-50"}`}
            >
              {STATUS_TEXT[s]}
            </Link>
          ))}
        </div>

        <SpaltenWahl
          alle={SPALTEN.map(({ key, titel, fest }) => ({ key, titel, fest }))}
          gewaehlt={gewaehlt}
          action={speichereSpaltenwahl.bind(null, "rapporte", "/rapporte")}
        />
      </div>

      {eigenerTimer && eigenerRapport && (
        <div className="mb-4 rounded-lg border-2 border-red-500 bg-red-50 p-4 flex flex-wrap items-center gap-3">
          <span className="flex-1 min-w-[14rem] text-sm text-red-800">
            <strong>Dein Timer läuft</strong> seit{" "}
            {new Date(eigenerTimer.timer_gestartet_um).toLocaleTimeString("de-CH", {
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
            Uhr – {eigenerRapport.kunde?.name ?? "Rapport"}
            {eigenerRapport.projekte?.bezeichnung
              ? ` · ${eigenerRapport.projekte.bezeichnung}`
              : ""}
          </span>
          <Link
            href={`/rapporte/${eigenerRapport.id}`}
            className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Rapport öffnen und stoppen
          </Link>
        </div>
      )}

      {rapporte.length === 0 ? (
        <p className="text-sm text-gray-500 bg-white rounded-lg border p-6">
          Noch keine Rapporte erfasst. Ein Rapport fasst die Positionen eines
          Kundeneinsatzes zusammen – Anfahrt, Arbeitszeit und Material.
        </p>
      ) : (
        <ListenTabelle
          spalten={sichtbar}
          zeilen={rapporte}
          basis="/rapporte"
          params={params}
          leerText="Keine Rapporte gefunden."
          zeilenKlasse={(r) =>
            timerJeRapport.has(r.id) ? "bg-red-50 hover:bg-red-100" : "hover:bg-gray-50"
          }
        />
      )}
    </div>
  );
}
