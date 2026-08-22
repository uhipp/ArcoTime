# Masken-Leitlinie

Stand: 22.08.2026 · **verbindlich für jede Maske, die angefasst wird**

Entstanden aus einer Beobachtung des Nutzers an der Kundenmaske: Sie ist durch
laufende Erweiterungen so lang geworden, dass man beim Arbeiten dauernd
scrollt. Wer dabei unterbrochen wird — Telefon, Besuch — schaut danach auf
einen Bildschirm voller Historie und weiss nicht mehr, wo er ist.

Der Entwurf, an dem diese Regeln entstanden sind, ist die neue Kundenmaske
(Design-Canvas „ArcoTime Kundenmaske", drei Ansichten: Arbeitsplatz,
Unterwegs, Kopfleiste). Vorbild war eine Comatic-Maske — nicht im Aussehen,
sondern im **Aufbau**.

---

## 0. Für wen die Regeln gelten

**Arbeitsmasken** — was jemand täglich benutzt: Kunden, Aufträge, Anfragen,
Rapporte, Zeiterfassung, Disposition, Leistungen. Hier gelten alle Regeln
unten, ohne Ausnahme.

**Einstellungsmasken** — was man einmal einrichtet und selten ändert:
Einstellungen, Plattformbereich, Datenpflege, Abonnement. Hier ist eine lange
Seite in Ordnung. Wer die Kontaktarten pflegt, tut das zweimal im Jahr und
darf dabei scrollen; wer vierzig Kunden am Tag anschaut, nicht.

Diese Unterscheidung ist der Kern. Sie ersetzt die Frage „ist das schön"
durch „wie oft macht das jemand".

---

## 1. Vier Zonen, die stehen bleiben

```
┌ 1 Produkt und Organisation ────────────── Person · Abmelden ┐  48 px
├ 2 Hauptmenü ─ Zeit Anfragen Rapporte [Kunden] Aufträge … ───┤  40 px
├ 3 Bereichsleiste ─ „Kunden“ · 128 Einträge ─ [Spalten][+Neu]┤  46 px
├─────────────────────────┬───────────────────────────────────┤
│ Liste                   │ Detail des gewählten Datensatzes  │
│ Suche · Filter · Spalten│ Reiter: Adresse | Konditionen | … │
│                         │ [Verwerfen] [Adresse speichern]   │
├─────────────────────────┴───────────────────────────────────┤
│ Zu diesem Kunden: [Rapport erfassen] [Adressblatt] …        │
├─────────────────────────────────────────────────────────────┤
│ Reiter: Ansprechpersonen | Standorte | Aufträge | Rapporte  │
│ ┌ Liste ───────────────┬ Detail des Nebenobjekts ─────────┐ │
│ │                      │ [Verwerfen] [Person speichern]   │ │
├─ Statuszeile ───────────────────────────────────────────────┤  26 px
```

- **Die Seite scrollt nie.** Gescrollt wird nur *innerhalb* der Listen und
  Detailflächen. Technisch: die äussere Hülle `h-screen` mit
  `overflow-hidden`, die inneren Flächen `min-h-0` und `overflow-y-auto`.
- **Das Hauptmenü ist immer sichtbar.** Wer nach einer Unterbrechung auf den
  Bildschirm schaut, sieht ohne Scrollen, wo er ist: Produktname,
  Organisation, aktiver Bereich, gewählter Datensatz.
- **Liste links, Detail rechts.** Beide Ebenen — der Hauptdatensatz oben, die
  Nebenobjekte unten — folgen derselben Aufteilung. Wer das Muster einmal
  versteht, versteht jede Maske.
- **Was heute untereinander steht, wird ein Reiter.** Bei den Kunden:
  Ansprechpersonen, Standorte, Aufträge, Rapporte, Preise und Rabatte,
  Dokumente, Historie. Die Historie ist die längste Liste der Maske und
  deshalb genau das, was in einen Reiter gehört.

---

## 2. Knöpfe sagen, was sie tun

Der Anlass: Auf der heutigen Kundenseite gibt es **drei Wörter für dieselbe
Handlung** — „Speichern" (speichert nur den Adressblock), „Übernehmen"
(speichert Preis oder Rabatt sofort in die Datenbank) und „speichern" in den
neuen Blöcken. Niemand kann daran ablesen, was gespeichert wird.

**Regeln:**

1. **Jeder Knopf nennt sein Objekt:** „Adresse speichern", „Person
   speichern", „Standort speichern", „Preis speichern". Nie ein nacktes
   „Speichern" auf einer Seite mit mehreren Blöcken.
