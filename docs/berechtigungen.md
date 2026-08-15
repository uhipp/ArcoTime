# Berechtigungen: was heute gilt

Stand: 15.08.2026 · **Lebendes Verzeichnis – bei jeder Änderung eine Zeile
nachführen**

Dieses Dokument ist die Bestandsaufnahme für ein späteres,
konfigurierbares Berechtigungssystem. Es wird bewusst **erst gebaut, wenn
der erste fremde Betrieb es braucht** oder die nächste Funktion die
fünfte Sonderregel hinzufügen würde – ein System, das Rechte für noch
nicht gebaute Funktionen aufzählt, wird abstrakt.

Damit dieser Umbau später keine Archäologie wird, steht hier, **wer was
darf und wo es durchgesetzt wird**.

## Die beiden Ebenen

**Die Datenbank ist die Sicherheitsgrenze.** Rund 110 RLS-Regeln
entscheiden, was möglich ist. Sie kennen zwei Funktionen:
`current_organisation_id()` (Mandantentrennung) und `is_admin()`.

**Die Anwendung ist die Bequemlichkeit.** Sie blendet aus, was ohnehin
scheitern würde, und nennt den Grund im Klartext. Alle Rollenprüfungen
laufen seit dem 15.08.2026 über **eine** Funktion:
`darf(profil, "recht")` in `src/lib/berechtigungen.ts`.

Was in der Anwendung ausgeblendet ist, ist bequem. Was in der Datenbank
verboten ist, ist verboten. **Ein Recht ohne Entsprechung in der
Datenbank ist ein Loch.**

## Rollen

Es gibt genau zwei: `admin` und `mitarbeiter`. Dazu kommt
`ist_platform_admin` – das ist Arcos selbst und gehört nicht zur
Organisation.

## Ein Mensch, ein Konto

Am 15.08.2026 entschieden, nach der Frage, ob „Admin" ein getrenntes
Verwaltungskonto sein sollte: **nein.** Adminrechte sind eine Eigenschaft
einer Person, kein eigener Zugang.

Begründung, in dieser Reihenfolge:

1. **Geteilte Konten zerstören die Nachvollziehbarkeit.** Ein Konto, mit
   dem „niemand arbeitet", benutzen in der Praxis mehrere. Das
   Änderungsprotokoll (0053) zeigt dann „Admin" statt der Person – und
   beantwortet die Frage nicht mehr, für die es gebaut wurde.
2. **Im Kleinbetrieb ist der Chef ein Mitarbeiter.** Zwingt man ihn zum
   Kontenwechsel, arbeitet er nach zwei Wochen dauerhaft im Konto mit den
   meisten Rechten – das Gegenteil des Gewollten.
3. **Ein reines Verwaltungskonto kostet eine Lizenz**, ohne dass jemand
   damit arbeitet.

Der Wunsch dahinter – nicht jeder soll alles dürfen – ist berechtigt und
gehört ins Berechtigungssystem: „Admin" bündelt heute Konfigurieren,
Löschen von Stammdaten und alle Auswertungen sehen. Diese drei
aufzutrennen ist die Aufgabe, nicht ein zweites Login.

Den reinen Verwalter ohne Mitarbeit gibt es genau einmal, und dort gehört
er hin: der Plattform-Admin (Arcos), ausserhalb der Organisation und ohne
Lizenz.

## Die Grundregel

> Mitarbeitende dürfen grundsätzlich alles erfassen und bearbeiten, was
> ihre Oberfläche ihnen zeigt. Löschen dürfen sie es nicht.

Sie stammt aus Migration 0031 und gilt weiterhin. Alles Folgende sind
die begründeten Ausnahmen davon.

## Rechte

| Recht | Wer | Durchgesetzt in der Anwendung | Durchgesetzt in der Datenbank |
|---|---|---|---|
| `kunden.loeschen` | Admin | Kundendetailseite | `kunden_delete` (0031) |
| `projekte.loeschen` | Admin | Projektdetailseite | `projekte_delete` (0031) |
| `dienstleistungen.loeschen` | Admin | Dienstleistungsdetailseite | `dienstleistungen_delete` (0031) |
| `anfragen.loeschen` | Admin | Anfragedetailseite | `anfragen_delete` (0013) |
| `dokumente.loeschen` | Admin | Dokumentenbereich (Anfrage, Rapport, Zeiteintrag) | `dokumente_delete` (0015) |
| `rapporte.abschliessen.fremde` | Admin | Abschlussblock am Rapport | `schliesse_rapport()` (0047) |
| `mitarbeitende.verwalten` | Admin | Mitarbeitendenliste und -detail, Einladen, Deaktivieren | Regeln auf `profiles`, Service-Role beim Einladen |
| `einstellungen.verwalten` | Admin | Einstellungsseite, Navigation | `*_write_admin` auf allen Auswahllisten (0030 ff.) |
| `datenpflege.verwalten` | Admin | Datenpflegeseite und ihre Aktionen | `datenpflege_laeufe_admin` (0052) |
| `protokoll.lesen` | Admin | Protokollseite | `aenderungsprotokoll_lesen` (0053) |
| `export.ausfuehren` | Admin | Exportseite, Download-Route | Regeln auf `belege_exporte`, `erstelle_export()` |
| `auswertungen.alle` | Admin | Auswertungen: alle Personen statt nur die eigenen | – (Sichtbarkeit, keine Grenze) |
| `kalender.alle` | Admin | Kalender: alle Personen statt nur die eigenen | – (Sichtbarkeit, keine Grenze) |

