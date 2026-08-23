#!/usr/bin/env python3
"""
Basisversion plus Zusatzmodule: Was muss gebucht werden, damit ein
niedrigerer Eintrittspreis keinen Umsatz kostet?

Aufruf:  python3 scripts/preismodell.py [ziel.md]

Die Frage, die dieses Skript beantwortet, ist NICHT „welcher Preis ist
richtig" – das ist eine Marktentscheidung. Es beantwortet die nachrechenbare
Hälfte davon: Wenn die Basis von 15 auf X sinkt, wie viele Betriebe müssen
dann ein Modul buchen, damit derselbe Umsatz herauskommt? Diese Zahl heisst
unten Deckungsquote. Ist sie über 100 %, holt kein Modulgeschäft die
Preissenkung ein.
"""
import sys

CLOCKIN_STARTER = (3.99, 3.79, 3.59)
CLOCKIN_EXPERT = (9.99, 9.49, 8.99)
PLATTFORM = 10.0


def clockin(satz, n, laufzeit=0):
    return n * satz[laufzeit] + (PLATTFORM if n < 5 else 0)


HEUTE = [(9, 15), (19, 13), (10**9, 11)]

BASIS = {
    "heute – 15.–": [(9, 15), (19, 13), (10**9, 11)],
    "Basis 12.–": [(4, 12), (9, 11), (19, 10), (10**9, 9)],
    "Basis 10.–": [(4, 10), (9, 9), (19, 8), (10**9, 7)],
    "Basis 9.–": [(4, 9), (9, 8), (19, 7), (10**9, 6)],
    "Einstieg steil": [(2, 9), (4, 11), (9, 13), (19, 12), (10**9, 11)],
}

# Kandidaten für Zusatzmodule, mit dem gemessenen Aufwand sie abzutrennen.
# „Einstiegspunkte" = Navigationslink + eigene Seiten + eigene Actions-Datei;
# das ist die Zahl der Stellen, an denen eine Sperre sitzen muss. Gemessen am
# 23.08.2026 im Code, nicht geschätzt.
MODULE = [
    # Name,                    Preis, je Lizenz, Einstiegspunkte, Bestand
    ("Disposition",              49, False,  4, True),
    ("Zeitkonto",                 4, True,   7, True),
    ("Anfragen und Absenzen",     2, True,   8, False),
    ("Buchhaltungs-Export",      19, False,  8, False),
    ("Mehrere Standorte",        19, False,  4, False),
    ("Änderungsprotokoll",        9, False,  2, False),
]

VERTEILUNGEN = {
    "kleinlastig": {1: 40, 2: 20, 3: 15, 5: 10, 8: 7, 12: 4, 20: 3, 35: 1},
    "mittellastig": {1: 15, 2: 12, 3: 12, 5: 18, 8: 15, 12: 12, 20: 10, 35: 6},
}
GROESSEN = [1, 2, 3, 5, 8, 10, 20]


def satz(staffel, n):
    return next(p for grenze, p in staffel if n <= grenze)


def basispreis(staffel, n):
    return n * satz(staffel, n)


def umsatz(staffel, verteilung):
    return sum(anz * basispreis(staffel, n) for n, anz in verteilung.items())


def z(*t):
    return "| " + " | ".join(str(x) for x in t) + " |"


a = []
a.append("# Basisversion und Zusatzmodule")
a.append("")
a.append("Stand 23.08.2026. Erzeugt von `scripts/preismodell.py`.")
a.append("")
a.append("Ergänzt `docs/preisvarianten.md`. Dort ging es um die Staffel allein;")
a.append("hier um die Frage aus der Marktanalyse: Funktionen als Modul anbieten,")
a.append("damit der **Eintrittspreis** sinkt, ohne den Umsatz dauerhaft zu verlieren.")
a.append("")
a.append("## 1. Was ein niedrigerer Eintrittspreis bewirkt")
a.append("")
a.append("Monatspreis der Basisversion, ohne Module, gegen clockin.")
a.append("")
a.append(z("Nutzer", *BASIS.keys(), "clockin Starter", "clockin Expert"))
a.append(z(*(["---:"] * (len(BASIS) + 3))))
for n in GROESSEN:
    a.append(z(n, *[f"{basispreis(s, n):.0f}" for s in BASIS.values()],
               f"{clockin(CLOCKIN_STARTER, n):.0f}", f"{clockin(CLOCKIN_EXPERT, n):.0f}"))
a.append("")
a.append("Der Vergleich mit dem **Starter** ist hier der richtige: Eine")
a.append("Basisversion tritt gegen eine Basisversion an. Gegen den Expert")
a.append("treten Basis plus Module an.")
a.append("")
a.append("Schlechtester Faktor gegen clockin Starter (monatlich) im Bereich 1–20:")
a.append("")
a.append(z("Basis", "schlechtester Faktor", "bei … Nutzern"))
a.append(z("---", "---:", "---:"))
for name, s in BASIS.items():
    paare = [(basispreis(s, n) / clockin(CLOCKIN_STARTER, n), n) for n in range(1, 21)]
    f, n = max(paare)
    a.append(z(name, f"{f:.2f}×", n))
a.append("")

