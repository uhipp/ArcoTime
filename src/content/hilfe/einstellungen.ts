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

## Bezeichnungen

Wie euer Betrieb die Dinge nennt. Die Struktur von ArcoTime ist für alle dieselbe – nur die Wörter sind verschieden: Ein Malergeschäft arbeitet an einer **Liegenschaft** und hat **Aufträge**, ein IT-Dienstleister betreut **Standorte** mit **Projekten** und nennt die Anfrage ein **Ticket**.

Je Bezeichnung hinterlegst du **Einzahl**, **Mehrzahl** und den **Artikel**. Alle drei sind nötig: Die Mehrzahl lässt sich im Deutschen nicht ableiten (Objekt/Objekte, aber Auftrag/Aufträge), und ohne Artikel stünde auf dem Knopf „Neues Auftrag" statt „Neuer Auftrag".

Über **Vorlage übernehmen** setzt du alle Bezeichnungen auf einmal – etwa auf „Handwerk" oder „IT-Artikel" – und passt danach einzelne an.

**Wo die Bezeichnung wirkt:** in der Navigation, auf der Startseite, in Seitentiteln, auf den Knöpfen, in Spaltentiteln der Listen und in den Hinweisen leerer Listen. **Unverändert** bleiben die Adressen im Browser (die Seite heisst weiter /projekte), die Hilfeseiten, die Spaltennamen im Comatic-Export – und zusammengesetzte Wörter wie „Projektleitung“ oder „Rapportnummer“. Ein Artikel lässt sich aus dem Geschlecht ableiten, ein Fugen-s nicht: Aus „Auftrag“ würde sonst „Auftragleitung“.

## Standorte führen

Der Schalter für die Ortsebene: Zwischen Kunde und Auftrag eine Stufe für den **Einsatzort** – Liegenschaft, Filiale, Baustelle, Serverzimmer – mit eigener Adresse, eigener Anfahrt, eigenem Zugang, eigenen Ansprechpersonen und den **Beteiligten** (Eigentümer, Verwaltung, Architekt, Behörde).

**Wer sie braucht:** Betriebe, bei denen ein Kunde an mehreren Orten bedient wird. Eine Liegenschaftsverwaltung mit vierzig Häusern ist ein Kunde mit einer Rechnungsadresse – und vierzig Orten mit vierzig Anfahrten. Ein IT-Dienstleister hat die Migros Region Basel als Kunden und arbeitet in ihren Filialen.

**Wer sie nicht braucht**, lässt das Häkchen weg. Dann bleibt alles wie bisher: keine zusätzliche Auswahl im Auftrag, kein Reiter beim Kunden, auf dem Rapport die Adresse des Kunden.

**Ein- und Ausschalten ist gefahrlos und umkehrbar.** Jeder Kunde hat auch ohne Häkchen still einen Standardstandort mit seiner Adresse, und jeder Auftrag hängt daran – die Ebene wird also nur sichtbar oder unsichtbar, nicht angelegt oder gelöscht. Was an zusätzlichen Standorten erfasst wurde, bleibt beim Ausschalten erhalten.

Die **Rollen** der Beteiligten (Kunde, Eigentümer, Verwaltung, Mieter, Hauswart, Architekt, Bauleitung, Subunternehmer, Behörde) sind vorgegeben und lassen sich ergänzen. Die Rolle „Kunde" wird gebraucht, um einen Standort seinem Kunden zuzuordnen – sie sollte stehen bleiben.

Der Standort ist eine **Postadresse und nichts weiter**. Alles, was ein Einsatz braucht – Anfahrt, Zugang, die zusätzlichen Adressen –, steht am [Auftrag](/hilfe/projekte). Nur so kann ein Betrieb ohne Standorte genau dasselbe wie einer mit.

Mehr dazu unter [Kunden](/hilfe/kunden).

## Beim neuen Auftrag übernehmen

Was ein neuer Auftrag vom letzten Auftrag **an derselben Adresse** mitbekommt. Vorgeschlagen sind Anfahrt, Zugang und die zusätzlichen Adressen; Projektleitung, Team, Kostenstelle und Notizen bleiben aus, weil sie von Vorhaben zu Vorhaben wechseln.

Beim **ersten** Auftrag an einer Adresse bleiben die Felder leer. Das ist Absicht: Ein Wert von einer anderen Liegenschaft wäre plausibel und falsch, und stille falsche Zahlen sind schlimmer als leere Felder.

