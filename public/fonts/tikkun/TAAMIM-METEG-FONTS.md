# Taamim-only meteg derivatives — version 1

These separately named Ajew Study Marked Taamim faces derive only from
`AjewStudyStam-taamim.ttf` (SHA-256
`7461de35bf7a8fbefd67b1c63a450d0a0878c2c3ff43d6bab970f1baff6b6efa`).
They retain its hidden-nikud outlines, consonants, glyph IDs, metrics, global
bounds, source shaping lookups, anchors and all embedded author/license
notices. Six meteg alternates inherit the original GPOS/GDEF records. Only
`ss04` activates original meteg contours in COLR-v0 palette entry 3; no other
vowel feature is added. The three hidden hataf+meteg glyphs consist of exactly
one original thin meteg rectangle, so no hidden hataf ink is restored.
Disabling emphasis leaves these alternates inactive and all source ink plain.

Source and author notices remain unchanged in `study-stam/LICENSE.txt`,
`study-stam/AUTHOR-README.htm` and `study-stam/ShlomoStam-source.ttf`.
The corresponding source archive includes those originals, the pinned
intermediate Taamim face, the complete generators and the unchanged
`study-stam-source-v2.tar.gz` source chain. Existing notices apply to their
respective source font software; this transformation does not replace them
or use a reserved source font name as its primary family name.

Reproduce offline with Python and **fontTools 4.60.1**, from the extracted
`study-stam-taamim-meteg-source-v1.tar.gz` root:

```
python scripts/build-tikkun-taamim-meteg-fonts.py --source-root . --output-root ./regenerated
```

Only the three new `AjewStudyMarked-taamim-{day,sepia,night}.ttf` files are
written. Compare them to `SOURCE-MANIFEST.json` expected outputs. Never use
the older generator's `main()` to regenerate approved fonts for this repair.

FontTools must extend the hmtx long-metric storage count and glyph count for
the new glyphs; every original advance/bearing and head/hhea/maxp geometry
field is retained. Feature-off shaping is identical to the source.
Font-table and HarfBuzz conservation is not a fresh browser paint pass;
actual palette pixels, source geometry, fit/focus and native delivery need
separate browser acceptance.
