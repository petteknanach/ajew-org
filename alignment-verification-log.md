# English-Hebrew Alignment Verification Log

**Started:** 2026-03-26
**Method:** Manual reading of Hebrew and English content + automated ratio checks
**Status:** IN PROGRESS

---

## Likutay Moharan Part 1

### ✅ VERIFIED GOOD (no alignment issues)
- [x] Torah 1 — 8 segs, all aligned ✅
- [x] Torah 16 — 3 segs, all aligned ✅
- [x] Torah 18 — 29 segs, all aligned ✅
- [x] Torah 19 — 34 segs, all aligned ✅
- [x] Torah 22 — 27 segs, all aligned ✅
- [x] Torah 25 — 13 segs, all aligned ✅
- [x] Torah 27 — 10 segs, all aligned ✅
- [x] Torah 28 — 7 segs, all aligned ✅
- [x] Torah 30 — 16 segs, all aligned ✅

### 🟡 MINOR ISSUES (1-2 segments off)
- [x] Torah 2 — 19 segs, 2 crammed (seg2, seg15). Content mostly matches but some English bleeds between segments.
- [x] Torah 3 — 12 segs, 1 crammed (seg11: 4090 en/527 he). Last segment has too much English piled up.
- [x] Torah 5 — 11 segs, 1 crammed (seg6). Rest aligned.
- [x] Torah 9 — 12 segs, 2 empty (seg3, seg5). Rest aligned.
- [x] Torah 11 — 15 segs, 1 crammed (seg0), 1 empty (seg14).
- [x] Torah 12 — 12 segs, 2 crammed, 1 empty.
- [x] Torah 20 — 29 segs, 1 crammed (seg1). Minor.
- [x] Torah 21 — 27 segs, 3 empty. Rest good.
- [x] Torah 23 — 17 segs, 1 crammed, 1 empty.
- [x] Torah 24 — 12 segs, 1 empty (seg1 is just a header).
- [x] Torah 26 — 4 segs, 1 crammed, 1 empty.
- [x] Torah 29 — 16 segs, 1 crammed, 1 empty.

### 🔴 NEEDS FIXING (3+ segments misaligned)
- [x] Torah 4 — 23 segs, 4 crammed, 6 empty. English ois sections 1-6 found, 7-9 missing in assignment.
- [x] Torah 6 — 19 segs, 4 crammed, 3 empty. English piled into early segments.
- [x] Torah 7 — 14 segs, 1 crammed, 2 empty. Seg 1-2 (verse + first ois marker) have no English.
- [x] Torah 8 — 16 segs, 4 crammed, 1 empty. Multiple sections crammed.
- [x] Torah 10 — 27 segs, 1 crammed (seg6: 6088 chars!), 3 empty at end.
- [x] Torah 13 — 18 segs, 3 crammed, 6 empty. Bad distribution.
- [x] Torah 14 — 33 segs, 1 crammed, 21 empty! Worst case — almost all English in first few segments.
- [x] Torah 15 — 18 segs, 2 crammed, 2 empty.
- [x] Torah 17 — 36 segs, 3 crammed, 19 empty. Very bad — like Torah 14.

### Summary LM Part 1, Torahs 1-30:
- **9 torahs GOOD** (no issues): 1, 16, 18, 19, 22, 25, 27, 28, 30
- **12 torahs MINOR** (1-2 off): 2, 3, 5, 9, 11, 12, 20, 21, 23, 24, 26, 29
- **9 torahs BAD** (3+ off): 4, 6, 7, 8, 10, 13, 14, 15, 17

### Part 1, Torahs 31-286:
- **230 GOOD** ✅
- **21 MINOR** 🟡: 42, 55, 57, 58, 62, 63, 78, 85, 95, 106, 107, 108, 111, 126, 137, 143, 157, 234, 269, 282, 286
- **5 BAD** 🔴: 33, 35, 60, 61, 212

### Part 2, Torahs 1-125:
- **117 GOOD** ✅
- **7 MINOR** 🟡: 8, 60, 67, 78, 79, 91, 92
- **1 BAD** 🔴: Torah 4 (26 segs, 3 crammed, 4 empty)

### FULL LM TOTALS:
- **356 GOOD (84%)** — no alignment issues
- **40 MINOR (9%)** — 1-2 segments slightly off
- **15 BAD (4%)** — 3+ segments need redistribution
- BAD torahs: Part 1: 4, 6, 7, 8, 10, 13, 14, 15, 17, 33, 35, 60, 61, 212. Part 2: 4.
- NOTE: Most BAD torahs are in 1-17 range — user providing new translations for 11-17

### Still need to verify:
- [ ] Likutay Halachos (all 8 parts — 1,111 crammed, WORST book)
- [ ] Kitzur LM
- [ ] Sichos HaRan
- [ ] Ebay HaNachal
- [ ] Likutay Tefilos
- [ ] All other books

---

## Root Cause Analysis

The cramming happens because:
1. English was imported as one block per "section" without respecting Hebrew paragraph breaks
2. Some torahs have Hebrew segments for verse citations (short segs like just "רשב"ם:" or "א") that don't have corresponding English paragraphs
3. English from multi-paragraph ois sections got dumped into the first segment of that section

The fix requires:
1. For each crammed segment: split the English at sentence boundaries
2. Distribute the split English to the empty segments that follow
3. Verify by reading that each segment's English discusses the same content as its Hebrew

---

## Other Books Status
- [ ] Likutay Halachos — 1,111 crammed segments (WORST)
- [ ] Chumash LH — 645 crammed
- [ ] Likutay Moharan Part 2 — included in LM above
- [ ] Ebay HaNachal — 130 crammed
- [ ] Alim LiTrufa — 104 crammed
- [ ] Kitzur LM — 102 crammed
- [ ] Yemay Moharnat — 97 crammed
- [ ] Sichos HaRan — 87 crammed
- [ ] All others — see full audit above
