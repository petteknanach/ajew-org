#!/usr/bin/env bash
set -e
VOL="01"
OUT="volumes/vol-$VOL/combined.md"
mkdir -p "volumes/vol-$VOL"
if [[ -f "source-texts/english/vol-$VOL.md" && -f "source-texts/hebrew/vol-$VOL.md" ]]; then
  paste -d $'\n' \
    <(sed 's/^/<p class="eng" id="par&\">/;s/$/<\/p>/' source-texts/english/vol-$VOL.md) \
    <(sed 's/^/<p class="heb" id="par&\">/;s/$/<\/p>/' source-texts/hebrew/vol-$VOL.md) > "$OUT"
else
  cat > "$OUT" << PLACEHOLDER
# Likutay Halachos — Volume $VOL

## Dedication (en)
English dedication.

## Dedication (heb)
\u05d4\u05e7\u05d3\u05d5\u05e9 \u05d1\u05e8\u05d5\u05da.

## TOC
1. Hashkama
2. Neteylas Yadayim
PLACEHOLDER
fi
# optional pandoc conversion if available
if command -v pandoc &>/dev/null; then
  pandoc "$OUT" -o "${OUT%.md}.pdf" --css=styles/kdp.css --metadata geometry:margin=0.5in --pdf-engine=xelatex 2>/dev/null || true
fi
echo "Pilot volume $VOL ready."
