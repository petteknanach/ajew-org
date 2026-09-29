# Tikun Vowels web fonts

`TikunVowels-day.ttf`, `TikunVowels-sepia.ttf`, and `TikunVowels-night.ttf` are modified versions of **Taamey Frank CLM**, copyright (C) 2010 Yoram Gnat (gyoramg@users.sourceforge.net).

License: GNU GPL version 2, with the original document-embedding exception extended to these derivatives. The original license is `../LICENSE.txt`; the complete GPL is `GNU-GPL.TXT` in this directory. The unchanged source font is `../TaameyFrankCLM-Medium.ttf`. The complete transformation source is `scripts/build-tikkun-vowel-font.py` (run from the repository; Python/fontTools; no network). The downloadable `TikunVowels-source-v1.tar.gz` in this directory packages that exact recipe, the unchanged TTF, the editable upstream FontForge SFD, both license files, reproduction instructions, and SHA-256 manifests. Extracted with fontTools 4.63.0, its recipe reproduces all three served fonts byte-for-byte; archive SHA-256: `59ec31eeb1f6c0f94ab846737e43414731d35e4dca3e20b2ca5a426a0274ef4b`.

The transformation derives from the coordinated native Tikun font recipe. It creates COLR-v0 colored glyph alternatives, preserves original GPOS/GDEF and contextual glyph attachments, and activates them with ss01 (audible sheva), ss02 (positive qamats katan), ss03 (uncertain qamats), and ss04 (meteg). Compound glyphs are split by exact outline correspondence; consonant contours remain currentColor. The web variant adds symmetric 34-font-unit layers to the sheva contours only, making the dots bolder without changing anchors, character widths or letter weight. Separate palettes keep all three UI themes readable.

No source text, Unicode character, PUA codepoint, linguistic decision or token index is replaced. Unmarked text uses the original glyphs. Font-feature spans enclose complete grapheme clusters, not separated combining marks. This prevents the measured browser run-splitting anchor failure.

`StamAshkenazCLM.ttf` is an unmodified Yoram Gnat / Culmus font for bare written ink; its original README, LICENSE and GPL files accompany it. Its U+05C6 mapping is empty, so the renderer uses the reading face's real inverted-nun glyph for that sign.
