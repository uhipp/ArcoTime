import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

export type Monatszeile = {
  monat: number;
  /** Sollstunden dieser Person in diesem Monat, nach Abzug der Absenzen. */
  soll: number;
  /** Erfasste Arbeitszeit. */
  ist: number;
  /** Stunden aus Abwesenheiten, die den Saldo belasten (Überstundenabbau). */
  kompensation: number;
  /** Summe der manuellen Buchungen. */
  buchungen: number;
  /** ist − soll − kompensation + buchungen */
  bewegung: number;
  /** Saldo am Monatsende, fortlaufend gerechnet. */
  saldo: number;
  /** Bezogene Ferientage (Abwesenheiten und Betriebsferien). */
  ferienTage: number;
  /** Arbeitstage des Monats (Mo–Fr ohne Schliesstage) – zur Kontrolle. */
  arbeitstage: number;
  /** Sollstunden laut Tabelle, bevor Pensum und Absenzen wirken. */
  sollTabelle: number | null;
};

export type Jahresauswertung = {
  zeilen: Monatszeile[];
  startsaldo: number;
  endsaldo: number;
  ferienAnspruch: number;
  ferienUebertrag: number;
  ferienBezogen: number;
  ferienRest: number;
  hinweise: string[];
};

type Abwesenheit = {
  von: string;
  bis: string;
  von_zeit: string | null;
  art: string;
};

type Art = {
  wert: string;
  bezeichnung: string;
  reduziert_soll: boolean;
  belastet_ferien: boolean;
  belastet_zeitsaldo: boolean;
};

type Schliesstag = { von: string; bis: string; belastet_ferien: boolean };

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function tageDesMonats(jahr: number, monat: number): string[] {
  const tage: string[] = [];
  const anzahl = new Date(jahr, monat, 0).getDate();
  for (let t = 1; t <= anzahl; t++) {
    tage.push(`${jahr}-${String(monat).padStart(2, "0")}-${String(t).padStart(2, "0")}`);
  }
  return tage;
}

function istWerktag(datum: string): boolean {
  const tag = new Date(`${datum}T12:00:00`).getDay();
  return tag !== 0 && tag !== 6;
}

