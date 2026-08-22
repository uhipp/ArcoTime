import type { HilfeArtikel } from "./typen";

export const kunden: HilfeArtikel[] = [
  {
    slug: "kunden",
    titel: "Kunden",
    kategorie: "Stammdaten",
    stichworte: [
      "kunde anlegen",
      "adresse",
      "strasse",
      "hausnummer",
      "plz",
      "firma",
      "kontakt",
      "standort",
      "liegenschaft",
      "baustelle",
      "filiale",
      "einsatzort",
      "beteiligte",
      "eigentümer",
      "verwaltung",
      "architekt",
      "zugang",
      "reiter",
    ],
    routen: ["/kunden"],
    inhalt: `
Hier verwaltest du deine Kundenstammdaten – Grundlage für Projekte, Zeiterfassung und Anfragen.

**Sortieren**: Ein Klick auf einen Spaltenkopf sortiert die Liste danach, ein zweiter Klick dreht die Richtung um. Filter und Suche bleiben dabei erhalten, und die Sortierung steht in der Adresse – sie überlebt also ein Neuladen.

**Spalten wählen**: Über „Spalten“ oben rechts stellst du ein, welche Angaben die Liste zeigt – etwa Telefon, Strasse, PLZ oder den Standardrabatt. Die Auswahl gilt nur für deine Anmeldung, folgt dir aber auf jedes Gerät. „Zurücksetzen“ stellt die Standardspalten wieder her. Die Namensspalte bleibt immer sichtbar, weil sie den Datensatz öffnet.

## Neuen Kunden anlegen

Auf **"+ Neuer Kunde"** klicken und die Felder ausfüllen. Pflichtfeld ist nur der **Name** (Nach- oder Firmenname); alles andere kann später ergänzt werden.

**Anfahrt km (verrechnet je Einsatz)**: Die Kilometer, die bei einem Einsatz verrechnet werden. Führt der Betrieb **Standorte**, steht dieser Wert am Standort und nicht mehr hier – bei vierzig Liegenschaften sind es vierzig Distanzen. Sonst gilt: die Kilometer, die bei einem Einsatz bei diesem Kunden verrechnet werden – in der Regel Hin- und Rückfahrt. Der Wert wird beim Erfassen als **Menge vorgeschlagen**, sobald eine Leistung gewählt wird, die unter [Artikel](/hilfe/artikel) als Anreise gekennzeichnet ist. Wie beim Standardrabatt gilt: Es ist ein Vorschlag, überschreibbar, und eine spätere Änderung wirkt nicht auf bereits erfasste Einträge.

Das Feld heisst bewusst „verrechnet je Einsatz" und nicht „Distanz" – sonst trägt die eine Person die einfache Strecke ein und die andere Hin und Zurück, und niemand merkt es, weil beides plausibel aussieht.

**Strasse und Nummer** sind zwei getrennte Felder, ebenso **PLZ** und **Ort**. Das hält die Adresse auswertbar und sortierbar. Im Export erscheint die Strasse wieder als eine Angabe („Bahnhofstrasse 12"), weil das Comatic-Format eine einzige Spalte dafür vorsieht.

**PLZ-Autofill**: Trägst du eine Schweizer Postleitzahl ein, schlägt ArcoTime automatisch den passenden Ort vor – spart Tipparbeit und vermeidet Tippfehler.

Weitere Felder wie Adress-Schlüssel (für den Buchhaltungsexport), Zahlungskonditionen und Währung lassen sich bei Bedarf setzen; sie haben sinnvolle Standardwerte (CHF, 30 Tage).

## Kunden schnell anlegen, ohne die Seite zu verlassen

In den Formularen für **Anfragen**, **Projekte** und **Zeiterfassung** gibt es jeweils ein **"+ Neuer Kunde"**, direkt neben dem Kunden-Feld. Damit lässt sich ein fehlender Kunde mit den wichtigsten Angaben (Vorname, Name, Telefon, E-Mail) sofort anlegen, ohne das aktuelle Formular zu verlieren – Adresse und weitere Details lassen sich danach jederzeit hier unter "Kunden" ergänzen.

Legt jemand versehentlich zweimal denselben Kunden an (z.B. weil zwei Mitarbeitende gleichzeitig arbeiten), erscheint eine **Dubletten-Warnung** mit der Möglichkeit, stattdessen den bereits bestehenden Kunden zu verwenden.

## Die Kundenmaske

Die Maske ist in zwei Hälften geteilt: **links die Liste**, rechts der gewählte Kunde. Die gewählte Zeile ist hinterlegt und mit einem Balken markiert – nach einer Unterbrechung ist das der Anker, an dem man wieder anknüpft.

**Die Seite selbst scrollt nicht.** Gescrollt wird nur innerhalb der Liste und der Detailfläche. Hauptmenü, Bereich und der Name des gewählten Kunden bleiben immer sichtbar.

Alles, was früher untereinander stand, steht jetzt in **Reitern**:

| Reiter | Inhalt |
|---|---|
| Adresse | Anschrift, Adress-Schlüssel, Zahlungskonditionen, Notizen und die Kontaktkanäle des Betriebs |
| Ansprechpersonen | wer beim Kunden zuständig ist, mit eigenen Kontaktangaben |
| Standorte | die Adressen, an denen gearbeitet wird |
| Aufträge | alle Aufträge dieses Kunden, mit ihrem Einsatzort |
| Preise und Rabatte | die Konditionen dieses Kunden |
| Dokumente | Dateien zum Kunden |
| Historie | alle Anfragen und Zeiterfassungen, filterbar nach Zeitraum und Auftrag |

Der gewählte Reiter steht in der Adresse – „…?reiter=standorte“. Der Zurück-Knopf funktioniert damit, und ein Link auf einen bestimmten Reiter ist teilbar.

**Das Suchfeld über der Liste sucht von vorn**: „Bür" findet Bürgi. Wer quer durch alle Angaben suchen will, nimmt „Ganze Liste" oben rechts – dort gibt es Spaltenwahl, Filter und Sortierung über alle Spalten.

**Jeder Knopf nennt sein Objekt**: „Adresse speichern", „Person speichern", „Standort speichern", „Preis speichern". Ein nacktes „Speichern" gibt es nicht mehr, „Übernehmen" auch nicht – es hat gespeichert, ohne es zu sagen. Gespeichert wird nur auf Knopfdruck; nichts wird still im Hintergrund übernommen.

## Standorte – die Adressen eines Kunden

Zwischen Kunde und Auftrag liegt der **Einsatzort**: die Liegenschaft, die Filiale, die Baustelle, das Serverzimmer. Ein Kunde kann mehrere haben.

Der Standort ist eine **Postadresse und nichts weiter** – sieben Felder: Bezeichnung, Adresszusatz, Strasse, Nummer, PLZ, Ort, Land. Dazu zwei Häkchen: welche Adresse beim Anlegen eines Auftrags **vorgeschlagen** wird, und ob sie noch **aktiv** ist.

Warum so wenig: Die Ortsebene gibt einem Betrieb genau zwei Dinge – mehrere Adressen je Kunde, und Auswertungen je Adresse. Alles andere, was ein Einsatz braucht, steht am **Auftrag**: Anfahrt, Zugang und die zusätzlichen Adressen (Eigentümer, Verwaltung, Architekt, Hauswart). Nur so kann ein Betrieb **ohne** Standorte genau dasselbe wie einer mit – sonst hätte er keinen Weg dorthin.

**Ein- und ausschalten**: Wer je Kunde nur eine Adresse hat, braucht die Ebene nicht. Ein Admin schaltet sie unter [Einstellungen](/hilfe/einstellungen) mit „Standorte führen" ein oder aus. Ist sie aus, ist sie unsichtbar – die Daten stimmen trotzdem: Jeder Kunde hat still eine Adresse aus seinem Kundenstamm, und jeder Auftrag hängt daran.

**Die vorgeschlagene Adresse** entsteht beim Anlegen eines Kunden von selbst, mit dessen Name und Adresse. Es gibt genau eine je Kunde; wer eine andere markiert, löst die erste ab.

**Verkauft?** Wechselt die Liegenschaft zu einem anderen Kunden **derselben Organisation**, wird beim Standort der Kunde geändert – die Historie zieht mit, weil Aufträge und Rapporte an der Adresse hängen. Die alten Rechnungen bleiben beim früheren Eigentümer; das ist Absicht, sonst wäre die Vergangenheit gefälscht. Wird die Liegenschaft **nach draussen** verkauft und nicht mehr betreut, nimmt man ihr das Häkchen **aktiv**: Sie bleibt lesbar und verschwindet aus jeder Auswahl.

**Dokumente**: Grundriss, Fotos vom Zustand, die Schlüsselquittung liegen an der Adresse – sie überleben das Vorhaben, in dem sie entstanden sind.

**Löschen** geht nur, solange kein Auftrag an der Adresse hängt.

## Kontaktangaben des Betriebs

Im Reiter **Adresse**, unter dem Adressblock, stehen die Kanäle, die dem Kunden als Ganzem gehören – die Zentrale: Direktwahl, Mobil, WhatsApp, eine zweite Mailadresse.

Sie stehen dort und nicht bei den Ansprechpersonen, weil sie zur Adresse gehören und zu keiner Person. E-Mail und Telefon aus dem Adressblock erscheinen zusätzlich in dieser Liste: Beim Umstellen auf die Kanäle sind sie **kopiert und nicht verschoben** worden, damit nichts verloren geht. Dass dieselbe Nummer an zwei Stellen steht, ist ein Übergangszustand.

## Ansprechpersonen

Im Reiter **Ansprechpersonen** steht, wer beim Kunden zuständig ist. Sobald ein Betrieb grösser ist, gibt es dort mehrere Personen mit eigener Nummer und eigener Mailadresse – die Sachbearbeiterin der Verwaltung, der Hauswart, die Filialleitung. Je Person gibt es Anrede, Vor- und Nachname, Funktion, eine Notiz und beliebig viele Kontaktkanäle.

Eine **postalische Adresse** hat eine Ansprechperson **nicht**. Post geht an die Adresse des Kunden oder an den Einsatzort; braucht jemand eine eigene Anschrift, ist er eine eigene Adresse im Adressbuch (ohne Häkchen „ist Kunde") und wird am Auftrag als zusätzliche Adresse geführt.

Die **Kontaktarten** (E-Mail, Telefon, Mobil, Direktwahl, WhatsApp) verwaltet ein Admin unter [Einstellungen](/hilfe/einstellungen); eigene lassen sich ergänzen. Mailadressen und Nummern sind anklickbar – auf dem Telefon führt der Tipp direkt in den Anruf.

Eine Person kann als **Standard** markiert werden. Es gibt höchstens eine je Kunde: Zwei Standardpersonen wären keine Vorgabe, sondern eine Frage. Wer eine zweite markiert, löst die erste ab.

Statt eine Person zu löschen, lässt sich das Häkchen **aktiv** entfernen – sie bleibt dann lesbar, verschwindet aber aus den Vorschlägen. Löschen dürfen nur Admins; die Kontaktangaben der Person gehen dabei mit.

## Geschäftspartner, die keine Kunden sind

Nicht jede Adresse ist ein Kunde. Bei einer Liegenschaftsverwaltung gehört der **Eigentümer** dazu, bei einem grösseren Vorhaben der **Architekt** oder eine **Behörde** – Adressen, die man braucht, an die aber kein Auftrag geht.

Dafür gibt es im Kundenformular das Häkchen **„Ist Kunde"**. Ohne dieses Häkchen bleibt der Eintrag im Adressbuch und in dieser Liste (dort mit dem Vermerk „nur Adresse"), erscheint aber **nicht** in der Auswahl eines Auftrags, einer Anfrage oder eines Rapports.

## Preise & Rabatte

Unter den Stammdaten liegt der Block **"Preise & Rabatte"** mit zwei Listen. Beide wirken ausschliesslich auf **neu erfasste** Zeiteinträge – bestehende behalten Preis und Rabatt, die beim Erfassen galten. Eine Änderung rechnet also nie rückwirkend um.

**Abweichende Preise** überschreiben den Katalogpreis eines Artikels für diesen Kunden. Beim Erfassen eines Zeiteintrags wird dieser Preis eingefroren.

**Rabatt je Artikelklasse** ist der bequemere Weg als Rabatte pro Artikel: Gib dem Kunden z.B. 10% auf die ganze Klasse "Beratung", und jede Artikel dieser Klasse erbt den Rabatt – auch die, die ihr erst später anlegt.

Welcher Rabatt vorgeschlagen wird, entscheidet sich in dieser Reihenfolge:

1. Die Artikel erlaubt keinen Teilrabatt → **0%** (siehe [Artikel](/hilfe/artikel))
2. Ein **Klassenrabatt** für diesen Kunden → dieser Wert
3. Sonst der **Standardrabatt** aus den Stammdaten des Kunden

Es ist immer nur ein Vorschlag: Beim Erfassen lässt sich der Rabatt überschreiben.

## Standardrabatt

Im Block "Rechnungswesen" der Stammdaten. Gilt für alle Artikel, für die kein Klassenrabatt hinterlegt ist.
`,
  },
];
