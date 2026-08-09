# שיחות סבא OCR correction overlay

## Sources

- Canonical OCR download: `public/downloads/sichos-saba-complete-hebrew-ocr.txt`
  - SHA-256: `35663a20875ebf18d75f4dbc52778f31f215291f1984f64a678e095949e8ee75`
  - This file remains unchanged and reconstructs exactly from the introduction plus all 234 tape-side `sourceSlice` values.
- Comparison witness: `שיחות סבא חדש.doc`
  - Format: Microsoft Word 97–2003 Composite Document File V2
  - Pages reported by the document: 1,167
  - SHA-256: `375d888d6ab7f2b51485412e11f6ce3e83109ee88c4f5273c90bf9ffd7ede276`
  - Extracted with antiword 0.37 using the UTF-8 map and unlimited line width.
  - Extracted-text SHA-256: `022f8ff760782fea8c246fa3078221839f06b4870111590d19c3d0a7af04c41d`

The binary witness and its extraction are retained locally under `.hermes/saba-ocr-witnesses/` and are deliberately excluded from Git. The correction ledger contains the source and witness excerpts needed to audit each published change without publishing the entire supplied document.

## Alignment and review

The extracted witness was normalized to Hebrew word tokens and aligned against the 234 canonical tape-side records with exact four-word shingles. Two hundred seven sides met the conservative alignment threshold. Missing sides and sides without a reliable correspondence were not inferred or filled.

The comparison produced 650 rare-token, one- or two-character candidates. Every candidate received a first-pass contextual review. Seventy-five survived that pass. A separate reviewer then re-examined all 75 against the complete canonical segment and witness context and approved only 10 unambiguous OCR or typographic corruptions. Spelling normalization, optional prefixes, colloquial grammar, repeated speech, uncertain names, and alternate auditory interpretations were rejected.

The approved changes and both review reasons are recorded in `scripts/data/saba-ocr-corrections.json`.

## Publication model

Corrections are an overlay on Reader Hebrew, not a rewrite of the archived OCR:

1. The importer reconstructs the same 234 source slices from the unchanged ABBYY text.
2. Segmentation is performed on the archived source before any correction, preserving all tape, side, and segment IDs.
3. For a ledger-listed segment, the importer requires the exact pre-correction Hebrew hash and substitutes the independently approved corrected segment.
4. It records the original hash, corrected hash, change count, and witness hash on the published segment.
5. Verified English is preserved only when its Hebrew is byte-identical. A corrected Hebrew segment therefore loses stale English verification and returns to the serialized translation/review queue.
6. The verifier requires every ledger entry to be emitted, validates every corrected hash and provenance record, and still requires exact reconstruction of the original OCR source.

This model prevents a useful secondary witness from silently changing source boundaries, missing-side status, uncertain transcriptions, or already reviewed material outside the exact approved corrections.
