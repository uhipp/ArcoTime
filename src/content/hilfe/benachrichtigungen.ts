import type { HilfeArtikel } from "./typen";

export const benachrichtigungen: HilfeArtikel[] = [
  {
    slug: "benachrichtigungen",
    titel: "Benachrichtigungen",
    kategorie: "Arbeiten mit ArcoTime",
    stichworte: ["e-mail", "badge", "erinnerung", "zuweisung", "reminder"],
    routen: [],
    inhalt: `
ArcoTime meldet sich in zwei Situationen aktiv per E-Mail, statt nur passiv etwas anzuzeigen, das man ohnehin aufrufen müsste.

## Fällige Wiedervorlage

Sobald das Wiedervorlage-Datum einer Anfrage erreicht ist (siehe [Anfragen](/hilfe/anfragen)), passiert täglich um **07:30 Uhr** automatisch Folgendes:

- Die Karte wandert im Kanban-Board in die Spalte "Wiedervorlage".
- Die zuständige Person bekommt eine **E-Mail** mit allen ihren fälligen Wiedervorlagen und Direktlinks.
- Ein **roter Zähler** neben "Anfragen" in der Navigation zeigt jederzeit die Anzahl.

## Zuweisung einer Anfrage

Wird dir eine Anfrage neu zugewiesen (bei der Erfassung oder nachträglich im Bearbeiten-Formular), bekommst du eine **E-Mail** mit dem Titel der Anfrage, einem direkten Link und dem Namen der Person, die dir die Anfrage zugewiesen hat.

Übernimmst du dir selbst eine noch nicht zugewiesene Anfrage (Button "Übernehmen"), gibt es bewusst **keine** Mail – eine Benachrichtigung über die eigene, gerade ausgeführte Aktion wäre nutzlos.

## Ich habe keine E-Mail bekommen – was tun?

Prüfe zuerst, ob unter [Mitarbeitende](/hilfe/mitarbeitende) eine E-Mail-Adresse hinterlegt ist – ohne diese kann keine Benachrichtigung verschickt werden. Bleibt das Problem bestehen, an einen Admin wenden.
`,
  },
];
