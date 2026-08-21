import { KundeForm } from "@/components/kunde-form";
import { createKunde } from "@/app/actions/kunden";
import { getBegriffe, neuLabel } from "@/lib/begriffe";

export default async function NeuerKundePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const begriffe = await getBegriffe();

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">{neuLabel(begriffe, "kunde")}</h1>
      <KundeForm action={createKunde} error={error} />
    </div>
  );
}
