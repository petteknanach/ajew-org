---
name: likutay-halachos-project
category: content-publishing
description: >
  Publishing 40 dual-language (English⇄Hebrew) KDP volumes for Likutay Halachos,
  plus a collective index. Includes conventions (transliteration, sources), file
  structure, build script, and notes for reuse.

conventions:
  transliteration:
    cheereek: ee
    tzairay: ei (common) / phonetic (uncommon)
    eye_sound: ai
    shuruk: oo (except word-initial/end)
  sources_per_commentary:
    - Rimzay Maaseyos
    - Likutay Nanach Vol. 4
  kdp_format: 6x9 bp B&W; English left/Hebrew right; paragraph-level numbering

structure:
  volumes:
    vol-N/eng.md
    vol-N/heb.md
    vol-N/combined.md
    vol-N/commentary/   # per-item index + commentary files
  styles/kdp.css
  output/              # generated PDFs for KDP
  vol-00/              # collective index

build:
  script: scripts/build-volume.sh <volume-number>
  convert: combined.md -> PDF via pandoc + kdp.css
  bulk: repeat for 01..40; generate collective index separately

notes:
  - Skeleton created after a dropped Windows-path folder; adapted to workspace.
  - README and spec documents are versioned at project root.
  - Next: supply source texts, bulk-build, produce PDFs, upload to KDP.

reuse: applicable to other dual-language series with fixed-layout requirements.