a.append("## 2. Was die Senkung kostet – und wer sie zurückholen muss")
a.append("")
a.append("**Deckungsquote** = der Umsatz, der durch die Senkung fehlt, geteilt")
a.append("durch den Umsatz, den alle 100 Betriebe brächten, wenn jeder **ein**")
a.append("Modul zu CHF 19.– buchte. 40 % heisst: Zwei von fünf Betrieben müssen")
a.append("ein Modul buchen, dann ist die Senkung bezahlt. Über 100 % heisst:")
a.append("mit Modulen allein nicht einzuholen.")
a.append("")
a.append("**oder mehr Kunden** = um wie viel die Kundenzahl steigen muss, damit")
a.append("die Senkung sich ohne jedes Modul bezahlt. Das ist die eigentliche")
a.append("Wette: Ein niedrigerer Eintrittspreis soll nicht denselben Kunden")
a.append("billiger bedienen, sondern mehr Kunden bringen.")
a.append("")
VERGLEICHSMODUL = 19
for vname, vert in VERTEILUNGEN.items():
    basis_heute = umsatz(HEUTE, vert)
    betriebe = sum(vert.values())
    a.append(f"**{vname}** – heute CHF {basis_heute:,.0f} bei {betriebe} Betrieben"
             .replace(",", "'"))
    a.append("")
    a.append(z("Basis", "Umsatz", "fehlt", "Deckungsquote", "oder mehr Kunden"))
    a.append(z("---", "---:", "---:", "---:", "---:"))
    for name, s in BASIS.items():
        u = umsatz(s, vert)
        fehlt = basis_heute - u
        quote = fehlt / (betriebe * VERGLEICHSMODUL) * 100
        wachstum = basis_heute / u
        a.append(z(name, f"CHF {u:,.0f}".replace(",", "'"),
                   f"CHF {fehlt:,.0f}".replace(",", "'"),
                   f"{quote:.0f} %" if fehlt > 0 else "–",
                   f"+{(wachstum - 1) * 100:.0f} %" if fehlt > 0 else "–"))
    a.append("")

a.append("## 3. Welche Funktionen sich überhaupt abtrennen lassen")
a.append("")
a.append("**Einstiegspunkte** = Navigationslink, eigene Seiten und eigene")
a.append("Actions-Datei, also die Stellen, an denen eine Sperre sitzen muss.")
a.append("Am 23.08.2026 im Code gezählt. Zum Vergleich: Die bestehende")
a.append("Disposition kommt mit vier Stellen aus – das ist der Maßstab für")
a.append("\u201ebillig abtrennbar\u201c.")
a.append("")
a.append(z("Funktion", "Preis", "Bezug", "Stellen", "Zustand"))
a.append(z("---", "---:", "---", "---:", "---"))
for name, preis, jeLizenz, stellen, bestand in MODULE:
    a.append(z(name, f"CHF {preis}.–", "je Lizenz" if jeLizenz else "pauschal",
               stellen, "vorhanden" if bestand else "neu"))
a.append("")
a.append("Nicht abtrennbar, gemessen an derselben Zählung:")
a.append("")
a.append(z("Funktion", "Stellen", "Grund"))
a.append(z("---", "---:", "---"))
a.append(z("Verrechnung (Preise, Rabatt, MWST)", 56, "steckt in Artikel, Konditionen, Positionen, Auswertungen"))
a.append(z("Dokumente", 56, "hängt an Kunde, Auftrag, Rapport, Anfrage"))
a.append(z("Unterschrift auf dem Rapport", 17, "gehört zum Rapport und ist das Verkaufsargument"))
a.append("")

a.append("## 4. Beispielrechnung: Basis 10.– plus Module")
a.append("")
a.append("Was ein Betrieb am Ende zahlt, wenn er das bucht was er braucht –")
a.append("gegen clockin Expert mit 24 Monaten, also gegen das volle Paket.")
a.append("")
s10 = BASIS["Basis 10.–"]
faelle = [
    ("Kleinstbetrieb, nur Zeit und Rapport", []),
    ("mit Absenzverwaltung", ["Anfragen und Absenzen"]),
    ("mit Absenzen und Buchhaltung", ["Anfragen und Absenzen", "Buchhaltungs-Export"]),
    ("volles Paket", [m[0] for m in MODULE]),
]
preise = {m[0]: (m[1], m[2]) for m in MODULE}
a.append(z("Nutzer", *[f for f, _ in faelle], "clockin Expert 24 Mt."))
a.append(z(*(["---:"] * (len(faelle) + 2))))
for n in [1, 3, 5, 10, 20]:
    zeile = [n]
    for _, mods in faelle:
        total = basispreis(s10, n)
        for m in mods:
            p, jeLizenz = preise[m]
            total += p * n if jeLizenz else p
        zeile.append(f"{total:.0f}")
    zeile.append(f"{clockin(CLOCKIN_EXPERT, n, 2):.0f}")
    a.append(z(*zeile))
a.append("")

text = "\n".join(a) + "\n"
ziel = sys.argv[1] if len(sys.argv) > 1 else None
if ziel:
    open(ziel, "w", encoding="utf-8").write(text)
    print("geschrieben:", ziel)
else:
    print(text)
