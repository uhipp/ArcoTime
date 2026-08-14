"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { verschiebeEinsatz } from "@/app/actions/disposition";

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
  // Warum der Einsatz im Konflikt steht – "doppelt belegt",
  // "Peter Muster: Ferien". Steht auf dem Balken, nicht nur im Tooltip:
  // Eine Warnung, die man suchen muss, ist keine.
  konfliktGrund?: string;
  // Nur geplante Einsätze offener Rapporte lassen sich ziehen. Erfasste
  // Zeit ist eine Tatsache über die Vergangenheit – die per Maus zu
  // versetzen wäre Fälschung.
  ziehbar?: boolean;
  // Tag, auf dem der Eintrag liegt. In der Tagesansicht wechselt beim
  // Ziehen die Person, nicht der Tag; dann bleibt dieser Wert.
  datum: string;
};

// Höhe einer Stunde in Pixeln. 56 ist der Kompromiss: hoch genug, dass in
// einen Einsatz von einer Stunde zwei Zeilen Text passen, niedrig genug,
// dass ein Arbeitstag von elf Stunden ohne Scrollen auf einen Bildschirm
// geht.
const STUNDE_PX = 56;

// Mindestbreite einer Spalte. Darunter passt kein Kundenname mehr hinein,
// und ein Raster, in dem man nichts lesen kann, ist keine Übersicht. Bei
// vielen Personen wächst das Raster deshalb über die Fensterbreite hinaus
// und wird seitlich gescrollt, statt die Spalten zusammenzuquetschen.
const SPALTE_MIN = "9rem";

// Überlappende Einsätze nebeneinander legen, wie man es aus Outlook kennt.
//
// Ohne das liegen zwei gleichzeitige Termine übereinander und der hintere
// ist unsichtbar – man plant an ihm vorbei. Gesucht sind zusammenhängende
// Gruppen: Termine, die sich direkt oder über einen dritten überschneiden,
// teilen sich die Breite. Sobald eine Lücke kommt, beginnt eine neue
// Gruppe und der nächste Balken ist wieder voll breit.
//
// Innerhalb einer Gruppe bekommt jeder Termin die erste Spur, die zu
// seiner Startzeit frei ist – dieselbe Greedy-Zuteilung wie in gängigen
// Kalendern. Sie ist nicht immer die schmalste Lösung, aber sie ist
// stabil: Ein Termin wandert nicht in eine andere Spur, nur weil weiter
// unten etwas dazukommt.
function spurenVerteilen(
  eintraege: RasterEintrag[]
): Map<string, { spur: number; spuren: number }> {
  const ergebnis = new Map<string, { spur: number; spuren: number }>();

  const sortiert = [...eintraege].sort(
    (a, b) => (a.vonMinuten ?? 0) - (b.vonMinuten ?? 0)
  );

  let gruppe: RasterEintrag[] = [];
  let gruppenEnde = -1;

  const gruppeAbschliessen = () => {
    if (gruppe.length === 0) return;
    // Endzeit je Spur, um die erste freie zu finden.
    const spurEnde: number[] = [];
    const zuteilung = new Map<string, number>();

    for (const e of gruppe) {
      const von = e.vonMinuten ?? 0;
      const bis = e.bisMinuten ?? von + 60;
      let spur = spurEnde.findIndex((ende) => ende <= von);
      if (spur === -1) {
        spur = spurEnde.length;
        spurEnde.push(bis);
      } else {
        spurEnde[spur] = bis;
      }
      zuteilung.set(e.key, spur);
    }

    for (const e of gruppe) {
      ergebnis.set(e.key, { spur: zuteilung.get(e.key) ?? 0, spuren: spurEnde.length });
    }
    gruppe = [];
    gruppenEnde = -1;
  };

  for (const e of sortiert) {
    const von = e.vonMinuten ?? 0;
    const bis = e.bisMinuten ?? von + 60;
    if (gruppe.length > 0 && von >= gruppenEnde) gruppeAbschliessen();
    gruppe.push(e);
    gruppenEnde = Math.max(gruppenEnde, bis);
  }
  gruppeAbschliessen();

  return ergebnis;
}

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
// Auf diese Schrittweite rastet ein gezogener Einsatz ein. Minutengenau
// zu ziehen ist mit der Maus nicht zu treffen und in der Planung auch
// nicht gemeint.
const RASTUNG_MINUTEN = 15;

