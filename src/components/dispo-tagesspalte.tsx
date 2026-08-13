import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDatumCH } from "@/lib/date-utils";
import { rapportNummer, type Rapport } from "@/lib/types";

function nachbartag(iso: string, richtung: 1 | -1): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + richtung);
  return d.toISOString().slice(0, 10);
}

function uhrzeit(zeitstempel: string | null): string {
  return zeitstempel ? zeitstempel.slice(11, 16) : "";
}

// Tagesplan als schmale Spalte neben dem Rapport. Beim Planen springt man
// sonst ständig zwischen Kalender und Formular hin und her – hier steht
// beides nebeneinander, mit eigener Blätterfunktion über den
// Query-Parameter "tag".
export async function DispoTagesspalte({
  tag,
  basisPfad,
  aktuellerRapportId,
}: {
  tag: string;
  // Pfad, an den der Blätter-Link hängt (die Seite bleibt dieselbe).
  basisPfad: string;
  aktuellerRapportId?: string;
}) {
  const supabase = await createClient();

  const [{ data: rapporteRoh }, { data: mitarbeitende }] = await Promise.all([
    supabase
      .from("rapporte")
      .select("*, kunden(id, name, vorname)")
      .eq("datum", tag)
      .neq("status", "storniert")
      .order("geplant_von", { ascending: true, nullsFirst: false }),
    supabase.from("profiles").select("id, name"),
  ]);

  const rapporte = (rapporteRoh as Rapport[] | null) ?? [];
  const namen = new Map((mitarbeitende ?? []).map((m) => [m.id, m.name]));

  const wochentag = new Date(`${tag}T12:00:00`).toLocaleDateString("de-CH", {
    weekday: "short",
  });

  return (
    <aside className="w-full md:w-72 shrink-0">
      <div className="bg-white rounded-lg border sticky top-4">
        <div className="px-3 pt-2 text-xs font-semibold text-arcos-navy">Tagesplan</div>
        <div className="flex items-center justify-between px-3 py-2 border-b bg-gray-50">
          <Link
            href={`${basisPfad}?tag=${nachbartag(tag, -1)}`}
            className="text-gray-500 hover:text-arcos-navy px-1"
            aria-label="Vorheriger Tag"
          >
            ←
          </Link>
          <span className="text-xs font-medium">
            {wochentag}, {formatDatumCH(tag)}
          </span>
          <Link
            href={`${basisPfad}?tag=${nachbartag(tag, 1)}`}
            className="text-gray-500 hover:text-arcos-navy px-1"
            aria-label="Nächster Tag"
          >
            →
          </Link>
        </div>

        {rapporte.length === 0 ? (
          <p className="px-3 py-3 text-xs text-gray-400">Nichts eingeplant.</p>
        ) : (
          <ul className="divide-y">
            {rapporte.map((r) => {
              const zeit =
                r.geplant_von || r.geplant_bis
                  ? `${uhrzeit(r.geplant_von) || "?"}–${uhrzeit(r.geplant_bis) || "?"}`
                  : "ganztags";
              const istDieser = r.id === aktuellerRapportId;

              return (
                <li
                  key={r.id}
                  className={`px-3 py-2 text-xs ${istDieser ? "bg-arcos-steel/10" : ""}`}
                >
                  <div className="font-mono text-gray-500">{zeit}</div>
                  <div>
                    {istDieser ? (
                      <span className="font-medium">{rapportNummer(r)} · dieser Rapport</span>
                    ) : (
                      <Link
                        href={`/rapporte/${r.id}`}
                        className="text-arcos-steel hover:underline"
                      >
                        {rapportNummer(r)}
                      </Link>
                    )}
                  </div>
                  <div className="text-gray-600">
                    {r.kunden?.vorname ? `${r.kunden.vorname} ` : ""}
                    {r.kunden?.name}
                  </div>
                  <div className={r.geplant_fuer ? "text-gray-500" : "text-amber-700"}>
                    {r.geplant_fuer ? namen.get(r.geplant_fuer) ?? "?" : "nicht zugewiesen"}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <div className="px-3 py-2 border-t">
          <Link
            href={`/disposition?ansicht=tag&datum=${tag}`}
            className="text-xs text-arcos-steel hover:underline"
          >
            Ganze Disposition öffnen →
          </Link>
        </div>
      </div>
    </aside>
  );
}
