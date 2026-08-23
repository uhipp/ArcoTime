#!/usr/bin/env python3
"""
Preisvergleich ArcoTime gegen clockin über verschiedene Betriebsgrössen.

Aufruf:
    python3 scripts/preisvergleich.py [ziel.md]

Quellen der Zahlen:
  ArcoTime  src/lib/lizenzpreise.ts (Stand 23.08.2026)
  clockin   clockin.de/preise, gelesen am 23.08.2026

Zur Währung: Die Zahlen stehen in CHF und EUR und werden NICHT umgerechnet.
Der Vergleich läuft auf Parität (1:1) – das ist die für uns unfreundlichste
Annahme, weil der Franken üblicherweise stärker ist. Wer den Tageskurs
einsetzen will, ändert KURS unten; an den Aussagen ändert ein Ausschlag von
fünf bis zehn Prozent nichts, weil die Unterschiede ein Mehrfaches betragen.
"""
import sys

KURS = 1.00  # EUR je CHF, siehe Kopfkommentar

# --- ArcoTime, aus src/lib/lizenzpreise.ts ---------------------------------
STUFEN = [(9, 15), (19, 13), (10**9, 11)]          # bis n Benutzer -> CHF/Monat
MODUL_DISPOSITION = 49                              # Pauschale je Monat
MODUL_ZEITKONTO = 4                                 # je Lizenz und Monat


def arcotime(n, disposition=False, zeitkonto=False):
    satz = next(preis for grenze, preis in STUFEN if n <= grenze)
    summe = n * satz
    if disposition:
        summe += MODUL_DISPOSITION
    if zeitkonto:
        summe += n * MODUL_ZEITKONTO
    return summe


# --- clockin, von clockin.de/preise ---------------------------------------
# (monatlich, 12 Monate, 24 Monate) je Nutzer und Monat
CLOCKIN = {
    "Starter": (3.99, 3.79, 3.59),
    "Pro": (6.99, 6.64, 6.29),
    "Expert": (9.99, 9.49, 8.99),
}
PLATTFORM_PAUSCHALE = 10.0   # je Monat, solange unter 5 Nutzer


def clockin(n, paket, laufzeit=0):
    satz = CLOCKIN[paket][laufzeit]
    summe = n * satz
    if n < 5:
        summe += PLATTFORM_PAUSCHALE
    return summe


GROESSEN = [1, 2, 3, 4, 5, 8, 10, 15, 20, 30, 50]


def chf(x):
    return f"{x:,.2f}".replace(",", "'")


def zeile(*z):
    return "| " + " | ".join(str(x) for x in z) + " |"


aus = []
aus.append("# Preisvergleich ArcoTime gegen clockin")
aus.append("")
aus.append("Stand 23.08.2026. Erzeugt von `scripts/preisvergleich.py` – wer die Zahlen")
aus.append("ändert, ändert das Skript und lässt es neu laufen.")
aus.append("")
aus.append("**Quellen.** ArcoTime: `src/lib/lizenzpreise.ts`. clockin: clockin.de/preise,")
aus.append("gelesen am 23.08.2026.")
aus.append("")
aus.append("**Währung.** CHF und EUR werden nicht umgerechnet, der Vergleich läuft auf")
aus.append("Parität. Das ist die für uns unfreundlichste Annahme – der Franken ist")
aus.append("üblicherweise stärker. An den Aussagen ändert ein Ausschlag von fünf bis zehn")
aus.append("Prozent nichts, weil die Unterschiede ein Mehrfaches betragen.")
aus.append("")
aus.append("**Was mit was verglichen wird.** clockins **Expert** ist das Paket, das")
aus.append("ArcoTime inhaltlich entspricht: digitale Unterschriften, Projektakten und")
aus.append("Projektexport liegen dort, Kundenverwaltung und Rollen im **Pro**. Der")
aus.append("**Starter** ist im Kern eine Stempeluhr ohne Kundenverwaltung – ihn mit")
aus.append("ArcoTime zu vergleichen, vergleicht zwei verschiedene Produkte. Alle drei")
aus.append("stehen trotzdem in der Tabelle, weil der Kunde sie auch alle drei sieht.")
aus.append("")

