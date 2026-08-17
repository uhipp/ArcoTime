import { NextRequest, NextResponse } from "next/server";
import { pruefeNachfristen } from "@/lib/cron/nachfristen";

// Tägliche Prüfung der Nachfristen nach Vertragsende.
//
// Eigener Eintrag und nicht im Lauf der Wiedervorlagen mit drin: Das dort
// sind Erinnerungen an die Kundinnen, das hier ist die Aufsicht über
// unsere eigenen Löschpflichten. Zwei Dinge, die aus verschiedenen Gründen
// laufen und deren Fehlschlag verschiedene Folgen hat.
//
// Auf die Stundenprüfung wie bei den Wiedervorlagen wird bewusst
// verzichtet: Ob diese Meldung im Sommer eine Stunde später kommt, spielt
// keine Rolle. Bei einer Erinnerung an den Arbeitsbeginn schon.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const header = request.headers.get("authorization");
    if (header !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
    }
  }

  try {
    const ergebnis = await pruefeNachfristen();
    console.log("Nachfristen geprüft", ergebnis);
    return NextResponse.json({ ok: true, ...ergebnis });
  } catch (fehler) {
    console.error("Nachfristprüfung fehlgeschlagen:", fehler);
    return NextResponse.json({ error: (fehler as Error).message }, { status: 500 });
  }
}
