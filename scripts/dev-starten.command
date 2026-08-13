#!/bin/bash
#
# ArcoTime lokal starten – gedacht für einen Doppelklick im Finder.
#
# Die Dateiendung .command sorgt dafür, dass macOS das Skript in einem
# Terminal-Fenster ausführt. Das Fenster bleibt offen und zeigt die Logs des
# Dev-Servers; beenden mit Ctrl+C.
#
# Auf dem Schreibtisch liegt nur ein kleiner Starter, der diese Datei
# aufruft – Änderungen hier wirken also sofort, ohne dass etwas kopiert
# werden muss.

REPO="$HOME/Documents/zeiterfassung-app"
PORT=3000

# Ein per Doppelklick gestartetes Skript erbt nicht zwingend denselben PATH
# wie ein interaktives Terminal. node/npm liegen unter /usr/local/bin,
# /opt/homebrew/bin ist für den Fall eines späteren Homebrew-Wechsels dabei.
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"

cd "$REPO" || {
  echo "FEHLER: Repo nicht gefunden unter $REPO"
  echo "Falls du es verschoben hast, den Pfad oben in dieser Datei anpassen."
  echo
  read -r -p "Mit Enter schliessen…"
  exit 1
}

# Läuft schon einer? Dann nicht doppelt starten, nur den Browser öffnen.
if lsof -nP -iTCP:$PORT -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Es läuft bereits ein Server auf Port $PORT."
  echo "Öffne nur den Browser – dieses Fenster kannst du gleich schliessen."
  open -a Safari "http://localhost:$PORT"
  sleep 2
  exit 0
fi

# .next wird von "next dev" UND "next build" benutzt. Lief zwischendurch ein
# Production-Build, mischen sich die Artefakte und der Dev-Server verhält
# sich seltsam. BUILD_ID entsteht ausschliesslich bei "next build" und ist
# damit ein zuverlässiges Erkennungsmerkmal – nur dann wird aufgeräumt,
# sonst bleibt der Cache erhalten und der Start bleibt schnell.
if [ -f .next/BUILD_ID ]; then
  echo "Production-Build im Cache gefunden – räume .next auf…"
  rm -rf .next
fi

# Browser erst öffnen, wenn der Port wirklich antwortet. Läuft im
# Hintergrund, damit npm im Vordergrund bleibt und Ctrl+C sauber greift.
(
  for _ in $(seq 1 60); do
    if nc -z localhost $PORT >/dev/null 2>&1; then
      open -a Safari "http://localhost:$PORT"
      exit 0
    fi
    sleep 1
  done
  echo "Hinweis: Server antwortet nach 60s nicht – Browser nicht geöffnet."
) &

echo "Starte Dev-Server auf http://localhost:$PORT"
echo "Beenden mit Ctrl+C."
echo
npm run dev

echo
echo "Dev-Server beendet. Fenster kann geschlossen werden."