# --- Tabelle 1: Monat, Grundpreis -----------------------------------------
aus.append("## 1. Monatspreis ohne Zusatzmodule, monatliche Zahlung")
aus.append("")
aus.append(zeile("Nutzer", "ArcoTime", "clockin Starter", "clockin Pro", "clockin Expert"))
aus.append(zeile("---:", "---:", "---:", "---:", "---:"))
for n in GROESSEN:
    aus.append(zeile(
        n,
        f"CHF {chf(arcotime(n))}",
        f"€ {chf(clockin(n,'Starter'))}",
        f"€ {chf(clockin(n,'Pro'))}",
        f"€ {chf(clockin(n,'Expert'))}",
    ))
aus.append("")
aus.append("Die Plattform-Pauschale von 10 €/Monat unter fünf Nutzern steckt in den")
aus.append("clockin-Spalten. Sie ist der Grund, warum die beworbenen Kleinpreise für")
aus.append("einen Kleinstbetrieb nicht gelten.")
aus.append("")

# --- Tabelle 2: je Nutzer -------------------------------------------------
aus.append("## 2. Dasselbe je Nutzer – hier sieht man den Wendepunkt")
aus.append("")
aus.append(zeile("Nutzer", "ArcoTime", "clockin Starter", "clockin Pro", "clockin Expert"))
aus.append(zeile("---:", "---:", "---:", "---:", "---:"))
for n in GROESSEN:
    aus.append(zeile(
        n,
        f"CHF {chf(arcotime(n)/n)}",
        f"€ {chf(clockin(n,'Starter')/n)}",
        f"€ {chf(clockin(n,'Pro')/n)}",
        f"€ {chf(clockin(n,'Expert')/n)}",
    ))
aus.append("")

# --- Tabelle 3: guenstigster clockin-Fall --------------------------------
aus.append("## 3. Der schlechteste Fall für uns: clockin Expert mit 24 Monaten Bindung")
aus.append("")
aus.append(zeile("Nutzer", "ArcoTime", "clockin Expert 24 Mt.", "Unterschied", "Faktor"))
aus.append(zeile("---:", "---:", "---:", "---:", "---:"))
for n in GROESSEN:
    a = arcotime(n)
    c = clockin(n, "Expert", 2)
    aus.append(zeile(
        n, f"CHF {chf(a)}", f"€ {chf(c)}",
        f"{'+' if a>c else ''}{chf(a-c)}",
        f"{a/c:.2f}×",
    ))
aus.append("")

# --- Tabelle 4: mit Modulen ---------------------------------------------
aus.append("## 4. ArcoTime mit Zusatzmodulen")
aus.append("")
aus.append("Disposition CHF 49.– pauschal, Zeitkonto CHF 4.– je Lizenz. Bei clockin")
aus.append("kostet die Schichtplanung 27 €/Monat pauschal; ein Zeitkonto führt sie im")
aus.append("Paket.")
aus.append("")
aus.append(zeile("Nutzer", "nur Lizenzen", "+ Disposition", "+ Zeitkonto", "beide",
                 "clockin Expert + Schichtplan"))
aus.append(zeile("---:", "---:", "---:", "---:", "---:", "---:"))
for n in GROESSEN:
    aus.append(zeile(
        n,
        f"CHF {chf(arcotime(n))}",
        f"CHF {chf(arcotime(n, disposition=True))}",
        f"CHF {chf(arcotime(n, zeitkonto=True))}",
        f"CHF {chf(arcotime(n, True, True))}",
        f"€ {chf(clockin(n,'Expert')+27)}",
    ))
aus.append("")

# --- Wendepunkte ---------------------------------------------------------
aus.append("## 5. Wo es kippt")
aus.append("")
for paket in ("Starter", "Pro", "Expert"):
    wende = None
    for n in range(1, 201):
        if clockin(n, paket) < arcotime(n) * KURS:
            wende = n
            break
    treu = None
    for n in range(1, 201):
        if clockin(n, paket, 2) < arcotime(n) * KURS:
            treu = n
            break
    aus.append(f"- **clockin {paket}** ist ab **{wende} Nutzern** günstiger als ArcoTime "
               f"(mit 24 Monaten Bindung ab **{treu}**).")
aus.append("")

