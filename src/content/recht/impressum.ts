import type { RechtsDokument } from "./typen";

export const impressum: RechtsDokument = {
  slug: "impressum",
  titel: "Impressum",
  stand: "16. August 2026",
  version: "1.0",
  kurz: "Wer hinter ArcoTime steht.",
  markdown: `
## Anbieterin

**Arcos Group GmbH**
Hauptstrasse 1
4447 Känerkinden
Schweiz

Unternehmens-Identifikationsnummer: **CHE-116.097.916**
Sitz: 4447 Känerkinden. Eingetragen im Handelsregister des Kantons
Basel-Landschaft.

Vertreten durch: **Urs Hipp**, Geschäftsführer

## Kontakt

E-Mail: [info@arcos.ch](mailto:info@arcos.ch)
Telefon: +41 79 761 13 85
Web: [www.arcos.ch](https://www.arcos.ch)

Für Fragen zum Betrieb von ArcoTime:
[support@arcotime.ch](mailto:support@arcotime.ch)
Für Anliegen zum Datenschutz:
[datenschutz@arcocloud.ch](mailto:datenschutz@arcocloud.ch)

## ArcoTime

ArcoTime ist ein Produkt der Arcos Group GmbH. Die Anwendung wird als
Software as a Service betrieben; die Daten liegen in einem Rechenzentrum in
der Schweiz. Einzelheiten dazu stehen in der
[Datenschutzerklärung](/datenschutz).

## Haftung für Inhalte

Die Inhalte dieser Seiten werden mit Sorgfalt erstellt. Für die Richtigkeit,
Vollständigkeit und Aktualität wird keine Gewähr übernommen. Für den
vertraglichen Leistungsumfang der Anwendung gelten die
[Allgemeinen Geschäftsbedingungen](/agb).

## Haftung für Links

Diese Seiten enthalten Verweise auf Websites Dritter. Auf deren Inhalte hat
die Arcos Group GmbH keinen Einfluss und übernimmt dafür keine Verantwortung.
Für die Inhalte verlinkter Seiten ist stets deren Betreiberin oder Betreiber
verantwortlich.

## Urheberrecht

Die auf diesen Seiten veröffentlichten Inhalte, die Software ArcoTime sowie
deren Gestaltung sind urheberrechtlich geschützt. Jede Verwendung ausserhalb
der Grenzen des Urheberrechts bedarf der schriftlichen Zustimmung der Arcos
Group GmbH.
`.trim(),
};
