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

## Neues Projekt anlegen

**"+ Neues Projekt"** klicken, **Kunde** wählen (oder über **"+ Neuer Kunde"** direkt einen neuen anlegen, siehe [Kunden](/hilfe/kunden)) und eine **Bezeichnung** vergeben.

Weitere Felder mit sinnvollen Standardwerten:

- **Status**: Aktiv/Inaktiv – nur aktive Projekte erscheinen standardmässig in Auswahllisten.
- **Startdatum**: standardmässig heute.
- **Projektleitung**: die verantwortliche Person. Sie wird beim Anlegen eines [Rapports](/hilfe/rapporte) für dieses Projekt automatisch als ausführende Person vorgeschlagen – änderbar bleibt das. Bei einem bestehenden Rapport wird nichts überschrieben, dort hat ja jemand bewusst gewählt.
- **Kostenstelle**: wird bei jedem Zeiteintrag dieses Projekts automatisch in den Export übernommen.
- **Nächste Belegnummer**: startet bei 470000 und erhöht sich nach jedem Export automatisch um 1. Nur ändern, wenn an eine bestehende Nummerierung im Buchhaltungssystem angeschlossen werden soll.
- **Für alle Mitarbeitende sichtbar**: Mit Häkchen (Standard) sehen alle das Projekt und können darauf Zeit erfassen. Ohne Häkchen sehen es nur die Personen im **Projektteam** sowie Admins.

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