# --- Was daraus folgt ----------------------------------------------------
# Bewusst im Skript und nicht daneben: Die Aussagen sind aus den Tabellen
# abgeleitet. Ändern sich die Zahlen, muss auch der Text geprüft werden, und
# das merkt nur, wer ihn hier findet.
aus.append("## 6. Was daraus folgt")
aus.append("")
aus.append("**Der Wendepunkt liegt bei zwei Nutzern, nicht bei fünf.** Gegen das")
aus.append("vergleichbare Paket (Expert) sind wir beim Einmannbetrieb günstiger –")
aus.append("CHF 15.– gegen 19,99 € –, ab dem zweiten Mitarbeitenden nicht mehr.")
aus.append("Gegen den Starter sind wir schon beim ersten Nutzer teurer, um einen")
aus.append("Franken.")
aus.append("")
aus.append("**Der Abstand ist kleiner als der Werbepreis vermuten lässt.** Gegen")
aus.append("Expert mit zwei Jahren Bindung liegen wir beim Faktor 1.2 bis 1.7 – nicht")
aus.append("beim Doppelten. Wer ArcoTime mit dem Starter vergleicht, vergleicht eine")
aus.append("Auftragsanwendung mit einer Stempeluhr.")
aus.append("")
aus.append("**Die Schmerzzone liegt bei fünf bis neun Nutzern (Faktor 1.67).** Der")
aus.append("Grund steht in Tabelle 2: Unsere erste Stufe läuft bis 9 Benutzer zu")
aus.append("CHF 15.–, während clockins Preis je Nutzer ab 5 flach ist. Genau dort")
aus.append("sitzt der typische Handwerksbetrieb.")
aus.append("")
aus.append("**Der billigste Hebel ist deshalb nicht ein Starter-Paket, sondern eine")
aus.append("früher greifende Staffel.** Ein Paket verlangt Funktionsgrenzen quer durch")
aus.append("die Masken – Oberfläche, Server und Zugriffsregeln je Grenze. Eine")
aus.append("zusätzliche Stufe ab 3 oder 5 Benutzern ist eine Zeile in")
aus.append("`lizenzpreise.ts` plus eine Preisstufe in Stripe.")
aus.append("")
aus.append("**Laufzeitrabatte kosten keine Entwicklung.** 12 Monate −5 %, 24 Monate")
aus.append("−10 % kann Stripe; sie senken die genannte Zahl und binden Kunden.")
aus.append("")
aus.append("**Ein Bruch in clockins Modell, den wir nennen dürfen:** Bei vier Nutzern")
aus.append("kostet clockin Starter 25,96 €, bei fünf nur 19,95 € – der fünfte")
aus.append("Mitarbeitende macht das Abonnement BILLIGER, weil die Plattform-Pauschale")
aus.append("wegfällt. Bei uns kostet jeder zusätzliche Mitarbeitende zusätzlich.")
aus.append("")
aus.append("**Die Zusatzmodule sind der Punkt, an dem wir wirklich teuer werden.** Bei")
aus.append("einem Betrieb mit drei Personen kostet ArcoTime mit Disposition und")
aus.append("Zeitkonto CHF 106.– gegen 66,97 € bei clockin Expert samt Schichtplanung.")
aus.append("Das Zeitkonto zu CHF 4.– je Lizenz ist dabei der Treiber; clockin führt")
aus.append("ein Arbeitszeitkonto im Paket und verlangt nur für die Schichtplanung")
aus.append("eine Pauschale.")
aus.append("")
aus.append("**Was der Vergleich NICHT sagt.** Er vergleicht Preise, nicht Produkte.")
aus.append("Nicht enthalten: dass ArcoTime Adressen, Standorte, Aufträge, Rapporte mit")
aus.append("Unterschrift, Auswertungen und frei einstellbare Bezeichnungen in einem")
aus.append("Preis führt, und dass umgekehrt der Buchhaltungsexport heute Comatic ist")
aus.append("und nicht DATEV. Für den deutschen Markt ist das der teurere Unterschied.")
aus.append("")

ziel = sys.argv[1] if len(sys.argv) > 1 else None
text = "\n".join(aus) + "\n"
if ziel:
    open(ziel, "w", encoding="utf-8").write(text)
    print(f"geschrieben: {ziel}")
else:
    print(text)
