# Likutay Halachos — 40 Volumes (English ↔ Hebrew)

## Overview
- 40 volumes (6″×9″ black & white KDP hardcover)
- English on left (even pages), Hebrew on right (odd pages)
- Paragraph-level numbering for cross‑reference
- Combined dual‑language files in `volumes/vol-N/combined.md`

## Project Structure
- `volumes/vol-N/eng.md` — English content for volume N
- `volumes/vol-N/heb.md` — Hebrew content for volume N
- `volumes/vol-N/combined.md` — Interleaved English↔Hebrew output
- `volumes/vol-N/commentary/` — Per‑item commentary (insert as needed)
- `styles/kdp.css` — Minimal print CSS (page size, margins, fonts)
- `output/` — Generated PDFs ready for KDP upload

## Quick Build (requires pandoc)
```bash
./scripts/build-volume.sh 01
# repeat for 02..40, then convert combined.md -> PDF via pandoc + kdp.css
```

## Collective Index
- `volumes/vol-00/` — collective index for all 40 volumes (terms, sources, cross‑refs)
