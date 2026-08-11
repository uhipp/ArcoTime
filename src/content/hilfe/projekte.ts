import type { HilfeArtikel } from "./typen";

export const projekte: HilfeArtikel[] = [
  {
    slug: "projekte",
    titel: "Projekte",
    kategorie: "Stammdaten",
    stichworte: ["projekt anlegen", "kostenstelle", "belegnummer", "startdatum", "sichtbarkeit"],
    routen: ["/projekte"],
    inhalt: `
Jedes Projekt gehört zu genau einem Kunden und ist die Grundlage für die Zeiterfassung.

## Neues Projekt anlegen

**"+ Neues Projekt"** klicken, **Kunde** wählen (oder über **"+ Neuer Kunde"** direkt einen neuen anlegen, siehe [Kunden](/hilfe/kunden)) und eine **Bezeichnung** vergeben.

Weitere Felder mit sinnvollen Standardwerten:

- **Status**: Aktiv/Inaktiv – nur aktive Projekte erscheinen standardmässig in Auswahllisten.
- **Startdatum**: standardmässig heute.
- **Kostenstelle**: wird bei jedem Zeiteintrag dieses Projekts automatisch in den Export übernommen.
- **Nächste Belegnummer**: startet bei 470000 und erhöht sich nach jedem Export automatisch um 1. Nur ändern, wenn an eine bestehende Nummerierung im Buchhaltungssystem angeschlossen werden soll.
- **Für alle Mitarbeitenden sichtbar**: steuert, ob auch andere Mitarbeitende (nicht nur Ersteller:in) auf dieses Projekt Zeit erfassen können.

## Projekte schnell anlegen, ohne die Seite zu verlassen

In den Formularen für **Anfragen** und **Zeiterfassung** gibt es ein **"+ Neues Projekt"** direkt neben dem Projekt-Feld – legt ein minimales Projekt (Kunde + Bezeichnung) sofort an. Fehlt dabei auch der Kunde, lässt sich dieser direkt im selben Dialog mit anlegen (verschachtelte Schnellerfassung). Weitere Angaben (Kostenstelle, Belegnummer, …) können danach jederzeit hier unter "Projekte" ergänzt werden.

Wie bei Kunden erscheint bei einem möglichen Duplikat eine **Dubletten-Warnung**.
`,
  },
];
