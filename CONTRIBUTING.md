# Bugfixing & Release-Workflow

Gilt ab Version 1.0.0 (Beginn der intensiven Test- und Bugfixing-Phase).

## 1. Bug-Erfassung

Jeder gefundene Bug wird als **GitHub Issue** erfasst (dauerhafte, vom Chat-Verlauf unabhängige Liste). Der Fix-Branch/PR referenziert das Issue (`Closes #12`), damit es beim Merge automatisch schliesst.

## 2. Bugfixing-Ablauf

1. **Branch pro Bug**: `fix/kurze-beschreibung` (bzw. `feat/...` für neue Funktionen, `docs/...`, `chore/...`).
2. **Fokus**: ein Bug pro Branch/Chat-Session, um den Kontext klein zu halten.
3. **Lokal prüfen**: `npm run build` + manuelle Kontrolle im Browser (es gibt aktuell keine automatisierten Tests – das ist der Massstab, bis eine Testsuite existiert).
4. **Pull Request** statt direktem Push auf `main`. Vercel erzeugt automatisch eine Preview-URL für den PR.
5. **Preview-Check**: den Fix auf der Vercel-Preview-URL nochmal bestätigen.
6. **Squash-Merge** nach `main`, Branch löschen. `main` deployt automatisch auf Produktion.

## 3. Commit-Konventionen (Conventional Commits)

- `fix: ...` – Bugfix (Patch-Version, 1.0.x)
- `feat: ...` – neue Funktion (Minor-Version, 1.x.0)
- `docs: ...` – reine Dokumentationsänderung
- `chore: ...` – Wartung/Dependency-Updates

Beschreibungstext weiterhin auf Deutsch, wie bisher.

## 4. Release-Prozess

Manuell ausgelöst ("erstelle ein Release"):

1. Git-Historie seit dem letzten Versions-Tag analysieren.
2. Technische Commit-Nachrichten in verständliche, anwenderfreundliche Sprache übersetzen (kein Entwickler-Jargon).
3. Neuen Eintrag oben in `src/content/releases.json` anfügen (Format siehe bestehende Einträge).
4. Version in `package.json` erhöhen (SemVer gemäss überwiegendem Commit-Typ seit letztem Tag).
5. Git-Tag erstellen (z.B. `v1.0.1`) und pushen.

Endnutzer sehen die Releasehistorie unter **🆕 Neuigkeiten** (`/aenderungen`) in der Anwendung.