// Das Zeitkonto einer Person für ein Jahr.
//
// Gerechnet wird tageweise und nicht mit Monatsformeln. Das klingt
// aufwendiger, macht aber die Fälle einfach, an denen Monatsformeln
// scheitern: Pensumswechsel mitten im Monat, Eintritt am 15., halbe
// Ferientage.
//
// Der Wert eines einzelnen Tages kommt aus der MONATSTABELLE und nicht
// aus den Wochenstunden: Tageswert = Sollstunden des Monats geteilt durch
// die Arbeitstage des Monats. Damit kann die Summe der Tage nie von der
// verbindlichen Monatssumme abweichen – und die Feiertage sind genau
// einmal berücksichtigt, nämlich dort, wo die Tabelle sie schon abzieht.
export async function ladeZeitkonto(
  supabase: Client,
  mitarbeiterId: string,
  jahr: number
): Promise<Jahresauswertung> {
  const von = `${jahr}-01-01`;
  const bis = `${jahr}-12-31`;

  const [
    { data: person },
    { data: sollMonate },
    { data: pensen },
    { data: anspruch },
    { data: abwesenheiten },
    { data: arten },
    { data: schliesstage },
    { data: eintraege },
    { data: buchungen },
    { data: organisation },
  ] = await Promise.all([
    supabase.from("profiles").select("eintritt, austritt").eq("id", mitarbeiterId).single(),
    supabase.from("soll_monate").select("monat, sollstunden").eq("jahr", jahr),
    supabase
      .from("pensen")
      .select("ab_datum, pensum_prozent")
      .eq("mitarbeiter_id", mitarbeiterId)
      .order("ab_datum"),
    supabase
      .from("ferienanspruch")
      .select("tage, uebertrag_tage")
      .eq("mitarbeiter_id", mitarbeiterId)
      .eq("jahr", jahr)
      .maybeSingle(),
    supabase
      .from("abwesenheiten")
      .select("von, bis, von_zeit, art")
      .eq("mitarbeiter_id", mitarbeiterId)
      .lte("von", bis)
      .gte("bis", von),
    supabase
      .from("abwesenheitsarten")
      .select("wert, bezeichnung, reduziert_soll, belastet_ferien, belastet_zeitsaldo"),
    supabase
      .from("schliesstage")
      .select("von, bis, belastet_ferien")
      .lte("von", bis)
      .gte("bis", von),
    supabase
      .from("v_zeiteintraege")
      .select("datum, menge_stunden")
      .eq("mitarbeiter_id", mitarbeiterId)
      .eq("vorlaeufig", false)
      .gte("datum", von)
      .lte("datum", bis),
    supabase
      .from("zeitkonto_buchungen")
      .select("datum, stunden")
      .eq("mitarbeiter_id", mitarbeiterId)
      .lte("datum", bis),
    supabase
      .from("organisationen")
      .select("feiertage_im_sollstunden_enthalten")
      .limit(1)
      .maybeSingle(),
  ]);

  const artVon = new Map((arten ?? []).map((a) => [a.wert, a as Art]));
  const sollTabelle = new Map(
    (sollMonate ?? []).map((s) => [s.monat, Number(s.sollstunden)])
  );

  const frei = (schliesstage ?? []) as Schliesstag[];
  const istSchliesstag = (datum: string) => frei.some((t) => t.von <= datum && t.bis >= datum);
  const istBetriebsferien = (datum: string) =>
    frei.some((t) => t.von <= datum && t.bis >= datum && t.belastet_ferien);

  // Pensum an einem Tag: der jüngste Eintrag, dessen Datum nicht in der
  // Zukunft liegt. Ohne jeden Eintrag gilt 100 Prozent.
  const pensumAm = (datum: string): number => {
    let wert = 100;
    for (const p of pensen ?? []) {
      if (p.ab_datum <= datum) wert = Number(p.pensum_prozent);
    }
    return wert / 100;
  };

  const angestelltAm = (datum: string): boolean => {
    if (person?.eintritt && datum < person.eintritt) return false;
    if (person?.austritt && datum > person.austritt) return false;
    return true;
  };

  // Abwesenheiten je Tag. Halbtags (mit Uhrzeit) zählt halb – die
  // Abwesenheit kennt bereits Zeiten, und ein halber Ferientag ist der
  // Normalfall und keine Ausnahme.
  const abwesenheitAm = (datum: string): { art: Art; anteil: number } | null => {
    for (const a of (abwesenheiten ?? []) as Abwesenheit[]) {
      if (a.von <= datum && a.bis >= datum) {
        const art = artVon.get(a.art);
        if (art) return { art, anteil: a.von_zeit ? 0.5 : 1 };
      }
    }
    return null;
  };

  const istProTag = new Map<string, number>();
  for (const z of eintraege ?? []) {
    const stunden = Number(z.menge_stunden ?? 0);
    if (stunden > 0) istProTag.set(z.datum, (istProTag.get(z.datum) ?? 0) + stunden);
  }

  // Buchungen vor diesem Jahr bilden den Startsaldo – so lässt sich ein
  // bestehender Saldo bei der Einführung einmal einbuchen und wandert
  // danach von Jahr zu Jahr mit.
  let startsaldo = 0;
  const buchungProMonat = new Map<number, number>();
  for (const b of buchungen ?? []) {
    const stunden = Number(b.stunden);
    if (b.datum < von) startsaldo += stunden;
    else {
      const monat = Number(b.datum.slice(5, 7));
      buchungProMonat.set(monat, (buchungProMonat.get(monat) ?? 0) + stunden);
    }
  }

  const hinweise: string[] = [];
  const zeilen: Monatszeile[] = [];
  let laufenderSaldo = startsaldo;
  let ferienBezogen = 0;

  for (let monat = 1; monat <= 12; monat++) {
    const tage = tageDesMonats(jahr, monat);

    // Arbeitstage des Monats: Werktage ohne FEIERTAGE. Betriebsferien
    // gehören ausdrücklich dazu.
    //
    // Der Unterschied ist wesentlich. Der Tageswert entsteht als
    // Monatssoll geteilt durch Arbeitstage; fielen die Betriebsferien
    // hier heraus, verteilte sich ihre Zeit auf die übrigen Tage und die
    // Person schuldete den vollen Monat – obwohl sie eine Woche zu hat
    // UND dafür Ferientage abgibt. Doppelt bestraft.
    //
    // Richtig ist: Betriebsferien zählen als Arbeitstage, reduzieren
    // dann aber wie jede bezahlte Absenz das Soll und belasten
    // zusätzlich das Ferienkonto.
    const arbeitstage = tage.filter(
      (t) => istWerktag(t) && !(istSchliesstag(t) && !istBetriebsferien(t))
    );

    const monatsSoll = sollTabelle.get(monat) ?? null;
    const tageswert100 =
      monatsSoll != null && arbeitstage.length > 0 ? monatsSoll / arbeitstage.length : 0;

    let soll = 0;
    let kompensation = 0;
    let ferienTage = 0;

    for (const tag of arbeitstage) {
      if (!angestelltAm(tag)) continue;

      const wert = tageswert100 * pensumAm(tag);
      const abwesend = abwesenheitAm(tag);
      soll += wert;

      if (abwesend) {
        if (abwesend.art.reduziert_soll) soll -= wert * abwesend.anteil;
        if (abwesend.art.belastet_zeitsaldo) kompensation += wert * abwesend.anteil;
        if (abwesend.art.belastet_ferien) ferienTage += abwesend.anteil;
        // Eine erfasste Abwesenheit schlägt die Betriebsferien: Wer
        // während der Betriebsferien krank ist, verbraucht keine
        // Ferientage. Das Soll ist oben bereits abgezogen.
        continue;
      }

      if (istBetriebsferien(tag)) {
        // Der Betrieb ist zu: Die Zeit ist nicht geschuldet, kostet aber
        // Ferientage (Art. 329c Abs. 2 OR).
        soll -= wert;
        ferienTage += 1;
      }
    }

    const ist = tage.reduce((s, t) => s + (istProTag.get(t) ?? 0), 0);
    const buchung = buchungProMonat.get(monat) ?? 0;
    const bewegung = ist - soll - kompensation + buchung;
    laufenderSaldo += bewegung;
    ferienBezogen += ferienTage;

    if (monatsSoll == null && arbeitstage.some((t) => angestelltAm(t))) {
      hinweise.push(
        `Für ${String(monat).padStart(2, "0")}/${jahr} sind keine Sollstunden erfasst – der Monat zählt mit 0 Sollstunden.`
      );
    }

    zeilen.push({
      monat,
      soll,
      ist,
      kompensation,
      buchungen: buchung,
      bewegung,
      saldo: laufenderSaldo,
      ferienTage,
      arbeitstage: arbeitstage.length,
      sollTabelle: monatsSoll,
    });
  }

  if (!organisation?.feiertage_im_sollstunden_enthalten) {
    hinweise.push(
      "In den Einstellungen ist vermerkt, dass die Feiertage NICHT in den Sollstunden enthalten sind. Diese Auswertung rechnet den Tageswert aus der Monatstabelle geteilt durch die Arbeitstage – die Feiertage sind damit bereits draussen. Bitte den Schalter prüfen."
    );
  }

  const ferienAnspruch = Number(anspruch?.tage ?? 0);
  const ferienUebertrag = Number(anspruch?.uebertrag_tage ?? 0);

  return {
    zeilen,
    startsaldo,
    endsaldo: laufenderSaldo,
    ferienAnspruch,
    ferienUebertrag,
    ferienBezogen,
    ferienRest: ferienAnspruch + ferienUebertrag - ferienBezogen,
    hinweise,
  };
}

export function stundenText(wert: number): string {
  const gerundet = Math.round(wert * 100) / 100;
  return `${gerundet > 0 ? "+" : ""}${gerundet.toFixed(2)}`;
}

export { iso };