## Regeln, die nicht an der Rolle hängen

Diese Grenzen gelten für alle – auch für Admins. Sie gehören nicht in ein
Rollenmodell und dürfen bei dessen Einführung **nicht** dorthin wandern.

| Regel | Begründung | Wo |
|---|---|---|
| Exportierte Positionen sind unantastbar – **auch für Admins** | Verrechnete Zeit liegt in der Buchhaltung; Korrektur läuft über den Beleg | `zeiteintraege_update/delete` (0059, vorher mit Admin-Ausnahme in 0046) |
| Zeiteinträge eines abgeschlossenen Monats sind unveränderlich – auch für Admins | Ein Abschluss, dessen Grundlagen sich noch ändern, ist eine Behauptung | `zeiteintraege_insert/update/delete` über `monat_abgeschlossen()` (0059) |
| Ein Rapport lässt sich nicht abschliessen oder stornieren, wenn seine Stunden in einem abgeschlossenen Monat liegen | Beides verändert rückwirkend, was als geleistet gilt | `schliesse_rapport()`, `storniere_rapport()` (0059) |
| Ein Monat lässt sich nicht abschliessen, solange Rapporte der Person darin offen sind | Ihre Stunden zählen erst mit dem Rapportabschluss und fehlten sonst dauerhaft | `schliesseMonatAb` (Anwendung) |
| Ein abgeschlossener Rapport ist unveränderlich | Der Kunde hat unterschrieben | `rapporte_update_offen` (0026) |
| Ein Rapport wird von der verantwortlichen Person abgeschlossen | Sie war dabei und steht auf dem Dokument | `schliesse_rapport()` (0047) |
| Stornieren ist bewusst **nicht** eingeschränkt | Korrektur des Büros, oft gerade dann nötig, wenn die verantwortliche Person fehlt | `storniere_rapport()` (0043) |
| Ein Rapport mit Datum in der Zukunft lässt sich nicht abschliessen | Aus Absicht wird erst dann ein Nachweis | `schliesse_rapport()` (0036/0047) |
| Das Änderungsprotokoll lässt sich nicht ändern | Ein Protokoll, das sich ändern lässt, ist keines | Keine Schreibregel auf `aenderungsprotokoll` (0053) |
| Gruppen und Rapport-Beteiligte sind **Sicht, keine Berechtigung** | Wer nicht dazugehört, verliert nichts | `gruppen_*`, `rapport_beteiligte_write` (0045/0049) |
| Projekte sind sichtbar für alle oder nur für das Projektteam | `sichtbar_fuer_alle` am Projekt | `projekte_select` (0001/0006, entschärft in 0032) |

## Was beim späteren Umbau zu beachten ist

1. **Die Datenbank zuerst.** Kommen die Rechte aus einer Tabelle, müssen
   die RLS-Regeln sie lesen – nicht die Anwendung. Sonst hängt die
   Sicherheit an der Oberfläche.
2. **`is_admin()` ist die Naht.** Rund 110 Regeln rufen sie auf. Ein
   Rechtemodell sollte diese Funktion ersetzen oder ergänzen, statt jede
   Regel einzeln umzuschreiben.
3. **Keine Rekursion.** Eine Rechtetabelle, deren Regel selbst wieder auf
   Rechte prüft, endet in „infinite recursion" – dieses Projekt hat das
   zweimal erlebt (0007, 0031). Die Prüffunktion gehört als
   `security definer` in die Datenbank, wie `is_admin()`.
4. **Die Grundregel nicht verlieren.** „Mitarbeitende bearbeiten, was sie
   sehen" ist eine bewusste Entscheidung und kein fehlendes Recht. Ein
   neues System sollte sie als Vorgabe mitbringen, nicht als leere Liste
   starten, die jeder Betrieb erst füllen muss.
5. **Sichtbarkeit ist keine Grenze.** `auswertungen.alle` und
   `kalender.alle` steuern nur, was gezeigt wird. Wer die Daten wirklich
   nicht sehen soll, braucht eine Regel in der Datenbank – die gibt es
   heute nicht.
