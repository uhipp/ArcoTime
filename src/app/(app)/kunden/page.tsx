import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Kunde } from "@/lib/types";
import { ListenTabelle } from "@/components/listen-tabelle";
import { SpaltenWahl } from "@/components/spalten-wahl";
import { speichereSpaltenwahl } from "@/app/actions/spaltenwahl";
import { sichtbareSpalten, sortiere, type Spalte } from "@/lib/listen-spalten";
import { begriff, getBegriffe, neuLabel } from "@/lib/begriffe";

// Spaltenkatalog der Kundenliste.
//
// Er bietet mehr an, als die Liste ungefragt zeigt: Telefon und Adresse
// braucht die Disposition täglich, in der Buchhaltung stehen sie nur im
// Weg. Was "aus" trägt, ist zunächst ausgeblendet und lässt sich über
// "Spalten" dazuholen.
const SPALTEN: Spalte<Kunde>[] = [
  {
    key: "name",
    titel: "Name",
    fest: true,
    wert: (k) => [k.vorname, k.name].filter(Boolean).join(" ") || null,
    zelle: (k) => (
      <span className="flex items-center gap-2">
        <Link href={`/kunden/${k.id}`} className="text-arcos-steel hover:underline">
          {k.vorname ? `${k.vorname} ` : ""}
          {k.name}
        </Link>
        {/* Die Liste IST das Adressbuch und zeigt deshalb auch Partner ohne
            Kundenrolle – ein Eigentümer wäre sonst nicht erreichbar. Dann
            muss sie es aber sagen (0074). */}
        {!k.ist_kunde && (
          <span
            title="Geschäftspartner ohne Kundenrolle – erscheint nicht in der Auswahl eines Auftrags"
            className="rounded bg-gray-100 text-gray-500 text-xs px-1.5 py-0.5"
          >
            nur Adresse
          </span>
        )}
      </span>
    ),
  },
  {
    key: "strasse",
    titel: "Strasse",
    aus: true,
    wert: (k) => k.strasse,
    zelle: (k) => [k.strasse, k.hausnummer].filter(Boolean).join(" ") || "–",
  },
  {
    key: "plz",
    titel: "PLZ",
    aus: true,
    wert: (k) => k.plz,
    zelle: (k) => k.plz ?? "–",
    klasse: "px-4 py-2 whitespace-nowrap",
  },
  { key: "ort", titel: "Ort", wert: (k) => k.ort, zelle: (k) => k.ort ?? "–" },
  {
    key: "telefon",
    titel: "Telefon",
    aus: true,
    wert: (k) => k.telefon,
    zelle: (k) =>
      k.telefon ? (
        <a href={`tel:${k.telefon}`} className="text-arcos-steel hover:underline">
          {k.telefon}
        </a>
      ) : (
        "–"
      ),
    klasse: "px-4 py-2 whitespace-nowrap",
  },
  {
    key: "email",
    titel: "E-Mail",
    wert: (k) => k.email,
    zelle: (k) =>
      k.email ? (
        <a href={`mailto:${k.email}`} className="text-arcos-steel hover:underline">
          {k.email}
        </a>
      ) : (
        "–"
      ),
  },
  {
    key: "schluessel",
    titel: "Adress-Schlüssel",
    wert: (k) => k.adress_schluessel,
    zelle: (k) => k.adress_schluessel ?? "–",
  },
  {
    key: "rabatt",
    titel: "Rabatt",
    aus: true,
    wert: (k) => k.standard_rabatt_prozent,
    zelle: (k) =>
      k.standard_rabatt_prozent ? `${k.standard_rabatt_prozent} %` : "–",
    klasse: "px-4 py-2 whitespace-nowrap",
  },
];

