import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/get-profile";
import {
  heuteIso,
  label,
  verschieben,
  monatsRaster,
  zeitraumFuer,
} from "@/lib/date-utils";
import type { ZeiteintragMitDetails } from "@/lib/types";

type SearchParams = {
  datum?: string;
  kunde_id?: string;
  projekt_id?: string;
  klasse_id?: string;
  mitarbeiter_id?: string;
  // alles | geplant | erfasst – bestimmt, welche Balken erscheinen.
  zeigen?: string;
};

type Zeigen = "alles" | "geplant" | "erfasst";

// undefined in den Überschreibungen entfernt den Parameter – so schaltet
// "Alles" den Umschalter zurück, statt ?zeigen=alles anzuhängen.
function baueQuery(params: SearchParams, overrides: Partial<SearchParams>) {
  const merged = { ...params, ...overrides };
  const qs = new URLSearchParams();
  Object.entries(merged).forEach(([k, v]) => {
    if (v) qs.set(k, v);
  });
  return `/kalender?${qs.toString()}`;
}

const WOCHENTAGE = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const STANDARDFARBE = "#457B9D";
const MAX_ZEILEN_JE_TAG = 4;

type ZeitZeile = { mitarbeiterId: string; name: string; farbe: string; stunden: number };
type PlanZeile = {
  rapportId: string;
  mitarbeiterId: string | null;
  name: string;
  // Weitere Beteiligte – erscheinen im Tooltip, nicht im Balken.
  weitere: string[];
  farbe: string;
  von: string;
  bis: string;
  kunde: string;
  ort: string | null;
  projekt: string | null;
};
type AnfrageZeile = { id: string; titel: string; farbe: string };

