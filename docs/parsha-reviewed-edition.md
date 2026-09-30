# Breslov on the Parsha — reviewed incremental edition

Revision: `reviewed-selections-20260930-v1`. This is **not complete Biraishis or complete Noach**. Finding OCR for an entire range is not proof that the range has been matched, finalized, and reviewed. Do not restore the displaced Chumash-LH text as a fallback.

## Published extent

- 14 source-authenticated Hebrew selections: Biraishis 13, Noach 1; English is absent/unreviewed and deliberately empty.
- Biraishis verse labels in source order: 1:1, 1:5, 1:26, 1:27, 1:4, 1:29–30, 2:2, 2:7. Repeated verses are distinct printed selections.
- Noach: 8:18, printed sefer pages 71–72. This is one complete selected excerpt, not certification of every intervening Noach teaching.
- First selection is the exact previously reviewed delivered witness. It is not reconstructed from today's changed corpus. Its original witness is hash-locked separately.
- Preserve printed citations separately from content locators: e.g. the printed מילה ג׳ ד׳ maps by content to a corpus segment headed אות ז. No silent citation correction.
- Summaries/verses/excerpt boundaries were checked against upright scans; Hebrew excerpts use established corpus wording plus explicitly recorded corrections. One corrupted corpus passage is a recorded scan transcription. No corpus master was edited.
- Printed apparatus is retained through 13 facsimile references (8 distinct referenced facsimiles; 10 page crops preserved), where available, with `transcriptionStatus: not-transcribed`. This is **not** a claim of complete reviewed notes. Decorative `ציונים64` is not a numbered note.

## Actual runtime targets

Site `/parsha/bereishit/`, `/parsha/noach/`, and `/reader/chumash-lh/1/{1,2}/` render the same reviewed master through `ReviewedParsha.astro`. Both `part-1/torah-{1,2}.json` and `section-p1-t{1,2}.json` are replaced; the displaced 92/30 legacy segments remain archived only as evidence. Chumash-LH search-derived snippets are suppressed on parsha pages, not copied into the edition.

Tanach commentary data lives at `/reader/breslov-parsha/bereishit-{1,2,8}.json`; the server sidebar and client fallback identify these actual endpoints. Chapter coverage remains partial. The original Tanach, LH, LM, Chayey, and Misheevas corpora are untouched.

App tab → parsha list → `/parsha/[slug]` opens the native reviewed/PDF screen. `bookLoader.loadTorah('chumash-lh',1,{1,2})` takes bundled reviewed data before the old live download/cache. The app assets are byte-identical to the website reviewed master/manifest. Unreviewed parshas in this flow are PDF-only; existing corrected special packet site views are retained.

## PDF inventory

All 56 existing files in the canonical `public/pdfs/parsha` tree were probed by HTTP range request and `%PDF-` bytes (56 succeeded, no failures). They cover 53 of 54 weekly-parsha slugs plus four holiday PDFs. Nitzavim/Vayeilech share one PDF; Vezot Haberacha has no verified mapping, and no neighboring PDF is substituted. The all-PDF native screen includes the holiday files.

The 306-row public library catalog was inspected; no explicitly parsha-named catalog PDFs were found. Canonical corrected packets were reconciled: 11 JSON packets, 13 literal PDF references, 11 unique PDFs, all included. Ownership is derived from the site's literal PDF map and packet entry slugs, not translated filename guesses.

Native actions: Android content-URI PDF view with read permission, private offline save with PDF magic validation, and platform file sharing. A valid saved file is reused offline. iOS uses the platform preview/share sheet. Browser actions are not proof of native-device behavior; native APIs are exercised by explicit stubs in tests. Download/share must reject HTML or bad HTTP responses and delete invalid partial files.

## Source recovery and unresolved spans

Durable intake: `C:\Users\Pettek\abbyy-ocr\chumash-lh-draft` and sibling `inbox` scans. Review evidence is archived under `/root/.local/share/ajew-app-improvements-20260930/evidence/parsha` and mirrored to `C:\Users\Pettek\Ajew-App-Improvements-20260930\parsha`. Loss of the old scratch directory does not mean the source is absent.

