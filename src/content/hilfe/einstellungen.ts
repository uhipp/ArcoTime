import type { HilfeArtikel } from "./typen";

export const einstellungen: HilfeArtikel[] = [
  {
    slug: "einstellungen",
    titel: "Einstellungen",
    kategorie: "Verwaltung (Admin)",
    stichworte: [
      "rabattsätze",
      "kanäle",
      "prioritäten",
      "dokument-kategorien",
      "konfiguration",
      "mwst",
      "mehrwertsteuer",
      "steuersatz",
      "absender",
      "logo",
      "briefkopf",
      "arbeitstag",
      "schliesstage",
      "betriebsferien",
      "feiertage",
      "abwesenheitsarten",
      "tagesgrenze",
    ],
    routen: ["/einstellungen"],
    inhalt: `
Nur Admins sehen diese Seite – hier lassen sich Auswahllisten zentral konfigurieren, ohne dass eine Programmänderung nötig wäre.

Bei **allen** Listen gilt dasselbe Prinzip: Jeder Eintrag ist direkt in seiner Zeile bearbeitbar und wird mit **"speichern"** übernommen. Nicht mehr benötigte Einträge werden **deaktiviert** statt gelöscht – sie bleiben dadurch in bestehenden Datensätzen lesbar, verschwinden aber aus neuen Auswahllisten. Das Zahlenfeld ganz rechts ist die **Sortierung**: Sie bestimmt, in welcher Reihenfolge die Optionen in den Auswahlfeldern der App erscheinen (kleinere Zahl zuerst).

## Einheiten

Die Auswahl für das Feld „Einheit" im [Dienstleistungskatalog](/hilfe/dienstleistungen) – Stunde, Pauschale, Stück, km, und was ihr sonst braucht. Neue Einheiten legst du hier an, danach stehen sie beim Anlegen einer Dienstleistung zur Verfügung.

Umbenennen ist gefahrlos: Die Dienstleistung speichert den Text der Einheit, keine Referenz. Bestehende Dienstleistungen behalten deshalb ihren bisherigen Wert – er erscheint dort dann als „nicht mehr in der Liste" und lässt sich bei Bedarf umstellen.

## MWSt-Codes

Die Steuercodes aus eurem Buchhaltungssystem, bestehend aus **Code** (z.B. \`B81\`), **Bezeichnung** und **Satz in Prozent**. Sie hängen an den [Dienstleistungen](/hilfe/dienstleistungen) und landen über den [Export](/hilfe/export) in der Buchhaltung.

> **Satzänderungen wirken nicht rückwirkend.** Beim Erfassen eines Zeiteintrags werden Code und Satz eingefroren – genau wie der Preis der Dienstleistung. Änderst du hier den Satz, gilt der neue Wert nur für **ab jetzt** erfasste Einträge; alle bestehenden behalten den Satz, der beim Erfassen gültig war. Ein bereits erzeugter Export einer vergangenen Periode bleibt damit reproduzierbar.
>
> Bei einer gesetzlichen Satzänderung kannst du also einfach den Satz anpassen. Einen neuen Code brauchst du nur, wenn dein Buchhaltungssystem alt und neu getrennt sehen will.

## Dienstleistungsklassen

Gruppieren die [Dienstleistungen](/hilfe/dienstleistungen) für die [Auswertungen](/hilfe/auswertungen). Auch hier gilt: deaktivieren statt löschen.

## Rabattsätze

Die zur Auswahl stehenden Rabatt-Prozentsätze in der Zeiterfassung, mit optionaler Bezeichnung. Wie beim Preis wird der Rabatt pro Zeiteintrag gespeichert – eine spätere Änderung des Prozentsatzes verändert bestehende Einträge also nicht.

## Anfrage-Kanäle

Über welche Wege Anfragen eingehen können (Telefon, E-Mail, …), inkl. eines kleinen Symbols, das im Kanban-Board angezeigt wird. Symbol und Bezeichnung lassen sich jederzeit ändern – bestehende Anfragen behalten ihren Kanal, weil intern ein unveränderlicher Schlüssel verwendet wird und nicht die Bezeichnung.

## Anfrage-Prioritäten

Die zur Auswahl stehenden Prioritätsstufen samt Farbe (erscheint als kleiner Punkt auf der Anfrage-Karte). Farbe und Bezeichnung sind änderbar, ohne dass bestehende Anfragen ihre Priorität verlieren.

## Dokument-Kategorien

Kategorien zur Einordnung hochgeladener Dokumente (z.B. "Vertrag", "Offerte") – erscheinen als Auswahl beim Hochladen an jeder Stelle, die eine Dokumentenablage hat (Kunden, Projekte, Anfragen, Zeiteinträge, Mitarbeitende).

## Absenderangaben und Logo

Adresse, Telefon, E-Mail und Webseite der eigenen Organisation – zusammen mit dem **Logo**. Beides erscheint auf dem [Arbeitsrapport](/hilfe/rapporte), den der Kunde erhält, und später auch im PDF und im Begleitmail. Deshalb wird es hier einmal gepflegt und nicht je Dokument.

Fürs Logo eignet sich ein **PNG mit durchsichtigem Hintergrund**, 400 Pixel Breite genügen für Druck und PDF. Maximal 1 MB.

## Arbeitszeit-Grenzen

**Hinweis ab … Stunden pro Tag** und **Speichern sperren ab … Stunden pro Tag** gelten je Mitarbeitendem und Tag, über alle Kunden hinweg. Der Hinweis erscheint beim Erfassen und lässt sich übergehen, die Sperre verweigert das Speichern – auch beim Erledigen einer Anfrage. Beide Felder leer lassen schaltet die jeweilige Prüfung ab.

## Arbeitstag von / bis

Der Rahmen, in dem die [Disposition](/hilfe/disposition) freie Zeiten vorschlägt – standardmässig 07:00 bis 18:00. Einsätze ausserhalb bleiben von Hand planbar; sie werden nur nicht automatisch vorgeschlagen.

## Schliesstage

Feiertage, Betriebsferien und alles andere, an dem die ganze Firma zu ist. Ein Schliesstag hat ein Von- und ein Bis-Datum – für einen einzelnen Tag trägst du beide gleich ein – und eine Bezeichnung. Die Disposition schlägt an diesen Tagen keine freien Zeiten vor.

Schliesstage sperren die Zeiterfassung **nicht**: Wer am Feiertag arbeitet, kann seine Zeit ganz normal erfassen.

## Abwesenheitsarten

Die Auswahl, die bei einer Person unter [Mitarbeitende](/hilfe/mitarbeitende) → "Details" zur Verfügung steht – z.B. Ferien, Krankheit, Militär, Kurs, Homeoffice.

Das Häkchen **"blockiert die Planung"** entscheidet, ob die Art in der Disposition wirkt: Ist es gesetzt, fällt der Zeitraum aus den freien Zeiten heraus. Ohne Häkchen ist die Abwesenheit reine Information und die Person bleibt einplanbar – gedacht für Fälle wie Homeoffice oder Aussendienst.

## Standardpositionen für neue Rapporte

Womit ein neuer [Arbeitsrapport](/hilfe/rapporte) beginnt. In vielen Betrieben ist das immer dasselbe – Anfahrt, Fahrzeit, manchmal eine Kleinmaterialpauschale. Wer hier nichts pflegt, bekommt wie bisher einen leeren Rapport.

Je Zeile eine Leistung und eine **Menge**. Diese Menge ist eine **Annahme**, die vor Ort korrigiert wird – bei Leistungen, die als Arbeitszeit zählen, in **Minuten**, sonst in der Einheit der Leistung. Eine Vorgabe ist zwingend: Eine Position ohne Wert lässt sich nicht speichern.

Trägt die Leistung das Häkchen **„Anreise zum Kunden"** (siehe [Dienstleistungen](/hilfe/dienstleistungen)), schlägt die beim Kunden hinterlegte Anfahrt diese Vorgabe. Der Rapport für einen Kunden mit 24 hinterlegten Kilometern beginnt also mit genau diesen 24 – ohne dass jemand etwas eintippt.

Angelegt werden die Positionen nur, wenn der Rapport ein **Projekt** hat; ohne Projekt lässt sich nichts verrechnen. Wird eine Leistung nicht mehr gebraucht, wird die Zeile **deaktiviert** statt gelöscht.

## Gruppen

Fasst Mitarbeitende zusammen – „Team Ost“, „Sanitär“, „Lernende“. Eine Gruppe wird angelegt wie jede andere Auswahlliste; die Mitglieder werden darunter mit Häkchen zugeteilt und mit **„Mitglieder speichern“** übernommen.

Eine Gruppe ist eine **Sicht, keine Berechtigung**: Wer in keiner Gruppe ist, sieht und darf genau gleich viel wie vorher. Mehrfache Zugehörigkeit ist gewollt – der Springer gehört zu beiden Teams, und ihn zwingend einem zuzuordnen wäre eine Aussage, die im Betrieb niemand treffen kann.

Zwei Stellen nutzen die Gruppen:

- In der [Disposition](/hilfe/disposition) schränkt der Filter **Gruppe** die Tagesansicht auf die Spalten dieser Gruppe ein. Bei zwanzig Mitarbeitenden ist das der Unterschied zwischen einer Übersicht und einer Tapete.
- Am [Rapport](/hilfe/rapporte) fügt **„Ganze Gruppe hinzufügen“** alle Mitglieder auf einmal als Beteiligte hinzu. Wer schon dabei ist, bleibt es.

Wird eine Gruppe **deaktiviert**, verschwindet sie aus beiden Auswahlfeldern. Bereits zusammengestellte Teams bleiben davon unberührt – sie bestehen aus Personen, nicht aus der Gruppe.

## Was sich nachträglich NICHT ändern lässt

Bei Kanälen und Prioritäten wird intern ein **unveränderlicher Schlüssel** aus der ursprünglichen Bezeichnung abgeleitet (z.B. \`telefon\`). Genau dieser Schlüssel steht in den Anfragen, nicht die Bezeichnung – deshalb darfst du umbenennen, ohne dass bestehende Anfragen ihre Zuordnung verlieren. Der Schlüssel selbst bleibt allerdings auf dem alten Stand; sichtbar ist er nur im Export.
`,
  },
];
