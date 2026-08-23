import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganisation } from "@/lib/get-profile";
import { formatDatumCH, heuteIso, label, minutenAus, type Ansicht, uhrzeitAus, verschieben, zeitraumFuer } from "@/lib/date-utils";
import { rapportNummer, type Rapport } from "@/lib/types";
import { DispoRaster, type RasterEintrag, type RasterSpalte } from "@/components/dispo-raster";
import { mitKunde } from "@/lib/rapport-kunde";

type SearchParams = {
  ansicht?: string;
  datum?: string;
  mitarbeiter_id?: string;
  gruppe_id?: string;
};

// Alle Tage zwischen zwei ISO-Daten, einschliesslich. Bewusst hier und
// nicht in date-utils: monatsRaster() dort liefert ein 7-spaltiges Gitter
// mit Rand-Tagen, für eine Terminliste braucht es die schlichte Folge.
function tageZwischen(von: string, bis: string): string[] {
  const tage: string[] = [];
  const d = new Date(`${von}T12:00:00`);
  const ende = new Date(`${bis}T12:00:00`);
  while (d <= ende) {
    // Hier ist toISOString() richtig: Der Mittag als Anker hält jeden Offset
    // aus, der Kalendertag kippt nicht. Für "heute" oder "jetzt" wäre es
    // falsch – dafür heuteIso() aus date-utils.
    // zeitzone-ok: Mittagsanker oben, der Kalendertag kippt bei keinem Offset
    tage.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 1);
  }
  return tage;
}

function uhrzeit(zeitstempel: string | null): string {
  // slice(11, 16) schnitt die UTC-Stunde aus der ISO-Zeichenkette.
  return uhrzeitAus(zeitstempel) ?? "";
}

// Doppelbelegungen je Person und Tag ermitteln.
//
// Anders als bei der Zeiterfassung ist eine Überschneidung hier fast immer
// ein Fehler – ein Monteur kann nicht an zwei Orten sein. Gesperrt wird
// trotzdem nichts: Ein Disponent schiebt manchmal bewusst zwei Termine
// ineinander und räumt sie später auseinander.
//
// Nur vergleichbar, wenn beide Termine eine Person UND beide Zeiten haben.
// Ganztägige oder unzugewiesene Einträge kollidieren mit nichts.
function minuten(zeitstempel: string | null): number | null {
  // slice(11, 16) schnitt die UTC-Stunde aus der Zeichenkette – damit wurde
  // gegen die falsche Tagesgrenze geprüft.
  return minutenAus(zeitstempel);
}

// Seit 0045 hat ein Einsatz mehrere Beteiligte. Ein Konflikt entsteht,
// sobald sich zwei Einsätze bei EINER Person überschneiden – auch wenn
// die übrigen Beteiligten verschieden sind.
function konflikteFinden(
  eintraege: Rapport[],
  beteiligteVon: (rapportId: string) => string[]
): Set<string> {
  const konflikte = new Set<string>();

  for (let i = 0; i < eintraege.length; i++) {
    for (let j = i + 1; j < eintraege.length; j++) {
      const a = eintraege[i];
      const b = eintraege[j];
      const gemeinsam = beteiligteVon(a.id).some((id) => beteiligteVon(b.id).includes(id));
      if (!gemeinsam) continue;

      const aVon = minuten(a.geplant_von);
      const aBis = minuten(a.geplant_bis);
      const bVon = minuten(b.geplant_von);
      const bBis = minuten(b.geplant_bis);
      if (aVon == null || aBis == null || bVon == null || bBis == null) continue;

      // Nahtloser Anschluss ist kein Konflikt: 08:00-10:00 und 10:00-12:00
      // gehen ineinander über.
      if (aVon < bBis && bVon < aBis) {
        konflikte.add(a.id);
        konflikte.add(b.id);
      }
    }
  }

  return konflikte;
}