The manifest contains 15 OCR/mapping source hashes, 4 frozen PDF scan hashes, per-unit full provenance hashes and teaching hashes, corpus offsets, explicit correction pairs, exact source verse/citations, approved selection IDs and page lists, and precise blockers:

- Printed pages 10–11 are missing from the available batch4 spreads; verify the physical 9→12 seam rather than trusting the old gap note alone.
- Biraishis 1:1 units 2–4: delivered parallel/unfinished assemblies need exact scan-to-corpus adjudication.
- Batch4 units 2, 3, 12: missing seam or incomplete opening/ending/intro.
- Batch5 paragraphs 3–13 and 33–180, except the two published selections: duplicates, interleaved apparatus and unresolved boundaries.
- Batch6 paragraphs 0–40, 47–474, 499–505, except selected Noach paragraphs 475–498. The 19-citation checkpoint is not 19 finalized units; paragraph 505 ends mid-teaching. The recovered matching note says 16/19 file resolutions, not full excerpt review.

These paragraphs are retained in evidence, not silently discarded or promoted to complete authenticated teachings.

## Incremental publication contract

1. Freeze/hash each new OCR and original scan before work. Preserve old witnesses and displaced JSON. Check edition identity, duplicates, apparatus/ornament boundaries, opening/closing seams and complete excerpt extents.
2. Assign a stable unit ID. Keep literal verse, scan hash/printed pages, summary, verse/intro, ordered teaching parts, midsummaries if present, printed citations, distinct corpus locators/offsets, exact before/after corrections, and review evidence. Store uncertain apparatus as facsimile. English remains empty until separately aligned and reviewed.
3. New candidate units need a semantic review of the entire excerpt, including its final line and any internal summaries. Fingerprint matches and hashing are **not** semantic approval.
4. Freeze the previous reviewed master before adding units. Existing IDs, text, provenance and order must be conserved. Any change requires an amendment containing exact whole-node `before`/`after`, a reason, and locked review evidence. The transition gate rejects lost/duplicate/reordered units, unlogged changes, stale witnesses, unused/duplicate corrections and false whole-book flags. Whole-node amendments provide semantic JSON reversal; byte-format reversal is not claimed.
5. Generate app assets, site master and all reader endpoints from that single candidate. Regenerate counts/page/verse lists, source/scan/provenance/teaching/master hashes, edition revision and runtime payloads. Do not edit source corpus masters or shared search builders.
6. Run conservation and transition gates, then actual reader language/mobile rendering checks. Mutation tests disable checksum masking to exercise logical conservation independently.
7. Keep `wholeParsha=false`/`wholeBook=false` until a separate exhaustive ordered coverage, gap, seam and apparatus audit justifies a new completion contract. Scan endpoints or paragraph totals never establish completeness.
8. Commit isolated app and site changes. Deployment is a separate authorized step; after deployment read back every exact endpoint/revision and compare its units, not merely HTTP success.

### Scoped checks (no full build required)

From the site checkout:

```sh
python3 scripts/verify-reviewed-parsha.py --app ../app-parsha --evidence ../evidence/parsha --corpus /root/ajew-org/public/reader
python3 scripts/check-parsha-increment.py --self-test
python3 scripts/check-parsha-increment.py --previous /path/to/frozen-reviewed.json --candidate public/data/breslov-parsha/reviewed-v1.json --amendments /path/to/exact-amendments.json
```

From the app checkout:

```sh
node tests/parsha-content.cjs
npx tsc --noEmit
node tests/build-parsha-ui.cjs /path/to/evidence
```

The last command bundles the **actual** RN Web screens with labeled Expo API stubs for browser layout/action wiring. It is not an emulator, release build, Android-device test, or production readback. Local real Astro pages and RN Web screens were exercised at mobile width; site pages were also exercised at desktop width. No full Astro build, deployment, push or Play submission is part of this change.
