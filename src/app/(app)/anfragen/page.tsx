import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/get-profile";
import { AnfragenBoard } from "@/components/anfragen-board";
import type { Anfrage } from "@/lib/types";

export default async function AnfragenPage() {
  const supabase = await createClient();
  const [user, { data: anfragen, error }] = await Promise.all([
    getCurrentUser(),
    supabase
      .from("anfragen")
      .select(
        "*, kunden(id, name, vorname), projekte(id, bezeichnung), zugewiesen:profiles!zugewiesen_an(id, name)"
      )
      .order("created_at", { ascending: false }),
  ]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Anfragen</h1>
        <Link
          href="/anfragen/neu"
          className="rounded bg-arcos-steel text-white text-sm font-medium px-4 py-2 hover:bg-arcos-navy"
        >
          + Neue Anfrage
        </Link>
      </div>

      {error && (
        <div className="rounded bg-red-50 text-red-700 text-sm px-3 py-2 mb-4">
          {error.message}
        </div>
      )}

      <AnfragenBoard
        initialAnfragen={(anfragen as Anfrage[] | null) ?? []}
        aktuellerUserId={user?.id ?? ""}
      />
    </div>
  );
}
