import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDatumCH } from "@/lib/date-utils";
import { ListenTabelle } from "@/components/listen-tabelle";
import { SpaltenWahl } from "@/components/spalten-wahl";
import { speichereSpaltenwahl } from "@/app/actions/spaltenwahl";
import { sichtbareSpalten, sortiere, type Spalte } from "@/lib/listen-spalten";

type ProjektZeile = {
  id: string;
  bezeichnung: string;
  kostenstelle: string | null;
  status: string;
  startdatum: string | null;
  notizen: string | null;
  sichtbar_fuer_alle: boolean;
  kunden?: { name: string; vorname: string | null } | null;
  projektleiter?: { name: string } | null;
};

const SPALTEN: Spalte<ProjektZeile>[] = [
  {
    key: "projekt",
    titel: "Projekt",
    fest: true,
    wert: (p) => p.bezeichnung,
    zelle: (p) => (
      <Link href={`/projekte/${p.id}`} className="text-arcos-steel hover:underline">
        {p.bezeichnung}
      </Link>
    ),
  },
  {
    key: "kunde",
    titel: "Kunde",
    wert: (p) => [p.kunden?.vorname, p.kunden?.name].filter(Boolean).join(" ") || null,
    zelle: (p) => `${p.kunden?.vorname ? `${p.kunden.vorname} ` : ""}${p.kunden?.name ?? "–"}`,
  },
  {
    key: "projektleitung",
    titel: "Projektleitung",
    wert: (p) => p.projektleiter?.name ?? null,
    zelle: (p) => p.projektleiter?.name ?? "–",
  },
  {
    key: "kostenstelle",
    titel: "Kostenstelle",
    wert: (p) => p.kostenstelle,
    zelle: (p) => p.kostenstelle ?? "–",
  },
  {
    key: "start",
    titel: "Start",
    aus: true,
    wert: (p) => p.startdatum,
    klasse: "px-4 py-2 whitespace-nowrap",
    zelle: (p) => (p.startdatum ? formatDatumCH(p.startdatum) : "–"),
  },
  {
    key: "sichtbarkeit",
    titel: "Sichtbar für",
    aus: true,
    wert: (p) => p.sichtbar_fuer_alle,
    zelle: (p) => (p.sichtbar_fuer_alle ? "Alle" : "Nur Zugeteilte"),
  },
  {
    key: "notizen",
    titel: "Notizen",
    aus: true,
    wert: (p) => p.notizen,
    zelle: (p) => p.notizen ?? "–",
  },
  {
    key: "status",
    titel: "Status",
    wert: (p) => p.status,
    klasse: "px-4 py-2 whitespace-nowrap",
    zelle: (p) => (
      <span
        className={`inline-block rounded px-2 py-0.5 text-xs ${
          p.status === "aktiv" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
        }`}
      >
        {p.status}
      </span>
    ),
  },
];

export default async function ProjektePage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    kunde_id?: string;
    sort?: string;
    richtung?: string;
  }>;
}) {
  const params = await searchParams;
  const { status, kunde_id, sort, richtung } = params;
  const supabase = await createClient();

  let query = supabase
    .from("projekte")
    .select("*, kunden(id, name, vorname), projektleiter:profiles!projektleiter_id(name)")
    .order("bezeichnung", { ascending: true });

  if (status) query = query.eq("status", status);
  if (kunde_id) query = query.eq("kunde_id", kunde_id);

  const { data, error } = await query;
  const projekte = sortiere((data as ProjektZeile[] | null) ?? [], SPALTEN, sort, richtung);

  const { sichtbar, gewaehlt } = await sichtbareSpalten("projekte", SPALTEN);

  const { data: kunden } = await supabase
    .from("kunden")
    .select("id, name, vorname")
    .order("name");

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Projekte</h1>
        <Link
          href="/projekte/neu"
          className="rounded bg-arcos-steel text-white text-sm font-medium px-4 py-2 hover:bg-arcos-navy"
        >
          + Neues Projekt
        </Link>
      </div>

      <div className="mb-4 flex items-start justify-between gap-3">
      <form className="flex flex-wrap gap-3">
        <select
          name="kunde_id"
          defaultValue={kunde_id ?? ""}
          className="rounded border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">Alle Kunden</option>
          {kunden?.map((k) => (
            <option key={k.id} value={k.id}>
              {k.vorname ? `${k.vorname} ` : ""}
              {k.name}
            </option>
          ))}
        </select>
        <select
          name="status"
          defaultValue={status ?? ""}
          className="rounded border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">Alle Status</option>
          <option value="aktiv">Aktiv</option>
          <option value="inaktiv">Inaktiv</option>
        </select>
        {/* Filtern darf die Sortierung nicht verwerfen. */}
        {sort && <input type="hidden" name="sort" value={sort} />}
        {richtung && <input type="hidden" name="richtung" value={richtung} />}
        <button
          type="submit"
          className="rounded border text-sm px-4 py-2 hover:bg-gray-50"
        >
          Filtern
        </button>
      </form>

        <SpaltenWahl
          alle={SPALTEN.map(({ key, titel, fest }) => ({ key, titel, fest }))}
          gewaehlt={gewaehlt}
          action={speichereSpaltenwahl.bind(null, "projekte", "/projekte")}
        />
      </div>

      {error && (
        <div className="rounded bg-red-50 text-red-700 text-sm px-3 py-2 mb-4">
          {error.message}
        </div>
      )}

      <ListenTabelle
        spalten={sichtbar}
        zeilen={projekte}
        basis="/projekte"
        params={params}
        leerText="Keine Projekte gefunden."
      />

    </div>
  );
}
