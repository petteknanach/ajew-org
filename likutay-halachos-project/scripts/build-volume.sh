#!/usr/bin/env bash
set -e
CONFIG="build-config.json"
PDF_ENGINE=$(python3 -c "import json; print(json.load(open('$CONFIG'))['pdfEngine'])" 2>/dev/null || echo "pandoc")
OUT_DIR="$1"
if [ -z "$OUT_DIR" ]; then echo "Usage: build-volume.sh <out-dir-combined.md>"; exit 1; fi

if [ "$PDF_ENGINE" = "stirling" ]; then
  # Example: stirling --input combined.md --output volume.pdf --size 6x9 --b&w
  stirling --input "$OUT_DIR" --output "${OUT_DIR%.md}.pdf" --size 6x9 --b&w 2>/dev/null || echo "Stirling PDF not available; skipping PDF."
else
  # pandoc fallback
  pandoc "$OUT_DIR" -o "${OUT_DIR%.md}.pdf" --css=../styles/kdp.css --metadata geometry:margin=0.5in --pdf-engine=xelatex 2>/dev/null || echo "Pandoc PDF skipped (engine not available)."
fi