Ein Unterschied, der die Wahl leichter macht: Bei den **zusätzlichen Adressen** ist die Übernahme eine Verknüpfung – zieht das Architekturbüro um, stimmt es auch in den Aufträgen, die den Eintrag geerbt haben. Bei **Anfahrt und Zugang** ist es eine Kopie: Ändert der Hauswart den Code, ist er in jedem laufenden Auftrag an diesem Ort nachzutragen. Bei abgeschlossenen Aufträgen ist der alte Code richtig – der Rapport von damals soll zeigen, was damals galt.

## Adressrollen

Die Rollen für die zusätzlichen Adressen an einem Auftrag: Eigentümer, Verwaltung, Mieter, Hauswart, Architekt, Bauleitung, Subunternehmer, Behörde. Eigene lassen sich ergänzen – ein Elektriker oder Sanitär ist in der Regel ein **Subunternehmer** und braucht keine eigene Rolle.

## Einheiten

Die Auswahl für das Feld „Einheit" im [Artikelstamm](/hilfe/artikel) – Stunde, Pauschale, Stück, km, und was ihr sonst braucht. Neue Einheiten legst du hier an, danach stehen sie beim Anlegen einer Artikel zur Verfügung.

Umbenennen ist gefahrlos: Die Artikel speichert den Text der Einheit, keine Referenz. Bestehende Artikel behalten deshalb ihren bisherigen Wert – er erscheint dort dann als „nicht mehr in der Liste" und lässt sich bei Bedarf umstellen.

## MWSt-Codes

