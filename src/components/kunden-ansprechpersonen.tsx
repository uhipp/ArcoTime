import { speichereAnsprechperson, loescheAnsprechperson } from "@/app/actions/kunden";
import { DeleteButton } from "@/components/delete-button";
import {
  KontaktListe,
  KontaktFormular,
  type KontaktArt,
  type KontaktZeile,
} from "@/components/kunden-kontaktkanaele";

// Die Ansprechpersonen eines Kunden (0074).
//
// Sobald ein Kunde grösser ist, gibt es dort mehrere Personen, die für den
// Betrieb wichtig sind: die Sachbearbeiterin der Verwaltung, der Hauswart,
// die Filialleitung – mit eigener Nummer und eigener Mailadresse. Bis 0074
// standen sie in einer Notiz, und beim Rapport wurde der Name jedes Mal neu
// getippt.
//
// Die Kanäle des Betriebs selbst standen bis zum 22.08.2026 auch hier. Sie
// sind auf den Reiter „Adresse" gezogen: Sie gehören der Adresse des Kunden
// und keiner Person (siehe kunden-kontaktkanaele.tsx).
//
// Bewusst eine Serverkomponente ohne eigenen Zustand: Jede Zeile ist ein
// Formular, das seine Server Action ruft.

export type { KontaktArt, KontaktZeile };

export type AnsprechpersonZeile = {
  id: string;
  anrede: string | null;
  vorname: string | null;
  name: string;
  funktion: string | null;
  notiz: string | null;
  ist_standard: boolean;
  aktiv: boolean;
};

export function KundenAnsprechpersonen({
  kundeId,
  personen,
  kontakte,
  arten,
  istAdmin,
}: {
  kundeId: string;
  personen: AnsprechpersonZeile[];
  kontakte: KontaktZeile[];
  arten: KontaktArt[];
  istAdmin: boolean;
}) {
  const kontakteDerPerson = (personId: string) =>
    kontakte.filter((k) => k.ansprechperson_id === personId);

  return (
    <div>
      <h2 className="text-lg font-medium mb-1">Ansprechpersonen</h2>
      <p className="text-sm text-gray-500 mb-4">
        Wer beim Kunden zuständig ist – mit eigener Nummer und eigener
        Mailadresse. Die Angaben des Betriebs selbst stehen im Reiter „Adresse“.
      </p>

      {/* Personen */}
      {personen.map((p) => (
        <div
          key={p.id}
          className={`rounded-lg border bg-white p-4 mb-3 ${p.aktiv ? "" : "opacity-60"}`}
        >
          {/* Der Löschknopf steht ÜBER dem Formular und nicht darin.
              Zweimal begründet: DeleteButton ist selbst ein <form>, und
              verschachtelte Formulare sind in HTML verboten – der Browser
              wirft das innere weg, der Knopf gehört dann zum äusseren und
              speichert, statt zu löschen (genau das ist am 22.08. passiert:
              "Wenn ich auf Person entfernen klicke passiert nichts").
              Ausserdem sagt die Masken-Leitlinie, dass Löschen nie neben dem
              Speichern steht, sondern am Objekt, das es entfernt. */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <span className="text-xs font-semibold text-gray-500">
              {p.ist_standard ? "Standardperson" : "Person"}
              {!p.aktiv && " · inaktiv"}
            </span>
            {istAdmin && (
              <DeleteButton
                action={loescheAnsprechperson.bind(null, kundeId, p.id)}
                label="Person entfernen"
                confirmText={`„${p.vorname ? `${p.vorname} ` : ""}${p.name}“ entfernen? Die Kontaktangaben dieser Person gehen mit.`}
              />
            )}
          </div>

          <form action={speichereAnsprechperson.bind(null, kundeId)} className="space-y-2">
            <input type="hidden" name="id" value={p.id} />
            <div className="flex flex-wrap items-end gap-2">
              <input
                name="anrede"
                defaultValue={p.anrede ?? ""}
                placeholder="Anrede"
                className="w-20 rounded border border-gray-300 px-2 py-1.5 text-sm"
              />
              <input
                name="vorname"
                defaultValue={p.vorname ?? ""}
                placeholder="Vorname"
                className="w-32 rounded border border-gray-300 px-2 py-1.5 text-sm"
              />
              <input
                name="name"
                required
                defaultValue={p.name}
                placeholder="Name"
                className="w-40 rounded border border-gray-300 px-2 py-1.5 text-sm"
              />
              <input
                name="funktion"
                defaultValue={p.funktion ?? ""}
                placeholder="Funktion"
                className="flex-1 min-w-[8rem] rounded border border-gray-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <input
                name="notiz"
                defaultValue={p.notiz ?? ""}
                placeholder="Notiz"
                className="flex-1 min-w-[10rem] rounded border border-gray-300 px-2 py-1.5 text-sm"
              />
              <label className="flex items-center gap-1.5 text-xs text-gray-600">
                <input type="checkbox" name="ist_standard" defaultChecked={p.ist_standard} />
                Standard
              </label>
              <label className="flex items-center gap-1.5 text-xs text-gray-600">
                <input
                  type="checkbox"
                  name="aktiv"
                  value="on"
                  defaultChecked={p.aktiv}
                />
                aktiv
              </label>
              <button
                type="submit"
                className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50"
              >
                Person speichern
              </button>
            </div>
          </form>

          <div className="mt-3 pt-3 border-t">
            <KontaktListe
              kundeId={kundeId}
              kontakte={kontakteDerPerson(p.id)}
              arten={arten}
              istAdmin={istAdmin}
            />
            <KontaktFormular kundeId={kundeId} arten={arten} ansprechpersonId={p.id} />
          </div>
        </div>
      ))}

      {/* Neue Person */}
      <form
        action={speichereAnsprechperson.bind(null, kundeId)}
        className="rounded-lg border border-dashed bg-white p-4 flex flex-wrap items-end gap-2"
      >
        <input
          name="anrede"
          placeholder="Anrede"
          className="w-20 rounded border border-gray-300 px-2 py-1.5 text-sm"
        />
        <input
          name="vorname"
          placeholder="Vorname"
          className="w-32 rounded border border-gray-300 px-2 py-1.5 text-sm"
        />
        <input
          id="neue_ansprechperson"
          name="name"
          required
          placeholder="Name"
          className="w-40 rounded border border-gray-300 px-2 py-1.5 text-sm"
        />
        <input
          name="funktion"
          placeholder="Funktion"
          className="flex-1 min-w-[8rem] rounded border border-gray-300 px-2 py-1.5 text-sm"
        />
        {/* Kein „+ Person": Der Anwender hat die Zeile ausgefüllt und will
            speichern. Ein Plus verspricht einen zusätzlichen Datensatz. */}
        <button
          type="submit"
          className="rounded bg-arcos-steel text-white text-sm font-medium px-4 py-1.5 hover:bg-arcos-navy"
        >
          Person speichern
        </button>
        <p className="basis-full text-xs text-gray-500">
          Kontaktangaben lassen sich hinzufügen, sobald die Person erfasst ist.
        </p>
      </form>
    </div>
  );
}