2. **„Übernehmen" gibt es nicht mehr.** Es speichert sofort und sagt es
   nicht. Wo es steht, heisst es künftig „… speichern".
3. **Jeder Block, der speichert, hat sein eigenes Paar** aus „Verwerfen" und
   „… speichern", direkt an seinem unteren Rand.
4. **Nichts wird still gespeichert.** Kein Autosave, kein Speichern beim
   Verlassen eines Feldes. Die Statuszeile sagt das einmal aus.
5. **Löschen heisst löschen** und steht nie neben dem Speichern-Knopf,
   sondern am Objekt, das es entfernt.

---

## 3. Aktionen stehen am Wert

Eine Mailadresse, die man abschreiben muss, ist eine halbe Angabe. Am rechten
Rand jedes Werts steht deshalb, was man damit tun kann:

| Kanal | Aktionen |
|---|---|
| E-Mail | Mail schreiben · kopieren |
| Telefon | anrufen · kopieren |
| Mobil | anrufen · WhatsApp · kopieren |
| Adresse | Navigation (Google Maps, Apple Karten) · kopieren |

- **Das Muster existiert schon** und ist erprobt: `kunden-kontakt.tsx` (0050,
  Phase 11 Etappe D) hat die Navigation, `kunden-ansprechpersonen.tsx` (0074)
  hat `mailto:` und `tel:`. Neu ist nur, dass es überall gleich aussieht.
- **Mail: zwei Wege, eine Einstellung je Betrieb.** `mailto:` öffnet das
  Programm des Anwenders (meist Outlook) — schnell, hinterlässt aber keine
  Spur. „Aus ArcoTime senden" nutzt den bestehenden Versand (eigener
  Absender, Textteil, Anhang) und **protokolliert**. Was Spuren hinterlassen
  soll, geht über ArcoTime; der schnelle Zuruf über das Programm des
  Anwenders. Einstellung: *Mail öffnen mit → Programm des Anwenders / aus
  ArcoTime senden.*
- **Ehrlich zu den Grenzen:** `tel:` wählt auf dem Handy sofort, am
  Arbeitsplatz nur mit eingerichtetem Softphone. Deshalb steht neben jeder
  Nummer auch „kopieren".
- **Nichts verlässt ArcoTime vor dem Klick.** Keine Vorschau, kein Dienst im
  Hintergrund, kein fremder Code auf der Seite. Derselbe Satz steht schon in
  der Hilfe zur Navigation.

---

## 4. Listen

- **Suchfeld über der Liste**, das von vorn sucht („Bür" → alles, was so
  beginnt). Dazu die **Filterzeile** je Spalte für die genaue Suche.
- **Klick auf den Spaltentitel sortiert**, ein zweiter Klick dreht die
  Richtung. Das kann `sortiere()` bereits.
- **Spaltenwahl über einen Knopf**, nicht über die rechte Maustaste: Im
  Browser und auf einem Tablet findet niemand ein Kontextmenü. Die
  Spaltenwahl gibt es schon (`listen-spalten.ts`, `sichtbareSpalten`).
- **Die Auswahl steht in der Adresse**, nicht im Browser-Zustand:
  `/kunden?id=…&reiter=personen`. Damit funktioniert der Zurück-Knopf, ein
  Link ist teilbar, und die Seiten bleiben Serverkomponenten.
- **Die gewählte Zeile ist sichtbar markiert** (hinterlegt, mit Balken am
  linken Rand) — nach einer Unterbrechung ist das der Anker.
- **Leere Listen erklären sich** und zeigen den Weg nach vorn, nicht die
  Sackgasse: „Für diesen Kunden ist noch kein Auftrag erfasst — ‚+ Neuer
  Auftrag' oben legt einen an."

---

## 5. Kopfleiste und Logo

**Entschieden am 22.08.2026: helle Leiste.**

- 48 px hoch, weiss, mit `border-bottom`. Darin links das **waagrechte
  Lockup** (`public/arcotime-logo-quer.png`, 26 px hoch), ein Trennstrich,
  der Name der Organisation. Rechts Person und Abmelden.
- Das Lockup ist aus dem **bestehenden Bildmaterial** zusammengesetzt: Symbol
  und Wortzeichen wurden aus `arcotime-logo.png` herausgemessen und
  nebeneinandergestellt (599 × 128, Verhältnis 4.7 : 1). Nichts eingefärbt,
  nichts neu gezeichnet. Eine echte SVG-Fassung darf es später ersetzen —
  dann auch für Mails und PDF-Kopf. Das Symbol allein liegt als
  `public/arcotime-mark.png`.