Die Steuercodes aus eurem Buchhaltungssystem, bestehend aus **Code** (z.B. \`B81\`), **Bezeichnung** und **Satz in Prozent**. Sie hängen an den [Artikel](/hilfe/artikel) und landen über den [Export](/hilfe/export) in der Buchhaltung.

> **Satzänderungen wirken nicht rückwirkend.** Beim Erfassen eines Zeiteintrags werden Code und Satz eingefroren – genau wie der Preis der Artikel. Änderst du hier den Satz, gilt der neue Wert nur für **ab jetzt** erfasste Einträge; alle bestehenden behalten den Satz, der beim Erfassen gültig war. Ein bereits erzeugter Export einer vergangenen Periode bleibt damit reproduzierbar.
>
> Bei einer gesetzlichen Satzänderung kannst du also einfach den Satz anpassen. Einen neuen Code brauchst du nur, wenn dein Buchhaltungssystem alt und neu getrennt sehen will.

## Artikelklassen

Gruppieren die [Artikel](/hilfe/artikel) für die [Auswertungen](/hilfe/auswertungen). Auch hier gilt: deaktivieren statt löschen.

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

**Feiertag oder Betriebsferien?** Mit gebuchtem [Zeitkonto](/hilfe/einstellungen) steht in jeder Zeile ein Schalter. **Betriebsferien** gehen vom Ferienanspruch der Mitarbeitenden ab – der Arbeitgeber darf den Zeitpunkt der Ferien bestimmen (Art. 329c Abs. 2 OR). **Feiertage** und Brückentage kosten dagegen keine Ferientage. Wie viele Tage eine Betriebsferienwoche kostet, richtet sich nach den Arbeitstagen der Person: Wer zu 60 % an drei Tagen arbeitet, verliert drei Tage und nicht fünf.

## Abwesenheitsarten

Die Auswahl, die bei einer Person unter [Mitarbeitende](/hilfe/mitarbeitende) → "Details" zur Verfügung steht – z.B. Ferien, Krankheit, Militär, Kurs, Homeoffice.

Das Häkchen **"blockiert die Planung"** entscheidet, ob die Art in der Disposition wirkt: Ist es gesetzt, fällt der Zeitraum aus den freien Zeiten heraus. Ohne Häkchen ist die Abwesenheit reine Information und die Person bleibt einplanbar – gedacht für Fälle wie Homeoffice oder Aussendienst.


**Mit gebuchtem Zeitkonto** kommen drei weitere Häkchen dazu. Sie sagen, wie eine Abwesenheit im Zeitkonto wirkt, und sind unabhängig voneinander:

- **Soll** – die Sollstunden dieses Tages entfallen. Das gilt für jede bezahlte Absenz: Ferien, Krankheit, Unfall, Militär.
- **Ferien** – zieht Tage vom Ferienguthaben ab. Nur bei Ferien selbst.
- **Saldo** – bucht die Stunden vom Zeitsaldo ab. Das ist der **Überstundenabbau**: Wer kompensiert, schuldet die Zeit weiterhin, er hat sie nur vorher geleistet. Deshalb hat diese Art **kein** Häkchen bei „Soll".

Homeoffice und Aussendienst haben keines der drei – dort wird gearbeitet.

Die bestehenden Arten wurden bei der Umstellung sinnvoll vorbelegt, und die Art **„Überstundenabbau"** ist neu dazugekommen. Bitte einmal durchsehen, ob es für euren Betrieb stimmt.
## Arbeitszeit-Grundlagen und Sollstunden (Zusatzmodul Zeitkonto)

Nur mit gebuchtem **Zeitkonto** sichtbar. Zwei Angaben bilden die Grundlage:

- **Wochenstunden bei 100 %** und **Arbeitstage pro Woche** – daraus entsteht das **Tages-Soll** (bei 42 Stunden auf 5 Tage also 8,4 Stunden). Mit diesem Wert werden einzelne Ferien- und Absenztage bewertet.
- **Sollstunden je Monat**, über „Sollstunden je Monat erfassen" auf einer eigenen Seite je Jahr. Das ist die verbindliche Summe, in der Praxis vom Treuhänder geliefert. Ein leeres Feld heisst „nicht erfasst" und nicht „null Stunden".

**Das Kalenderfenster als Rechenhilfe**: Wer die Tabelle nicht zur Hand hat, klickt beim Monat auf **„Kalender"**. Es zeigt jeden Tag des Monats einzeln und belegt ihn vor – Werktage mit dem Tagesanteil (Wochenstunden ÷ 5), Wochenenden und [Schliesstage](/hilfe/einstellungen) mit null. Feiertage sind dabei benannt und gelb hinterlegt. Einzelne Tage korrigierst du direkt im Fenster (Brückentag, halber 24. Dezember), unten steht laufend die Summe, und **„Daten übernehmen"** schreibt sie in die Monatszeile. Gespeichert wird erst mit dem Knopf unter der Tabelle – bis dahin lässt sich alles noch ändern.

Das Häkchen **„Feiertage sind in den Sollstunden bereits enthalten"** ist wichtig: Eine Treuhänder-Tabelle hat die Feiertage abgezogen, und ArcoTime kennt die Schliesstage ebenfalls. Ohne das Häkchen würden sie ein zweites Mal abgezogen – die häufigste Fehlerquelle in solchen Auswertungen.

Die Angaben **je Person** – Eintritt, Austritt, Pensum und Ferienanspruch – stehen bei [Mitarbeitende](/hilfe/mitarbeitende) → Details.

## Monatsabschluss (Zusatzmodul Zeitkonto)

Über „Monatsabschluss" bei den Arbeitszeit-Grundlagen. Die Seite zeigt einen Monat über **alle Mitarbeitenden** mit Soll, Ist, Saldo und Ferienrest.

Der Abschluss **hält die Zahlen fest und sperrt ihre Grundlagen**: Die Zeiteinträge dieser Person in diesem Monat lassen sich danach weder ändern noch löschen noch ergänzen – auch nicht von Administratoren. Ohne diese Sperre zeigte die Auswertung das eine und das Zeitkonto das andere.

Ebenfalls gesperrt sind danach das **Abschliessen und Stornieren von Rapporten**, deren Stunden in diesem Monat liegen: Beides würde rückwirkend verändern, was als geleistet gilt.

Der Abschluss **hält die Zahlen fest**, wie sie jetzt sind. Danach rechnet das Zeitkonto den Folgemonat auf diesem Stand weiter, und eine spätere Korrektur an einem alten Zeiteintrag verschiebt die Zahl nicht mehr, die an die Lohnbuchhaltung ging. Korrekturen laufen dann über eine **Buchung im Folgemonat**.

**Solange ein Rapport des Monats offen ist, lässt sich die betroffene Person nicht abschliessen.** Ihre Stunden zählen erst mit dem Abschluss des Rapports – wird der Monat vorher eingefroren, fehlten sie dauerhaft – deshalb die Sperre statt einer blossen Warnung. Der typische Fall ist der Einsatz vom Monatsletzten, der erst ein paar Tage später abgeschlossen wird. Wie viele offen waren, bleibt am Abschluss vermerkt.

Abgeschlossen wird **je Person** und nicht für alle auf einmal: Wer bei einer Person noch etwas nachtragen will, soll die übrigen trotzdem abschliessen können. Ein Abschluss lässt sich **wieder öffnen** – das [Änderungsprotokoll](/hilfe/einstellungen) hält beides fest.

Die **Übersicht als PDF** (A4 quer) enthält alle Mitarbeitenden des Monats – das Blatt für die Betriebsleitung und die Lohnbuchhaltung. Andere Dateiformate kommen, wenn ein Lohnsystem sie verlangt.

## Datenpflege

Ein eigener Bereich unter Einstellungen, erreichbar über **„Datenpflege öffnen"**. Er enthält zweierlei.

**Prüfungen** zeigen Lücken in den Stammdaten, die erst auffallen, wenn sie stören: Kunden ohne PLZ oder Ort (der Brief passt dann nicht ins Fenstercouvert), Kunden ohne E-Mail (kein Rapportversand), Kunden ohne Anfahrt-Kilometer, aktive Projekte ohne Projektleitung. Sie ändern nichts, sie zählen und verlinken auf die Liste, in der sich die Lücke schliessen lässt.

**Sammelaktionen** führen bestehende Werte in einem Zug nach. Der Ablauf ist immer derselbe: **Vorschau ansehen** – jede betroffene Zeile mit „bisher" und „neu" –, dann auslösen, und der Lauf lässt sich **rückgängig machen**. Die alten Werte werden dabei aufbewahrt.

Warum das so gebaut ist: Erweiterungen an ArcoTime bringen neue Felder mit. Die **Struktur** – die Spalte selbst – gilt sofort für alle Organisationen, sonst liefen mehrere Datenmodelle nebeneinander. Das **Umformen bestehender Werte** ist etwas anderes: Ob eine automatische Ableitung für eure 800 Kundenadressen passt, kann niemand von aussen beurteilen. Deshalb löst ihr das selbst aus, wenn es euch passt, und könnt es zurücknehmen.

Ausgeführte Läufe bleiben unten stehen – auch rückgängig gemachte. Die Spur ist der Zweck.

Ausgenommen bleiben Fehler, die Daten beschädigen, sowie Sicherheits- und Gesetzesanpassungen: Die laufen sofort für alle, mit Information danach statt Zustimmung davor.

## Änderungsprotokoll

Jede Änderung an euren Stammdaten, Belegen und Konten – wer, wann und was. Erreichbar über **„Protokoll öffnen"**, sichtbar nur für Administratoren der eigenen Organisation.

Aufgezeichnet wird in der **Datenbank selbst** und nicht in der Anwendung. Das ist der entscheidende Punkt: So erscheinen auch Eingriffe, die nicht über die Oberfläche laufen – etwa eine Korrektur durch Arcos im Rahmen des Supports. Ein solcher Eingriff hat kein Benutzerkonto und steht deshalb ausdrücklich als **„Arcos (direkter Datenbankzugriff)"** da.

Warum das so gelöst ist und nicht über weniger Zugriff: Als Auftragsbearbeiter braucht Arcos vollen Zugriff auf die Datenbank – für Sicherungen, für Fehlerkorrekturen, für Migrationen. Das zu verschleiern wäre schlechter, als es zu benennen. Vertrauen entsteht über Nachvollziehbarkeit.

Bei einer Änderung stehen die **betroffenen Felder** mit altem und neuem Wert da. Ein Speichern, das nichts verändert hat, erzeugt keinen Eintrag.

Das Protokoll **lässt sich nicht bearbeiten und nicht löschen**, auch nicht von Administratoren – ein Protokoll, das sich ändern lässt, wäre keines. Es beginnt mit seiner Einrichtung; frühere Änderungen sind nicht rückwirkend erfasst.

## Standardpositionen für neue Rapporte

Womit ein neuer [Arbeitsrapport](/hilfe/rapporte) beginnt. In vielen Betrieben ist das immer dasselbe – Anfahrt, Fahrzeit, manchmal eine Kleinmaterialpauschale. Wer hier nichts pflegt, bekommt wie bisher einen leeren Rapport.

Je Zeile eine Leistung und eine **Menge**. Diese Menge ist eine **Annahme**, die vor Ort korrigiert wird – bei Leistungen, die als Arbeitszeit zählen, in **Minuten**, sonst in der Einheit der Leistung. Eine Vorgabe ist zwingend: Eine Position ohne Wert lässt sich nicht speichern.

Trägt die Leistung das Häkchen **„Anreise zum Kunden"** (siehe [Artikel](/hilfe/artikel)), schlägt die beim Kunden hinterlegte Anfahrt diese Vorgabe. Der Rapport für einen Kunden mit 24 hinterlegten Kilometern beginnt also mit genau diesen 24 – ohne dass jemand etwas eintippt.

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
