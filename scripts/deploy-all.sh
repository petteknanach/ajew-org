#!/usr/bin/env bash
set -e
cd "$(dirname "$BASH_SOURCE")/.."
echo "=== Building all 40 volumes ==="
for v in $(seq -w 1 40); do
  echo "--- Volume $v ---"
  ./scripts/build-volume.sh "volumes/vol-$v/combined.md"
done
echo "=== Generating collective index (vol-00) ==="
mkdir -p volumes/vol-00/indices
# aggregate topic entries (example extraction)
grep -h "^# Topic Index" volumes/vol-*/indices/topic-index.md | sort -u > volumes/vol-00/indices/topic-index.md || true
# aggregate verse entries
grep -h "^# Verse Index" volumes/vol-*/indices/verse-index.md | sort -u > volumes/vol-00/indices/verse-index.md || true
# aggregate talmudic entries
grep -h "^# Talmudic Index" volumes/vol-*/indices/talmudic-index.md | sort -u > volumes/vol-00/indices/talmudic-index.md || true
# works cited (collect unique)
grep -h "^# Works Cited" volumes/vol-*/indices/works-cited.md | sort -u > volumes/vol-00/indices/works-cited.md || true
# build collective index page
cat > volumes/vol-00/combined.md << 'INDEXEOF'
# Collective Index — All Volumes

## Topic Index
INDEXEOF
cat volumes/vol-00/indices/topic-index.md >> volumes/vol-00/combined.md
cat >> volumes/vol-00/combined.md << 'INDEXEOF'

## Verse Index
INDEXEOF
cat volumes/vol-00/indices/verse-index.md >> volumes/vol-00/combined.md
cat >> volumes/vol-00/combined.md << 'INDEXEOF'

## Talmudic Index
INDEXEOF
cat volumes/vol-00/indices/talmudic-index.md >> volumes/vol-00/combined.md
cat >> volumes/vol-00/combined.md << 'INDEXEOF'

## Works Cited
INDEXEOF
cat volumes/vol-00/indices/works-cited.md >> volumes/vol-00/combined.md
# convert collective index to PDF if possible
if command -v pandoc &>/dev/null; then
  pandoc volumes/vol-00/combined.md -o volumes/vol-00/combined.pdf --css=styles/kdp.css --metadata geometry:margin=0.5in --pdf-engine=xelatex 2>/dev/null || echo "PDF skipped for vol-00"
fi
echo "=== Running deployment safeguards ==="
npm run verify

echo "=== Pushing to origin/main ==="
git add -A
git commit -m "deploy: build all 40 volumes + collective index" || echo "Nothing to commit"
git push origin main
echo "=== Deploy complete ==="
