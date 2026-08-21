import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AnfragenBoard } from "@/components/anfragen-board";
import type { Anfrage } from "@/lib/types";
import { begriff, getBegriffe, neuLabel } from "@/lib/begriffe";

export default async function AnfragenPage() {
  const supabase = await createClient();
  // Wie dieser Betrieb den Bereich nennt (0073).
  const begriffe = await getBegriffe();
  const [{ data: anfragen, error }, { data: kanaele }, { data: prioritaeten }] =
    await Promise.all([
      supabase
        .from("anfragen")
        .select(
          "*, kunden(id, name, vorname), projekte(id, bezeichnung), zugewiesen:profiles!zugewiesen_an(id, name)"
        )
        .order("created_at", { ascending: false }),
      supabase.from("anfrage_kanaele").select("wert, symbol"),
      supabase.from("anfrage_prioritaeten").select("wert, farbe"),
    ]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">{begriff(begriffe, "anfrage", "mehrzahl")}</h1>
        <Link
          href="/anfragen/neu"
          className="rounded bg-arcos-steel text-white text-sm font-medium px-4 py-2 hover:bg-arcos-navy"
        >
          + {neuLabel(begriffe, "anfrage")}
        </Link>
      </div>

      {error && (
        <div className="rounded bg-red-50 text-red-700 text-sm px-3 py-2 mb-4">
          {error.message}
        </div>
      )}

      <AnfragenBoard
        initialAnfragen={(anfragen as Anfrage[] | null) ?? []}
        kanaele={kanaele ?? []}
        prioritaeten={prioritaeten ?? []}
        bezeichnungMehrzahl={begriff(begriffe, "anfrage", "mehrzahl")}
      />
    </div>
  );
}
