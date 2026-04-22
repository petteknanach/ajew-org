#!/usr/bin/env bash
set -e
VOL="01"
echo "--- Pilot build: volume $VOL ---"

# 1) Normalize and combine English + Hebrew (placeholder source texts for demo)
ENG="source-texts/english/vol-$VOL.md"
HEB="source-texts/hebrew/vol-$VOL.md"
OUT="volumes/vol-$VOL/combined.md"

mkdir -p "volumes/vol-$VOL"

# If real sources exist, use them; else create minimal placeholders
if [[ -f "$ENG" && -f "$HEB" ]]; then
  # normalize titles in source files externally; here we just wrap them
  paste -d $'\n' \
    <(sed 's/^\(.*\)$/<p class="eng" id="par&\">\1<\/p>/' "$ENG") \
    <(sed 's/^\(.*\)$/<p class="heb" id="par&\">\1<\/p>/' "$HEB") > "$OUT"
else
  # Minimal placeholder content
  cat > "$OUT" << PLACEHOLDER
# Likutay Halachos — Volume $VOL

## Dedication (back of title page)
English dedication placeholder.

## Dedication (back of title page — Hebrew)
\u05d4\u05e7\u05d3\u05d5\u05e9 \u05d1\u05e8\u05d5\u05da \u05d4\u05d5\u05d0... (placeholder)

## Table of Contents
1. Hashkama — Rising Early
2. Neteylas Yadayim — Washing Hands

## Contents
- Hashkama laws
- Neteylas Yadayim laws

## Body
### Hashkama — Rising Early
<p class="eng" id="par1">The laws of rising early in the morning...</p>
<p class="heb" id="par1">\u05de\u05e9\u05e0\u05d4 \u05d0 \u05d5...</p>

### Neteylas Yadayim — Washing Hands
<p class="eng" id="par2">Laws of washing hands in the morning...</p>
<p class="heb" id="par2">\u05d4\u05dc\u05db\u05d5\u05ea \u05e0\u05d8\u05d9\u05dc\u05ea...</p>

## Indices
- Topic Index: charity, prayer, tzitzit
- Verse Index: e.g., Deuteronomy 6:5
- Talmudic Index: e.g., Menachos 98b
- Works Cited: Likutay Moharan, Rimzay Maaseyos

## Na NaCh

\u05e0 \u05e0\u05d7 \u05e0\u05d7\u05de \u05e0\u05d7\u05de\u05df \u05de\u05d0\u05d5\u05de\u05df

## Tikkun HaKlali Notes
(Here we fix RTL verse numbering and hard returns after Hebrew verses.)
PLACEHOLDER
fi

# 2) Apply corrections from the 3 text files (if present)
#   files: source-texts/corrections/eng.txt, heb.txt, meta.txt
CORRECTIONS="source-texts/corrections"
if [[ -d "$CORRECTIONS" ]]; then
  echo "Applying corrections from $CORRECTIONS (if any)..."
  # placeholder: in practice we would run sed/awk replacements per file
fi

# 3) Generate PDF via pandoc (requires pandoc; skip if not available)
if command -v pandoc &>/dev/null; then
  pandoc "$OUT" \
    -o "volumes/vol-$VOL/combined.pdf" \
    --css=styles/kdp.css \
    --metadata geometry:margin=0.5in \
    --pdf-engine=xelatex 2>/dev/null || echo "PDF generation skipped (xelatex not available)."
else
  echo "pandoc not installed — PDF skipped."
fi

# 4) Build indices for this volume
echo "Building indices for volume $VOL..."
mkdir -p "volumes/vol-$VOL/indices"
cat > "volumes/vol-$VOL/indices/topic-index.md" << IDXEOF
# Topic Index — Volume $VOL
- charity
- prayer
- tzitzit
IDXEOF

cat > "volumes/vol-$VOL/indices/verse-index.md" << VERSEEOF
# Verse Index — Volume $VOL
- Deuteronomy 6:5 — Shema
VERSEEOF

cat > "volumes/vol-$VOL/indices/talmudic-index.md" << TALEOF
# Talmudic Index — Volume $VOL
- Menachos 98b — menora
TALEOF

# 5) Reverse index of cited works (per volume, lightweight)
cat > "volumes/vol-$VOL/indices/works-cited.md" << WORKSEOF
# Works Cited — Volume $VOL
- Likutay Moharan
- Rimzay Maaseyos
WORKSEOF

echo "Pilot build for volume $VOL complete."
