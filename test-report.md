# Feature Pages Test Report - ajew.org
Generated: 2026-03-25

## Summary

| Page | Exists | JSON Loads | JS Correct | Links Valid | Issues |
|------|--------|------------|------------|-------------|--------|
| /torah-gps | Yes | Yes (torah-gps-index.json) | Yes | BROKEN | All URLs use wrong format |
| /torah-lens | Yes | Yes (torah-lens-index.json) | Yes | BROKEN | All URLs use wrong format |
| /chain-of-light | Yes | Yes (chain-of-light.json, loaded server-side) | Yes | BROKEN | All connection URLs use wrong format |
| /healing-words | Yes | Yes (healing-words.json, imported server-side) | Yes | OK | URLs use correct format |
| /daily-study | Yes | Yes (chok-breslov.json) | Yes | OK | URLs use correct format |
| /my-sefer | Yes | N/A (localStorage only) | Yes | N/A | No issues found |

---

## CRITICAL: Broken URL Format in 3 Data Files

### The Problem

All Astro reader routes use the `[part]/[torah]` dynamic pattern where:
- `part` is a plain number: `1`, `2`, `3`, etc.
- `torah` is a plain number: `1`, `2`, `42`, etc.

**Correct URL format:** `/reader/likutay-moharan/1/14`
**Correct URL format:** `/reader/likutay-halachos/4/12`
**Correct URL format:** `/reader/likutay-tefilos/1/14`

Three JSON data files generate URLs using the **internal file path** format instead of the **route** format:

### 1. torah-gps-index.json - ALL URLs BROKEN

**Build script:** `scripts/build-torah-gps-index.cjs` (lines 588-590)
```
let readerUrl = `/reader/${bookId}`;
if (partNum) readerUrl += `/part-${partNum}`;   // BUG: should be just `/${partNum}`
readerUrl += `/${torahFile}`;                     // BUG: torahFile = "torah-1" but route expects just "1"
```

**Example broken URLs generated:**
- `/reader/likutay-moharan/part-1/torah-14` -- should be `/reader/likutay-moharan/1/14`
- `/reader/likutay-halachos/part-6/halacha-13` -- should be `/reader/likutay-halachos/6/13`
- `/reader/likutay-tefilos/part-1/prayer-14` -- should be `/reader/likutay-tefilos/1/14`

**Affected count:** Every URL in the file (the file has 51 topics with many results each)

**Fix for build-torah-gps-index.cjs (lines 588-590):**
```js
let readerUrl = `/reader/${bookId}`;
if (partNum) readerUrl += `/${partNum}`;
if (torahNum) readerUrl += `/${torahNum}`;
```

### 2. torah-lens-index.json - ALL 147 URLs BROKEN

**Build script:** `scripts/build-torah-lens-index.cjs`
URLs are hardcoded in the source file with wrong format.

**Example broken URLs:**
- `/reader/likutay-moharan/part-1/torah-14` -- should be `/reader/likutay-moharan/1/14`
- `/reader/likutay-moharan/part-2/torah-8` -- should be `/reader/likutay-moharan/2/8`
- `/reader/likutay-tefilos/part-1/prayer-14` -- should be `/reader/likutay-tefilos/1/14`
- `/reader/likutay-tefilos/part-2/prayer-5` -- should be `/reader/likutay-tefilos/2/5`

**Fix:** Find-and-replace in `scripts/build-torah-lens-index.cjs`:
- `/part-1/torah-` --> `/1/`
- `/part-2/torah-` --> `/2/`
- `/part-1/prayer-` --> `/1/`
- `/part-2/prayer-` --> `/2/`
Then rebuild the index.

### 3. chain-of-light.json - ALL 1,345+ URLs BROKEN

**Build script:** `scripts/build-chain-of-light.cjs`

**Multiple broken URL patterns (with line references in build script):**

| Line | Current (broken) | Should be |
|------|-----------------|-----------|
| 158 | `/reader/kitzur-likutay-moharan/part-${partNum}/torah-${num}` | `/reader/kitzur-likutay-moharan/${partNum}/${num}` |
| 206 | `/reader/likutay-tefilos/part-${part}/prayer-${num}` | `/reader/likutay-tefilos/${part}/${num}` |
| 275 | `/reader/parparos-lechochma/part-1/torah-${num}` | `/reader/parparos-lechochma/1/${num}` |
| 337 | `/reader/biur-halikutim/part-1/torah-${num}` | `/reader/biur-halikutim/1/${num}` |
| 445 | `/reader/likutay-halachos/part-${partNum}/halacha-${num}` | `/reader/likutay-halachos/${partNum}/${num}` |
| 491 | `/reader/sichos-haran/sicha-${num}` | `/reader/sichos-haran/1/${num}` |
| 554 | `/reader/${bookId}/part-${partNum}/section-${num}` | `/reader/${bookId}/${partNum}/${num}` |
| 651 | `/reader/likutay-moharan/part-${partNum}/torah-${num}` | `/reader/likutay-moharan/${partNum}/${num}` |