- **Verworfen: die dunkle Leiste.** Sie wirkt mehr nach Anwendung, verlangt
  aber eine einfarbig weisse Fassung des Logos. Das wäre eine
  Markenänderung — und dafür gab es keinen Anlass.
- **Das ganze Logo mit Slogan** bleibt auf der Anmeldeseite, der Startseite,
  im Rapport- und Rechnungs-PDF, in Systemmails und in der Hilfe zum
  Ausdrucken. Die Marke arbeitet an der Tür und auf dem, was das Haus
  verlässt — nicht in jeder Zeile jeder Liste.
- Warum überhaupt: Heute steht das senkrechte Lockup mit Slogan im Kopf,
  56 px hoch, mit Rand rund 80 px. Auf einer Maske, die ohne Scrollen
  auskommen soll, ist jede eingesparte Zeile Höhe eine Datenzeile mehr.
- **Das Logo des Kunden** (`organisationen.logo_pfad`) bleibt dort, wo es
  heute ist: auf seinen eigenen Dokumenten.

---

## 6. Am Handy gilt es anders

ArcoTime ist keine Windows-Anwendung. Der Monteur bedient dieselbe Maske auf
dem Telefon, und dort ist Nebeneinander unmöglich.

- Aus dem Nebeneinander wird ein **Nacheinander**: Liste → Auswahl → Detail
  als eigene Ansicht, mit einem Weg zurück.
- Die Reiter werden eine **waagrechte Leiste**, die man wischen kann.
- **Dort ist Scrollen richtig.** Die Regel „kein Scrollen" gilt für den
  Arbeitsplatz, nicht für die Baustelle.
- Berührungsflächen mindestens 44 px. Die wichtigste Aktion (anrufen,
  navigieren, Timer) gehört nach unten, in Reichweite des Daumens.

---

## 7. Beschriftungen

Jede Beschriftung eines Objekts kommt aus `begriffe` (0073) über
`begriff()` / `neuLabel()` — nie als festes Wort im Code. Das gilt für
Navigation, Seitentitel, Knöpfe, Spaltentitel und Leertexte.

**Zusammengesetzte Wörter bleiben fest** („Projektleitung",
„Rapportnummer"): Das Fugen-s lässt sich nicht ableiten, aus „Auftrag" würde
„Auftragleitung". Wo ein Satz ein zusammengesetztes Wort bräuchte, wird der
Satz umformuliert.

---

## 8. Prüfliste je Maske

Beim Anfassen einer Arbeitsmaske:

1. Kommt die Seite **ohne Scrollen** aus? Scrollen nur die inneren Flächen?
2. Sind **Hauptmenü, Bereich und gewählter Datensatz** immer sichtbar?
3. **Liste links, Detail rechts** — auf beiden Ebenen?
4. Steht alles Nebensächliche in **Reitern** statt untereinander?
5. Sagt **jeder Knopf**, was er speichert? Kein „Übernehmen", kein nacktes
   „Speichern", kein Autosave?
6. Haben Mailadressen, Nummern und Adressen ihre **Aktionen am Wert**?
7. Hat die Liste **Suche, Filterzeile, Sortierung, Spaltenwahl** — und steht
   die Auswahl in der **Adresse**?
8. Erklären **leere Listen** den Weg nach vorn?
9. Kommen alle Beschriftungen aus **`begriffe`**?
10. Funktioniert die Maske am **Handy** als Nacheinander, mit 44-px-Flächen?

---

## 9. Wo wir heute stehen

Keine bestehende Arbeitsmaske erfüllt die Liste vollständig — die Leitlinie
ist ein Ziel, kein Zustand. Umgebaut wird **beim Anfassen**, nicht in einem
Rundumschlag.

| Maske | Zustand |
|---|---|
| Kunden | Entwurf steht (Design-Canvas). Umbau mit Etappe 4, weil dort die Standorte als Reiter dazukommen |
| Aufträge (Projekte) | lange Seite, kein Detail neben der Liste |
| Anfragen | Board statt Liste + Detail — hier ist das Board wahrscheinlich das bessere Muster, zu prüfen |
| Rapporte | Detailseite eigenständig; Positionen sind der Kern, Reiter denkbar |
| Zeiterfassung | Formular über Liste, funktioniert; Feldaktionen fehlen |
| Einstellungen, Plattform | Einstellungsmasken — Länge ist dort in Ordnung |

**Nächster Schritt:** Etappe 4 (Standorte, 0076) baut die Kundenmaske nach
diesem Muster um — dort entstehen ohnehin neue Reiter, und ein zweites Mal
anfassen wäre verschwendete Arbeit.
