# Tikun presentation provenance and limits

## Three intentionally different presentations

- **Fixed Torah columns** are written text, not qere. The imported word groups and line membership come from `akivajgordon/tikkun.io` commit `57ba104e8de055cf92d3cf6aa91245bd92b34d60`, `src/data/pages/torah/1.json` through `245.json`. Its MIT license is included as `LICENSE-tikkun-io.txt`. Import is offline; no external requests occur during a site build or in the reader.
- **Continuous study** is the existing pointed reading edition, with adaptive line breaks, reading punctuation and the existing paragraph annotations. It is NOT advertised as physical scroll lineation.
- **Numbered/per-verse study** retains the original reading and Targum workflows. Its unpointed written side uses the separate UXLC ketiv supplement. The UXLC paragraph tradition is not silently substituted into the fixed edition.

Upstream repository: https://github.com/akivajgordon/tikkun.io/tree/57ba104e8de055cf92d3cf6aa91245bd92b34d60

## Printed comparison (images, NOT OCR wording)

The user-supplied **Ish Matzliach** PDF is a scan with an imperfect OCR layer. Its SHA-256 is `17fe402444a6a358d3db04c867c1d8c264ef6d30dff1f61782c2ffc03bf17208`; 391 physical pages. It is not redistributed here.

Direct raster inspection covered physical pages 74, 75, 76, 151, 184, 258 and 315: printed columns 1, 2, 3, 78, 111, 185 and 242. The left printed side is bare written text; the right is pointed reading. These show justification, paragraph whitespace, the Sea song's alternating fragments, and Haazinu's separated halves. The implementation reproduces fixed groups rather than wrapping verses into imitation columns. No Torah wording was taken from OCR.

The pinned open dataset was **not accepted unexamined**: four book-transition columns had five empty rows, and column 78 omitted the two blank rows surrounding the Sea song. `layout-edits.json` records every presentation-only correction and its evidence. The corrected result is 245 columns of 42 physical rows. The source row numbers remain attached to each imported row; inserted blank rows have `sourceLine:null`. No consonant was altered by these corrections.

Primary rules used to check the physical structures:
- Rambam, Hilchos Sefer Torah 7:4, 7:7–8: columns, four blank book-separation lines, unusual letters: https://mechon-mamre.org/i/2307.htm
- 8:1–3 and 8:12–13: open/closed spaces and the distinct song forms: https://mechon-mamre.org/i/2308.htm
- 10:1: pointing / verse division must not be written in a Torah scroll: https://mechon-mamre.org/i/2310.htm
- Kiddushin 66b:13: the divided vav of shalom: https://www.sefaria.org/Kiddushin.66b.13

In particular, **maqaf, sof pasuq, paseq, vowels and cantillation are not scroll ink**. Maqaf becomes a word space. Extraordinary dots and inverted nuns are scribal signs, not vowels: they remain. Printed פ/ס labels never appear inside fixed scroll ink. Closed sections use source fragment gaps, open sections retain their unwritten line end, and empty source rows remain empty.

## Edition boundaries / honest limitations

The fixed edition and UXLC are not word-identical. The import measures 304,801 Hebrew consonants in the fixed source. An independent sequence comparison found 133 non-equal word runs between the two written editions. Those are a review inventory, NOT 133 certified textual errors or a reason to overwrite either source. The fixed view is a study reconstruction, not a certified scribal master.

Nine exceptional-letter features are explicitly sourced in `layout-edits.json`: enlarged initial bet, small heh/alef/yod, four UXLC large-letter positions, and the divided vav. The vav is a typographic stem mask; it is not a calligraphic facsimile. Individual variant tagin/curled letters and exact parchment/font metrics are not claimed. The displayed font is actual **Stam Ashkenaz CLM** rather than a generic family renamed “Stam.” On narrow screens, columns pan horizontally; they never reflow into different lines. Both song forms preserve the supplied fixed fragment membership.

## Reading, ketiv and frozen gold

`written-overrides.json` contains 1,111 independently indexed written verses and 27 complete reading-tail restorations from the original XML. The original `public/reader/medooyuk/*.json` files, token indexes, gold classifications and mark arrays are unchanged. Each source JSON SHA-256 is recorded and regression-checked.

`<q>` inline children/tails must be flattened just like `<w>`; using `q.text` alone silently truncates 27 readings. The importer preserves the full string as a presentation repair, while `scripts/build_medooyuk_data.py` is corrected for future imports. This task does NOT regenerate the corpus or rerun/change the linguistic rules.

The pure `tikkun-renderer.js` never infers a new ruling. `na` affects the sheva glyph only, `qk` the actual qamats, `qb` a distinct uncertain-qamats palette, and meteg its own mark. Nach is unmarked. Out-of-range indexes never color the entire word or a consonant.

## Font paint: why intact COLR clusters

Actual Chrome 151 pixel comparison showed that an isolated `.02px` larger combining-mark span shifted its anchor by about 15 CSS px at 60px in Taamey Frank. Without the split, the color vanished. The legacy splitter rule is retained, but the new renderer does not use it: changing a font invalidates earlier anchor measurements.

The final reading faces are small **COLR-v0 derivatives of Taamey Frank CLM**, using the native worker's source-preserving OpenType recipe. `ss01`/`ss02`/`ss03`/`ss04` are applied to the intact base-plus-marks cluster. Only vowel contours have palette colors; consonants retain currentColor. Contextual/compound glyphs (including final-kaf vowels and hataf+meteg) preserve their original GPOS/GDEF attachments. The website variant emboldens only sheva contours by symmetric outline layers. No Unicode or PUA substitutions are used; selectable text remains exact.

Three palette-specific faces are bundled for day, sepia and night; font URLs, CSS/JS URLs and the service-worker cache name are versioned. The complete build recipe, original face already in `public/fonts`, GPL-2 and font embedding exception are distributed together. See `public/fonts/tikkun/VOWEL-FONTS.md`.

## Reproducible tests (no full WSL website build)

- `node scripts/test-tikkun-renderer.cjs <evidence-dir>`: all 23,213 verses, 39 corpus hashes, 121,618 mark records, all 397 positive qamats marks, ketiv/source separation, paragraph/poetry rows and special letters. Writes font cases for the next test.
- `/usr/bin/python3 scripts/test-tikkun-font-shaping.py <evidence-dir>`: every unique annotated word through actual HarfBuzz; compares source glyphs/advances/offsets and requested colored glyphs.
- `python scripts/test-tikkun-browser.py --url <narrow-harness-url> --cdp <local-Chrome-CDP> --out <evidence-dir>`: desktop/mobile × three local themes × global day/dark, actual platform font use, contrast, interactions, and all columns at 16/26/44px.
- `python scripts/test-tikkun-paint.py --url <url> --cdp <CDP> --out <evidence-dir>`: same-position unsplit reference versus colored ink at 16/26/60px; asserts unchanged consonant ink and actual bold sheva pixels.

The local harness uses the actual route markup, scripts, fonts and shared Layout CSS. It is not a complete production Astro build. Final production delivery, Windows/iOS browser QA and native-device QA remain with the integrating parent.
