import type { HilfeArtikel } from "./typen";

export const benachrichtigungen: HilfeArtikel[] = [
  {
    slug: "benachrichtigungen",
    titel: "Benachrichtigungen",
    kategorie: "Arbeiten mit ArcoTime",
    stichworte: ["e-mail", "badge", "erinnerung", "zuweisung", "reminder"],
    routen: [],
    inhalt: `
ArcoTime meldet sich in drei Situationen aktiv per E-Mail, statt nur passiv etwas anzuzeigen, das man ohnehin aufrufen müsste.

## Fällige Wiedervorlage

Sobald das Wiedervorlage-Datum einer Anfrage erreicht ist (siehe [Anfragen](/hilfe/anfragen)), passiert täglich um **07:30 Uhr** automatisch Folgendes:

- Die Karte wandert im Kanban-Board in die Spalte "Wiedervorlage".
- Die zuständige Person bekommt eine **E-Mail** mit allen ihren fälligen Wiedervorlagen und Direktlinks.
- Ein **roter Zähler** neben "Anfragen" in der Navigation zeigt jederzeit die Anzahl.

## Offene Rapporte vom Vortag

Ein [Arbeitsrapport](/hilfe/rapporte), der offen bleibt, zählt nirgends: weder in den Auswertungen noch im Export noch in der Zeiterfassung. Er ist also nicht bloss unordentlich, sondern **unverrechnete Arbeit** – und das fällt niemandem auf, weil an der Stelle schlicht nichts steht.

Deshalb geht im selben Lauf um **07:30 Uhr** eine Erinnerung an die Person, die unter **„Ausgeführt von"** eingetragen ist. Sie darf den Rapport abschliessen und weiss als Einzige, ob noch etwas fehlt. Die Mail listet alle betroffenen Rapporte mit Kunde, Projekt und Datum; was länger als einen Tag liegt, ist rot hervorgehoben und nennt die Zahl der Tage.

Erinnert wird nur an Rapporte mit einem Datum **vor heute**. Ein Einsatz von heute läuft möglicherweise noch. Die Erinnerung wiederholt sich täglich, bis der Rapport abgeschlossen oder storniert ist.

Ein **roter Zähler** neben „Rapporte" in der Navigation zeigt dieselbe Zahl jederzeit an.

## Zuweisung einer Anfrage

Wird dir eine Anfrage neu zugewiesen (bei der Erfassung oder nachträglich im Bearbeiten-Formular), bekommst du eine **E-Mail** mit dem Titel der Anfrage, einem direkten Link und dem Namen der Person, die dir die Anfrage zugewiesen hat.

Übernimmst du dir selbst eine noch nicht zugewiesene Anfrage (Button "Übernehmen"), gibt es bewusst **keine** Mail – eine Benachrichtigung über die eigene, gerade ausgeführte Aktion wäre nutzlos.

## Ich habe keine E-Mail bekommen – was tun?

Prüfe zuerst, ob unter [Mitarbeitende](/hilfe/mitarbeitende) eine E-Mail-Adresse hinterlegt ist – ohne diese kann keine Benachrichtigung verschickt werden. Bleibt das Problem bestehen, an einen Admin wenden.
`,
  },
];
