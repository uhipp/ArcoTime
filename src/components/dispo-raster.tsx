import Link from "next/link";

export type RasterSpalte = {
  key: string;
  titel: string;
  untertitel?: string | null;
  // Hebt die Spalte hervor, z.B. den heutigen Tag.
  betont?: boolean;
  // Führt zum Anlegen eines Einsatzes in dieser Spalte. Der Weg vom Plan
  // zum Auftrag gehört dorthin, wo die Lücke sichtbar ist.
  planenHref?: string;
};

export type RasterEintrag = {
  key: string;
  spalte: string;
  // Minuten seit Mitternacht. Fehlen sie, erscheint der Eintrag über dem
  // Raster statt darin – siehe unten.
  vonMinuten: number | null;
  bisMinuten: number | null;
  farbe: string;
  titelZeile: string;
  zweiteZeile?: string | null;
  href: string;
  konflikt?: boolean;
};

// Höhe einer Stunde in Pixeln. 56 ist der Kompromiss: hoch genug, dass in
// einen Einsatz von einer Stunde zwei Zeilen Text passen, niedrig genug,
// dass ein Arbeitstag von elf Stunden ohne Scrollen auf einen Bildschirm
// geht.
const STUNDE_PX = 56;

function alsUhrzeit(minuten: number): string {
  return `${String(Math.floor(minuten / 60)).padStart(2, "0")}:${String(
    minuten % 60
  ).padStart(2, "0")}`;
}

// Zeitraster für die Disposition: Stunden senkrecht, frei wählbare
// Spalten waagrecht.
//
// Der Sinn gegenüber einer Liste je Tag: Man sieht Lücken. Eine Liste
// beantwortet "was ist geplant", ein Raster beantwortet "wann ist noch
// Platz" – und das ist die Frage, die ein Disponent den ganzen Tag stellt.
//
// Bewusst ohne eigenes Scrollen in der Senkrechten: Der Ausschnitt ist der
// Arbeitstag der Organisation (Einstellungen), und was ausserhalb liegt,
// wird an den Rand geklemmt statt abgeschnitten. Ein Raster über volle
// 24 Stunden wäre zu drei Vierteln leer.
export function DispoRaster({
  spalten,
  eintraege,
  vonMinuten,
  bisMinuten,
}: {
  spalten: RasterSpalte[];
  eintraege: RasterEintrag[];
  vonMinuten: number;
  bisMinuten: number;
}) {
  // Auf volle Stunden erweitern, damit die Beschriftung aufgeht.
  const start = Math.floor(vonMinuten / 60) * 60;
  const ende = Math.ceil(bisMinuten / 60) * 60;
  const stunden: number[] = [];
  for (let m = start; m < ende; m += 60) stunden.push(m);
  const hoehe = ((ende - start) / 60) * STUNDE_PX;

  const ohneZeit = eintraege.filter((e) => e.vonMinuten == null);
  const imRaster = eintraege.filter((e) => e.vonMinuten != null);

  return (
    <div className="bg-white rounded-lg border overflow-x-auto">
      <div className="min-w-[48rem]">
        {/* Kopfzeile */}
        <div
          className="grid border-b"
          style={{ gridTemplateColumns: `4rem repeat(${spalten.length}, minmax(0, 1fr))` }}
        >
          <div />
          {spalten.map((s) => (
            <div
              key={s.key}
              className={`px-2 py-2 text-center border-l ${
                s.betont ? "bg-arcos-steel/10 font-semibold" : ""
              }`}
            >
              <div className="text-sm truncate">{s.titel}</div>
              {s.untertitel && (
                <div className="text-xs text-gray-400 truncate">{s.untertitel}</div>
              )}
              {s.planenHref && (
                <Link
                  href={s.planenHref}
                  className="text-xs text-arcos-steel hover:underline"
                >
                  + planen
                </Link>
              )}
            </div>
          ))}
        </div>

        {/* Einsätze ohne Planzeit: Sie haben im Raster keinen Ort, dürfen
            aber nicht verschwinden – sonst plant man an ihnen vorbei. */}
        {ohneZeit.length > 0 && (
          <div
            className="grid border-b bg-gray-50"
            style={{ gridTemplateColumns: `4rem repeat(${spalten.length}, minmax(0, 1fr))` }}
          >
            <div className="px-2 py-2 text-[11px] text-gray-400 text-right">ohne Zeit</div>
            {spalten.map((s) => (
              <div key={s.key} className="border-l px-1 py-1 space-y-1">
                {ohneZeit
                  .filter((e) => e.spalte === s.key)
                  .map((e) => (
                    <Link
                      key={e.key}
                      href={e.href}
                      className="block text-[11px] leading-4 text-white rounded px-1 truncate hover:opacity-80"
                      style={{ backgroundColor: e.farbe }}
                      title={`${e.titelZeile}${e.zweiteZeile ? ` · ${e.zweiteZeile}` : ""}`}
                    >
                      {e.titelZeile}
                    </Link>
                  ))}
              </div>
            ))}
          </div>
        )}

        {/* Raster */}
        <div
          className="grid"
          style={{ gridTemplateColumns: `4rem repeat(${spalten.length}, minmax(0, 1fr))` }}
        >
          {/* Stundenachse */}
          <div className="relative" style={{ height: hoehe }}>
            {stunden.map((m, i) => (
              <div
                key={m}
                className="absolute right-2 text-[11px] text-gray-400 -translate-y-1/2"
                style={{ top: i * STUNDE_PX }}
              >
                {alsUhrzeit(m)}
              </div>
            ))}
          </div>

          {spalten.map((s) => (
            <div
              key={s.key}
              className={`relative border-l ${s.betont ? "bg-arcos-steel/5" : ""}`}
              style={{ height: hoehe }}
            >
              {/* Stundenlinien */}
              {stunden.map((m, i) => (
                <div
                  key={m}
                  className="absolute left-0 right-0 border-t border-gray-100"
                  style={{ top: i * STUNDE_PX }}
                />
              ))}

              {imRaster
                .filter((e) => e.spalte === s.key)
                .map((e) => {
                  // An den Rand klemmen statt abschneiden: Ein Einsatz, der
                  // vor dem Arbeitstag beginnt, soll sichtbar bleiben.
                  const von = Math.max(e.vonMinuten as number, start);
                  const bis = Math.min(e.bisMinuten ?? (e.vonMinuten as number) + 60, ende);
                  const top = ((von - start) / 60) * STUNDE_PX;
                  // Mindesthöhe, damit ein Kurzeinsatz anklickbar bleibt.
                  const hoeheBalken = Math.max(((bis - von) / 60) * STUNDE_PX, 22);

                  return (
                    <Link
                      key={e.key}
                      href={e.href}
                      title={`${e.titelZeile}${e.zweiteZeile ? ` · ${e.zweiteZeile}` : ""}`}
                      className={`absolute left-0.5 right-0.5 rounded px-1.5 py-0.5 text-[11px] leading-4 text-white overflow-hidden hover:opacity-90 ${
                        e.konflikt ? "ring-2 ring-red-500" : ""
                      }`}
                      style={{ top, height: hoeheBalken, backgroundColor: e.farbe }}
                    >
                      <div className="font-medium truncate">{e.titelZeile}</div>
                      {e.zweiteZeile && (
                        <div className="truncate opacity-90">{e.zweiteZeile}</div>
                      )}
                    </Link>
                  );
                })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
