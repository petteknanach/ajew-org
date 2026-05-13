# Pettek Nanach - Source Patches Archive

These `t<N>_seg<X>_patch.json` files are the flat-key intermediate
format that earlier sessions used to draft commentary segments.
Every patch in this folder has already been merged into the canonical
nested structure of the corresponding `torah-<N>.json` file in:

`..\..\public\reader\pettek-nanach-commentary\`

A patch's `beginner_en` lives at `segments[index==X].layers.beginner.en`
in the torah file (and similarly for intermediate_en / intermediate_he /
scholarly_he). Sampled 8 patches at random across the full N range on
2026-05-03 and confirmed byte-for-byte equality with the merged copy.

DO NOT re-apply. Kept here as a source backup only; no longer shipped
with the public site. The `write_t*.py` scripts are the generators
that produced higher-numbered torah files (N >= 61); they used the
N-ending typo as author, which has been corrected in the merged JSON.

- Pettek Nanach (Simcha)