**Special note on sichos-haran (line 491):** This is doubly broken:
1. Uses `sicha-` prefix instead of plain number
2. Missing part number entirely (should have `/1/` between book name and number)

---

## Pages That Are CORRECT

### 4. /healing-words - OK
- `healing-words.json` is imported server-side in the Astro frontmatter
- URLs use correct format: `/reader/likutay-moharan/2/24`, `/reader/sichos-haran/1/42`, etc.
- Journey cards render from `healingData.journeys.map()`
- Step links use `step.reader_url` which has correct format
- localStorage progress tracking works correctly
- No issues found

### 5. /daily-study - OK
- `chok-breslov.json` loaded via fetch in client JS
- URLs use correct format: `/reader/likutay-moharan/1/1`, `/reader/likutay-halachos/1/1`, etc.
- Book portion cards render with `firstSection.url`
- Date letters section uses `letter.url`
- Bonus section uses `first.url`
- localStorage progress/streak tracking works
- Also generates bonus LT URLs correctly at line 804: `/reader/likutay-tefilos/${p.part}/${p.num}`
- No issues found

### 6. /my-sefer - OK
- No external JSON data file needed
- Page is entirely localStorage-based (`mySefer` key)
- Functions: loadSefer(), saveSefer(), render(), export PDF, share, drag-drop reorder
- Links to `/reader` in empty state work correctly
- No issues found

---

## Route Format Reference

Every reader route follows this pattern in getStaticPaths():
```
paths.push({ params: { part: '1', torah: String(number) } });
```

The URL is always: `/reader/{book-name}/{part-number}/{item-number}`

Where `{part-number}` is a plain integer and `{item-number}` is a plain integer.

The file on disk may be `part-1/torah-1.json` or `part-4/halacha-12.json` or `sicha-42.json`,
but the route always maps `part` and `torah` params to plain numbers.

**Verified route files:**
- `src/pages/reader/likutay-moharan/[part]/[torah].astro` - parts 1,2; loads `part-{N}/torah-{N}.json`
- `src/pages/reader/likutay-halachos/[part]/[torah].astro` - parts 1-8; loads `part-{N}/halacha-{N}.json`
- `src/pages/reader/likutay-tefilos/[part]/[torah].astro` - parts 1-2; loads `part-{N}/prayer-{N}.json`
- `src/pages/reader/kitzur-likutay-moharan/[part]/[torah].astro` - parts 1-2; loads `part-{N}/torah-{N}.json`
- `src/pages/reader/sichos-haran/[part]/[torah].astro` - part 1 only; loads `sicha-{N}.json`
- `src/pages/reader/likutay-eitzos/[part]/[torah].astro` - part 1 only; loads `topic-{N}.json`
- `src/pages/reader/meshivas-nefesh/[part]/[torah].astro` - part 1 only; loads `section-{N}.json`
- `src/pages/reader/parparos-lechochma/[part]/[torah].astro` - part 1 only; loads `section-{N}.json`
- `src/pages/reader/biur-halikutim/[part]/[torah].astro` - part 1 only; loads `section-{N}.json`

---

## Fix Plan (Priority Order)

1. **Fix `scripts/build-chain-of-light.cjs`** - Fix all 8 URL construction lines (listed above). Rebuild: `node scripts/build-chain-of-light.cjs`

2. **Fix `scripts/build-torah-lens-index.cjs`** - Replace all hardcoded URLs from `part-N/type-N` to `N/N` format. Rebuild: `node scripts/build-torah-lens-index.cjs`

3. **Fix `scripts/build-torah-gps-index.cjs`** - Fix lines 588-590 URL construction. Rebuild: `node scripts/build-torah-gps-index.cjs`

4. After fixing scripts, rebuild all three JSON files and redeploy.

---

## Additional Notes

- The chain-of-light.astro has a correct fallback URL at line 697: `/reader/likutay-moharan/' + part + '/' + torah` -- this works because it uses numeric part/torah. But the connection URLs from the JSON (line 744: `conn.url`) are all broken.
- The torah-gps.astro and torah-lens.astro JS correctly use `r.url` / `src.url` from the JSON, so the fix only needs to happen in the JSON build scripts.
- healing-words.json and chok-breslov.json were presumably built with different/corrected scripts and use the proper URL format.
