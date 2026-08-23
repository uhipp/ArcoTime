# Staffel-Varianten für ArcoTime

Stand 23.08.2026. Erzeugt von `scripts/preisvarianten.py`.

Grundlage ist `docs/preisvergleich.md`: Der Wendepunkt gegen clockin liegt
heute bei zwei Nutzern, und die Schmerzzone ist fünf bis neun Benutzer
(Faktor 1.67 gegen clockin Expert mit 24 Monaten Bindung), weil unsere erste
Stufe bis 9 läuft, während clockins Preis je Nutzer ab 5 flach ist.

## Die Varianten

**A – heute** — Der Bestand. Erste Stufe bis 9 Benutzer.
  CHF je Benutzer und Monat: 1–9: 15 · 10–19: 13 · 20: 11

**B – Stufe ab 5** — Eine Stufe früher, dort wo der Handwerksbetrieb sitzt.
  CHF je Benutzer und Monat: 1–4: 15 · 5–9: 13 · 10–19: 11 · 20: 10

**C – feiner ab 3** — Fünf Stufen, greift schon beim dritten Mitarbeitenden.
  CHF je Benutzer und Monat: 1–2: 15 · 3–4: 13 · 5–9: 11 · 10–19: 10 · 20: 9

**D – Solo plus heute** — Nur eine kleine Zahl fürs Schaufenster, Staffel unverändert.
  CHF je Benutzer und Monat: 1 Benutzer: 12 · 1–9: 15 · 10–19: 13 · 20: 11

**E – B plus Laufzeit** — Variante B, dazu 12 Monate −5 % und 24 Monate −10 %.
  CHF je Benutzer und Monat: 1–4: 15 · 5–9: 13 · 10–19: 11 · 20: 10 · 12 Mt. −5 %, 24 Mt. −10 %

**G – B plus Solo** — Variante B und die Solo-Zahl zusammen, ohne Laufzeitrabatt.
  CHF je Benutzer und Monat: 1 Benutzer: 12 · 1–4: 15 · 5–9: 13 · 10–19: 11 · 20: 10

**F – offensiv** — Deutlich unter dem Bestand, mit Laufzeitrabatten.
  CHF je Benutzer und Monat: 1–2: 14 · 3–4: 12 · 5–9: 10 · 10–19: 9 · 20: 8 · 12 Mt. −5 %, 24 Mt. −10 %

## 1. Monatspreis (monatliche Zahlung)

| Nutzer | A – heute | B – Stufe ab 5 | C – feiner ab 3 | D – Solo plus heute | E – B plus Laufzeit | G – B plus Solo | F – offensiv | clockin Expert |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 15 | 15 | 15 | 12 | 15 | 12 | 14 | 20 |
| 2 | 30 | 30 | 30 | 30 | 30 | 30 | 28 | 30 |
| 3 | 45 | 45 | 39 | 45 | 45 | 45 | 36 | 40 |
| 5 | 75 | 65 | 55 | 75 | 65 | 65 | 50 | 50 |
| 8 | 120 | 104 | 88 | 120 | 104 | 104 | 80 | 80 |
| 10 | 130 | 110 | 100 | 130 | 110 | 110 | 90 | 100 |
| 15 | 195 | 165 | 150 | 195 | 165 | 165 | 135 | 150 |
| 20 | 220 | 200 | 180 | 220 | 200 | 200 | 160 | 200 |
| 30 | 330 | 300 | 270 | 330 | 300 | 300 | 240 | 300 |
| 50 | 550 | 500 | 450 | 550 | 500 | 500 | 400 | 500 |

## 2. Faktor gegen clockin Expert mit 24 Monaten Bindung

Unter 1.00 heisst: Wir sind günstiger. Der schlechteste Wert je Spalte
entscheidet, wie das Angebot wahrgenommen wird.

| Nutzer | A – heute | B – Stufe ab 5 | C – feiner ab 3 | D – Solo plus heute | E – B plus Laufzeit | G – B plus Solo | F – offensiv |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 0.79× | 0.79× | 0.79× | 0.63× | 0.71× | 0.63× | 0.66× |
| 2 | 1.07× | 1.07× | 1.07× | 1.07× | 0.96× | 1.07× | 0.90× |
| 3 | 1.22× | 1.22× | 1.05× | 1.22× | 1.10× | 1.22× | 0.88× |
| 5 | 1.67× | 1.45× | 1.22× | 1.67× | 1.30× | 1.45× | 1.00× |
| 8 | 1.67× | 1.45× | 1.22× | 1.67× | 1.30× | 1.45× | 1.00× |
| 10 | 1.45× | 1.22× | 1.11× | 1.45× | 1.10× | 1.22× | 0.90× |
| 15 | 1.45× | 1.22× | 1.11× | 1.45× | 1.10× | 1.22× | 0.90× |
| 20 | 1.22× | 1.11× | 1.00× | 1.22× | 1.00× | 1.11× | 0.80× |
| 30 | 1.22× | 1.11× | 1.00× | 1.22× | 1.00× | 1.11× | 0.80× |
| 50 | 1.22× | 1.11× | 1.00× | 1.22× | 1.00× | 1.11× | 0.80× |

| **schlechtester Wert 1–20** | **1.67×** | **1.45×** | **1.22×** | **1.67×** | **1.30×** | **1.45×** | **1.00×** |

## 3. Monatsumsatz bei 100 Betrieben

Zwei gegenläufige Annahmen zur Kundenverteilung – **keine Daten.** Sobald es
echte Kunden gibt, gehören die wirklichen Betriebsgrössen ins Skript.

**kleinlastig** — 1 Pers.: 40 · 2 Pers.: 20 · 3 Pers.: 15 · 5 Pers.: 10 · 8 Pers.: 7 · 12 Pers.: 4 · 20 Pers.: 3 · 35 Pers.: 1
**mittellastig** — 1 Pers.: 15 · 2 Pers.: 12 · 3 Pers.: 12 · 5 Pers.: 18 · 8 Pers.: 15 · 12 Pers.: 12 · 20 Pers.: 10 · 35 Pers.: 6

| Variante | kleinlastig | mittellastig | gegen heute |
| --- | ---: | ---: | ---: |
| A – heute | CHF 5'134 | CHF 10'657 | +0 % |
| B – Stufe ab 5 | CHF 4'731 | CHF 9'539 | -9 % |
| C – feiner ab 3 | CHF 4'286 | CHF 8'493 | -18 % |
| D – Solo plus heute | CHF 5'014 | CHF 10'612 | -1 % |
| E – B plus Laufzeit | CHF 4'258 | CHF 8'585 | -18 % |
| G – B plus Solo | CHF 4'611 | CHF 9'494 | -11 % |
| F – offensiv | CHF 3'521 | CHF 6'889 | -33 % |

Bei den Varianten mit Laufzeitrabatt ist der Umsatz mit **24 Monaten**
gerechnet, also im schlechtesten Fall. Wer monatlich zahlt, zahlt mehr.

