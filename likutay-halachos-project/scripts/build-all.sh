#!/usr/bin/env bash
set -e
SRC_HEB="$1"   # e.g., source-texts/hebrew/vol-01.html
SRC_ENG="$2"   # e.g., source-texts/english/vol-01.html
VOL="$3"
OUT_DIR="volumes/vol-$VOL"

# Step 1: normalize titles (hashkama -> rising early; neteylas yadayim -> hand washing)
# In practice you’d map original-title -> canonical-title using a lookup table.
# Here we just copy/paste as placeholders.

# Step 2: produce combined dual-language file with paragraph numbers
paste -d $'\n' \
  <(awk '{print "<p class=\"eng\" id=\"par"NR\">" $0 "</p>"}' "$SRC_ENG") \
  <(awk '{print "<p class=\"heb\" id=\"par"NR"\">" $0 "</p>"}' "$SRC_HEB") > "$OUT_DIR/combined.md"

# Step 3: convert to PDF via pandoc + KDP CSS (requires pandoc)
# pandoc "$OUT_DIR/combined.md" -o "$OUT_DIR/combined.pdf" --css=../styles/kdp.css --metadata geometry:margin=0.5in