export default async function KalenderPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const bezugsdatum = params.datum ?? heuteIso();
  const heute = heuteIso();
  const [monatVon, monatBis] = zeitraumFuer("monat", bezugsdatum);
  const wochen = monatsRaster(bezugsdatum);
  const rasterVon = wochen[0][0];
  const rasterBis = wochen[wochen.length - 1][6];

  const zeigen: Zeigen =
    params.zeigen === "geplant" || params.zeigen === "erfasst"
      ? (params.zeigen as Zeigen)
      : "alles";

  const profile = await getCurrentProfile();
  const isAdmin = profile?.role === "admin";
  const supabase = await createClient();

  // Bewusst die ABFRAGE abschalten und nicht erst die Anzeige filtern:
  // Wer nur die Planung sehen will, soll dafür auch keine Zeiteinträge
  // laden.
  let query = supabase
    .from("v_zeiteintraege")
    .select("*")
    // Positionen offener Rapporte erscheinen als Planungsbalken, nicht
    // zusätzlich als erfasste Zeit – sonst steht ein Einsatz zweimal im
    // selben Tag (siehe 0036).
    .eq("vorlaeufig", false)
    .gte("datum", rasterVon)
    .lte("datum", rasterBis);

  if (params.kunde_id) query = query.eq("kunde_id", params.kunde_id);
  if (params.projekt_id) query = query.eq("projekt_id", params.projekt_id);
  if (params.klasse_id) query = query.eq("klasse_id", params.klasse_id);
  if (params.mitarbeiter_id) query = query.eq("mitarbeiter_id", params.mitarbeiter_id);

  // Anfragen erscheinen anhand ihres Wiedervorlage-Datums im Kalender – die
  // Klasse-Filterung betrifft nur Zeiteinträge (Anfragen haben keine
  // Dienstleistungsklasse), daher bei aktivem Klasse-Filter bewusst keine
  // Anfragen anzeigen, statt unpassende Treffer zu zeigen.
  let anfrageQuery = params.klasse_id
    ? null
    : supabase
        .from("anfragen")
        .select("id, titel, kunde_id, projekt_id, zugewiesen_an, wiedervorlage_am, status")
        .gte("wiedervorlage_am", rasterVon)
        .lte("wiedervorlage_am", rasterBis)
        .neq("status", "erledigt");

  if (anfrageQuery) {
    if (params.kunde_id) anfrageQuery = anfrageQuery.eq("kunde_id", params.kunde_id);
    if (params.projekt_id) anfrageQuery = anfrageQuery.eq("projekt_id", params.projekt_id);
    if (params.mitarbeiter_id) anfrageQuery = anfrageQuery.eq("zugewiesen_an", params.mitarbeiter_id);
  }

  // Geplante Einsätze aus den Rapporten. Sie sind für die Übersicht sogar
  // wichtiger als die erfassten Zeiten: Der Kalender beantwortet die Frage
  // "wer ist wann wo eingeteilt", und die Zeiterfassung kommt erst danach.
  // Wie bei den Anfragen entfallen sie bei aktivem Klassenfilter – ein
  // Rapportkopf kennt keine Dienstleistungsklasse.
  // Filter als match-Objekt statt als Kette von Neuzuweisungen: Letzteres
  // treibt die Typherleitung von PostgREST in die Tiefe, bis TypeScript
  // aufgibt ("Type instantiation is excessively deep").
  const planFilter: Record<string, string> = {};
  if (params.kunde_id) planFilter.kunde_id = params.kunde_id;
  if (params.projekt_id) planFilter.projekt_id = params.projekt_id;
  // Beteiligte seit 0045: Der Filter läuft über den eingebetteten
  // Verbund, nicht mehr über geplant_fuer.
  if (params.mitarbeiter_id) {
    planFilter["rapport_beteiligte.mitarbeiter_id"] = params.mitarbeiter_id;
  }

  // Nur OFFENE Rapporte: Ein abgeschlossener zeigt seine tatsächlich
  // geleistete Zeit über die Zeiteinträge. So bleibt es bei einem Balken
  // je Einsatz, und ob er geplant oder geleistet ist, sieht man an der
  // Darstellung.
  //
  // Gesucht wird über datum, nicht über geplant_von: Ein Rapport ohne
  // Planzeiten fiele sonst ganz aus dem Kalender – und wäre nirgends mehr
  // sichtbar, weil seine Positionen als vorläufig ausgeblendet sind.
  const planQuery = params.klasse_id || zeigen === "erfasst"
    ? null
    : supabase
        .from("rapporte")
        .select(
          `id, datum, kunde_id, projekt_id, mitarbeiter_id, geplant_von, geplant_bis, kunden(name, vorname, ort), projekte(bezeichnung), ${
            params.mitarbeiter_id
              ? "rapport_beteiligte!inner(mitarbeiter_id)"
              : "rapport_beteiligte(mitarbeiter_id)"
          }`
        )
        .eq("status", "offen")
        .gte("datum", rasterVon)
        .lte("datum", rasterBis)
        .match(planFilter);

  // Alle Queries unabhängig voneinander gleichzeitig statt nacheinander
  // abschicken (die Haupt-Queries hängen nicht von den Filter-Listen ab).
  const zeitQuery = zeigen === "geplant" ? null : query;

  const [
    { data: kunden },
    { data: projekte },
    { data: klassen },
    { data: alleMitarbeitende },
    { data },
    anfrageErgebnis,
    planErgebnis,
  ] = await Promise.all([
    supabase.from("kunden").select("id, name, vorname").order("name"),
    supabase.from("projekte").select("*, kunden(name, vorname)").order("bezeichnung"),
    supabase.from("dienstleistungsklassen").select("id, bezeichnung").order("sortierung"),
    // Farb-Zuordnung wird für ALLE gebraucht (auch nicht-Admins sehen im
    // gemeinsamen Anfragen-Board Kolleg:innen-Zuweisungen), nicht nur für
    // den Mitarbeitende-Filter, der weiterhin admin-exklusiv bleibt.
    supabase.from("profiles").select("id, name, farbe").order("name"),
    zeitQuery ?? Promise.resolve({ data: [] as never[] }),
    anfrageQuery ?? Promise.resolve({ data: [] as never[] }),
    planQuery ?? Promise.resolve({ data: [] as never[] }),
  ]);
  const zeilen = (data as ZeiteintragMitDetails[] | null) ?? [];
  const anfragenRoh = (anfrageErgebnis.data as
    | {
        id: string;
        titel: string;
        kunde_id: string;
        projekt_id: string | null;
        zugewiesen_an: string | null;
        wiedervorlage_am: string;
        status: string;
      }[]
    | null) ?? [];

  const planungRoh = (planErgebnis.data as
    | {
        id: string;
        datum: string;
        mitarbeiter_id: string | null;
        rapport_beteiligte?: { mitarbeiter_id: string }[];
        geplant_von: string | null;
        geplant_bis: string | null;
        kunden?: { name: string; vorname: string | null; ort: string | null } | null;
        projekte?: { bezeichnung: string } | null;
      }[]
    | null) ?? [];

  const farbeVon = (mitarbeiterId: string | null) =>
    alleMitarbeitende?.find((m) => m.id === mitarbeiterId)?.farbe ?? STANDARDFARBE;

  const proTag = new Map<
    string,
    {
      stunden: number;
      betrag: number;
      zeit: Map<string, ZeitZeile>;
      anfragen: AnfrageZeile[];
      plan: PlanZeile[];
    }
  >();
  const tagEintrag = (datum: string) => {
    let eintrag = proTag.get(datum);
    if (!eintrag) {
      eintrag = { stunden: 0, betrag: 0, zeit: new Map(), anfragen: [], plan: [] };
      proTag.set(datum, eintrag);
    }
    return eintrag;
  };

  const nameVon = (mitarbeiterId: string | null) =>
    alleMitarbeitende?.find((m) => m.id === mitarbeiterId)?.name ?? "Nicht zugeteilt";

  // Uhrzeit aus dem Zeitstempel wie im Rapportformular: dort wird
  // geplant_von/bis ebenso über die Zeichenkette gelesen, damit beide
  // Seiten dieselbe Uhrzeit anzeigen.
  const uhrzeit = (wert: string | null) => (wert ? wert.slice(11, 16) : "");

  for (const r of planungRoh) {
    // Planzeit bestimmt den Tag, wenn vorhanden – sonst das Rapportdatum.
    const eintrag = tagEintrag(r.geplant_von ? r.geplant_von.slice(0, 10) : r.datum);
    eintrag.plan.push({
      rapportId: r.id,
      mitarbeiterId: r.mitarbeiter_id,
      // Farbe und Name der verantwortlichen Person; bei mehreren
      // Beteiligten kann die Farbe nicht "die Person" bedeuten.
      name: nameVon(r.mitarbeiter_id),
      farbe: farbeVon(r.mitarbeiter_id),
      weitere: (r.rapport_beteiligte ?? [])
        .map((b) => b.mitarbeiter_id)
        .filter((id) => id !== r.mitarbeiter_id)
        .map(nameVon),
      von: uhrzeit(r.geplant_von),
      bis: uhrzeit(r.geplant_bis),
      kunde:
        [r.kunden?.vorname, r.kunden?.name].filter(Boolean).join(" ") || "Ohne Kunde",
      ort: r.kunden?.ort ?? null,
      projekt: r.projekte?.bezeichnung ?? null,
    });
  }

  for (const z of zeilen) {
    const eintrag = tagEintrag(z.datum);
    eintrag.stunden += Number(z.menge_stunden);
    eintrag.betrag += Number(z.betrag);

    const zeile = eintrag.zeit.get(z.mitarbeiter_id) ?? {
      mitarbeiterId: z.mitarbeiter_id,
      name: z.mitarbeiter_name,
      farbe: farbeVon(z.mitarbeiter_id),
      stunden: 0,
    };
    zeile.stunden += Number(z.menge_stunden);
    eintrag.zeit.set(z.mitarbeiter_id, zeile);
  }

  for (const a of anfragenRoh) {
    const eintrag = tagEintrag(a.wiedervorlage_am);
    eintrag.anfragen.push({
      id: a.id,
      titel: a.titel,
      farbe: farbeVon(a.zugewiesen_an),
    });
  }

  const monatStunden = [...proTag.entries()]
    .filter(([datum]) => datum >= monatVon && datum <= monatBis)
    .reduce((s, [, v]) => s + v.stunden, 0);

  // Legende: nur Mitarbeitende, die im aktuell sichtbaren Monatsraster
  // tatsächlich mit Zeit oder Anfrage auftauchen – vermeidet eine lange,
  // wenig hilfreiche Liste bei vielen Mitarbeitenden.
  const sichtbareMitarbeiterIds = new Set<string>();
  for (const eintrag of proTag.values()) {
    for (const id of eintrag.zeit.keys()) sichtbareMitarbeiterIds.add(id);
  }
  for (const a of anfragenRoh) {
    if (a.zugewiesen_an) sichtbareMitarbeiterIds.add(a.zugewiesen_an);
  }
  for (const p of planungRoh) {
    if (p.mitarbeiter_id) sichtbareMitarbeiterIds.add(p.mitarbeiter_id);
    for (const b of p.rapport_beteiligte ?? []) sichtbareMitarbeiterIds.add(b.mitarbeiter_id);
  }
  const legende = (alleMitarbeitende ?? []).filter((m) => sichtbareMitarbeiterIds.has(m.id));

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Kalenderübersicht</h1>

      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-2 text-sm">
          <Link
            href={baueQuery(params, { datum: verschieben("monat", bezugsdatum, -1) })}
            className="rounded border px-3 py-1.5 hover:bg-gray-50"
          >
            ← Zurück
          </Link>
          <span className="font-medium min-w-[10rem] text-center">
            {label("monat", monatVon, monatBis)}
          </span>
          <Link
            href={baueQuery(params, { datum: verschieben("monat", bezugsdatum, 1) })}
            className="rounded border px-3 py-1.5 hover:bg-gray-50"
          >
            Weiter →
          </Link>
          <Link
            href={baueQuery(params, { datum: heuteIso() })}
            className="rounded border px-3 py-1.5 hover:bg-gray-50"
          >
            Heute
          </Link>
        </div>
        {/* Bei "nur geplant" gibt es keine erfassten Stunden – ein Total
            von 0.00 h wäre dort keine Auskunft, sondern eine Irreführung. */}
        {zeigen !== "geplant" && (
          <div className="text-sm text-gray-500">
            Total {label("monat", monatVon, monatBis)}:{" "}
            <strong>{monatStunden.toFixed(2)} h</strong>
          </div>
        )}
      </div>

      {/* Umschalter statt Auswahlfeld: drei Zustände, die man im Blick
          behalten will – als Feld im Filterformular bräuchte jeder Wechsel
          einen zusätzlichen Klick auf "Filtern". */}
      <div className="flex gap-2 mb-4 text-sm">
        {(
          [
            ["alles", "Alles"],
            ["geplant", "Nur geplant"],
            ["erfasst", "Nur erfasst"],
          ] as [Zeigen, string][]
        ).map(([wert, text]) => (
          <Link
            key={wert}
            href={baueQuery(params, { zeigen: wert === "alles" ? undefined : wert })}
            className={`rounded border px-3 py-1.5 ${
              zeigen === wert ? "bg-arcos-steel text-white" : "bg-white hover:bg-gray-50"
            }`}
          >
            {text}
          </Link>
        ))}
      </div>

      <form className="bg-white rounded-lg border p-4 mb-6 flex flex-wrap items-end gap-3 text-sm">
        <input type="hidden" name="datum" value={bezugsdatum} />
        {/* Der Umschalter oben darf beim Filtern nicht verlorengehen. */}
        {zeigen !== "alles" && <input type="hidden" name="zeigen" value={zeigen} />}
        <div>
          <label className="block text-xs text-gray-500 mb-1">Kunde</label>
          <select
            name="kunde_id"
            defaultValue={params.kunde_id ?? ""}
            className="rounded border border-gray-300 px-2 py-1.5 min-w-[10rem]"
          >
            <option value="">Alle</option>
            {kunden?.map((k) => (
              <option key={k.id} value={k.id}>
                {k.vorname ? `${k.vorname} ` : ""}
                {k.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Projekt</label>
          <select
            name="projekt_id"
            defaultValue={params.projekt_id ?? ""}
            className="rounded border border-gray-300 px-2 py-1.5 min-w-[12rem]"
          >
            <option value="">Alle</option>
            {projekte?.map((m) => (
              <option key={m.id} value={m.id}>
                {m.kunden?.vorname ? `${m.kunden.vorname} ` : ""}
                {m.kunden?.name} – {m.bezeichnung}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Klasse</label>
          <select
            name="klasse_id"
            defaultValue={params.klasse_id ?? ""}
            className="rounded border border-gray-300 px-2 py-1.5 min-w-[9rem]"
          >
            <option value="">Alle</option>
            {klassen?.map((k) => (
              <option key={k.id} value={k.id}>
                {k.bezeichnung}
              </option>
            ))}
          </select>
        </div>
        {isAdmin && (
          <div>
            <label className="block text-xs text-gray-500 mb-1">Mitarbeitende</label>
            <select
              name="mitarbeiter_id"
              defaultValue={params.mitarbeiter_id ?? ""}
              className="rounded border border-gray-300 px-2 py-1.5 min-w-[10rem]"
            >
              <option value="">Alle</option>
              {alleMitarbeitende?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <button type="submit" className="rounded border px-4 py-1.5 hover:bg-gray-50">
          Filtern
        </button>
      </form>

      {legende.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-3 text-xs text-gray-500">
          {legende.map((m) => (
            <span key={m.id} className="inline-flex items-center gap-1.5">
              <span
                className="inline-block w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: m.farbe ?? STANDARDFARBE }}
              />
              {m.name}
            </span>
          ))}
          <span className="inline-flex items-center gap-1.5 text-gray-400">
            <span
              className="inline-block w-2.5 h-2.5 rounded-full bg-gray-400"
            />
            geplant
            <span
              className="inline-block w-2.5 h-2.5 rounded-full bg-gray-400 ml-2"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(135deg, rgba(255,255,255,.75) 0 2px, rgba(255,255,255,.25) 2px 4px)",
              }}
            />
            erfasst
          </span>
        </div>
      )}

      <div className="bg-white rounded-lg border overflow-hidden overflow-x-auto">
        <div className="grid grid-cols-7 text-xs text-gray-500 border-b">
          {WOCHENTAGE.map((tag) => (
            <div key={tag} className="px-2 py-2 text-center font-medium">
              {tag}
            </div>
          ))}
        </div>
        {wochen.map((woche, wi) => (
          <div key={wi} className="grid grid-cols-7 border-b last:border-b-0">
            {woche.map((tagIso) => {
              const imMonat = tagIso >= monatVon && tagIso <= monatBis;
              const werte = proTag.get(tagIso);
              const istHeute = tagIso === heute;
              const tagNr = Number(tagIso.slice(8, 10));

              const zeitZeilen = werte ? [...werte.zeit.values()] : [];
              const anfrageZeilen = werte?.anfragen ?? [];
              const planZeilen = werte?.plan ?? [];
              // Planung zuerst: Der Kalender beantwortet vor allem die
              // Frage, wer wann eingeteilt ist.
              const alleZeilen = [
                ...planZeilen.map((p) => ({
                  key: `p-${p.rapportId}`,
                  farbe: p.farbe,
                  schraffiert: false,
                  // Ohne den Namen: Farbe und Legende sagen längst, wer es
                  // ist. Der Platz gehört der Frage, um WAS es geht – bei
                  // einem geplanten Einsatz also Uhrzeit, Kunde und Ort.
                  label: `${p.von ? `${p.von} ` : ""}${p.kunde}${p.ort ? `, ${p.ort}` : ""}`,
                  titel: [
                    `Geplant für ${[p.name, ...p.weitere].filter(Boolean).join(", ")}`,
                    p.von ? `${p.von}${p.bis ? `–${p.bis}` : ""}` : null,
                    p.kunde,
                    p.ort,
                    p.projekt,
                  ]
                    .filter(Boolean)
                    .join(" · "),
                  href: `/rapporte/${p.rapportId}`,
                })),
                ...zeitZeilen.map((z) => ({
                  key: `z-${z.mitarbeiterId}`,
                  farbe: z.farbe,
                  schraffiert: true,
                  label: `${z.name.split(" ")[0]} · ${z.stunden.toFixed(1)}h`,
                  href: `/auswertungen?ansicht=tag&datum=${tagIso}`,
                  titel: `Erfasst – ${z.name}: ${z.stunden.toFixed(2)} h an diesem Tag`,
                })),
                ...anfrageZeilen.map((a) => ({
                  key: `a-${a.id}`,
                  farbe: a.farbe,
                  schraffiert: false,
                  label: a.titel,
                  href: `/anfragen/${a.id}`,
                  titel: a.titel,
                })),
              ];
              const sichtbar = alleZeilen.slice(0, MAX_ZEILEN_JE_TAG);
              const rest = alleZeilen.length - sichtbar.length;

              return (
                <div
                  key={tagIso}
                  className={`border-r last:border-r-0 px-1.5 py-1.5 min-h-[7.5rem] flex flex-col gap-1 ${
                    imMonat ? "" : "bg-gray-50 text-gray-400"
                  }`}
                >
                  <div className="flex items-center justify-between px-0.5">
                    <Link
                      href={`/auswertungen?ansicht=tag&datum=${tagIso}`}
                      className={`text-xs rounded-full hover:bg-arcos-steel/10 ${
                        istHeute
                          ? "inline-flex items-center justify-center w-5 h-5 bg-arcos-steel text-white"
                          : "px-1"
                      }`}
                    >
                      {tagNr}
                    </Link>
                    {werte && werte.stunden > 0 && (
                      <span className="text-[11px] text-gray-400">
                        {werte.stunden.toFixed(1)}h
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col gap-0.5">
                    {sichtbar.map((zeile) => (
                      <Link
                        key={zeile.key}
                        href={zeile.href}
                        title={zeile.titel}
                        className={`block text-[11px] leading-4 rounded px-1 truncate hover:opacity-80 ${
                          zeile.schraffiert ? "text-gray-900" : "text-white"
                        }`}
                        style={
                          // Gleiche Farbe je Person, damit die Zuordnung auf
                          // einen Blick stimmt. Erfasste Zeit bekommt eine
                          // Schraffur darüber, geplante Zeit bleibt deckend –
                          // so sind beide unterscheidbar, ohne dass eine
                          // zweite Farbskala nötig wird.
                          //
                          // Auf der Schraffur steht die Schrift schwarz: Die
                          // hellen Streifen brechen den Untergrund so weit
                          // auf, dass Weiss darauf ausfranst. Deshalb sind
                          // die Streifen hier auch kräftiger als in der
                          // Legende – sie müssen Text tragen.
                          zeile.schraffiert
                            ? {
                                backgroundColor: zeile.farbe,
                                backgroundImage:
                                  "repeating-linear-gradient(135deg, rgba(255,255,255,.75) 0 4px, rgba(255,255,255,.25) 4px 8px)",
                              }
                            : { backgroundColor: zeile.farbe }
                        }
                      >
                        {zeile.label}
                      </Link>
                    ))}
                    {rest > 0 && (
                      <Link
                        href={`/auswertungen?ansicht=tag&datum=${tagIso}`}
                        className="block text-[11px] leading-4 text-gray-400 hover:text-arcos-steel px-1"
                      >
                        +{rest} weitere
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      {!isAdmin && (
        <p className="text-xs text-gray-400 mt-3">
          Zeiteinträge zeigen nur deine eigenen; Anfragen (Wiedervorlagen)
          zeigen alle, die deiner Organisation zugeordnet sind.
        </p>
      )}
    </div>
  );
}