export default async function DispositionPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  // Kostenpflichtiges Zusatzmodul: Ohne Buchung gibt es die Seite nicht.
  // Geprüft wird zusätzlich serverseitig, nicht nur über die Navigation.
  const organisation = await getCurrentOrganisation();
  if (!organisation?.modul_disposition) redirect("/");

  const params = await searchParams;
  const ansicht: Ansicht =
    params.ansicht === "tag" || params.ansicht === "monat"
      ? (params.ansicht as Ansicht)
      : "woche";
  const bezugsdatum = params.datum ?? heuteIso();
  const [von, bis] = zeitraumFuer(ansicht, bezugsdatum);

  const supabase = await createClient();

  // !inner beim Filtern auf eine Person: So liefert die Abfrage nur
  // Rapporte, an denen sie beteiligt ist – ohne den Umweg über eine
  // zweite Abfrage nach ihren Rapport-Kennungen.
  const einbettung = params.mitarbeiter_id
    ? "rapport_mitarbeiter!inner(mitarbeiter_id)"
    : "rapport_mitarbeiter(mitarbeiter_id)";

  let query = supabase
    .from("rapporte")
    .select(`*, projekte(id, bezeichnung, kunden(id, name, vorname)), ${einbettung}`)
    .gte("datum", von)
    .lte("datum", bis)
    .neq("status", "storniert")
    .order("geplant_von", { ascending: true, nullsFirst: false });

  if (params.mitarbeiter_id) {
    query = query.eq("rapport_mitarbeiter.mitarbeiter_id", params.mitarbeiter_id);
  }

  const [
    { data: rapporteRoh },
    { data: mitarbeitende },
    { data: gruppen },
    { data: gruppenMitglieder },
  ] = await Promise.all([
    query,
    supabase.from("profiles").select("id, name, farbe").is("deaktiviert_am", null).order("name"),
    supabase.from("gruppen").select("id, bezeichnung").eq("aktiv", true).order("sortierung"),
    supabase.from("gruppen_mitglieder").select("gruppe_id, mitarbeiter_id"),
  ]);

  // Gruppen schränken die SPALTEN ein, nicht die Einsätze (0049). Ein
  // Einsatz, an dem eine Person aus der Gruppe beteiligt ist, soll
  // sichtbar bleiben – auch wenn die übrigen Beteiligten anderswo
  // hingehören. Andernfalls verschwände genau die Zusammenarbeit über
  // Teamgrenzen hinweg, die man in der Disposition sehen will.
  const gruppenPersonen = params.gruppe_id
    ? new Set(
        (gruppenMitglieder ?? [])
          .filter((z) => z.gruppe_id === params.gruppe_id)
          .map((z) => z.mitarbeiter_id)
      )
    : null;

  const rapporte = ((rapporteRoh as Rapport[] | null) ?? []).map(mitKunde);

  // Beteiligte je Rapport. Beim Filtern auf eine Person liefert der
  // !inner-Verbund nur diese eine Zeile zurück – die vollständige Liste
  // kommt dann aus einer eigenen Abfrage, sonst zeigte die Tagesansicht
  // den Einsatz nur in einer Spalte.
  const beteiligtePro = new Map<string, string[]>();
  if (params.mitarbeiter_id && rapporte.length > 0) {
    const { data: alle } = await supabase
      .from("rapport_mitarbeiter")
      .select("rapport_id, mitarbeiter_id")
      .in("rapport_id", rapporte.map((r) => r.id));
    for (const z of alle ?? []) {
      beteiligtePro.set(z.rapport_id, [...(beteiligtePro.get(z.rapport_id) ?? []), z.mitarbeiter_id]);
    }
  } else {
    for (const r of rapporte) {
      const eingebettet = (r as unknown as { rapport_mitarbeiter?: { mitarbeiter_id: string }[] })
        .rapport_mitarbeiter;
      beteiligtePro.set(r.id, (eingebettet ?? []).map((b) => b.mitarbeiter_id));
    }
  }
  const beteiligteVon = (id: string) => beteiligtePro.get(id) ?? [];
  const tage = tageZwischen(von, bis);

  const proTag = new Map<string, Rapport[]>();
  for (const r of rapporte) {
    const liste = proTag.get(r.datum) ?? [];
    liste.push(r);
    proTag.set(r.datum, liste);
  }

  const query2 = (over: Partial<SearchParams>) => {
    const qs = new URLSearchParams();
    Object.entries({ ...params, ...over }).forEach(([k, v]) => {
      if (v) qs.set(k, String(v));
    });
    return `/disposition?${qs.toString()}`;
  };

  const heute = heuteIso();

  const STANDARDFARBE = "#457B9D";
  const personen = (mitarbeitende ?? []) as { id: string; name: string; farbe: string | null }[];
  const farbeVon = (id: string | null) =>
    personen.find((m) => m.id === id)?.farbe ?? STANDARDFARBE;
  const nameVon = (id: string | null) =>
    personen.find((m) => m.id === id)?.name ?? "Nicht zugeteilt";

  // Alle Konflikte des sichtbaren Zeitraums, tagweise ermittelt.
  const alleKonflikte = new Set<string>();
  for (const tag of tage) {
    for (const id of konflikteFinden(proTag.get(tag) ?? [], beteiligteVon)) alleKonflikte.add(id);
  }

  // ---------------------------------------------------------
  // Abwesenheiten und Schliesstage als Konflikt
  // ---------------------------------------------------------
  // Beim Verschieben wird gefragt, und wer bestätigt, hat den Grund im
  // Kopf. Zwei Telefone und eine Mittagspause später hat ihn niemand mehr
  // – und der Balken sah aus wie jeder andere. Ein Plan, der nicht
  // aufgeht, muss man ihm ansehen, und zwar dauerhaft.
  //
  // Kein Verbund auf abwesenheitsarten: abwesenheiten.art hält nur den
  // Schlüssel, ein Fremdschlüssel darauf existiert nicht (siehe den
  // Fehler in freieZeitenAm).
  const [{ data: abwesenheiten }, { data: abwesenheitsarten }, { data: schliesstage }] =
    await Promise.all([
      supabase
        .from("abwesenheiten")
        .select("mitarbeiter_id, art, von, bis, von_zeit, bis_zeit")
        .lte("von", bis)
        .gte("bis", von),
      supabase.from("abwesenheitsarten").select("wert, bezeichnung, blockiert"),
      supabase.from("schliesstage").select("bezeichnung, von, bis").lte("von", bis).gte("bis", von),
    ]);

  const artVon = new Map(
    (abwesenheitsarten ?? []).map((a) => [a.wert, a as { bezeichnung: string; blockiert: boolean }])
  );

  const konfliktGruende = new Map<string, string[]>();
  for (const r of rapporte) {
    const gruende: string[] = [];

    if (alleKonflikte.has(r.id)) gruende.push("doppelt belegt");

    for (const tag of schliesstage ?? []) {
      if (tag.von <= r.datum && tag.bis >= r.datum) gruende.push(`betriebsfrei (${tag.bezeichnung})`);
    }

    for (const person of beteiligteVon(r.id)) {
      for (const a of abwesenheiten ?? []) {
        if (a.mitarbeiter_id !== person) continue;
        if (a.von > r.datum || a.bis < r.datum) continue;

        // Arten ohne "blockiert" – Homeoffice, Aussendienst – sind reine
        // Information und kein Konflikt.
        const art = artVon.get(a.art);
        if (art?.blockiert === false) continue;

        // Halbtägige Abwesenheit zählt nur, wenn sie sich mit der
        // Planzeit überschneidet. Ohne Planzeit gilt der ganze Tag.
        if (a.von_zeit && r.geplant_von && r.geplant_bis) {
          const abVon = Number(a.von_zeit.slice(0, 2)) * 60 + Number(a.von_zeit.slice(3, 5));
          const abBis = a.bis_zeit
            ? Number(a.bis_zeit.slice(0, 2)) * 60 + Number(a.bis_zeit.slice(3, 5))
            : 24 * 60;
          const planVon = minuten(r.geplant_von) ?? 0;
          const planBis = minuten(r.geplant_bis) ?? 24 * 60;
          if (planBis <= abVon || planVon >= abBis) continue;
        }

        gruende.push(`${nameVon(person)}: ${art?.bezeichnung ?? "abwesend"}`);
      }
    }

    if (gruende.length > 0) konfliktGruende.set(r.id, gruende);
  }

  // In der Wochenansicht sind die Spalten die Tage, in der Tagesansicht die
  // Personen. Das ist die Frage, die man in der jeweiligen Ansicht stellt:
  // "wie ist die Woche verteilt" gegenüber "wer ist heute wo".
  const rasterSpalten: RasterSpalte[] =
    ansicht === "woche"
      ? tage.map((t) => ({
          key: t,
          titel: new Date(`${t}T12:00:00`).toLocaleDateString("de-CH", { weekday: "short" }),
          untertitel: formatDatumCH(t),
          betont: t === heute,
          planenHref: `/rapporte/neu?datum=${t}${
            params.mitarbeiter_id ? `&mitarbeiter=${params.mitarbeiter_id}` : ""
          }`,
        }))
      : [
          ...personen
            .filter((m) => !params.mitarbeiter_id || m.id === params.mitarbeiter_id)
            .filter((m) => !gruppenPersonen || gruppenPersonen.has(m.id))
            .map((m) => ({
              key: m.id,
              titel: m.name,
              planenHref: `/rapporte/neu?datum=${bezugsdatum}&mitarbeiter=${m.id}`,
            })),
          // Eigene Spalte, damit unzugeteilte Einsätze nicht untergehen –
          // sie sind der häufigste Grund, warum am Morgen jemand anruft.
          {
            key: "ohne",
            titel: "Nicht zugeteilt",
            planenHref: `/rapporte/neu?datum=${bezugsdatum}`,
          },
        ];

  // In der Tagesansicht erscheint ein Einsatz in JEDER Spalte seiner
  // Beteiligten – aber es bleibt ein Einsatz: Ziehen bewegt ihn für alle
  // (siehe verschiebeEinsatz). In der Wochenansicht steht er einmal am Tag.
  const sichtbar = rapporte.filter((r) => ansicht !== "tag" || r.datum === bezugsdatum);

  const rasterEintraege: RasterEintrag[] = sichtbar.flatMap((r) => {
    const beteiligte = beteiligteVon(r.id);
    const namen = beteiligte.map(nameVon).filter(Boolean);
    const kunde = [r.kunde?.vorname, r.kunde?.name].filter(Boolean).join(" ") || "Ohne Kunde";

    const gemeinsam = {
      vonMinuten: minuten(r.geplant_von),
      bisMinuten: minuten(r.geplant_bis),
      // Farbe der verantwortlichen Person: Bei mehreren Beteiligten kann
      // die Farbe nicht mehr "die Person" bedeuten – die übrigen Namen
      // stehen im Tooltip.
      farbe: farbeVon(r.mitarbeiter_id ?? null),
      titelZeile: kunde,
      // Herkunft mitgeben: Wer aus der Disposition einen Balken
      // öffnet, will danach in dieselbe Ansicht und denselben Tag
      // zurück – nicht in die Rapportliste.
      href: `/rapporte/${r.id}?von=disposition&ansicht=${ansicht}&datum=${bezugsdatum}`,
      konflikt: konfliktGruende.has(r.id),
      konfliktGrund: konfliktGruende.get(r.id)?.join(" · "),
      datum: r.datum,
      // Nur offene Rapporte lassen sich verschieben. Ein abgeschlossener
      // hält fest, was geleistet wurde – daran zieht niemand mehr.
      ziehbar: r.status === "offen",
    };

    const zweiteZeile =
      ansicht === "woche"
        ? [namen.join(", "), r.projekte?.bezeichnung].filter(Boolean).join(" · ")
        : r.projekte?.bezeichnung ?? null;

    if (ansicht === "woche") {
      return [{ ...gemeinsam, key: r.id, spalte: r.datum, zweiteZeile }];
    }

    const spalten = beteiligte.length > 0 ? beteiligte : ["ohne"];
    return spalten.map((spalte) => ({
      ...gemeinsam,
      // Eigener Schlüssel je Spalte, damit React die Balken auseinander
      // hält – verschoben wird trotzdem der ganze Einsatz.
      key: beteiligte.length > 1 ? `${r.id}::${spalte}` : r.id,
      spalte,
      zweiteZeile:
        beteiligte.length > 1
          ? [`mit ${namen.length - 1} weiteren`, r.projekte?.bezeichnung]
              .filter(Boolean)
              .join(" · ")
          : zweiteZeile,
    }));
  });

  const rasterMoeglich = ansicht !== "monat";

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Disposition</h1>

      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex rounded border overflow-hidden text-sm">
          {(["tag", "woche", "monat"] as Ansicht[]).map((a) => (
            <Link
              key={a}
              href={query2({ ansicht: a, datum: heuteIso() })}
              className={`px-4 py-1.5 ${
                ansicht === a ? "bg-arcos-steel text-white" : "bg-white hover:bg-gray-50"
              }`}
            >
              {a === "tag" ? "Tag" : a === "woche" ? "Woche" : "Monat"}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2 text-sm">
          <Link
            href={query2({ datum: verschieben(ansicht, bezugsdatum, -1) })}
            className="rounded border px-3 py-1.5 hover:bg-gray-50"
          >
            ← Zurück
          </Link>
          <span className="font-medium min-w-[10rem] text-center">
            {label(ansicht, von, bis)}
          </span>
          <Link
            href={query2({ datum: verschieben(ansicht, bezugsdatum, 1) })}
            className="rounded border px-3 py-1.5 hover:bg-gray-50"
          >
            Weiter →
          </Link>
          <Link
            href={query2({ datum: heuteIso() })}
            className="rounded border px-3 py-1.5 hover:bg-gray-50"
          >
            Heute
          </Link>
        </div>
      </div>

      <form className="bg-white rounded-lg border p-4 mb-6 flex flex-wrap items-end gap-3 text-sm">
        <input type="hidden" name="ansicht" value={ansicht} />
        <input type="hidden" name="datum" value={bezugsdatum} />
        {gruppen && gruppen.length > 0 && (
          <div>
            <label className="block text-xs text-gray-500 mb-1">Gruppe</label>
            <select
              name="gruppe_id"
              defaultValue={params.gruppe_id ?? ""}
              className="rounded border border-gray-300 px-2 py-1.5 min-w-[10rem]"
            >
              <option value="">Alle</option>
              {gruppen.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.bezeichnung}
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="block text-xs text-gray-500 mb-1">Monteur</label>
          <select
            name="mitarbeiter_id"
            defaultValue={params.mitarbeiter_id ?? ""}
            className="rounded border border-gray-300 px-2 py-1.5 min-w-[12rem]"
          >
            <option value="">Alle</option>
            {mitarbeitende?.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="rounded border px-3 py-1.5 hover:bg-gray-50">
          Filtern
        </button>
        {(params.mitarbeiter_id || params.gruppe_id) && (
          <Link
            href={query2({ mitarbeiter_id: "", gruppe_id: "" })}
            className="text-gray-500 hover:underline"
          >
            Filter zurücksetzen
          </Link>
        )}
      </form>

      {/* Zeitraster für Tag und Woche, Liste für den Monat: Über 30 Tage
          hinweg wäre ein Raster unleserlich, dort will man ohnehin nur
          wissen, an welchen Tagen etwas liegt. */}
      {rasterMoeglich && (
        <div className="mb-6">
          <DispoRaster
            spalten={rasterSpalten}
            eintraege={rasterEintraege}
            vonMinuten={organisation?.arbeitstag_von_minuten ?? 420}
            bisMinuten={organisation?.arbeitstag_bis_minuten ?? 1080}
            spaltenBedeutung={ansicht === "woche" ? "tag" : "person"}
          />
          <p className="text-xs text-gray-400 mt-2">
            Der Ausschnitt ist der Arbeitstag aus den Einstellungen. Einsätze
            ausserhalb erscheinen am Rand geklemmt, Einsätze ohne Planzeit in
            der Zeile darüber. Rot heisst Terminkonflikt – doppelt belegt,
            abwesend oder betriebsfrei; der Grund steht auf dem Balken.
            Geplante
            Einsätze lassen sich mit der Maus verschieben – in Viertelstunden
            und, in der Wochenansicht, auf einen anderen Tag.
          </p>
        </div>
      )}

      {/* Liste nur im Monat: In Tag und Woche steht dasselbe im Raster,
          und zwar besser – dort sieht man zusätzlich die Lücken. */}
      {!rasterMoeglich && (
      <div className="space-y-3">
        {tage.map((tag) => {
          const eintraege = proTag.get(tag) ?? [];
          const istHeute = tag === heute;

          return (
            <div
              key={tag}
              className={`bg-white rounded-lg border ${istHeute ? "border-arcos-steel" : ""}`}
            >
              <div className="flex items-center justify-between px-4 py-2 border-b bg-gray-50">
                <span className={`text-sm ${istHeute ? "font-semibold text-arcos-navy" : ""}`}>
                  {new Date(`${tag}T12:00:00`).toLocaleDateString("de-CH", { weekday: "long" })},{" "}
                  {formatDatumCH(tag)}
                </span>
                {/* Freie Zeit anklicken: legt einen Rapport mit vorbelegtem
                    Datum und Monteur an – der Weg vom Plan zum Auftrag ohne
                    Umweg über die Rapportliste. */}
                <Link
                  href={`/rapporte/neu?datum=${tag}${
                    params.mitarbeiter_id ? `&mitarbeiter=${params.mitarbeiter_id}` : ""
                  }`}
                  className="text-xs text-arcos-steel hover:underline"
                >
                  + Einsatz planen
                </Link>
              </div>

              {eintraege.length === 0 ? (
                <p className="px-4 py-3 text-sm text-gray-400">Nichts eingeplant.</p>
              ) : (
                <ul className="divide-y">
                  {eintraege.map((r) => {
                    const zeit =
                      r.geplant_von || r.geplant_bis
                        ? `${uhrzeit(r.geplant_von) || "?"}–${uhrzeit(r.geplant_bis) || "?"}`
                        : "ganztags";
                    const beteiligte = beteiligteVon(r.id).map(nameVon).filter(Boolean);
                    const person =
                      beteiligte.length > 0 ? beteiligte.join(", ") : "nicht zugewiesen";

                    const gruende = konfliktGruende.get(r.id) ?? [];
                    const imKonflikt = gruende.length > 0;

                    return (
                      <li
                        key={r.id}
                        className={`px-4 py-2 text-sm flex flex-wrap items-center gap-x-4 gap-y-1 ${
                          imKonflikt ? "bg-red-50" : ""
                        }`}
                      >
                        <span className="font-mono text-gray-500 w-24 shrink-0">{zeit}</span>
                        <Link
                          href={`/rapporte/${r.id}?von=disposition&ansicht=${ansicht}&datum=${bezugsdatum}`}
                          className="text-arcos-steel hover:underline"
                        >
                          {rapportNummer(r)}
                        </Link>
                        <span className="flex-1 min-w-[10rem]">
                          {r.kunde?.vorname ? `${r.kunde.vorname} ` : ""}
                          {r.kunde?.name}
                          {r.projekte?.bezeichnung ? ` · ${r.projekte.bezeichnung}` : ""}
                        </span>
                        <span
                          className={
                            beteiligte.length > 0
                              ? "text-gray-600"
                              : "text-amber-700 font-medium"
                          }
                        >
                          {person}
                        </span>
                        {imKonflikt && (
                          <span
                            className="rounded bg-red-100 text-red-800 text-xs px-2 py-0.5"
                            title={gruende.join(" · ")}
                          >
                            Achtung Terminkonflikt: {gruende.join(" · ")}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}
