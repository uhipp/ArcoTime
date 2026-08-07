import { KundeForm } from "@/components/kunde-form";
import { createKunde } from "@/app/actions/kunden";

export default async function NeuerKundePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Neuer Kunde</h1>
      <KundeForm action={createKunde} error={error} />
    </div>
  );
}
