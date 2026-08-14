# Phase 9: Teamrapporte und Projektleitung

Stand: 14.08.2026 · Planungsdokument, noch nicht umgesetzt

## Ausgangslage

Ein Rapport kennt heute genau eine Person. In der Praxis erledigen
mehrere Personen zusammen einen Auftrag. Der Ablauf, den Urs geschildert
hat, ist der Massstab für diese Phase:

Eine IT-Firma erneuert bei einem KMU die Hardware – 20 Arbeitsplätze,
3 Server, mehrere Drucker.

1. Die Disposition legt **Kunde und Projekt** an und trägt dort den
   **Projektleiter** ein. Das ganze Projekt läuft über ihn.
2. Die **Vorinstallation** in der eigenen Werkstatt läuft über die
   normale Zeiterfassung der beteiligten Mitarbeitenden auf dieses
   Projekt. *Hier ändert sich nichts.*
3. Für Lieferung und Installation vor Ort erstellt die Disposition
   **einen Rapport** mit dem Projektleiter und zwei weiteren
   Mitarbeitenden.
4. In der Disposition erscheint das als **ein gruppierter Balken**, den
   der Disponent am Stück verschiebt, bis es bei allen passt.
5. Die Disposition erfasst **Positionen** und verknüpft die
   Stundenpositionen mit den jeweiligen Personen. Material und
   Reisespesen brauchen keine Person.
6. Fällt jemand aus, wird er **im ganzen Rapport ersetzt** – Teamzeile
   und bereits erfasste Stunden wandern mit.
7. **Abgeschlossen wird nur durch den Projektleiter**, mit Unterschrift
   des Kunden.

## Entschiedene Punkte

| Frage | Entscheidung |
|---|---|
| Ein Balken oder einer je Person? | **Ein Balken.** Die Planzeit bleibt am Rapport, wo sie heute schon ist. Verschieben bewegt den Einsatz für alle. |
| Personen im Raster verschieben? | **Nein.** Personen werden über „ersetzen" getauscht, nicht gezogen – nur so wandern die erfassten Stunden mit. |
| Namenszeile im Export | **Je Position die Person, die sie geleistet hat.** Der Comatic-Export hat keine Mitarbeiterspalte; stünde überall der Projektleiter, könnte die Buchhaltung Stunden nicht mehr zuordnen. Der Projektleiter steht im Rapportkopf. |
| Konflikt beim Verschieben | **Melden, nicht blockieren.** Bei drei Personen würde eine einzige Abwesenheit sonst den ganzen Einsatz festsetzen – und die Person wird ohnehin ersetzt. Die Meldung nennt, **wer** nicht kann und warum. |
| Ist das Team eine Berechtigung? | **Nein, reine Planung.** Auch Aussenstehende – etwa die Disposition – dürfen Positionen erfassen. Einschränkungen gehören ins geplante Berechtigungssystem. |
| Wer schliesst ab? | **Nur der Projektleiter.** Damit hat die Rolle eine Wirkung und ist keine Beschriftung. |

## Datenmodell

**`projekte.projektleiter_id`** – verantwortliche Person des Projekts.
Steuert die Vorbelegung am Rapport.

**`rapport_beteiligte`** – eine Zeile je Person und Rapport.

- Eigenes `organisation_id`, per Trigger aus dem Rapport gefüllt.
  **Zwingend**: Eine RLS-Regel, die von hier auf `rapporte` zurückfragt,
  erzeugt dieselbe Endlosschleife wie seinerzeit `mandat_mitarbeiter`
  (siehe 0007 und den Rückfall in 0031/0032). Die Regel prüft
  ausschliesslich das eigene `organisation_id`.
- Der Projektleiter steht ebenfalls in dieser Tabelle. Sie ist die
  vollständige Antwort auf „wer ist eingeplant".

**`rapporte.mitarbeiter_id`** behält seine Bedeutung: die
**verantwortliche** Person, also der Projektleiter.

**`rapporte.geplant_fuer` entfällt.** Der Wert wandert in
`rapport_beteiligte`; zwei Quellen für dieselbe Aussage laufen
auseinander. Die Spalte wird migriert und danach nicht mehr gelesen.

**`zeiteintraege.mitarbeiter_id`** gibt es bereits je Position. Neu wird
sie frei aus dem Team gewählt statt vom Rapportkopf geerbt.

## Auswirkungen auf Bestehendes

Diese Stellen lesen heute `geplant_fuer` oder setzen voraus, dass ein
Rapport genau eine Person hat:

- **Dispositionsraster** – Tagesansicht: Der Einsatz erscheint in jeder
  Spalte seiner Beteiligten, bleibt aber ein Balken.
- **Kalender** – Planungsbalken je Rapport; die Farbe kann nicht mehr
  „die Person" sein. Vorschlag: Farbe des Projektleiters, die übrigen
  Namen im Tooltip.
- **`freieZeitenAm()`** – Belegung einer Person ergibt sich künftig aus
  „ist unter den Beteiligten", nicht aus `geplant_fuer`.
- **`konflikteFinden()`** – prüft je Person statt je Rapport.
- **`verschiebeEinsatz()`** – prüft alle Beteiligten und liefert eine
  Warnung mit Namen statt eines Fehlers.
- **Trigger `rapport_positionen_nachfuehren` (0038)** – zieht heute
  Datum **und** Person nach. Künftig darf er nur noch das **Datum**
  nachziehen; die Person gehört zur Position.
- **`schliesse_rapport()`** – zusätzlich prüfen, dass der Abschliessende
  der Projektleiter ist.

## Etappen

**A — Projektleiter am Projekt.** Feld am Projekt, Anzeige in der
Projektliste, Vorbelegung beim Anlegen eines Rapports. Unabhängig vom
Rest und sofort nützlich.

**B — Team am Rapport.** Tabelle, Oberfläche zum Hinzufügen und
Entfernen, Migration von `geplant_fuer`, Anpassung von Raster, Kalender,
freien Zeiten und Konfliktprüfung. Verschieben meldet Konflikte mit
Namen und lässt sich bestätigen.

**C — Positionen und Personentausch.** Personenwahl bei
Stundenpositionen (bei Mengenartikeln entfällt sie), Funktion „Person
ersetzen" für Teamzeile und alle Stundenpositionen in einem Zug,
Anpassung des Nachführ-Triggers.

**D — Abschluss durch den Projektleiter.** Zusammen mit Unterschrift und
PDF, weil beides denselben Ablauf betrifft.

## Reihenfolge gegenüber den übrigen offenen Punkten

Vor dieser Phase sollte die **Konfliktprüfung bei gleichzeitiger
Bearbeitung** stehen. Ein Teamrapport wird typischerweise von der
Disposition und von mehreren Monteuren gleichzeitig angefasst – ohne die
Prüfung überschreiben sie einander, und zwar häufiger als heute.

**Unterschrift und PDF** gehören zu Etappe D und lassen sich damit
zusammenlegen.

## Offene Fragen für später

- Braucht ein Teammitglied eine eigene Planzeit, wenn es nur zeitweise
  dabei ist (der Elektriker kommt zwei Stunden später)? Bewusst
  zurückgestellt: Erst prüfen, ob der Fall im Alltag vorkommt.
- Sollen Gruppen von Mitarbeitenden (Team Ost, Sanitär) als Stammdaten
  existieren, um sie in einem Zug einem Rapport zuzuweisen? Hängt mit
  der gewünschten Spaltenordnung im Raster zusammen.
