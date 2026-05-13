# Likutay Halachos — Project Specification

## Layout
- Format: 6" × 9" hardcover (KDP black & white)
- Page pairing: English on the left (even pages), Hebrew on the right (odd pages)
- Numbering: Paragraph-level numbers for cross-reference between languages
- Volumes: 40 volumes + 1 collective index (separate volume)
- Source texts: Provide clean source files (Markdown or plain text) per volume

## File Conventions
- volumes/vol-N/eng.md — English content for volume N
- volumes/vol-N/heb.md — Hebrew content for volume N
- volumes/vol-N/combined.md — Dual‑language interleaved output (English←→Hebrew by paragraph)
- styles/kdp.css — Minimal print CSS (page size, margins, fonts, hyphenation)
- output/ — Generated files ready for KDP upload (PDF via pandoc or similar)

## Collective Index (vol-00)
- Aggregate index of terms, sources, and cross‑references across all 40 volumes
- Each index entry points to volume and paragraph number(s)
- Include both English and Hebrew headings

## Build Process (local)
1. Prepare source texts (plain Markdown) in volumes/vol-N/eng.md and heb.md
2. Run the pairing script to create combined.md
3. Convert combined.md to PDF with pandoc + kdp.css
4. Repeat for all volumes; generate collective index separately

## Next steps
- Provide the 40 source texts (or placeholders) so we can generate the dual‑language layouts and PDFs.
