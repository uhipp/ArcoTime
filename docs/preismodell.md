# Basisversion und Zusatzmodule

Stand 23.08.2026. Erzeugt von `scripts/preismodell.py`.

Ergänzt `docs/preisvarianten.md`. Dort ging es um die Staffel allein;
hier um die Frage aus der Marktanalyse: Funktionen als Modul anbieten,
damit der **Eintrittspreis** sinkt, ohne den Umsatz dauerhaft zu verlieren.

## 1. Was ein niedrigerer Eintrittspreis bewirkt

Monatspreis der Basisversion, ohne Module, gegen clockin.

| Nutzer | heute – 15.– | Basis 12.– | Basis 10.– | Basis 9.– | Einstieg steil | clockin Starter | clockin Expert |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 15 | 12 | 10 | 9 | 9 | 14 | 20 |
| 2 | 30 | 24 | 20 | 18 | 18 | 18 | 30 |
| 3 | 45 | 36 | 30 | 27 | 33 | 22 | 40 |
| 5 | 75 | 55 | 45 | 40 | 65 | 20 | 50 |
| 8 | 120 | 88 | 72 | 64 | 104 | 32 | 80 |
| 10 | 130 | 100 | 80 | 70 | 120 | 40 | 100 |
| 20 | 220 | 180 | 140 | 120 | 220 | 80 | 200 |

Der Vergleich mit dem **Starter** ist hier der richtige: Eine
Basisversion tritt gegen eine Basisversion an. Gegen den Expert
treten Basis plus Module an.

Schlechtester Faktor gegen clockin Starter (monatlich) im Bereich 1–20:

| Basis | schlechtester Faktor | bei … Nutzern |
| --- | ---: | ---: |
| heute – 15.– | 3.76× | 8 |
| Basis 12.– | 2.76× | 8 |
| Basis 10.– | 2.26× | 8 |
| Basis 9.– | 2.01× | 9 |
| Einstieg steil | 3.26× | 8 |

## 2. Was die Senkung kostet – und wer sie zurückholen muss

**Deckungsquote** = der Umsatz, der durch die Senkung fehlt, geteilt
durch den Umsatz, den alle 100 Betriebe brächten, wenn jeder **ein**
Modul zu CHF 19.– buchte. 40 % heisst: Zwei von fünf Betrieben müssen
ein Modul buchen, dann ist die Senkung bezahlt. Über 100 % heisst:
mit Modulen allein nicht einzuholen.

**oder mehr Kunden** = um wie viel die Kundenzahl steigen muss, damit
die Senkung sich ohne jedes Modul bezahlt. Das ist die eigentliche
Wette: Ein niedrigerer Eintrittspreis soll nicht denselben Kunden
billiger bedienen, sondern mehr Kunden bringen.

**kleinlastig** – heute CHF 5'134 bei 100 Betrieben

| Basis | Umsatz | fehlt | Deckungsquote | oder mehr Kunden |
| --- | ---: | ---: | ---: | ---: |
| heute – 15.– | CHF 5'134 | CHF 0 | – | – |
| Basis 12.– | CHF 4'001 | CHF 1'133 | 60 % | +28 % |
| Basis 10.– | CHF 3'253 | CHF 1'881 | 99 % | +58 % |
| Basis 9.– | CHF 2'879 | CHF 2'255 | 119 % | +78 % |
| Einstieg steil | CHF 4'214 | CHF 920 | 48 % | +22 % |

**mittellastig** – heute CHF 10'657 bei 100 Betrieben

| Basis | Umsatz | fehlt | Deckungsquote | oder mehr Kunden |
| --- | ---: | ---: | ---: | ---: |
| heute – 15.– | CHF 10'657 | CHF 0 | – | – |
| Basis 12.– | CHF 8'340 | CHF 2'317 | 122 % | +28 % |
| Basis 10.– | CHF 6'662 | CHF 3'995 | 210 % | +60 % |
| Basis 9.– | CHF 5'823 | CHF 4'834 | 254 % | +83 % |
| Einstieg steil | CHF 9'715 | CHF 942 | 50 % | +10 % |

## 3. Welche Funktionen sich überhaupt abtrennen lassen

**Einstiegspunkte** = Navigationslink, eigene Seiten und eigene
Actions-Datei, also die Stellen, an denen eine Sperre sitzen muss.
Am 23.08.2026 im Code gezählt. Zum Vergleich: Die bestehende
Disposition kommt mit vier Stellen aus – das ist der Maßstab für
„billig abtrennbar“.

| Funktion | Preis | Bezug | Stellen | Zustand |
| --- | ---: | --- | ---: | --- |
| Disposition | CHF 49.– | pauschal | 4 | vorhanden |
| Zeitkonto | CHF 4.– | je Lizenz | 7 | vorhanden |
| Anfragen und Absenzen | CHF 2.– | je Lizenz | 8 | neu |
| Buchhaltungs-Export | CHF 19.– | pauschal | 8 | neu |
| Mehrere Standorte | CHF 19.– | pauschal | 4 | neu |
| Änderungsprotokoll | CHF 9.– | pauschal | 2 | neu |

Nicht abtrennbar, gemessen an derselben Zählung:

| Funktion | Stellen | Grund |
| --- | ---: | --- |
| Verrechnung (Preise, Rabatt, MWST) | 56 | steckt in Artikel, Konditionen, Positionen, Auswertungen |
| Dokumente | 56 | hängt an Kunde, Auftrag, Rapport, Anfrage |
| Unterschrift auf dem Rapport | 17 | gehört zum Rapport und ist das Verkaufsargument |

## 4. Beispielrechnung: Basis 10.– plus Module

Was ein Betrieb am Ende zahlt, wenn er das bucht was er braucht –
gegen clockin Expert mit 24 Monaten, also gegen das volle Paket.

| Nutzer | Kleinstbetrieb, nur Zeit und Rapport | mit Absenzverwaltung | mit Absenzen und Buchhaltung | volles Paket | clockin Expert 24 Mt. |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 10 | 12 | 31 | 112 | 19 |
| 3 | 30 | 36 | 55 | 144 | 37 |
| 5 | 45 | 55 | 74 | 171 | 45 |
| 10 | 80 | 100 | 119 | 236 | 90 |
| 20 | 140 | 180 | 199 | 356 | 180 |

