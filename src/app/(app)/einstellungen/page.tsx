import { redirect } from "next/navigation";
import Link from "next/link";
import { logoAdresseVon } from "@/lib/logo-adresse";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, getCurrentOrganisation } from "@/lib/get-profile";
import { FARBEN_OPTIONEN } from "@/lib/farben";
import { formatDatumCH } from "@/lib/date-utils";
import { ZeitFeld } from "@/components/zeit-feld";
import { DatumFeld } from "@/components/datum-feld";
import { OptionalesDatumFeld } from "@/components/optionales-datum-feld";
import {
  updateOrganisation,
  ladeLogoHoch,
  entferneLogo,
  createSchliesstag,
  loescheSchliesstag,
  toggleSchliesstagFerien,
  createAbwesenheitsart,
  updateAbwesenheitsart,
  toggleAbwesenheitsart,
  createEinheit,
  toggleEinheit,
  updateEinheit,
  createKlasse,
  toggleKlasse,
  updateKlasse,
  createMwstCode,
  toggleMwstCode,
  updateMwstCode,
  createRabattsatz,
  toggleRabattsatz,
  updateRabattsatz,
  createAnfrageKanal,
  toggleAnfrageKanal,
  updateAnfrageKanal,
  createAnfragePrioritaet,
  toggleAnfragePrioritaet,
  updateAnfragePrioritaet,
  createDokumentKategorie,
  toggleDokumentKategorie,
  updateDokumentKategorie,
  createGruppe,
  updateGruppe,
  toggleGruppe,
  setzeGruppenMitglieder,
  createStandardposition,
  updateStandardposition,
  toggleStandardposition,
} from "@/app/actions/einstellungen";
import { darf } from "@/lib/berechtigungen";

// Minuten seit Mitternacht als HH:MM, für die Anzeige der gespeicherten
// Arbeitszeit. Gespeichert wird in Minuten, damit sich damit rechnen lässt.
function minutenAlsUhrzeit(minuten: number): string {
  return `${String(Math.floor(minuten / 60)).padStart(2, "0")}:${String(minuten % 60).padStart(2, "0")}`;
}

