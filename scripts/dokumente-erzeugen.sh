#!/bin/bash
#
# Erzeugt die Word-Dokumente aus den Markdown-Quellen im Repo.
#
# Aufruf:
#   bash scripts/dokumente-erzeugen.sh [zielordner]
#
# Ohne Zielordner landen die Dateien in docs/. Für die Ablage in OneDrive:
#   bash scripts/dokumente-erzeugen.sh "$HOME/Library/CloudStorage/OneDrive-ArcosInformatikGmbH/ArcoSoftware"
#
# Warum aus Markdown und nicht direkt in Word: Die Projektdokumentation ist
# am 16.08.2026 in Word geschrieben worden und stand danach still, weil jede
# Änderung Handarbeit in einem Binärformat war – im Projektstand stand
# monatelang „es gibt kein Erzeugerskript, das Kapitel ist von Hand
# nachzuziehen". Eine Doku, die man nicht neu erzeugen kann, ist nach der
# dritten Migration falsch. Jetzt liegt der Text als Markdown im Repo,
# wandert mit jedem Commit mit und lässt sich lesen wie Code.
#
# BEWUSST ohne --reference-doc, obwohl die alten .docx als Vorlage naheliegen:
# Sie bringen keine Listendefinition mit, die pandoc nutzen kann, und dann
# verschwinden ALLE Aufzählungspunkte stillschweigend – aus einer Liste wird
# eine Reihe fetter Absätze. Ein Dokument, das seine Struktur verliert, ist
# schlechter als eines in einer anderen Schrift. Wer das Aussehen anpassen
# will, tut es in Word an der erzeugten Datei; die Quelle bleibt das Markdown.
set -euo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
ZIEL="${1:-$REPO/docs}"
PATH="$HOME/.local/bin:$PATH"

if ! command -v pandoc >/dev/null; then
  echo "pandoc fehlt. Erwartet unter ~/.local/bin." >&2
  exit 1
fi

erzeuge() {
  local quelle="$1" name="$2"
  # resource-path: pandoc sucht Bilder sonst im Arbeitsverzeichnis und nicht
  # neben der Quelldatei – die Bilder verschwinden dann stillschweigend und
  # werden durch ihre Beschriftung ersetzt.
  local args=(--from markdown --to docx --standalone
              --resource-path "$(dirname "$quelle")")
  # Silbentrennung und Aufzählungen bleiben, wie sie im Markdown stehen.
  pandoc "${args[@]}" "$quelle" -o "$ZIEL/$name"
  echo "geschrieben: $ZIEL/$name"
}

erzeuge "$REPO/docs/projektdokumentation.md" "ArcoTime-Projektdokumentation.docx"
erzeuge "$REPO/docs/flyer.md" "ArcoTime-Flyer.docx"
