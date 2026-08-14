# Phase 10: Mehrtägige Einsätze

Stand: 14.08.2026 · Planungsdokument, noch nicht umgesetzt

## Ausgangslage

Ein Rapport hat heute **ein** Datum und **eine** Planzeit. Ein Einsatz
über mehrere Tage heisst deshalb: ein Rapport pro Tag, zusammengehalten
nur durch das Projekt. Vier Rapportnummern, vier Unterschriften, vier
Dokumente für einen Auftrag.

Die Fälle aus der Praxis, die den Massstab bilden:

- Ein Einsatz läuft **Do und Fr, dann Mo und Di** – mit dem Wochenende
  als Lücke. Eine Von-bis-Spanne bildet das nicht ab.
- **Ein Teil des Teams ist alle Tage dabei**, eine Person nur am
  Nachmittag des letzten Tages.
- Der Kunde erhält **einen** Nachweis über den Auftrag, nicht vier.

Entscheidend für die Bauart: ArcoTime wird an Organisationen aus
verschiedenen Branchen verkauft. Im Bau ist der tägliche Regierapport
üblich, bei einem IT-Rollout wäre er lästig. Beides muss gehen.

## Der Grundgedanke

Der Rapport bleibt **ein Dokument für einen Auftrag** und bekommt statt
einer Planzeit eine **Liste von Einsatzterminen**.

Das ist eine **Obermenge des heutigen Verhaltens**: Ein Rapport mit
genau einem Termin ist exakt das, was ArcoTime heute tut – gleiche
Ansicht, gleicher Ablauf, gleiches Dokument. Wer täglich unterschreiben
lässt, legt weiterhin pro Tag einen Rapport an und merkt von der
Erweiterung nichts.

Deshalb **keine Einstellung „mehrtägig ja/nein"**. Ein Schalter würde
die Testfälle verdoppeln, müsste in jeder Ansicht mitgedacht und in der
Dokumentation erklärt werden – und er zwingt jeden neuen Mandanten zu
einer Entscheidung, die er beim Einrichten noch gar nicht treffen kann.
Ein Modell, das beides trägt, verlangt niemandem eine Entscheidung ab.

## Datenmodell

```sql
create table rapport_termine (
  id uuid primary key default gen_random_uuid(),
  rapport_id uuid not null references rapporte(id) on delete cascade,
  -- Leer = gilt für alle Beteiligten. Gesetzt = nur für diese Person,
  -- z.B. "Peter nur Dienstagnachmittag".
  mitarbeiter_id uuid references profiles(id) on delete cascade,
  datum date not null,
  von_zeit time,
  bis_zeit time,
  organisation_id uuid not null references organisationen(id)
);
```

Beispiel für „Do, Fr, Mo ganzes Team, Di nur Peter am Nachmittag":

| Person   | Tag       | von   | bis   |
|----------|-----------|-------|-------|
| *(alle)* | Do 27.8.  | 07:30 | 17:00 |
| *(alle)* | Fr 28.8.  | 07:30 | 17:00 |
| *(alle)* | Mo 31.8.  | 07:30 | 17:00 |
| Peter    | Di 1.9.   | 13:00 | 17:00 |

Vier Zeilen plus eine Ausnahmezeile. Tage stehen einzeln, deshalb ist
die Wochenendlücke kein Sonderfall. Kommt jemand später ins Team, gelten
die offenen Termine automatisch auch für ihn.

`organisation_id` als eigene Spalte mit Trigger aus dem Rapport – wie
bei `rapport_beteiligte` (0045) und `gruppen_mitglieder` (0049). Regeln,
die sich gegenseitig abfragen, hat Postgres in diesem Projekt zweimal
mit „infinite recursion" quittiert.

`rapporte.geplant_von` / `geplant_bis` werden nach der Übernahme nicht
mehr gelesen und als veraltet vermerkt – nicht sofort gelöscht, damit
ein Rückweg offen bleibt. Die Lehre aus `geplant_fuer` gilt aber: **Ab
dem Umbau nicht mehr lesen.** Zwei Quellen für dieselbe Aussage laufen
auseinander, und beim letzten Mal hat es Wochen gedauert, bis das
auffiel.

