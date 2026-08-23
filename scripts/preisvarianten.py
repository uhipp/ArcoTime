#!/usr/bin/env python3
"""
Rechnet Staffel-Varianten für ArcoTime durch.

Aufruf:
    python3 scripts/preisvarianten.py [ziel.md]

Zwei Fragen je Variante:
  1. Wie stehen wir damit gegen clockin? (objektiv, aus den Preisen)
  2. Was kostet oder bringt sie an Umsatz? (nur so gut wie die angenommene
     Kundenverteilung – siehe VERTEILUNGEN)

Die Verteilungen sind ANNAHMEN und keine Daten. Sie stehen absichtlich als
zwei gegenläufige Szenarien da: Wer nur eine Zahl rechnet, hält sie für die
Wahrheit. Sobald es echte Kunden gibt, gehören die wirklichen Betriebsgrössen
hier hinein.
"""
import sys

# --- clockin, von clockin.de/preise am 23.08.2026 -------------------------
CLOCKIN_EXPERT = (9.99, 9.49, 8.99)   # monatlich, 12 Mt., 24 Mt.
PLATTFORM_PAUSCHALE = 10.0            # je Monat unter 5 Nutzern


def clockin_expert(n, laufzeit=0):
    summe = n * CLOCKIN_EXPERT[laufzeit]
    if n < 5:
        summe += PLATTFORM_PAUSCHALE
    return summe


# --- Varianten -----------------------------------------------------------
# Staffel als [(bis einschliesslich n Benutzer, CHF je Benutzer und Monat)].
# Volume-Pricing: Die erreichte Stufe gilt für ALLE Benutzer.
# solo: abweichender Preis für genau einen Benutzer (Schaufensterzahl).
# rabatt: (12 Monate, 24 Monate) als Faktor auf den Monatspreis.
VARIANTEN = {
    "A – heute": {
        "staffel": [(9, 15), (19, 13), (10**9, 11)],
        "beschreibung": "Der Bestand. Erste Stufe bis 9 Benutzer.",
    },
    "B – Stufe ab 5": {
        "staffel": [(4, 15), (9, 13), (19, 11), (10**9, 10)],
        "beschreibung": "Eine Stufe früher, dort wo der Handwerksbetrieb sitzt.",
    },
    "C – feiner ab 3": {
        "staffel": [(2, 15), (4, 13), (9, 11), (19, 10), (10**9, 9)],
        "beschreibung": "Fünf Stufen, greift schon beim dritten Mitarbeitenden.",
    },
    "D – Solo plus heute": {
        "staffel": [(9, 15), (19, 13), (10**9, 11)],
        "solo": 12,
        "beschreibung": "Nur eine kleine Zahl fürs Schaufenster, Staffel unverändert.",
    },
    "E – B plus Laufzeit": {
        "staffel": [(4, 15), (9, 13), (19, 11), (10**9, 10)],
        "rabatt": (0.95, 0.90),
        "beschreibung": "Variante B, dazu 12 Monate −5 % und 24 Monate −10 %.",
    },
    "G – B plus Solo": {
        "staffel": [(4, 15), (9, 13), (19, 11), (10**9, 10)],
        "solo": 12,
        "beschreibung": "Variante B und die Solo-Zahl zusammen, ohne Laufzeitrabatt.",
    },
    "F – offensiv": {
        "staffel": [(2, 14), (4, 12), (9, 10), (19, 9), (10**9, 8)],
        "rabatt": (0.95, 0.90),
        "beschreibung": "Deutlich unter dem Bestand, mit Laufzeitrabatten.",
    },
}


def preis(variante, n, laufzeit=0):
    v = VARIANTEN[variante]
    if n == 1 and "solo" in v:
        satz = v["solo"]
    else:
        satz = next(p for grenze, p in v["staffel"] if n <= grenze)
    summe = n * satz
    if laufzeit and "rabatt" in v:
        summe *= v["rabatt"][laufzeit - 1]
    return summe


# --- Angenommene Kundenverteilungen (je 100 Betriebe) --------------------
VERTEILUNGEN = {
    "kleinlastig": {1: 40, 2: 20, 3: 15, 5: 10, 8: 7, 12: 4, 20: 3, 35: 1},
    "mittellastig": {1: 15, 2: 12, 3: 12, 5: 18, 8: 15, 12: 12, 20: 10, 35: 6},
}

GROESSEN = [1, 2, 3, 5, 8, 10, 15, 20, 30, 50]


def z(*teile):
    return "| " + " | ".join(str(t) for t in teile) + " |"


def f(x):
    return f"{x:,.0f}".replace(",", "'")


