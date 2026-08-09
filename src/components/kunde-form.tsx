import type { Kunde } from "@/lib/types";
import { PlzOrtFields } from "@/components/plz-ort-fields";

export function KundeForm({
  kunde,
  action,
  error,
}: {
  kunde?: Kunde;
  action: (formData: FormData) => void;
  error?: string;
}) {
  return (
    <form action={action} className="space-y-6 max-w-2xl">
      {error && (
        <div className="rounded bg-red-50 text-red-700 text-sm px-3 py-2">
          {error}
        </div>
      )}

      <section>
        <h2 className="text-sm font-semibold text-gray-500 mb-3">
          Adresse
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Anrede" name="anrede" defaultValue={kunde?.anrede} />
          <Field
            label="Externer Adress-Schlüssel"
            name="adress_schluessel"
            defaultValue={kunde?.adress_schluessel}
            hint="Referenz-Nr. im Buchhaltungssystem (Comatic)"
          />
          <Field label="Vorname" name="vorname" defaultValue={kunde?.vorname} />
          <Field
            label="Name / Firma"
            name="name"
            defaultValue={kunde?.name}
            required
          />
          <Field
            label="Zuhanden / Adresszusatz"
            name="adresse_zusatz"
            defaultValue={kunde?.adresse_zusatz}
            className="col-span-2"
          />
          <Field
            label="Strasse"
            name="strasse"
            defaultValue={kunde?.strasse}
            className="col-span-2"
          />
          <Field label="Postfach" name="postfach" defaultValue={kunde?.postfach} />
          <PlzOrtFields defaultPlz={kunde?.plz} defaultOrt={kunde?.ort} />
          <Field
            label="Land"
            name="land"
            defaultValue={kunde?.land ?? "CH"}
          />
          <Field label="E-Mail" name="email" type="email" defaultValue={kunde?.email} />
          <Field label="Telefon" name="telefon" defaultValue={kunde?.telefon} />
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-gray-500 mb-3">
          Rechnungswesen
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            label="Währung"
            name="waehrung"
            defaultValue={kunde?.waehrung ?? "CHF"}
          />
          <Field
            label="Zahlungskondition (Tage)"
            name="zahlungskondition_tage"
            type="number"
            defaultValue={kunde?.zahlungskondition_tage ?? 30}
          />
        </div>
      </section>

      <section>
        <label className="block text-sm font-medium mb-1">Notizen</label>
        <textarea
          name="notizen"
          defaultValue={kunde?.notizen ?? ""}
          rows={3}
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-arcos-steel"
        />
      </section>

      <div className="flex gap-3">
        <button
          type="submit"
          className="rounded bg-arcos-steel text-white text-sm font-medium px-4 py-2 hover:bg-arcos-navy"
        >
          Speichern
        </button>
        <a
          href="/kunden"
          className="rounded border text-sm font-medium px-4 py-2 hover:bg-gray-50"
        >
          Abbrechen
        </a>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  required,
  hint,
  className,
}: {
  label: string;
  name: string;
  defaultValue?: string | number | null;
  type?: string;
  required?: boolean;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium mb-1" htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue ?? ""}
        className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-arcos-steel"
      />
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}
