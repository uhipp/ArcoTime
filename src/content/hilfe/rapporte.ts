import type { HilfeArtikel } from "./typen";

export const rapporte: HilfeArtikel[] = [
  {
    slug: "rapporte",
    titel: "Arbeitsrapporte",
    kategorie: "Arbeiten mit ArcoTime",
    stichworte: [
      "rapport",
      "arbeitsrapport",
      "einsatz",
      "vor ort",
      "unterschrift",
      "positionen",
      "anfahrt",
      "material",
    ],
    routen: ["/rapporte"],
    inhalt: `
Ein Arbeitsrapport fasst alles zusammen, was bei einem Kundeneinsatz angefallen ist: Anfahrt, Arbeitszeit und verbrauchtes Material. Er ist die Klammer um mehrere Positionen, die sonst als einzelne Zeiteinträge nebeneinanderstünden.

## Wann brauchst du einen Rapport – und wann nicht?

Ein Rapport ist **optional**. Fernwartung, Büroarbeit, interne Zeit oder eine telefonisch erledigte Anfrage erfasst du weiterhin direkt in der [Zeiterfassung](/hilfe/zeiterfassung). Der Rapport lohnt sich dort, wo ein Einsatz aus mehreren Positionen besteht und der Kunde einen Nachweis erhalten soll.

## Einen Rapport erstellen

Zwei Wege führen zu einem Rapport. Der direkte: **"+ Neuer Rapport"** auf der Übersicht. Im Kopf legst du fest:

- **Kunde** und **Projekt** – zur Auswahl stehen nur Projekte dieses Kunden. Beides ist **zwingend**: Ohne Projekt lässt sich keine Leistung verrechnen, der Rapport könnte also nichts. Fehlt das passende Projekt, legst du es direkt im Auswahlfeld an.
- **Einsatzdatum** und **ausgeführt von** – beides gilt für alle Positionen, du musst es nicht je Zeile wiederholen
- **Bemerkung** – erscheint später auf dem Rapport

Nach dem Anlegen landest du direkt auf der Detailseite, wo du die Positionen erfasst.

Hat ein Admin unter [Einstellungen](/hilfe/einstellungen) **Standardpositionen** hinterlegt, bringt der neue Rapport diese bereits mit – etwa Anfahrt und Fahrzeit. Die Mengen sind Annahmen und werden vor Ort korrigiert; bei der Anfahrt steht gleich die beim Kunden hinterlegte Kilometerzahl.

Datum und ausführende Person gelten für den **ganzen Rapport** – sie stehen deshalb nur im Kopf und nicht bei den Positionen. Änderst du sie oben, ziehen die bereits erfassten Positionen automatisch nach.

## Navigation und Anruf

Bei einem offenen Rapport steht zuoberst die Adresse des Kunden mit einem Knopf **„Navigation"**. Er übergibt die Adresse an die Karten-App: auf dem Telefon an Google Maps, sofern installiert, sonst an den Browser. Daneben führt der kleine Link **„Apple Karten"** zur Karten-App von Apple. Wird die Navigation dort gestartet, läuft sie auf **CarPlay** oder **Android Auto** weiter.

Daneben steht die **Telefonnummer** als Knopf – ein Tippen wählt sie („bin in zehn Minuten da").

Die Adresse verlässt ArcoTime dabei erst, wenn du tippst: Es wird nichts im Hintergrund abgefragt und kein fremder Code auf der Seite geladen. Ist beim Kunden keine Adresse hinterlegt, erscheint auch kein Knopf – ein Navigationslink, der auf einen blossen Firmennamen zeigt, führt irgendwohin.

## Druckansicht

Über **„Druckansicht"** oben am Rapport öffnet sich die Fassung, die der Kunde bekommt: Kundenadresse, Einsatz, Positionen mit Mengen und ein Feld für die Bestätigung. **Ohne Preise** – der Rapport ist ein Leistungsnachweis, keine Rechnung.

Ist noch nicht unterschrieben, steht dort eine Linie für Datum und Unterschrift. So lässt sich der Rapport ausdrucken und von Hand unterschreiben, wenn kein Tablet dabei ist.

Daneben steht „PDF“: dasselbe Dokument als Datei, zum Ablegen oder Weiterschicken. Aufbau und Masse sind dieselben wie in der Druckansicht.

## Rapport abschliessen

Solange ein Rapport offen ist, zählen seine Positionen nirgends. Der Abschluss ist damit kein Formalismus, sondern der Moment, in dem die Arbeit gültig wird – er steht unten auf der Rapportseite.

Beim Abschliessen erhält der Rapport seine **Nummer** und wird **unveränderlich**. Korrekturen laufen danach über Storno und Neuerstellung.

Der gemeinte Weg ist **„Signieren und abschliessen"**: Name der unterzeichnenden Person eintragen, den Kunden im Feld darunter unterschreiben lassen – mit Finger oder Stift auf dem Tablet, mit der Maus am Rechner – und abschliessen. Die Unterschrift bleibt am Rapport sichtbar.

Ist niemand Unterschriftsberechtigtes mehr vor Ort, gibt es darunter **„Ohne Unterschrift abschliessen"**. Dieser Weg verlangt einen kurzen **Vermerk**, warum keine Unterschrift vorliegt – etwa „Kunde nicht mehr vor Ort". Er liegt bewusst eine Ebene tiefer, damit er nicht zur Gewohnheit wird.

Zwei Fälle lassen keinen Abschluss zu: ein Rapport **ohne Positionen** und einer mit **Datum in der Zukunft**. Beim zweiten ist der Einsatz schlicht noch nicht geleistet.

Bleibt ein Rapport nach seinem Einsatztag offen, erinnert ArcoTime die Person unter „Ausgeführt von" täglich per E-Mail daran, und ein roter Zähler neben „Rapporte" zeigt die Anzahl – siehe [Benachrichtigungen](/hilfe/benachrichtigungen).

### Wer abschliesst

Abschliessen darf die **verantwortliche Person** des Rapports – bei einem Einsatz mit mehreren Beteiligten also die Projektleitung. Sie war dabei, sie steht mit ihrem Namen auf dem Dokument, und sie beurteilt, ob alle Positionen erfasst sind. Wer nicht verantwortlich ist, sieht statt der Abschlussfelder einen Hinweis mit dem Namen der zuständigen Person.

Soll jemand anders abschliessen, wird oben am Rapport die **verantwortliche Person geändert** – dann stimmt auch das Dokument. Zusätzlich darf ein **Administrator** jederzeit abschliessen, damit ein Einsatz nicht feststeckt, wenn die verantwortliche Person krank ist oder das Unternehmen verlassen hat.

Das **Stornieren** ist bewusst nicht eingeschränkt: Es ist eine Korrektur des Büros und wird oft gerade dann gebraucht, wenn die verantwortliche Person nicht erreichbar ist.

## Beteiligte

Ein Auftrag wird oft von mehreren Personen zusammen erledigt – etwa eine Projektleiterin mit zwei Monteuren. Unter **Beteiligte** legst du fest, wer bei diesem Einsatz dabei ist.

In der [Disposition](/hilfe/disposition) erscheint der Einsatz dadurch in **jeder ihrer Spalten**, bleibt aber ein einziger Balken: Verschieben bewegt ihn für alle. Passt es bei einer Person nicht – Ferien, Betriebsferien –, meldet ArcoTime beim Verschieben, **wer** nicht kann, und du entscheidest, ob du es trotzdem tust.

Die **verantwortliche Person** aus dem Kopf ist immer dabei und lässt sich nicht entfernen; sie schliesst den Rapport ab. Wer sie wechseln will, ändert das Feld oben.

Die Beteiligten sind **reine Planung, keine Berechtigung**: Wer nicht dazugehört, darf trotzdem Positionen erfassen – die Disposition etwa fährt nie selbst mit.

**Ganze Gruppe hinzufügen**: Sind unter [Einstellungen](/hilfe/einstellungen) Gruppen angelegt, kommt ein Team in einem Zug dazu – der Regelfall ist „Team Ost fährt hin“ und nicht drei einzeln gewählte Namen. Wer schon dabei ist, bleibt es.

**Person ersetzen**: Fällt jemand aus, übernimmt eine andere Person – samt aller bereits erfassten Stundenpositionen. Ohne diese Funktion müsste man die Teamzeile tauschen und danach jede Position einzeln umhängen, und würde dabei welche vergessen. Bereits **exportierte** Positionen bleiben, wo sie sind: Wessen Stunden verrechnet wurden, ändert man nicht nachträglich.

**Geleistet von**: Sind mehrere Personen beteiligt, wählst du bei jeder Stundenposition, wer sie geleistet hat. Material und Reisespesen brauchen das nicht – sie gehören zum Auftrag, nicht zu einer Person. Der Name landet auch in der ersten Zeile der Beschreibung, denn im Export ist das die einzige Spur, wem die Stunde gehört.

## Wann eine Position zählt

Ein Rapport wird meist **vorbereitet**: Die Disposition legt die Aufträge der kommenden Woche an, oft schon mit bekannten Positionen – Reisespesen, angenommene Stunden – und mit einer Beschreibung dessen, was zu tun ist. Der Monteur passt vor Ort die Werte an und schliesst ab.

Bis zum Abschluss ist eine Position eine **Absicht, kein Nachweis**. Sie erscheint deshalb weder in den [Auswertungen](/hilfe/auswertungen) noch im [Export](/hilfe/export) und auch nicht in der [Zeiterfassungsliste](/hilfe/zeiterfassung) – dort stünden sonst Zeiten, die noch gar nicht geleistet sein können. Im [Kalender](/hilfe/kalender) erscheint der Einsatz als **geplant**.

Mit dem Abschliessen oder Signieren zählt alles auf einmal: Es wird nichts kopiert und nichts verschoben, der Rapport wechselt lediglich seinen Status. Ein **stornierter** Rapport zählt nie.

Daraus folgt: **Ein Rapport mit Datum in der Zukunft lässt sich nicht abschliessen.** Vorbereiten ja, abschliessen erst, wenn der Tag da ist.

Nicht betroffen ist die Prüfung der Tagesarbeitszeit – sie zählt auch vorläufige Positionen mit. Sie fragt, ob ein Tag überhaupt plausibel ist, und das gilt für die Planung genauso: Wenn die Disposition jemandem vierzehn Stunden auf einen Tag legt, soll das auffallen.

## Positionen erfassen

Jede Position ist ein ganz normaler Zeiteintrag – sie wird verrechnet, exportiert und erscheint in den Auswertungen wie jeder andere Eintrag auch. Der Rapport ist nur die Klammer darum.

Je nach gewählter Leistung erscheint das passende Feld:

- **Arbeitszeit**: Von/Bis oder direkt eine Dauer in Minuten
- **Mengenartikel** wie Kilometer oder Material: ein Mengenfeld mit der Einheit der Leistung

Welche Leistungen als Arbeitszeit zählen, legt ein Admin unter [Dienstleistungen](/hilfe/dienstleistungen) fest. Preis, MWSt-Satz und Rabatt werden beim Hinzufügen eingefroren – eine spätere Änderung an den Stammdaten verändert einen bestehenden Rapport nicht.

**Timer für die Fahrzeit**: An jeder Position, die als Arbeitszeit zählt, steht bei einem offenen Rapport ein Knopf **„▶ Timer starten"**. Gedacht ist er für die Anfahrt: Der Monteur sitzt im Fahrzeug, öffnet den Rapport des Kunden, startet den Timer und fährt los. Bei der Ankunft stoppt er ihn – die gemessene Zeit ersetzt die Dauer dieser Position.

Solange er läuft, steht ein breiter Knopf **„■ Ankunft – Timer stoppen"** mit der laufenden Zeit zuoberst über den Positionen; wer bei der Ankunft erst die richtige Zeile suchen müsste, täte es während der Fahrt. Zusätzlich erscheint ein rotes ⏱ in der Navigation, damit kein Timer über Nacht weiterläuft.

Gerechnet wird ab dem gespeicherten Startzeitpunkt – die Zeit stimmt also auch, wenn das Telefon zwischendurch im Ruhezustand war oder du den Rapport auf einem anderen Gerät öffnest. Es läuft **ein Timer je Person**; ist bereits einer aktiv, sagt die Meldung, wo. Kilometer und Material bekommen keinen Timer – die misst man nicht mit der Uhr.

Der zweite Weg führt über eine [Anfrage](/hilfe/anfragen): Dort schliesst **"Erledigen mit Rapport"** die Anfrage ab und legt gleichzeitig den passenden Rapport-Entwurf an – Kunde, Projekt und zuständige Person sind bereits gesetzt, Titel und Beschreibung stehen als Bemerkung drin. Der übliche Ablauf, wenn aus einer Kundenanfrage ein Einsatz vor Ort wird.

## Dokumente am Rapport

Zu jedem Rapport lassen sich Dokumente ablegen – Anweisungen, Pläne, Fotos, alles was die Person braucht, die rausfährt. Kommt der Rapport aus einer [Anfrage](/hilfe/anfragen), können deren Dokumente beim Abschliessen direkt mit übernommen werden.

## Wenn eine Position abgelehnt wird

Überschreitet eine Position die zulässige Tagesarbeitszeit, erscheint der Hinweis schon **während** du sie erfasst – nicht erst beim Speichern. Und falls der Server sie doch ablehnt, bleibt alles Eingetippte stehen: Die Meldung erscheint im Formular, die Beschreibung ist nicht verloren.

## An den Kunden senden

Ist der Rapport abgeschlossen, lässt er sich als **PDF per Mail** verschicken. Die Adresse kommt vom Kunden, sofern dort eine hinterlegt ist, und ist vor dem Senden änderbar – ein Mail an den falschen Empfänger lässt sich nicht zurückholen. Optional kannst du eine kurze Nachricht mitgeben; ohne sie geht ein knapper Standardtext raus.

Antworten des Kunden landen bei **eurer** Organisation, nicht bei ArcoTime – dafür sorgt die E-Mail-Adresse aus den [Einstellungen](/hilfe/einstellungen).

Ein Entwurf lässt sich nicht versenden. Erst mit dem Abschluss steht fest, was der Kunde bekommt.

## Stornieren

Ein abgeschlossener Rapport ist unveränderlich. Stellt sich heraus, dass etwas falsch war, wird er **storniert** und neu erstellt – gelöscht wird er nicht, denn die Nummer ist vergeben und der Kunde hat womöglich schon ein PDF.

Die erfassten Positionen bleiben erhalten, **zählen aber nicht mehr**: weder in den Auswertungen noch im Export. Man muss ja sehen können, was ursprünglich verrechnet werden sollte.

Ein Grund ist Pflicht und bleibt am Rapport vermerkt.

Sind Positionen bereits **exportiert**, lässt sich nicht mehr stornieren – sie liegen in der Buchhaltung, und die Korrektur muss dort erfolgen.

## Übersicht sortieren

Ein Klick auf einen Spaltenkopf sortiert die Liste nach dieser Spalte, ein zweiter Klick dreht die Richtung um. Der kleine Pfeil zeigt, wonach gerade sortiert ist. Ein gesetzter Statusfilter bleibt dabei erhalten.

Die Sortierung steht in der Adresse – die Ansicht überlebt also ein Neuladen und lässt sich als Lesezeichen ablegen oder weitergeben.

**Spalten wählen**: Über „Spalten“ oben rechts stellst du ein, welche Angaben die Liste zeigt. Zusätzlich verfügbar sind die geplante Zeit, die Bemerkung, wer unterzeichnet hat – bei einem Abschluss ohne Unterschrift steht dort der Vermerk – und das Versanddatum. Die Auswahl gilt nur für deine Anmeldung, folgt dir aber auf jedes Gerät; „Zurücksetzen“ stellt den Standard wieder her.

## Rapportnummer

Die Nummer im Format **2026-0001** wird erst beim Abschliessen vergeben, nicht beim Anlegen. Ein verworfener Entwurf reisst dadurch keine Lücke in die Nummernfolge. Bis dahin steht in der Übersicht "Entwurf". Die Zählung beginnt in jedem Jahr neu.

## Löschen

Solange ein Rapport im Status "Entwurf" ist, kannst du ihn löschen. **Die erfassten Positionen werden dabei mitgelöscht.** Wer einen Rapport verwirft, tut das, weil der Einsatz nicht stattfindet oder etwas schiefgelaufen ist – dann wurde die Leistung auch nicht erbracht und darf nicht als verrechenbarer Zeiteintrag zurückbleiben. Stammt der Rapport aus einer [Anfrage](/hilfe/anfragen), wird diese dabei wieder geöffnet.

Eine Ausnahme: Ist eine Position bereits **exportiert**, lässt sich der Rapport nicht mehr löschen – diese Leistung liegt schon in der Buchhaltung. Für solche Fälle ist die Stornierung vorgesehen. Eine einzelne Position entfernst du über "entfernen" in der Zeile.

## Was noch kommt

Unterschrift des Kunden auf dem Tablet, PDF-Erzeugung und automatischer Versand an die Kundenadresse sind die nächsten Ausbauschritte. Sobald ein Rapport signiert oder abgeschlossen ist, wird er unveränderlich – Korrekturen laufen dann über Storno und Neuerstellung.
`,
  },
];
