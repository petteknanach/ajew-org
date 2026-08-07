# Kokhvei Or bilingual alignment provenance

## Incident

The Koachvay/Kokhvei Or Reader English was not reliably paired with its canonical Hebrew. The original importer (`scripts/parse-koachvay-or-english.cjs`) distributed extracted English blocks proportionally whenever source-block and Hebrew-segment counts differed. Later bulk “repair” commits reassigned those already arbitrary storage chunks by segment index. This produced fluent but unrelated English beside many Hebrew paragraphs.

The proportional importer is now hard-disabled. It must not be used to write Reader data.

## Canonical sources and repair policy

- Canonical Hebrew and metadata: `public/reader/kokhvei-or/section-1.json` through `section-21.json` as they existed before this repair.
- Authoritative English source HTML: `C:\Users\Pettek\Documents\Claude Desktop projects\Finished\Koachvay Or\` (20 source files).
- Historical recovery source: commit `d1dd4889d`, with selected later direct translations retained only after semantic review.
- Where those English sources abridged canonical Hebrew, the omitted Hebrew was translated directly and reviewed; a fluent summary was never treated as complete coverage.
- Every canonical Hebrew string, index, order, and metadata value was preserved. Only `segments[*].en` changed, except Section 15 `hasEnglish`, because Biur HaLikutim is canonically Hebrew-only.
- The final corpus contains 901 canonical segments: 781 reviewed bilingual pairs and 120 intentionally Hebrew-only Biur HaLikutim segments.
- English was repartitioned by explicit headings, story/prayer/siman boundaries, names, quotations, and meaning—not by historical array index or proportional length.
- Synthetic translator summaries and decorative corpus banners were excluded; translated source notes and commentary corresponding to Hebrew were retained.

## Durable gates

- `public/reader/kokhvei-or/alignment-manifest.json` locks the reviewed Hebrew, English, and pair hashes for every canonical segment.
- `scripts/verify-kokhvei-or-alignment.cjs` validates all 21 sections and the known tainted-grain anchors.
- `scripts/verify-search-regressions.cjs` validates generated-index retrieval for the tainted-grain story under realistic English and Hebrew variants.
- `npm run verify:base` invokes the alignment verifier before every production build.

## Special case

Section 15, **Biur HaLikutim**, is Hebrew-only. Imported English in that section was unrelated and was removed rather than falsely presented as a translation.
