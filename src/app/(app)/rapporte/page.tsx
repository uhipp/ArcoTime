import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDatumCH } from "@/lib/date-utils";
import { rapportNummer, type Rapport, type RapportStatus } from "@/lib/types";
import { ListenTabelle } from "@/components/listen-tabelle";
import { SpaltenWahl } from "@/components/spalten-wahl";
import { speichereSpaltenwahl } from "@/app/actions/spaltenwahl";
import { sichtbareSpalten, sortiere, type Spalte } from "@/lib/listen-spalten";

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

const SPALTEN: Spalte<Rapport>[] = [
  {
    key: "nummer",
    titel: "Nummer",
    fest: true,
    wert: (r) => (r.jahr && r.nummer ? r.jahr * 100000 + r.nummer : null),
    klasse: "px-4 py-2 whitespace-nowrap",
    zelle: (r) => (
      <Link href={`/rapporte/${r.id}`} className="text-arcos-steel hover:underline">
        {rapportNummer(r)}
      </Link>
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
    wert: (r) => [r.kunden?.vorname, r.kunden?.name].filter(Boolean).join(" ") || null,
    zelle: (r) =>
      `${r.kunden?.vorname ? `${r.kunden.vorname} ` : ""}${r.kunden?.name ?? "–"}`,
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

export default async function RapportePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; status?: string; sort?: string; richtung?: string }>;
}) {
  const params = await searchParams;
  const { error, status, sort, richtung } = params;
  const supabase = await createClient();

  let query = supabase
    .from("rapporte")
    .select("*, kunden(id, name, vorname, email), projekte(id, bezeichnung), profiles!rapporte_mitarbeiter_id_fkey(id, name)")
    .order("datum", { ascending: false })
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);

  const { data } = await query;
  // Ohne Sortierwunsch bleibt die Reihenfolge der Abfrage: neueste zuerst.
  const rapporte = sortiere((data as Rapport[] | null) ?? [], SPALTEN, sort, richtung);

  const { sichtbar, gewaehlt } = await sichtbareSpalten("rapporte", SPALTEN);

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
        />
      )}
    </div>
  );
}
