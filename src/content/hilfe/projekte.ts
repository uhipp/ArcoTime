import type { HilfeArtikel } from "./typen";

export const projekte: HilfeArtikel[] = [
  {
    slug: "projekte",
    titel: "Projekte",
    kategorie: "Stammdaten",
    stichworte: ["projekt anlegen", "kostenstelle", "belegnummer", "startdatum", "sichtbarkeit", "projektleitung", "projektleiter", "projektteam", "team", "zugriff", "zuweisen"],
    routen: ["/projekte"],
    inhalt: `
Jedes Projekt gehört zu genau einem Kunden und ist die Grundlage für die Zeiterfassung.

**Sortieren**: Ein Klick auf einen Spaltenkopf sortiert die Liste danach, ein zweiter Klick dreht die Richtung um. Filter und Suche bleiben dabei erhalten, und die Sortierung steht in der Adresse – sie überlebt also ein Neuladen.

**Spalten wählen**: Über „Spalten“ oben rechts stellst du ein, welche Angaben die Liste zeigt – zusätzlich stehen Startdatum, Sichtbarkeit und Notizen zur Verfügung. Die Auswahl gilt nur für deine Anmeldung.

## Neues Projekt anlegen

**"+ Neues Projekt"** klicken, **Kunde** wählen (oder über **"+ Neuer Kunde"** direkt einen neuen anlegen, siehe [Kunden](/hilfe/kunden)) und eine **Bezeichnung** vergeben.

**Einsatzort**: Führt der Betrieb [Standorte](/hilfe/kunden), steht direkt unter dem Kunden das Feld **Einsatzort** – wo gearbeitet wird. Vorgeschlagen ist der Standardstandort des Kunden; die Auswahl zeigt nur Orte dieses Kunden und wechselt mit ihm. Der Einsatzort bestimmt die Adresse auf dem Arbeitsrapport und die Anfahrt.

Kunde und Einsatzort sind zwei verschiedene Aussagen, keine Doppelung: **wer bestellt** und **wo gearbeitet wird**. Dieselbe Liegenschaft kann einen Auftrag mit der Verwaltung und einen mit dem Eigentümer tragen – zwei Aufträge, ein Ort. Ist die Ortsebene ausgeschaltet, gibt es das Feld nicht und der Standardstandort des Kunden wird still gesetzt.

**Anfahrt km und Zugang** stehen am Auftrag, nicht am Kunden und nicht an der Adresse:

- **Anfahrt km (verrechnet je Einsatz)** – in der Regel Hin- und Rückfahrt. Wird bei [Artikeln](/hilfe/artikel) vorgeschlagen, die als Anreise gekennzeichnet sind. Das Feld heisst bewusst nicht „Distanz": Sonst trägt der eine die einfache Strecke ein und der andere Hin und Zurück, und niemand merkt es.
- **Zugang** – „Schlüssel Nr. 4 im Kasten links, Code 4711, sonst beim Hauswart klingeln (079…)". Steht auf dem Arbeitsrapport; dort nützt es mehr als in einer Notiz, die niemand liest.

Warum am Auftrag: Eine Verwaltung mit vierzig Liegenschaften hat vierzig Distanzen, und ein Unterhaltsvertrag kann am selben Ort andere Ansätze haben als eine Sanierung. Vor allem aber kann ein Betrieb **ohne** Standorte so genau dasselbe wie einer mit – läge es an der Adresse, hätte er keinen Weg dorthin.

**Übernommen vom letzten Auftrag**: Legst du einen zweiten Auftrag an derselben Adresse an, schlägt ArcoTime Anfahrt und Zugang aus dem vorherigen vor und sagt, woher der Wert kommt. Überschreiben genügt. Beim **ersten** Auftrag an einer Adresse bleiben die Felder leer – ein Wert von einer anderen Liegenschaft wäre plausibel und falsch. Was übernommen wird, stellt ein Admin unter [Einstellungen](/hilfe/einstellungen) ein.

Weitere Felder mit sinnvollen Standardwerten:

- **Status**: Aktiv/Inaktiv – nur aktive Projekte erscheinen standardmässig in Auswahllisten.
- **Startdatum**: standardmässig heute.
- **Projektleitung**: die verantwortliche Person. Sie wird beim Anlegen eines [Rapports](/hilfe/rapporte) für dieses Projekt automatisch als ausführende Person vorgeschlagen – änderbar bleibt das. Bei einem bestehenden Rapport wird nichts überschrieben, dort hat ja jemand bewusst gewählt.
- **Kostenstelle**: wird bei jedem Zeiteintrag dieses Projekts automatisch in den Export übernommen.
- **Nächste Belegnummer**: startet bei 470000 und erhöht sich nach jedem Export automatisch um 1. Nur ändern, wenn an eine bestehende Nummerierung im Buchhaltungssystem angeschlossen werden soll.
- **Für alle Mitarbeitende sichtbar**: Mit Häkchen (Standard) sehen alle das Projekt und können darauf Zeit erfassen. Ohne Häkchen sehen es nur die Personen im **Projektteam** sowie Admins.

## Die Auftragsmaske

Wie bei den Kunden: **links die Liste**, rechts der gewählte Auftrag, und die Seite scrollt nicht. Alles Weitere steht in Reitern:

| Reiter | Inhalt |
|---|---|
| Auftrag | Kunde, Einsatzort, Anfahrt, Zugang, Projektleitung, Kostenstelle, Belegnummer, Notizen |
| Adressen | die zusätzlichen Adressen mit Rolle |
| Team | wer auf den Auftrag zugreifen darf |
| Rapporte | alle Rapporte dieses Auftrags |
| Dokumente | Dateien zum Auftrag |

## Zusätzliche Adressen

Im Reiter **Adressen** steht, wer sonst an diesem Auftrag beteiligt ist: **Eigentümer, Verwaltung, Mieter, Hauswart, Architekt, Bauleitung, Subunternehmer, Behörde**. Die Rollen verwaltet ein Admin unter [Einstellungen](/hilfe/einstellungen).

Der Gewinn ist die **einmalige Erfassung**: Der Architekt steht genau einmal im Adressbuch und ist an zehn Aufträgen beteiligt. Zieht sein Büro um, wird eine Adresse geändert und es stimmt überall. Wäre die Adresse jedes Mal neu erfasst, wäre sie nach dem Umzug neunmal falsch.

Fehlt eine Adresse in der Auswahl, wird sie einmal unter [Kunden](/hilfe/kunden) erfasst – **ohne** Häkchen „ist Kunde", wenn kein Auftrag an sie geht.

Eine Beteiligung kann **ab** und **bis** tragen. Ein Rollenwechsel braucht ein Datum: Wer bis gestern Eigentümer war, war es für die Rapporte von damals trotzdem.

Nummer und Mailadresse der beteiligten Adressen sind anklickbar – auf dem Telefon führt der Tipp direkt in den Anruf. Das ist der Punkt der ganzen Sache: Wer vor verschlossener Tür steht, ruft an.

## Projektteam

Auf der Detailseite eines Projekts steht unter **Projektteam**, wer darauf zugreifen darf. Wer ein Projekt anlegt, gehört automatisch dazu – sonst würde man sich mit dem Entfernen des Sichtbarkeits-Häkchens das eigene Projekt wegnehmen.

Solange das Projekt für alle sichtbar ist, hat das Team keine Wirkung; es greift erst, wenn du das Häkchen entfernst. Deshalb lohnt es sich, das Team **vor** dem Abschotten zu füllen.

Wird jemand aus dem Team entfernt, bleiben die von dieser Person bereits erfassten Zeiten unverändert bestehen – es geht nur um den Zugriff von hier an.

## Projekte schnell anlegen, ohne die Seite zu verlassen

In den Formularen für **Anfragen** und **Zeiterfassung** gibt es ein **"+ Neues Projekt"** direkt neben dem Projekt-Feld – legt ein minimales Projekt (Kunde + Bezeichnung) sofort an. Fehlt dabei auch der Kunde, lässt sich dieser direkt im selben Dialog mit anlegen (verschachtelte Schnellerfassung). Weitere Angaben (Kostenstelle, Belegnummer, …) können danach jederzeit hier unter "Projekte" ergänzt werden.

Wie bei Kunden erscheint bei einem möglichen Duplikat eine **Dubletten-Warnung**.
`,
  },
];