`rapporte.datum` bleibt und bedeutet neu den **ersten Einsatztag**. An
ihm hängen Nummernkreis, Sortierung und die Rapportliste; ihn zu
entfernen wäre ein Umbau ohne Gegenwert.

## Auswirkungen auf Bestehendes

**Disposition.** Ein Balken **je Termin** statt je Rapport. Verschieben
bewegt diesen Termin, nicht mehr den ganzen Einsatz. Die Konfliktprüfung
läuft schon heute datumsbezogen und passt unverändert – sie muss nur je
Termin statt je Rapport gefragt werden.

**Positionen.** Sie brauchen einen eigenen Tag. Heute zieht der
Rapportkopf sein Datum auf alle Positionen nach (Trigger aus 0038, der
den verlorenen Export repariert hat) – bei mehreren Tagen ist das
falsch und muss weg. Stattdessen wählt man beim Erfassen den
Einsatztag; vorbelegt mit „heute", wenn heute einer der Tage ist, sonst
mit dem ersten. Für den Monteur vor Ort ist das ein Klick weniger als
heute, nicht mehr.

**Abschluss.** Die Regel „nicht in der Zukunft" gilt neu für den
**letzten** Termin.

**Dokument und PDF.** Kopfzeile „Einsatz 27.–28.08. und 31.08.–01.09.",
Positionen nach Tag gruppiert mit Zwischensummen. Der Kunde
unterschreibt einmal, am Schluss.

**Export und Auswertungen.** Unberührt – sie zählen die Positionen mit
deren eigenem Datum.

**Kalender.** Ein Eintrag je Termin, gleiche Farbe, gleicher Rapport.

## Etappen

**A — Modell und Rapportseite.** Tabelle, Übernahme der bestehenden
Planzeiten als je ein Termin, Erfassen und Ändern der Einsatztage am
Rapport. Die Disposition liest weiterhin den ersten Termin, verhält sich
also wie heute.

**B — Disposition.** Ein Balken je Termin, Verschieben und
Konfliktprüfung je Termin, Personentermine in der Tagesansicht.

**C — Positionen und Abschluss.** Tag je Position, Nachführ-Trigger
ablösen, Abschlussregel auf den letzten Termin.

**D — Dokument, PDF und Kalender.** Gruppierung nach Tag,
Zwischensummen, Kopfzeile mit dem Zeitraum.

## Offene Fragen

- **Unterschrift je Einsatztag?** Die einzige Stelle, an der die
  Branchen inhaltlich auseinandergehen. Heute hängt die Unterschrift am
  Rapport; bei täglicher Abnahme müsste sie am Termin hängen. **Nicht
  jetzt bauen** – aber die Termine so anlegen, dass eine Unterschrift je
  Termin später dazukommen kann, ohne das Modell nochmals aufzureissen.
  Diese Frage sollte vor Etappe A beantwortet sein.
- **Serienanlage.** Braucht es einen Weg „Einsatz über mehrere Tage
  planen", der für Betriebe mit täglicher Abnahme gleich *mehrere
  Rapporte* anlegt? Erst prüfen, wenn ein Mandant danach fragt – der
  Fall ist mit „pro Tag ein Rapport" schon heute abgedeckt, nur ohne
  Komfort.
- **Wer erfasst die Tage?** Bei Arcos die Disposition im Voraus, in
  kleineren Betrieben der Monteur am Abend. Beides muss gehen, ist aber
  eine Frage der Bedienung und nicht des Modells.
- **Teilweise abgeschlossene Einsätze.** Ein Einsatz läuft noch, der
  Kunde will aber den ersten Tag schon quittiert haben. Hängt an der
  ersten Frage und wird mit ihr entschieden.

## Reihenfolge gegenüber den übrigen offenen Punkten

Vor dieser Phase steht nichts Zwingendes. Danach – und das spricht
dafür, sie nicht zu lange aufzuschieben – wird jede weitere Arbeit am
Rapport teurer, weil sie das eintägige Modell voraussetzt.

Weiterhin offen und unabhängig davon: Datenpflege-Bereich mit
Änderungsprotokoll, das konfigurierbare Berechtigungssystem.