export function DispoRaster({
  spalten,
  eintraege,
  vonMinuten,
  bisMinuten,
  spaltenBedeutung,
}: {
  spalten: RasterSpalte[];
  eintraege: RasterEintrag[];
  vonMinuten: number;
  bisMinuten: number;
  // Was eine Spalte darstellt – davon hängt ab, was sich beim Ablegen
  // ändert: der Tag oder die zuständige Person.
  spaltenBedeutung: "tag" | "person";
}) {
  const router = useRouter();
  const [fehler, setFehler] = useState<string | null>(null);
  const [laeuft, setLaeuft] = useState(false);
  // Ein Verschieben, das an einer Abwesenheit hängt: Der Vorgang wird
  // gemeldet, nicht verworfen – bestätigt man ihn, läuft er unverändert
  // durch. Bei einem Team wäre Blockieren falsch, weil eine einzige
  // abwesende Person sonst den ganzen Einsatz festsetzt.
  const [nachfrage, setNachfrage] = useState<
    { text: string; ausfuehren: () => Promise<void> } | null
  >(null);

  // Touch mit Verzögerung: Ohne das liesse sich im Raster nicht mehr
  // scrollen, weil jede Berührung sofort als Ziehen gälte.
  const sensoren = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
  );

  async function beimAblegen(ereignis: DragEndEvent) {
    const eintrag = eintraege.find((e) => e.key === ereignis.active.id);
    if (!eintrag || eintrag.vonMinuten == null) return;

    const zielSpalte = ereignis.over ? String(ereignis.over.id) : eintrag.spalte;
    const verschobeneMinuten =
      Math.round(((ereignis.delta.y / STUNDE_PX) * 60) / RASTUNG_MINUTEN) * RASTUNG_MINUTEN;

    const dauer = (eintrag.bisMinuten ?? eintrag.vonMinuten + 60) - eintrag.vonMinuten;
    // Innerhalb des sichtbaren Ausschnitts halten, sonst landet ein Einsatz
    // ausserhalb des Rasters und ist nur noch am Rand geklemmt zu sehen.
    const neuVon = Math.min(Math.max(eintrag.vonMinuten + verschobeneMinuten, start), ende - dauer);

    if (zielSpalte === eintrag.spalte && neuVon === eintrag.vonMinuten) return;

    // Der Schlüssel trägt in der Tagesansicht die Spalte mit, damit React
    // mehrere Balken desselben Einsatzes auseinanderhält – für den Server
    // zählt nur die Kennung davor.
    const rapportId = eintrag.key.split("::")[0];

    const senden = async (trotzdem: boolean) => {
      setFehler(null);
      setNachfrage(null);
      setLaeuft(true);
      const ergebnis = await verschiebeEinsatz(rapportId, {
        datum: spaltenBedeutung === "tag" ? zielSpalte : eintrag.datum,
        vonMinuten: neuVon,
        bisMinuten: neuVon + dauer,
        mitarbeiterId:
          spaltenBedeutung === "person"
            ? zielSpalte === "ohne"
              ? null
              : zielSpalte
            : undefined,
        trotzdem,
      });
      setLaeuft(false);

      if (ergebnis && "fehler" in ergebnis) {
        setFehler(ergebnis.fehler);
        return;
      }
      if (ergebnis && "warnung" in ergebnis) {
        setNachfrage({ text: ergebnis.warnung, ausfuehren: () => senden(true) });
        return;
      }
      router.refresh();
    };

    await senden(false);
  }

  // Auf volle Stunden erweitern, damit die Beschriftung aufgeht.
  const start = Math.floor(vonMinuten / 60) * 60;
  const ende = Math.ceil(bisMinuten / 60) * 60;
  const stunden: number[] = [];
  for (let m = start; m < ende; m += 60) stunden.push(m);
  const hoehe = ((ende - start) / 60) * STUNDE_PX;

  const ohneZeit = eintraege.filter((e) => e.vonMinuten == null);
  const imRaster = eintraege.filter((e) => e.vonMinuten != null);

  return (
    <DndContext sensors={sensoren} onDragEnd={beimAblegen}>
      {/* Meldungen liegen fest am unteren Rand und nicht über dem Raster.
          Das Raster ist einen ganzen Arbeitstag hoch; wer einen Balken am
          Nachmittag zieht, hat den Anfang der Seite längst nicht mehr im
          Bild. Eine Meldung dort oben ist so gut wie keine – der Balken
          sprang zurück, und es sah aus, als wäre nichts passiert. */}
      {(fehler || nachfrage) && (
        <div className="fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
          {fehler && (
            <div className="w-full max-w-xl rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-lg flex flex-wrap items-center gap-3">
              <span className="flex-1 min-w-[14rem]">{fehler}</span>
              <button
                type="button"
                onClick={() => setFehler(null)}
                className="text-sm text-gray-600 hover:underline"
              >
                Schliessen
              </button>
            </div>
          )}
          {nachfrage && (
            <div className="w-full max-w-xl rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-lg flex flex-wrap items-center gap-3">
              <span className="flex-1 min-w-[14rem]">{nachfrage.text}</span>
              <button
                type="button"
                onClick={() => void nachfrage.ausfuehren()}
                className="rounded bg-amber-600 text-white text-sm px-3 py-1 hover:bg-amber-700"
              >
                Trotzdem verschieben
              </button>
              <button
                type="button"
                onClick={() => setNachfrage(null)}
                className="text-sm text-gray-600 hover:underline"
              >
                Abbrechen
              </button>
            </div>
          )}
        </div>
      )}
      <div
        className={`bg-white rounded-lg border overflow-x-auto ${
          laeuft ? "opacity-60 pointer-events-none" : ""
        }`}
      >
      <div className="min-w-max">
        {/* Kopfzeile */}
        <div
          className="grid border-b"
          style={{ gridTemplateColumns: `4rem repeat(${spalten.length}, minmax(${SPALTE_MIN}, 1fr))` }}
        >
          {/* Bleibt beim seitlichen Scrollen stehen – ohne die Uhrzeiten
              daneben ist ein Balken weit rechts nicht mehr einzuordnen. */}
          <div className="sticky left-0 z-20 bg-white" />
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
            style={{ gridTemplateColumns: `4rem repeat(${spalten.length}, minmax(${SPALTE_MIN}, 1fr))` }}
          >
            <div className="sticky left-0 z-20 bg-gray-50 px-2 py-2 text-[11px] text-gray-400 text-right">
              ohne Zeit
            </div>
            {spalten.map((s) => (
              <div key={s.key} className="border-l px-1 py-1 space-y-1">
                {ohneZeit
                  .filter((e) => e.spalte === s.key)
                  .map((e) => (
                    <Link
                      key={e.key}
                      href={e.href}
                      className={`block text-[11px] leading-4 text-white rounded px-1 truncate hover:opacity-80 ${
                        e.konflikt ? "ring-2 ring-red-500" : ""
                      }`}
                      style={{ backgroundColor: e.farbe }}
                      title={[
                        `${e.titelZeile}${e.zweiteZeile ? ` · ${e.zweiteZeile}` : ""}`,
                        e.konflikt
                          ? `Achtung Terminkonflikt: ${e.konfliktGrund ?? "Planung prüfen"}`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" — ")}
                    >
                      {e.konflikt && <span className="font-semibold">⚠ </span>}
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
          style={{ gridTemplateColumns: `4rem repeat(${spalten.length}, minmax(${SPALTE_MIN}, 1fr))` }}
        >
          {/* Stundenachse */}
          <div className="relative sticky left-0 z-20 bg-white" style={{ height: hoehe }}>
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
            <Spalte key={s.key} spalte={s} hoehe={hoehe}>
              {/* Stundenlinien */}
              {stunden.map((m, i) => (
                <div
                  key={m}
                  className="absolute left-0 right-0 border-t border-gray-100"
                  style={{ top: i * STUNDE_PX }}
                />
              ))}

              {(() => {
                const eigene = imRaster.filter((e) => e.spalte === s.key);
                const spuren = spurenVerteilen(eigene);
                return eigene.map((e) => (
                  <Balken
                    key={e.key}
                    eintrag={e}
                    start={start}
                    ende={ende}
                    lage={spuren.get(e.key) ?? { spur: 0, spuren: 1 }}
                  />
                ));
              })()}
            </Spalte>
          ))}
        </div>
      </div>
      </div>
    </DndContext>
  );
}

// Eine Spalte ist die Ablegefläche. Getroffen wird sie über die ganze
// Höhe – wohin genau innerhalb der Spalte, ergibt sich aus der
// verschobenen Strecke, nicht aus dem Ablegepunkt.
function Spalte({
  spalte,
  hoehe,
  children,
}: {
  spalte: RasterSpalte;
  hoehe: number;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: spalte.key });
  return (
    <div
      ref={setNodeRef}
      className={`relative border-l ${spalte.betont ? "bg-arcos-steel/5" : ""} ${
        isOver ? "bg-arcos-steel/10" : ""
      }`}
      style={{ height: hoehe }}
    >
      {children}
    </div>
  );
}

function Balken({
  eintrag,
  start,
  ende,
  lage,
}: {
  eintrag: RasterEintrag;
  start: number;
  ende: number;
  // Spur und Anzahl Spuren der Überlappungsgruppe – bestimmt Breite und
  // waagrechte Lage des Balkens.
  lage: { spur: number; spuren: number };
}) {
  // Bewusst auch abgeschlossene Rapporte ziehbar: Ein gesperrter
  // Draggable liefert überhaupt kein Ereignis, der Balken bewegte sich
  // nicht, und beim Loslassen öffnete sich der Rapport – ohne einen
  // Hinweis, warum. Jetzt lehnt die Aktion mit Begründung ab (sie prüft
  // den Status ohnehin selbst, siehe verschiebeEinsatz).
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: eintrag.key,
  });

  // Merken, ob dieser Balken gerade gezogen wurde.
  //
  // Der Balken folgt dem Zeiger, also liegt beim Loslassen der Link unter
  // ihm – der Browser feuert ein click, und die Seite sprang zum Rapport.
  // Damit war jedes Verschieben unsichtbar: Die Rückfrage wegen einer
  // Abwesenheit erschien zwar, aber auf einer Seite, die es nicht mehr
  // gab. Ein <a> navigiert von sich aus; dnd-kit unterdrückt das nicht.
  const gezogen = useRef(false);
  useEffect(() => {
    if (isDragging) gezogen.current = true;
  }, [isDragging]);

  // An den Rand klemmen statt abschneiden: Ein Einsatz, der vor dem
  // Arbeitstag beginnt, soll sichtbar bleiben.
  const von = Math.max(eintrag.vonMinuten as number, start);
  const bis = Math.min(eintrag.bisMinuten ?? (eintrag.vonMinuten as number) + 60, ende);
  const top = ((von - start) / 60) * STUNDE_PX;
  // Mindesthöhe, damit ein Kurzeinsatz anklickbar bleibt – mit
  // Konflikthinweis etwas mehr, sonst verdeckt die Warnung den
  // Kundennamen, den sie erklären soll.
  const hoehe = Math.max(((bis - von) / 60) * STUNDE_PX, eintrag.konflikt ? 40 : 22);

  const beschriftung = `${eintrag.titelZeile}${
    eintrag.zweiteZeile ? ` · ${eintrag.zweiteZeile}` : ""
  }`;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      // Eigene Handler in der Capture-Phase, damit sie die
      // pointerdown-Behandlung von dnd-kit nicht ersetzen.
      onPointerDownCapture={() => {
        gezogen.current = false;
      }}
      // Hier und nicht am Link: In der Capture-Phase läuft dieser Handler
      // VOR dem des Links, und stopPropagation lässt ihn gar nicht erst
      // ans Navigieren kommen. Auf preventDefault allein zu bauen hiesse
      // sich darauf zu verlassen, dass next/link es beachtet.
      onClickCapture={(e) => {
        if (gezogen.current) {
          e.preventDefault();
          e.stopPropagation();
          gezogen.current = false;
        }
      }}
      title={[
        beschriftung,
        eintrag.konflikt
          ? `Achtung Terminkonflikt: ${eintrag.konfliktGrund ?? "Planung prüfen"}`
          : null,
        eintrag.ziehbar ? "zum Verschieben ziehen" : "abgeschlossen, nicht verschiebbar",
      ]
        .filter(Boolean)
        .join(" — ")}
      className={`absolute rounded overflow-hidden ${
        eintrag.konflikt ? "ring-2 ring-red-500" : ""
      } cursor-grab active:cursor-grabbing ${
        isDragging ? "opacity-70 z-10 shadow-lg" : ""
      }`}
      style={{
        top,
        height: hoehe,
        // Bei Überlappung teilen sich die Balken die Breite; allein
        // stehend nimmt einer die ganze Spalte ein.
        left: `calc(${(lage.spur / lage.spuren) * 100}% + 2px)`,
        width: `calc(${100 / lage.spuren}% - 4px)`,
        backgroundColor: eintrag.farbe,
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
      }}
    >
      {/* Ein Klick öffnet den Rapport – ausser der Balken wurde eben
          gezogen. Unter der Aktivierungsschwelle von 6 Pixeln beginnt
          gar kein Ziehen, ein gewöhnlicher Klick kommt also weiterhin
          durch. */}
      <Link
        href={eintrag.href}
        draggable={false}
        className="block px-1.5 py-0.5 text-[11px] leading-4 text-white h-full hover:opacity-90"
      >
        {/* Der Hinweis steht zuoberst und in eigener Farbe: Auf dem
            farbigen Balken der Person geht roter Text unter, und bei
            einem kurzen Einsatz ist die erste Zeile die einzige, die
            sicher zu sehen ist. */}
        {eintrag.konflikt && (
          <div className="-mx-1.5 -mt-0.5 mb-0.5 truncate bg-red-600 px-1.5 font-semibold text-white">
            ⚠ Achtung Terminkonflikt
            {eintrag.konfliktGrund ? `: ${eintrag.konfliktGrund}` : ""}
          </div>
        )}
        <div className="font-medium truncate">{eintrag.titelZeile}</div>
        {eintrag.zweiteZeile && (
          <div className="truncate opacity-90">{eintrag.zweiteZeile}</div>
        )}
      </Link>
    </div>
  );
}
