#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
OUT="public/images/sefer-hamidos-truth"
make_video() {
  lang="$1"
  list="/tmp/sh_truth_${lang}_concat.txt"
  : > "$list"
  for i in $(seq -w 1 10); do
    printf "file '%s/%s'\n" "$PWD/$OUT" "sh-truth-${i}-a-${lang}.png" >> "$list"
    printf "duration 3\n" >> "$list"
  done
  printf "file '%s/%s'\n" "$PWD/$OUT" "sh-truth-10-a-${lang}.png" >> "$list"
  ffmpeg -y -hide_banner -loglevel error -f concat -safe 0 -i "$list" \
    -vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,format=yuv420p" \
    -r 30 -c:v libx264 -preset medium -crf 21 -movflags +faststart \
    "$OUT/sefer-hamidos-truth-${lang}-clip.mp4"
}
make_video he
make_video en
ls -lh "$OUT"/*.mp4
