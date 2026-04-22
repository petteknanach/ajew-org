#!/usr/bin/env bash
set -e
VOL="$1"
if [ -z "$VOL" ]; then echo "Usage: build-volume.sh <volume-number>"; exit 1; fi
OUT_DIR="volumes/vol-$VOL/combined.md"
# placeholder: in production this would merge eng+heb and apply corrections
if [ ! -f "source-texts/english/vol-$VOL.md" ] || [ ! -f "source-texts/hebrew/vol-$VOL.md" ]; then
  echo "Missing sources for vol-$VOL — skipping."; exit 0
fi
paste -d $'\n' \
  <(sed 's/^/<p class="eng" id="par&\">/;s/$/<\/p>/' source-texts/english/vol-$VOL.md) \
  <(sed 's/^/<p class="heb" id="par&\">/;s/$/<\/p>/' source-texts/hebrew/vol-$VOL.md) > "$OUT_DIR"
echo "Generated $OUT_DIR"