export default async function KundenPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string; richtung?: string; nur?: string }>;
}) {
  const params = await searchParams;
  const { q, sort, richtung, nur } = params;
  const supabase = await createClient();
  // Wie dieser Betrieb den Bereich nennt (0073).
  const begriffe = await getBegriffe();

  let query = supabase
    .from("kunden")
    .select("*")
    .order("name", { ascending: true });

  // Die Liste IST das Adressbuch: Sie hält Kunden UND Adressen ohne
  // Kundenrolle – Eigentümer, Architekten, Ämter. Der Filter macht aus einer
  // Liste drei Sichten, ohne die Daten zu trennen (0083).
  if (nur === "kunden") query = query.eq("ist_kunde", true);
  if (nur === "adressen") query = query.eq("ist_kunde", false);

  if (q) {
    query = query.or(
      `name.ilike.%${q}%,vorname.ilike.%${q}%,ort.ilike.%${q}%,adress_schluessel.ilike.%${q}%`
    );
  }

  const { data, error } = await query;
  const kunden = sortiere((data as Kunde[] | null) ?? [], SPALTEN, sort, richtung);

  const { sichtbar, gewaehlt } = await sichtbareSpalten("kunden", SPALTEN);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">{begriff(begriffe, "adresse", "mehrzahl")}</h1>
        <Link
          href="/kunden/neu"
          className="rounded bg-arcos-steel text-white text-sm font-medium px-4 py-2 hover:bg-arcos-navy"
        >
          + {neuLabel(begriffe, "adresse")}
        </Link>
      </div>

      {/* Drei Sichten auf eine Liste. „nur Adressen" zeigt, wen man im
          Adressbuch führt, ohne dass ein Auftrag an ihn geht – nach solchen
          Zeilen sucht man sonst mit der Suchfunktion nach dem Vermerk. */}
      <div className="mb-4 flex flex-wrap items-center gap-1 text-sm">
        {[
          { wert: "", titel: "Alle" },
          { wert: "kunden", titel: `nur ${begriff(begriffe, "kunde", "mehrzahl")}` },
          { wert: "adressen", titel: "nur Adressen" },
        ].map((f) => {
          const aktiv = (nur ?? "") === f.wert;
          const ziel = new URLSearchParams();
          if (q) ziel.set("q", q);
          if (sort) ziel.set("sort", sort);
          if (richtung) ziel.set("richtung", richtung);
          if (f.wert) ziel.set("nur", f.wert);
          const abfrage = ziel.toString();
          return (
            <Link
              key={f.wert || "alle"}
              href={abfrage ? `/kunden?${abfrage}` : "/kunden"}
              className={`rounded border px-3 py-1.5 ${
                aktiv
                  ? "border-arcos-steel bg-arcos-steel text-white"
                  : "border-gray-300 hover:bg-gray-50"
              }`}
            >
              {f.titel}
            </Link>
          );
        })}
      </div>

      <div className="mb-4 flex items-start justify-between gap-3">
        <form className="flex-1">
          <input
            type="text"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Suche nach Name, Ort, Adress-Schlüssel…"
            className="w-full max-w-sm rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-arcos-steel"
          />
          {/* Eine Suche darf die eingestellte Sortierung nicht verwerfen –
              das Formular schickt sonst nur "q" ab. */}
          {sort && <input type="hidden" name="sort" value={sort} />}
          {richtung && <input type="hidden" name="richtung" value={richtung} />}
          {nur && <input type="hidden" name="nur" value={nur} />}
        </form>

        <SpaltenWahl
          alle={SPALTEN.map(({ key, titel, fest }) => ({ key, titel, fest }))}
          gewaehlt={gewaehlt}
          action={speichereSpaltenwahl.bind(null, "kunden", "/kunden")}
        />
      </div>

      {error && (
        <div className="rounded bg-red-50 text-red-700 text-sm px-3 py-2 mb-4">
          {error.message}
        </div>
      )}

      <ListenTabelle
        spalten={sichtbar}
        zeilen={kunden}
        basis="/kunden"
        params={params}
        leerText={
          nur === "adressen"
            ? "Keine Adressen ohne Kundenrolle gefunden."
            : `Keine ${begriff(begriffe, nur === "kunden" ? "kunde" : "adresse", "mehrzahl")} gefunden.`
        }
      />
    </div>
  );
}