export default async function EinstellungenPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const profile = await getCurrentProfile();
  if (!darf(profile, "einstellungen.verwalten")) redirect("/");

  const { error } = await searchParams;
  const organisation = await getCurrentOrganisation();
  const logoAdresse = logoAdresseVon(organisation?.logo_pfad);
  const supabase = await createClient();
  const [
    { data: klassen },
    { data: einheiten },
    { data: schliesstage },
    { data: abwesenheitsarten },
    { data: mwstCodes },
    { data: rabattsaetze },
    { data: kanaele },
    { data: prioritaeten },
    { data: dokumentKategorien },
    { data: gruppen },
    { data: gruppenMitglieder },
    { data: mitarbeitende },
    { data: dienstleistungen },
    { data: standardpositionen },
  ] = await Promise.all([
    supabase.from("dienstleistungsklassen").select("*").order("sortierung"),
    supabase.from("einheiten").select("*").order("sortierung"),
    supabase.from("schliesstage").select("*").order("von"),
    supabase.from("abwesenheitsarten").select("*").order("sortierung"),
    supabase.from("mwst_codes").select("*").order("code"),
    supabase.from("rabattsaetze").select("*").order("sortierung"),
    supabase.from("anfrage_kanaele").select("*").order("sortierung"),
    supabase.from("anfrage_prioritaeten").select("*").order("sortierung"),
    supabase.from("dokument_kategorien").select("*").order("sortierung"),
    supabase.from("gruppen").select("*").order("sortierung"),
    supabase.from("gruppen_mitglieder").select("gruppe_id, mitarbeiter_id"),
    supabase
      .from("profiles")
      .select("id, name")
      .is("deaktiviert_am", null)
      .order("name"),
    supabase
      .from("dienstleistungen")
      .select("id, bezeichnung, einheit, zaehlt_als_arbeitszeit")
      .eq("aktiv", true)
      .order("bezeichnung"),
    supabase
      .from("rapport_standardpositionen")
      .select("*, dienstleistungen(id, bezeichnung, einheit, zaehlt_als_arbeitszeit)")
      .order("sortierung"),
  ]);

  // Mitglieder je Gruppe, damit die Häkchen ohne Suche in einer Liste
  // gesetzt werden können.
  const mitgliederVon = new Map<string, Set<string>>();
  for (const z of gruppenMitglieder ?? []) {
    const menge = mitgliederVon.get(z.gruppe_id) ?? new Set<string>();
    menge.add(z.mitarbeiter_id);
    mitgliederVon.set(z.gruppe_id, menge);
  }

  return (
    <div className="space-y-10 max-w-2xl">
      <h1 className="text-2xl font-semibold">Einstellungen</h1>
      <p className="text-sm text-gray-500">
        Auswahllisten in der ganzen App sind hier frei verwaltbar – nichts
        davon ist fix im Code. Jeder Eintrag lässt sich direkt in seiner Zeile
        bearbeiten und mit „speichern“ übernehmen. Bereits verwendete Werte
        lassen sich nur deaktivieren statt löschen, damit bestehende Einträge
        lesbar bleiben.
      </p>
      <div className="rounded-lg border bg-white p-5">
        <h2 className="text-lg font-medium mb-1">Datenpflege</h2>
        <p className="text-sm text-gray-500 mb-3">
          Aufgaben an euren eigenen Daten: Lücken in den Stammdaten und
          Sammelaktionen, mit denen sich bestehende Werte in einem Zug
          nachführen lassen – mit Vorschau und Rückweg.
        </p>
        <Link
          href="/einstellungen/datenpflege"
          className="inline-block rounded border px-4 py-2 text-sm hover:bg-gray-50"
        >
          Datenpflege öffnen
        </Link>
      </div>

      <div className="rounded-lg border bg-white p-5">
        <h2 className="text-lg font-medium mb-1">Änderungsprotokoll</h2>
        <p className="text-sm text-gray-500 mb-3">
          Jede Änderung an euren Stammdaten, Belegen und Konten – wer, wann und
          was. Aufgezeichnet in der Datenbank selbst, damit auch Eingriffe
          sichtbar sind, die nicht über die Oberfläche laufen.
        </p>
        <Link
          href="/einstellungen/aenderungsprotokoll"
          className="inline-block rounded border px-4 py-2 text-sm hover:bg-gray-50"
        >
          Protokoll öffnen
        </Link>
      </div>

      <p className="text-sm text-gray-500">
        Das schmale Zahlenfeld rechts in jeder Zeile ist die{" "}
        <strong>Sortierung</strong>: Sie bestimmt die Reihenfolge in den
        Auswahlfeldern der App, kleinere Zahl zuerst. Die Zehnerschritte sind
        Absicht – so lässt sich später etwas dazwischenschieben, ohne alles neu
        zu nummerieren. Neue Einträge werden automatisch hinten angehängt.
      </p>

      {error && (
        <div className="rounded bg-red-50 text-red-700 text-sm px-3 py-2">{error}</div>
      )}

      <section>
        <h2 className="text-lg font-medium mb-3">Organisation</h2>
        <p className="text-sm text-gray-500 mb-3">
          Erscheint im Header anstelle eines fixen Kunden-Logos.
        </p>
        <form action={updateOrganisation} className="space-y-3">
          <div className="flex gap-2">
            <input
              name="name"
              required
              defaultValue={organisation?.name ?? ""}
              placeholder="Name der Organisation"
              className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="rounded bg-arcos-steel text-white text-sm font-medium px-4 py-2 hover:bg-arcos-navy"
            >
              Speichern
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1" htmlFor="warnung_ab_stunden">
                Hinweis ab … Stunden pro Tag
              </label>
              <input
                id="warnung_ab_stunden"
                name="warnung_ab_stunden"
                type="number"
                step="0.5"
                min={0}
                defaultValue={
                  organisation?.warnung_ab_minuten_pro_tag != null
                    ? organisation.warnung_ab_minuten_pro_tag / 60
                    : ""
                }
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1" htmlFor="sperre_ab_stunden">
                Speichern sperren ab … Stunden pro Tag
              </label>
              <input
                id="sperre_ab_stunden"
                name="sperre_ab_stunden"
                type="number"
                step="0.5"
                min={0}
                defaultValue={
                  organisation?.sperre_ab_minuten_pro_tag != null
                    ? organisation.sperre_ab_minuten_pro_tag / 60
                    : ""
                }
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1" htmlFor="arbeitstag_von">
                Arbeitstag von
              </label>
              <ZeitFeld
                id="arbeitstag_von"
                name="arbeitstag_von"
                startwert={minutenAlsUhrzeit(organisation?.arbeitstag_von_minuten ?? 420)}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1" htmlFor="arbeitstag_bis">
                Arbeitstag bis
              </label>
              <ZeitFeld
                id="arbeitstag_bis"
                name="arbeitstag_bis"
                startwert={minutenAlsUhrzeit(organisation?.arbeitstag_bis_minuten ?? 1080)}
              />
            </div>
          </div>
          <p className="text-xs text-gray-400">
            Der Arbeitstag ist der Rahmen, in dem die Disposition freie Zeiten
            vorschlägt. Termine ausserhalb bleiben von Hand erfassbar.
          </p>

          {/* Nur mit gebuchtem Zeitkonto: Aus Wochenstunden und
              Arbeitstagen entsteht das Tages-Soll, mit dem einzelne
              Ferien- und Absenztage bewertet werden. */}
          {organisation?.modul_zeitkonto && (
            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-1">Arbeitszeit-Grundlagen (Zeitkonto)</p>
              <p className="text-xs text-gray-400 mb-3">
                Grundlage für das Tages-Soll. Nicht jeder Betrieb arbeitet 42
                Stunden in fünf Tagen.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1" htmlFor="wochenstunden">
                    Wochenstunden bei 100 %
                  </label>
                  <input
                    id="wochenstunden"
                    name="wochenstunden"
                    type="number"
                    step="any"
                    min="1"
                    defaultValue={Number(organisation.wochenstunden ?? 42)}
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label
                    className="block text-xs text-gray-500 mb-1"
                    htmlFor="arbeitstage_pro_woche"
                  >
                    Arbeitstage pro Woche
                  </label>
                  <input
                    id="arbeitstage_pro_woche"
                    name="arbeitstage_pro_woche"
                    type="number"
                    step="0.5"
                    min="1"
                    max="7"
                    defaultValue={Number(organisation.arbeitstage_pro_woche ?? 5)}
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <label className="mt-3 flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="feiertage_im_sollstunden_enthalten"
                  defaultChecked={organisation.feiertage_im_sollstunden_enthalten ?? true}
                  className="mt-0.5"
                />
                <span>
                  <span className="block text-sm font-medium">
                    Feiertage sind in den Sollstunden bereits enthalten
                  </span>
                  <span className="block text-xs text-gray-500 mt-0.5">
                    Trifft auf jede Tabelle vom Treuhänder zu. Ohne dieses
                    Häkchen zieht ArcoTime die Schliesstage ein zweites Mal ab –
                    die häufigste Fehlerquelle in solchen Auswertungen.
                  </span>
                </span>
              </label>
              <p className="mt-3">
                <Link
                  href="/einstellungen/zeitkonto"
                  className="text-sm text-arcos-steel hover:underline"
                >
                  Sollstunden je Monat erfassen →
                </Link>
                <br />
                <Link
                  href="/einstellungen/zeitkonto/abschluss"
                  className="text-sm text-arcos-steel hover:underline"
                >
                  Monatsabschluss →
                </Link>
              </p>
            </div>
          )}

          {/* Absenderangaben. Sie erscheinen auf der Druckansicht eines
              Rapports und später im PDF und im Begleitmail – deshalb an
              einer Stelle gepflegt und nicht je Dokument. */}
          <div className="border-t pt-4">
            <p className="text-sm font-medium mb-1">Absenderangaben</p>
            <p className="text-xs text-gray-400 mb-3">
              Erscheinen auf dem Arbeitsrapport, den der Kunde erhält.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs text-gray-500 mb-1" htmlFor="strasse">
                  Strasse
                </label>
                <input
                  id="strasse"
                  name="strasse"
                  defaultValue={organisation?.strasse ?? ""}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1" htmlFor="hausnummer">
                  Nr.
                </label>
                <input
                  id="hausnummer"
                  name="hausnummer"
                  defaultValue={organisation?.hausnummer ?? ""}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1" htmlFor="plz">
                  PLZ
                </label>
                <input
                  id="plz"
                  name="plz"
                  defaultValue={organisation?.plz ?? ""}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs text-gray-500 mb-1" htmlFor="ort">
                  Ort
                </label>
                <input
                  id="ort"
                  name="ort"
                  defaultValue={organisation?.ort ?? ""}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1" htmlFor="telefon">
                  Telefon
                </label>
                <input
                  id="telefon"
                  name="telefon"
                  defaultValue={organisation?.telefon ?? ""}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1" htmlFor="org_email">
                  E-Mail
                </label>
                <input
                  id="org_email"
                  name="email"
                  type="email"
                  defaultValue={organisation?.email ?? ""}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1" htmlFor="webseite">
                  Webseite
                </label>
                <input
                  id="webseite"
                  name="webseite"
                  defaultValue={organisation?.webseite ?? ""}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-400">
            Gilt je Mitarbeitendem und Tag, über alle Kunden hinweg. Der
            Hinweis erscheint beim Erfassen und lässt sich übergehen; die
            Sperre verweigert das Speichern und greift auch beim Erledigen von
            Anfragen. Beide Felder leer lassen schaltet die jeweilige Prüfung
            ab. 24 Stunden als Sperre fängt vor allem Tippfehler ab – 4800
            Minuten statt 480.
          </p>

          <label className="flex items-start gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              name="zeige_auf_login"
              defaultChecked={organisation?.zeige_auf_login ?? false}
              className="mt-0.5"
            />
            <span>
              Auf der Login-Seite anzeigen. Übergangslösung: Solange es noch
              keine eigene Adresse pro Organisation gibt, kann das nur eine
              Organisation gleichzeitig sein.
            </span>
          </label>
        </form>

        {/* Eigenes Formular: Ein Datei-Upload gehört nicht in dasselbe
            Formular wie die Textfelder – sonst lädt jedes Speichern der
            Adresse die Datei erneut hoch. */}
        <div className="border-t mt-5 pt-4">
          <p className="text-sm font-medium mb-1">Logo</p>
          <p className="text-xs text-gray-400 mb-3">
            Erscheint auf dem Arbeitsrapport. PNG mit durchsichtigem Hintergrund
            sieht am besten aus, 400 Pixel Breite genügen. Maximal 1 MB.
          </p>

          {logoAdresse && (
            <div className="flex items-center gap-4 mb-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoAdresse}
                alt="Logo der Organisation"
                className="max-h-16 border rounded bg-white p-1"
              />
              <form action={entferneLogo}>
                <button type="submit" className="text-xs text-gray-500 hover:text-red-600">
                  Logo entfernen
                </button>
              </form>
            </div>
          )}

          <form action={ladeLogoHoch} className="flex flex-wrap items-center gap-2">
            <input
              type="file"
              name="logo"
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              required
              className="text-sm"
            />
            <button
              type="submit"
              className="rounded border text-sm font-medium px-3 py-1.5 hover:bg-gray-50"
            >
              Hochladen
            </button>
          </form>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-medium mb-3">Dienstleistungsklassen</h2>
        <p className="text-sm text-gray-500 mb-3">
          Auswahlliste für den Dienstleistungskatalog.
        </p>
        <ul className="bg-white rounded-lg border divide-y mb-4">
          {klassen?.map((k) => (
            <li key={k.id} className="px-4 py-2 text-sm">
              <form
                action={updateKlasse.bind(null, k.id)}
                className="flex flex-wrap items-center gap-2"
              >
                <input
                  name="bezeichnung"
                  required
                  defaultValue={k.bezeichnung}
                  aria-label="Bezeichnung"
                  className={`flex-1 min-w-[10rem] rounded border border-gray-300 px-2 py-1 ${
                    k.aktiv ? "" : "text-gray-400"
                  }`}
                />
                <input
                  name="sortierung"
                  type="number"
                  defaultValue={k.sortierung ?? 0}
                  aria-label="Sortierung"
                  title="Sortierung"
                  className="w-16 rounded border border-gray-300 px-2 py-1"
                />
                <button type="submit" className="text-xs text-arcos-steel hover:underline">
                  speichern
                </button>
              </form>
              <form action={toggleKlasse.bind(null, k.id, !k.aktiv)} className="mt-1">
                <button type="submit" className="text-xs text-gray-400 hover:text-arcos-steel">
                  {k.aktiv ? "deaktivieren" : "aktivieren"}
                </button>
              </form>
            </li>
          ))}
        </ul>
        <form action={createKlasse} className="flex gap-2">
          <input
            id="neue_klasse"
            name="bezeichnung"
            required
            placeholder="Neue Klasse…"
            className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded bg-arcos-steel text-white text-sm font-medium px-4 py-2 hover:bg-arcos-navy"
          >
            Hinzufügen
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-lg font-medium mb-3">Einheiten</h2>
        <p className="text-sm text-gray-500 mb-3">
          Auswahlliste für das Feld „Einheit“ im Dienstleistungskatalog –
          Stunde, Pauschale, Stück, km, was ihr braucht.
        </p>
        <ul className="bg-white rounded-lg border divide-y mb-4">
          {einheiten?.map((e) => (
            <li key={e.id} className="px-4 py-2 text-sm">
              <form
                action={updateEinheit.bind(null, e.id)}
                className="flex flex-wrap items-center gap-2"
              >
                <input
                  name="bezeichnung"
                  required
                  defaultValue={e.bezeichnung}
                  aria-label="Bezeichnung"
                  className={`flex-1 min-w-[10rem] rounded border border-gray-300 px-2 py-1 ${
                    e.aktiv ? "" : "text-gray-400"
                  }`}
                />
                <input
                  name="sortierung"
                  type="number"
                  defaultValue={e.sortierung ?? 0}
                  aria-label="Sortierung"
                  title="Sortierung"
                  className="w-16 rounded border border-gray-300 px-2 py-1"
                />
                <button type="submit" className="text-xs text-arcos-steel hover:underline">
                  speichern
                </button>
              </form>
              <form action={toggleEinheit.bind(null, e.id, !e.aktiv)} className="mt-1">
                <button type="submit" className="text-xs text-gray-400 hover:text-arcos-steel">
                  {e.aktiv ? "deaktivieren" : "aktivieren"}
                </button>
              </form>
            </li>
          ))}
        </ul>
        <form action={createEinheit} className="flex gap-2">
          <input
            id="neue_einheit"
            name="bezeichnung"
            required
            placeholder="Neue Einheit…"
            className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded bg-arcos-steel text-white text-sm font-medium px-4 py-2 hover:bg-arcos-navy"
          >
            Hinzufügen
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-lg font-medium mb-3">Schliesstage</h2>
        <p className="text-sm text-gray-500 mb-3">
          Feiertage, Betriebsferien und Brückentage. Die Disposition schlägt an
          diesen Tagen keine Termine vor. Als Zeitraum erfasst – für einen
          einzelnen Feiertag genügt das Startdatum.
        </p>
        {organisation?.modul_zeitkonto && (
          <p className="rounded bg-blue-50 text-blue-900 text-xs px-3 py-2 mb-3">
            <strong>Betriebsferien</strong> gehen vom Ferienanspruch der
            Mitarbeitenden ab – der Arbeitgeber darf den Zeitpunkt der Ferien
            bestimmen (Art. 329c Abs. 2 OR). <strong>Feiertage</strong> und
            Brückentage kosten dagegen keine Ferientage. Das Häkchen in der
            Zeile sagt, was von beidem gemeint ist.
          </p>
        )}
        <ul className="bg-white rounded-lg border divide-y mb-4">
          {schliesstage?.length === 0 && (
            <li className="px-4 py-3 text-sm text-gray-400">Keine Schliesstage erfasst.</li>
          )}
          {schliesstage?.map((t) => (
            <li key={t.id} className="flex items-center justify-between px-4 py-2 text-sm">
              <span className="flex flex-wrap items-center gap-2">
                <strong>{t.bezeichnung}</strong>
                <span className="text-gray-500">
                  · {formatDatumCH(t.von)}
                  {t.bis !== t.von ? ` bis ${formatDatumCH(t.bis)}` : ""}
                </span>
                {organisation?.modul_zeitkonto && (
                  <form action={toggleSchliesstagFerien.bind(null, t.id, !t.belastet_ferien)}>
                    <button
                      type="submit"
                      title={
                        t.belastet_ferien
                          ? "Betriebsferien: Die Tage gehen vom Ferienanspruch ab. Klicken, um daraus einen Feiertag zu machen."
                          : "Feiertag: kostet keine Ferientage. Klicken, um daraus Betriebsferien zu machen."
                      }
                      className={`rounded px-2 py-0.5 text-xs ${
                        t.belastet_ferien
                          ? "bg-blue-100 text-blue-800"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {t.belastet_ferien ? "Betriebsferien" : "Feiertag"}
                    </button>
                  </form>
                )}
              </span>
              <form action={loescheSchliesstag.bind(null, t.id)}>
                <button type="submit" className="text-xs text-gray-400 hover:text-red-600">
                  entfernen
                </button>
              </form>
            </li>
          ))}
        </ul>
        <form action={createSchliesstag} className="flex flex-wrap items-end gap-2">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Von</label>
            <DatumFeld id="neuer_schliesstag" name="von"  required className="rounded border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Bis (optional)</label>
            <OptionalesDatumFeld name="bis" className="rounded border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <input
            name="bezeichnung"
            required
            placeholder="z.B. Bundesfeier"
            className="flex-1 min-w-[10rem] rounded border border-gray-300 px-3 py-2 text-sm"
          />
          {organisation?.modul_zeitkonto && (
            <label className="flex items-center gap-1 text-xs whitespace-nowrap pb-2">
              <input type="checkbox" name="belastet_ferien" />
              Betriebsferien
            </label>
          )}
          <button
            type="submit"
            className="rounded bg-arcos-steel text-white text-sm font-medium px-4 py-2 hover:bg-arcos-navy"
          >
            Hinzufügen
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-lg font-medium mb-3">Abwesenheitsarten</h2>
        <p className="text-sm text-gray-500 mb-3">
          Auswahl beim Erfassen von Abwesenheiten bei den Mitarbeitenden. Die
          Farbe erscheint im Kalender. Ist „blockiert“ nicht gesetzt, gilt die
          Person trotzdem als einsatzfähig – etwa bei einer Weiterbildung im
          Betrieb.
        </p>
        {organisation?.modul_zeitkonto && (
          <div className="rounded bg-blue-50 text-blue-900 text-xs px-3 py-2 mb-3 space-y-1">
            <p>
              Die drei Häkchen rechts sagen, wie eine Abwesenheit im{" "}
              <strong>Zeitkonto</strong> wirkt – unabhängig voneinander:
            </p>
            <p>
              <strong>Soll</strong>: Die Sollstunden des Tages entfallen
              (bezahlte Absenz). · <strong>Ferien</strong>: Zieht Tage vom
              Ferienguthaben ab. · <strong>Saldo</strong>: Bucht die Stunden
              vom Zeitsaldo ab.
            </p>
            <p>
              Ferien haben Soll und Ferien, Krankheit nur Soll,
              Überstundenabbau nur Saldo – wer Überstunden abbaut, schuldet
              die Zeit weiterhin, er hat sie nur vorher geleistet. Homeoffice
              hat keines der drei: Dort wird gearbeitet.
            </p>
          </div>
        )}
        <ul className="bg-white rounded-lg border divide-y mb-4">
          {abwesenheitsarten?.map((a) => (
            <li key={a.id} className="px-4 py-2 text-sm">
              <form
                action={updateAbwesenheitsart.bind(null, a.id)}
                className="flex flex-wrap items-center gap-2"
              >
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${a.farbe}`} />
                <select
                  name="farbe"
                  defaultValue={a.farbe}
                  aria-label="Farbe"
                  className="rounded border border-gray-300 px-2 py-1"
                >
                  {FARBEN_OPTIONEN.map((f) => (
                    <option key={f.wert} value={f.wert}>
                      {f.label}
                    </option>
                  ))}
                </select>
                <input
                  name="bezeichnung"
                  required
                  defaultValue={a.bezeichnung}
                  aria-label="Bezeichnung"
                  className={`flex-1 min-w-[8rem] rounded border border-gray-300 px-2 py-1 ${
                    a.aktiv ? "" : "text-gray-400"
                  }`}
                />
                <label className="flex items-center gap-1 text-xs whitespace-nowrap">
                  <input type="checkbox" name="blockiert" defaultChecked={a.blockiert} />
                  blockiert
                </label>
                {/* Wirkung auf das Zeitkonto (0055). Nur mit gebuchtem
                    Modul – ohne Auswertung sagen die drei Häkchen nichts
                    und wären bloss drei Fragen mehr beim Einrichten. */}
                {organisation?.modul_zeitkonto && (
                  <>
                    <input type="hidden" name="wirkung_erfasst" value="1" />
                    <label
                      className="flex items-center gap-1 text-xs whitespace-nowrap"
                      title="Die Sollstunden des Tages entfallen – bezahlte Absenz."
                    >
                      <input
                        type="checkbox"
                        name="reduziert_soll"
                        defaultChecked={a.reduziert_soll ?? true}
                      />
                      Soll
                    </label>
                    <label
                      className="flex items-center gap-1 text-xs whitespace-nowrap"
                      title="Zieht Tage vom Ferienguthaben ab."
                    >
                      <input
                        type="checkbox"
                        name="belastet_ferien"
                        defaultChecked={a.belastet_ferien ?? false}
                      />
                      Ferien
                    </label>
                    <label
                      className="flex items-center gap-1 text-xs whitespace-nowrap"
                      title="Bucht die Stunden vom Zeitsaldo ab – der Fall Überstundenabbau."
                    >
                      <input
                        type="checkbox"
                        name="belastet_zeitsaldo"
                        defaultChecked={a.belastet_zeitsaldo ?? false}
                      />
                      Saldo
                    </label>
                  </>
                )}
                <input
                  name="sortierung"
                  type="number"
                  defaultValue={a.sortierung ?? 0}
                  aria-label="Sortierung"
                  title="Sortierung"
                  className="w-16 rounded border border-gray-300 px-2 py-1"
                />
                <button type="submit" className="text-xs text-arcos-steel hover:underline">
                  speichern
                </button>
              </form>
              <form action={toggleAbwesenheitsart.bind(null, a.id, !a.aktiv)} className="mt-1">
                <button type="submit" className="text-xs text-gray-400 hover:text-arcos-steel">
                  {a.aktiv ? "deaktivieren" : "aktivieren"}
                </button>
              </form>
            </li>
          ))}
        </ul>
        <form action={createAbwesenheitsart} className="flex flex-wrap items-end gap-2">
          <input
            id="neue_abwesenheitsart"
            name="bezeichnung"
            required
            placeholder="Neue Art…"
            className="flex-1 min-w-[10rem] rounded border border-gray-300 px-3 py-2 text-sm"
          />
          <select name="farbe" defaultValue="bg-gray-300" className="rounded border border-gray-300 px-3 py-2 text-sm">
            {FARBEN_OPTIONEN.map((f) => (
              <option key={f.wert} value={f.wert}>
                {f.label}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-1 text-sm whitespace-nowrap pb-2">
            <input type="checkbox" name="blockiert" defaultChecked />
            blockiert
          </label>
          <button
            type="submit"
            className="rounded bg-arcos-steel text-white text-sm font-medium px-4 py-2 hover:bg-arcos-navy"
          >
            Hinzufügen
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-lg font-medium mb-3">Gruppen</h2>
        <p className="text-sm text-gray-500 mb-3">
          Fasst Mitarbeitende zusammen – „Team Ost“, „Sanitär“, „Lernende“.
          In der <strong>Disposition</strong> lässt sich die Tagesansicht damit
          auf die Spalten einer Gruppe einschränken, und am Rapport kommt ein
          Team in einem Zug dazu.
        </p>
        <p className="rounded bg-blue-50 text-blue-900 text-xs px-3 py-2 mb-3">
          Eine Gruppe ist eine <strong>Sicht, keine Berechtigung</strong>: Wer
          in keiner Gruppe ist, sieht und darf genau gleich viel. Mehrfache
          Zugehörigkeit ist gewollt – der Springer gehört zu beiden Teams.
        </p>
        <ul className="bg-white rounded-lg border divide-y mb-4">
          {gruppen?.map((g) => (
            <li key={g.id} className="px-4 py-3 text-sm">
              <form
                action={updateGruppe.bind(null, g.id)}
                className="flex flex-wrap items-center gap-2"
              >
                <input
                  name="bezeichnung"
                  required
                  defaultValue={g.bezeichnung}
                  aria-label="Bezeichnung"
                  className={`flex-1 min-w-[8rem] rounded border border-gray-300 px-2 py-1 ${
                    g.aktiv ? "" : "text-gray-400"
                  }`}
                />
                <input
                  name="sortierung"
                  type="number"
                  defaultValue={g.sortierung ?? 0}
                  aria-label="Sortierung"
                  title="Sortierung"
                  className="w-16 rounded border border-gray-300 px-2 py-1"
                />
                <button type="submit" className="text-xs text-arcos-steel hover:underline">
                  speichern
                </button>
              </form>

              {/* Die Mitglieder stehen in einem eigenen Formular: Sie
                  gehören in eine andere Tabelle, und ein gemeinsames
                  "speichern" würde verschweigen, dass zwei Dinge
                  geschrieben werden. */}
              <form action={setzeGruppenMitglieder.bind(null, g.id)} className="mt-2">
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {mitarbeitende?.map((m) => (
                    <label key={m.id} className="flex items-center gap-1.5 text-xs">
                      <input
                        type="checkbox"
                        name="mitarbeiter_id"
                        value={m.id}
                        defaultChecked={mitgliederVon.get(g.id)?.has(m.id) ?? false}
                      />
                      {m.name}
                    </label>
                  ))}
                  {(!mitarbeitende || mitarbeitende.length === 0) && (
                    <span className="text-xs text-gray-400">
                      Noch keine Mitarbeitenden erfasst.
                    </span>
                  )}
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <button type="submit" className="text-xs text-arcos-steel hover:underline">
                    Mitglieder speichern
                  </button>
                  <span className="text-xs text-gray-400">
                    {mitgliederVon.get(g.id)?.size ?? 0} zugeteilt
                  </span>
                </div>
              </form>

              <form action={toggleGruppe.bind(null, g.id, !g.aktiv)} className="mt-1">
                <button type="submit" className="text-xs text-gray-400 hover:text-arcos-steel">
                  {g.aktiv ? "deaktivieren" : "aktivieren"}
                </button>
              </form>
            </li>
          ))}
          {(!gruppen || gruppen.length === 0) && (
            <li className="px-4 py-3 text-sm text-gray-400">
              Noch keine Gruppen. Ohne Gruppen zeigt die Disposition wie bisher
              alle Mitarbeitenden.
            </li>
          )}
        </ul>
        <form action={createGruppe} className="flex flex-wrap items-end gap-2">
          <input
            id="neue_gruppe"
            name="bezeichnung"
            required
            placeholder="Neue Gruppe…"
            className="flex-1 min-w-[10rem] rounded border border-gray-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded bg-arcos-steel text-white text-sm font-medium px-4 py-2 hover:bg-arcos-navy"
          >
            Hinzufügen
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-lg font-medium mb-3">Standardpositionen für neue Rapporte</h2>
        <p className="text-sm text-gray-500 mb-3">
          Womit ein neuer Arbeitsrapport beginnt. In vielen Betrieben ist
          das immer dasselbe – Anfahrt, Fahrzeit, manchmal eine
          Kleinmaterialpauschale. Wer hier nichts pflegt, bekommt wie bisher
          einen leeren Rapport.
        </p>
        <p className="rounded bg-blue-50 text-blue-900 text-xs px-3 py-2 mb-3">
          Die Menge ist eine <strong>Annahme</strong>, die vor Ort korrigiert
          wird – bei Leistungen, die als Arbeitszeit zählen, in{" "}
          <strong>Minuten</strong>, sonst in der Einheit der Leistung. Trägt
          die Leistung das Häkchen „Anreise zum Kunden“, schlägt die beim
          Kunden hinterlegte Anfahrt diese Vorgabe.
        </p>
        <ul className="bg-white rounded-lg border divide-y mb-4">
          {standardpositionen?.map((sp) => (
            <li key={sp.id} className="px-4 py-2 text-sm">
              <form
                action={updateStandardposition.bind(null, sp.id)}
                className="flex flex-wrap items-center gap-2"
              >
                <span className={`flex-1 min-w-[10rem] ${sp.aktiv ? "" : "text-gray-400"}`}>
                  {sp.dienstleistungen?.bezeichnung ?? "Gelöschte Leistung"}
                </span>
                <input
                  name="vorgabe"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  defaultValue={Number(sp.vorgabe)}
                  aria-label="Menge"
                  className="w-24 rounded border border-gray-300 px-2 py-1"
                />
                <span className="text-xs text-gray-400 w-12">
                  {sp.dienstleistungen?.zaehlt_als_arbeitszeit
                    ? "Min."
                    : sp.dienstleistungen?.einheit ?? ""}
                </span>
                <input
                  name="sortierung"
                  type="number"
                  defaultValue={sp.sortierung ?? 0}
                  aria-label="Sortierung"
                  title="Sortierung"
                  className="w-16 rounded border border-gray-300 px-2 py-1"
                />
                <button type="submit" className="text-xs text-arcos-steel hover:underline">
                  speichern
                </button>
              </form>
              <form
                action={toggleStandardposition.bind(null, sp.id, !sp.aktiv)}
                className="mt-1"
              >
                <button type="submit" className="text-xs text-gray-400 hover:text-arcos-steel">
                  {sp.aktiv ? "deaktivieren" : "aktivieren"}
                </button>
              </form>
            </li>
          ))}
          {(!standardpositionen || standardpositionen.length === 0) && (
            <li className="px-4 py-3 text-sm text-gray-400">
              Noch keine Standardpositionen – neue Rapporte entstehen leer.
            </li>
          )}
        </ul>
        <form action={createStandardposition} className="flex flex-wrap items-end gap-2">
          <select
            id="neue_standardposition"
            name="dienstleistung_id"
            required
            defaultValue=""
            className="flex-1 min-w-[12rem] rounded border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="" disabled>
              Leistung wählen…
            </option>
            {dienstleistungen?.map((d) => (
              <option key={d.id} value={d.id}>
                {d.bezeichnung}
              </option>
            ))}
          </select>
          <input
            name="vorgabe"
            type="number"
            step="0.01"
            min="0.01"
            required
            defaultValue="1"
            aria-label="Menge"
            title="Menge bzw. Minuten"
            className="w-24 rounded border border-gray-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded bg-arcos-steel text-white text-sm font-medium px-4 py-2 hover:bg-arcos-navy"
          >
            Hinzufügen
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-lg font-medium mb-3">MWSt-Codes</h2>
        <p className="text-sm text-gray-500 mb-3">
          Bitte an die effektiven Codes aus eurem Buchhaltungssystem anpassen.
          Bestehende Einträge lassen sich direkt in der Zeile korrigieren.
        </p>
        <p className="rounded bg-blue-50 text-blue-900 text-xs px-3 py-2 mb-3">
          Eine Änderung am Satz gilt nur für <strong>künftige</strong>{" "}
          Zeiteinträge. Bereits erfasste behalten den Satz, der beim Erfassen
          gültig war – Exporte vergangener Perioden bleiben dadurch unverändert.
        </p>
        <ul className="bg-white rounded-lg border divide-y mb-4">
          {mwstCodes?.map((m) => (
            <li key={m.id} className="px-4 py-2 text-sm">
              <form
                action={updateMwstCode.bind(null, m.id)}
                className="flex flex-wrap items-center gap-2"
              >
                <input
                  name="code"
                  required
                  defaultValue={m.code}
                  aria-label="Code"
                  className={`w-24 rounded border border-gray-300 px-2 py-1 ${
                    m.aktiv ? "" : "text-gray-400"
                  }`}
                />
                <input
                  name="bezeichnung"
                  required
                  defaultValue={m.bezeichnung}
                  aria-label="Bezeichnung"
                  className={`flex-1 min-w-[8rem] rounded border border-gray-300 px-2 py-1 ${
                    m.aktiv ? "" : "text-gray-400"
                  }`}
                />
                <input
                  name="satz"
                  type="number"
                  step="0.1"
                  min={0}
                  max={100}
                  required
                  defaultValue={Number(m.satz)}
                  aria-label="Satz in Prozent"
                  className={`w-20 rounded border border-gray-300 px-2 py-1 ${
                    m.aktiv ? "" : "text-gray-400"
                  }`}
                />
                <span className="text-xs text-gray-400">%</span>
                <button type="submit" className="text-xs text-arcos-steel hover:underline">
                  speichern
                </button>
              </form>
              <form
                action={toggleMwstCode.bind(null, m.id, !m.aktiv)}
                className="mt-1"
              >
                <button type="submit" className="text-xs text-gray-400 hover:text-arcos-steel">
                  {m.aktiv ? "deaktivieren" : "aktivieren"}
                </button>
              </form>
            </li>
          ))}
        </ul>
        <form action={createMwstCode} className="flex gap-2">
          <input
            id="neuer_mwst_code"
            name="code"
            required
            placeholder="Code (z.B. B81)"
            className="w-32 rounded border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            name="bezeichnung"
            required
            placeholder="Bezeichnung"
            className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            name="satz"
            type="number"
            step="0.1"
            placeholder="Satz %"
            className="w-24 rounded border border-gray-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded bg-arcos-steel text-white text-sm font-medium px-4 py-2 hover:bg-arcos-navy"
          >
            Hinzufügen
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-lg font-medium mb-3">Rabattsätze</h2>
        <p className="text-sm text-gray-500 mb-3">
          Auswahlliste für die Zeiterfassung und das Erledigen von Anfragen.
          100% entspricht nicht verrechneter (interner) Zeit.
        </p>
        <ul className="bg-white rounded-lg border divide-y mb-4">
          {rabattsaetze?.map((r) => (
            <li key={r.id} className="px-4 py-2 text-sm">
              <form
                action={updateRabattsatz.bind(null, r.id)}
                className="flex flex-wrap items-center gap-2"
              >
                <input
                  name="prozent"
                  type="number"
                  step="0.1"
                  min={0}
                  max={100}
                  required
                  defaultValue={Number(r.prozent)}
                  aria-label="Prozent"
                  className={`w-20 rounded border border-gray-300 px-2 py-1 ${
                    r.aktiv ? "" : "text-gray-400"
                  }`}
                />
                <span className="text-xs text-gray-400">%</span>
                <input
                  name="bezeichnung"
                  defaultValue={r.bezeichnung ?? ""}
                  placeholder="Bezeichnung (optional)"
                  aria-label="Bezeichnung"
                  className={`flex-1 min-w-[8rem] rounded border border-gray-300 px-2 py-1 ${
                    r.aktiv ? "" : "text-gray-400"
                  }`}
                />
                <input
                  name="sortierung"
                  type="number"
                  defaultValue={r.sortierung ?? 0}
                  aria-label="Sortierung"
                  title="Sortierung"
                  className="w-16 rounded border border-gray-300 px-2 py-1"
                />
                <button type="submit" className="text-xs text-arcos-steel hover:underline">
                  speichern
                </button>
              </form>
              <form action={toggleRabattsatz.bind(null, r.id, !r.aktiv)} className="mt-1">
                <button type="submit" className="text-xs text-gray-400 hover:text-arcos-steel">
                  {r.aktiv ? "deaktivieren" : "aktivieren"}
                </button>
              </form>
            </li>
          ))}
        </ul>
        <form action={createRabattsatz} className="flex gap-2">
          <input
            id="neuer_rabatt"
            name="prozent"
            type="number"
            min={0}
            max={100}
            step="0.1"
            required
            placeholder="%"
            className="w-24 rounded border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            name="bezeichnung"
            placeholder="Bezeichnung (optional)"
            className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded bg-arcos-steel text-white text-sm font-medium px-4 py-2 hover:bg-arcos-navy"
          >
            Hinzufügen
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-lg font-medium mb-3">Anfrage-Kanäle</h2>
        <p className="text-sm text-gray-500 mb-3">
          Auswahlliste für „Wie kam die Anfrage rein?“.
        </p>
        <ul className="bg-white rounded-lg border divide-y mb-4">
          {kanaele?.map((k) => (
            <li key={k.id} className="px-4 py-2 text-sm">
              <form
                action={updateAnfrageKanal.bind(null, k.id)}
                className="flex flex-wrap items-center gap-2"
              >
                <input
                  name="symbol"
                  defaultValue={k.symbol}
                  aria-label="Symbol"
                  title="Symbol"
                  className="w-14 rounded border border-gray-300 px-2 py-1 text-center"
                />
                <input
                  name="bezeichnung"
                  required
                  defaultValue={k.bezeichnung}
                  aria-label="Bezeichnung"
                  className={`flex-1 min-w-[8rem] rounded border border-gray-300 px-2 py-1 ${
                    k.aktiv ? "" : "text-gray-400"
                  }`}
                />
                <input
                  name="sortierung"
                  type="number"
                  defaultValue={k.sortierung ?? 0}
                  aria-label="Sortierung"
                  title="Sortierung"
                  className="w-16 rounded border border-gray-300 px-2 py-1"
                />
                <button type="submit" className="text-xs text-arcos-steel hover:underline">
                  speichern
                </button>
              </form>
              <form action={toggleAnfrageKanal.bind(null, k.id, !k.aktiv)} className="mt-1">
                <button type="submit" className="text-xs text-gray-400 hover:text-arcos-steel">
                  {k.aktiv ? "deaktivieren" : "aktivieren"}
                </button>
              </form>
            </li>
          ))}
        </ul>
        <form action={createAnfrageKanal} className="flex gap-2">
          <input
            id="neuer_kanal"
            name="symbol"
            placeholder="Symbol (z.B. 📞)"
            className="w-28 rounded border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            name="bezeichnung"
            required
            placeholder="Bezeichnung"
            className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded bg-arcos-steel text-white text-sm font-medium px-4 py-2 hover:bg-arcos-navy"
          >
            Hinzufügen
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-lg font-medium mb-3">Anfrage-Prioritäten</h2>
        <p className="text-sm text-gray-500 mb-3">
          Auswahlliste für die Priorität einer Anfrage – die Farbe erscheint
          als Punkt auf der Kanban-Karte.
        </p>
        <ul className="bg-white rounded-lg border divide-y mb-4">
          {prioritaeten?.map((p) => (
            <li key={p.id} className="px-4 py-2 text-sm">
              <form
                action={updateAnfragePrioritaet.bind(null, p.id)}
                className="flex flex-wrap items-center gap-2"
              >
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${p.farbe}`} />
                <select
                  name="farbe"
                  defaultValue={p.farbe}
                  aria-label="Farbe"
                  className="rounded border border-gray-300 px-2 py-1"
                >
                  {FARBEN_OPTIONEN.map((f) => (
                    <option key={f.wert} value={f.wert}>
                      {f.label}
                    </option>
                  ))}
                </select>
                <input
                  name="bezeichnung"
                  required
                  defaultValue={p.bezeichnung}
                  aria-label="Bezeichnung"
                  className={`flex-1 min-w-[8rem] rounded border border-gray-300 px-2 py-1 ${
                    p.aktiv ? "" : "text-gray-400"
                  }`}
                />
                <input
                  name="sortierung"
                  type="number"
                  defaultValue={p.sortierung ?? 0}
                  aria-label="Sortierung"
                  title="Sortierung"
                  className="w-16 rounded border border-gray-300 px-2 py-1"
                />
                <button type="submit" className="text-xs text-arcos-steel hover:underline">
                  speichern
                </button>
              </form>
              <form action={toggleAnfragePrioritaet.bind(null, p.id, !p.aktiv)} className="mt-1">
                <button type="submit" className="text-xs text-gray-400 hover:text-arcos-steel">
                  {p.aktiv ? "deaktivieren" : "aktivieren"}
                </button>
              </form>
            </li>
          ))}
        </ul>
        <form action={createAnfragePrioritaet} className="flex gap-2">
          <select
            name="farbe"
            className="w-28 rounded border border-gray-300 px-3 py-2 text-sm"
            defaultValue="bg-gray-300"
          >
            {FARBEN_OPTIONEN.map((f) => (
              <option key={f.wert} value={f.wert}>
                {f.label}
              </option>
            ))}
          </select>
          <input
            id="neue_prioritaet"
            name="bezeichnung"
            required
            placeholder="Bezeichnung"
            className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded bg-arcos-steel text-white text-sm font-medium px-4 py-2 hover:bg-arcos-navy"
          >
            Hinzufügen
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-lg font-medium mb-3">Dokument-Kategorien</h2>
        <p className="text-sm text-gray-500 mb-3">
          Auswahlliste für die Dokumentenablage (bei Kunden, Projekten,
          Mitarbeitenden, Anfragen und Zeiteinträgen). Kategorie ist beim
          Hochladen optional.
        </p>
        <ul className="bg-white rounded-lg border divide-y mb-4">
          {dokumentKategorien?.map((k) => (
            <li key={k.id} className="px-4 py-2 text-sm">
              <form
                action={updateDokumentKategorie.bind(null, k.id)}
                className="flex flex-wrap items-center gap-2"
              >
                <input
                  name="bezeichnung"
                  required
                  defaultValue={k.bezeichnung}
                  aria-label="Bezeichnung"
                  className={`flex-1 min-w-[10rem] rounded border border-gray-300 px-2 py-1 ${
                    k.aktiv ? "" : "text-gray-400"
                  }`}
                />
                <input
                  name="sortierung"
                  type="number"
                  defaultValue={k.sortierung ?? 0}
                  aria-label="Sortierung"
                  title="Sortierung"
                  className="w-16 rounded border border-gray-300 px-2 py-1"
                />
                <button type="submit" className="text-xs text-arcos-steel hover:underline">
                  speichern
                </button>
              </form>
              <form action={toggleDokumentKategorie.bind(null, k.id, !k.aktiv)} className="mt-1">
                <button type="submit" className="text-xs text-gray-400 hover:text-arcos-steel">
                  {k.aktiv ? "deaktivieren" : "aktivieren"}
                </button>
              </form>
            </li>
          ))}
        </ul>
        <form action={createDokumentKategorie} className="flex gap-2">
          <input
            id="neue_kategorie"
            name="bezeichnung"
            required
            placeholder="Neue Kategorie…"
            className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded bg-arcos-steel text-white text-sm font-medium px-4 py-2 hover:bg-arcos-navy"
          >
            Hinzufügen
          </button>
        </form>
      </section>
    </div>
  );
}
