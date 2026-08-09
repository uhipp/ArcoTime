import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/get-profile";
import { ladeDokumente } from "@/lib/dokumente-laden";
import { DokumenteBereich } from "@/components/dokumente-bereich";

// Erreichbar für Admin (jede Person) oder die Person selbst (nur die
// eigene) – Personal-Dokumente sind sensibel, siehe Phase-7-Plan.
export default async function MitarbeitendeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const istAdmin = profile.role === "admin";
  if (!istAdmin && profile.id !== id) redirect("/");

  const supabase = await createClient();
  const [{ data: person }, { dokumente, kategorien }] = await Promise.all([
    supabase.from("profiles").select("id, name, vorname, nachname, email, role").eq("id", id).single(),
    ladeDokumente(supabase, "mitarbeitende", id),
  ]);

  if (!person) notFound();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">
          {person.vorname ? `${person.vorname} ` : ""}
          {person.name}
        </h1>
        <p className="text-sm text-gray-500">
          {person.email ?? "–"} · {person.role === "admin" ? "Admin" : "Mitarbeitende"}
        </p>
      </div>

      <div className="max-w-2xl">
        <h2 className="text-lg font-medium mb-1">Dokumente</h2>
        <p className="text-sm text-gray-500 mb-4">
          Nur für Admin und diese Person sichtbar (z.B. Vertrag, Ausweiskopie).
        </p>
        <DokumenteBereich
          bereich="mitarbeitende"
          bezugId={id}
          initialDokumente={dokumente}
          kategorien={kategorien}
          aktuellerUserId={profile.id}
          istAdmin={istAdmin}
        />
      </div>
    </div>
  );
}