aus = []
aus.append("# Staffel-Varianten für ArcoTime")
aus.append("")
aus.append("Stand 23.08.2026. Erzeugt von `scripts/preisvarianten.py`.")
aus.append("")
aus.append("Grundlage ist `docs/preisvergleich.md`: Der Wendepunkt gegen clockin liegt")
aus.append("heute bei zwei Nutzern, und die Schmerzzone ist fünf bis neun Benutzer")
aus.append("(Faktor 1.67 gegen clockin Expert mit 24 Monaten Bindung), weil unsere erste")
aus.append("Stufe bis 9 läuft, während clockins Preis je Nutzer ab 5 flach ist.")
aus.append("")
aus.append("## Die Varianten")
aus.append("")
for name, v in VARIANTEN.items():
    stufen = []
    for i, (grenze, p) in enumerate(v["staffel"]):
        ab = 1 if i == 0 else v["staffel"][i - 1][0] + 1
        bis = "" if grenze > 10**8 else f"–{grenze}"
        stufen.append(f"{ab}{bis}: {p}")
    text = " · ".join(stufen)
    if "solo" in v:
        text = f"1 Benutzer: {v['solo']} · " + text
    if "rabatt" in v:
        text += " · 12 Mt. −5 %, 24 Mt. −10 %"
    aus.append(f"**{name}** — {v['beschreibung']}")
    aus.append(f"  CHF je Benutzer und Monat: {text}")
    aus.append("")

# --- Tabelle: Monatspreis je Variante ------------------------------------
aus.append("## 1. Monatspreis (monatliche Zahlung)")
aus.append("")
aus.append(z("Nutzer", *VARIANTEN.keys(), "clockin Expert"))
aus.append(z(*(["---:"] * (len(VARIANTEN) + 2))))
for n in GROESSEN:
    aus.append(z(n, *[f(preis(k, n)) for k in VARIANTEN], f"{clockin_expert(n):.0f}"))
aus.append("")

# --- Tabelle: Faktor gegen clockin Expert 24 Monate ---------------------
aus.append("## 2. Faktor gegen clockin Expert mit 24 Monaten Bindung")
aus.append("")
aus.append("Unter 1.00 heisst: Wir sind günstiger. Der schlechteste Wert je Spalte")
aus.append("entscheidet, wie das Angebot wahrgenommen wird.")
aus.append("")
aus.append(z("Nutzer", *VARIANTEN.keys()))
aus.append(z(*(["---:"] * (len(VARIANTEN) + 1))))
for n in GROESSEN:
    c = clockin_expert(n, 2)
    aus.append(z(n, *[f"{preis(k, n, 2 if 'rabatt' in VARIANTEN[k] else 0)/c:.2f}×"
                      for k in VARIANTEN]))
aus.append("")
aus.append(z("**schlechtester Wert 1–20**", *[
    f"**{max(preis(k, n, 2 if 'rabatt' in VARIANTEN[k] else 0)/clockin_expert(n, 2) for n in range(1, 21)):.2f}×**"
    for k in VARIANTEN]))
aus.append("")

# --- Tabelle: Umsatz ----------------------------------------------------
aus.append("## 3. Monatsumsatz bei 100 Betrieben")
aus.append("")
aus.append("Zwei gegenläufige Annahmen zur Kundenverteilung – **keine Daten.** Sobald es")
aus.append("echte Kunden gibt, gehören die wirklichen Betriebsgrössen ins Skript.")
aus.append("")
for vname, verteilung in VERTEILUNGEN.items():
    zusammen = " · ".join(f"{n} Pers.: {anz}" for n, anz in verteilung.items())
    aus.append(f"**{vname}** — {zusammen}")
aus.append("")
aus.append(z("Variante", *VERTEILUNGEN.keys(), "gegen heute"))
aus.append(z("---", "---:", "---:", "---:"))
basis = {}
for vname, verteilung in VERTEILUNGEN.items():
    basis[vname] = sum(anz * preis("A – heute", n) for n, anz in verteilung.items())
for k in VARIANTEN:
    werte = []
    abweichungen = []
    for vname, verteilung in VERTEILUNGEN.items():
        laufzeit = 2 if "rabatt" in VARIANTEN[k] else 0
        summe = sum(anz * preis(k, n, laufzeit) for n, anz in verteilung.items())
        werte.append(f"CHF {f(summe)}")
        abweichungen.append((summe / basis[vname] - 1) * 100)
    mittel = sum(abweichungen) / len(abweichungen)
    aus.append(z(k, *werte, f"{mittel:+.0f} %"))
aus.append("")
aus.append("Bei den Varianten mit Laufzeitrabatt ist der Umsatz mit **24 Monaten**")
aus.append("gerechnet, also im schlechtesten Fall. Wer monatlich zahlt, zahlt mehr.")
aus.append("")

ziel = sys.argv[1] if len(sys.argv) > 1 else None
text = "\n".join(aus) + "\n"
if ziel:
    open(ziel, "w", encoding="utf-8").write(text)
    print(f"geschrieben: {ziel}")
else:
    print(text)
