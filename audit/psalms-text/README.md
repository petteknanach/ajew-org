# Psalms text repair candidate — source audit, not release approval

## Settled findings

- Audited all **150 chapters / 2,527 verse identities**, with three frozen independent source witnesses: UXLC 2.5 XML; MAM (Hebrew Wikisource) CSV; and newly fetched Open Scriptures Hebrew Bible (OSHB) XML. `candidate/independent-comparison.json` retains all four complete readings (Original, UXLC, MAM HTML, OSHB reading), references and UXLC editorial notes. Diagnostic normalization is explicitly comparison-only, never a displayed-text rewrite.
- **13 Original Hebrew holam-attachment errors** were repaired in 11 Reader chapters and their 11 local verse-lookup counterparts. The only textual operation moves existing U+05B9 from a consonantal vav to the preceding consonant; no character is added or removed. Examples: 37:9 `וְקוֵֹי` → `וְקֹוֵי`; 37:21 `לוֶֹה` → `לֹוֶה`; 88:16 `וְגוֵֹעַ` → `וְגֹוֵעַ`. References: 15:1, 25:3, 37:9, 37:21, 40:5, 47:6, 69:7, 73:28, 88:16, 100:5, 116:5, 116:6, 140:8. Each has an exact OSHB word witness; MAM corroborates holam placement without authorizing unrelated divine-name vowel changes.
- `holam-repairs.json` records complete before/after verses, exact source words, input hashes and byte-offset patches. `original-files/` preserves all displaced file bytes. Tests reverse every patch to the exact original hash. English, bare Hebrew, all other fields, consonants, paragraph labels, ketiv/qere and all linguistic annotations remain untouched.
- Both legacy importers now apply the same **reference-bound, full-verse, fail-closed** overlay. A changed source verse is rejected for re-review; already-corrected output is accepted. No runtime external API was added.

## The reported mid-word maqaf is not blanket-deletable corruption

Original Reader Hebrew contains **zero U+05BE maqaf, zero U+05BD meteg, zero ASCII/soft hyphens**. The UXLC/Succos Psalter contains **2,404 maqaf and 4,021 meteg**. Every Medooyuk and bundled Succos token is exact to the preserved UXLC XML; all existing annotations also agree between the bundle and site.

Psalm **67:2** has `יָ֤אֵ֥־ר` in UXLC. This is not a renderer insertion: the XML's correction **67:2.4** explicitly says **“Add maqaf between alef and resh. Add note 'c'.”** MAM and OSHB have the unsplit word. Four other apparent intra-word splits occur at 44:15, 57:10, 108:4 and 149:7: UXLC has `בַּל־אֻמִּים`, while MAM/Original use `בַּלְאֻמִּים`. These are inherited edition differences, not authorization to delete maqaf.

Many unexpected vowels/dageshim likewise have explicit UXLC editorial notes: e.g. 25:3 moves both holam and segol; 13:2 removes a nun dagesh; 14:7 removes a tsadi dagesh. Do not normalize the edition from intuition. The **193 remaining Original-vs-UXLC diagnostic difference blocks** are unresolved/edition-dependent, not 193 proven errors. Combining-order/holam-haser/ZWJ/hataf and spacing differences are retained in that count; it must not be marketed as a linguistic error count. Jerusalem's unusual two-vowel spelling is preserved.

## Source/renderer diagnosis

Live Chrome reproduced Original 37:9's misattached holam in `data-nikud`, proving a stored-data defect before rendering. Full app/site shared-renderer text was source-exact in all four special-mark/teamim combinations for every verse. U+05BD remains a combining meteg; it is not U+05BE. Observed browser CSS was `hyphens: manual; word-break: normal`; CSS did not insert the source maqaf.

**Separate integration problem, not edited in this lane:** `public/medooyuk.js` lines 73–77 replaces the Original Hebrew body with UXLC when the button/title promises nikud marking. Actual live 67:2 changed from Original to the UXLC internal-maqaf reading after clicking the button. The app already labels its fully annotated alternative separately and source-exact attachment refuses mismatches (8 attached / 65 qere refusals / 2,454 source mismatches in this corpus). Parent must coordinate source-exact attachment or explicit edition labeling with the shared renderer owner; this lane did not modify fonts, shared renderer, or UI/navigation.

## Consumer coverage and unresolved blockers

`consumer-audit.json`, `app-text-consumers.json`, and `site-text-consumers.json` identify direct consumers and textual references.

- Site/app general Reader: all 2,527 Original verses; search/share/offline data follows Reader endpoint. Corrected site files must actually be delivered; explicitly downloaded older app pages need refresh. No fake app-only normalizer was added.
- Medooyuk, app Shnayim/Tikun/Chok and site shared rendering: all 2,527 source tokens; full-page interactions on every dynamic screen were **not** re-exercised here.
- Succos all-Psalms/Hallel/Ascents: all 2,527 bundled verses; no source changes were required.
- App Tikun Haklali: all **164** verses in its 10 chapters match Original Reader exactly; none needs the 13 corrections.
- App Tikun Chatzos: **108 rows / 11 Psalms sections**, including the explicitly labeled 24:7–10 opening, match Original Reader exactly.
- Local verse lookup: **150 / 2,527**, exact to corrected Reader. Its old disabled API route does not establish current live API availability.
- **Standalone website `/tikkun-klali` is an independent, defective inline edition:** only **149 Hebrew verse rows versus 164 expected**. Concrete missing verses include 16:5, 41:10, 42:4, 42:9, 59:6, 59:14, 77:9, 90:7, 105:10/12/14/16/23, 137:4/7. Complete source/page comparison is retained; additional spellings, divine-name substitutions, pointing and English/transliteration alignment need a separately scoped review. Not rewritten here because that would alter the standalone Tikun presentation/English beyond the agreed text-data repair. This is an open release blocker, not a green consumer.
- Incidental quotations in other books are inventoried, not claimed to be verified Psalter editions. `/teachings/tikkun-haklali` is a teaching page, not a direct Hebrew Psalter renderer.

## Verification executed

- `node scripts/test-psalms-holam.cjs`: **5,492 checks**, **26 rejecting controls**, byte inverses, all 150 Reader chapters/all fields. Actual Reader generator and actual local converter exercised with filesystem doubles; local converter uses explicitly synthetic markup composed from frozen verses, not a recovered CP1255 source.
- App `tests/psalms-source-conservation.cjs`: **35,540 checks**, **3 rejecting controls**, actual TS parsing/attachment and actual app/site markup, all 2,527 verses in four modes.
- Existing app Reader marks tests **10/10**, Reader edition tests **2/2**, Succos structural/service gate **24,452 assertions**; `npx tsc --noEmit` exited **0**.
- Chrome 151 Linux: actual font-loaded source fixture, 8 deliberately selected verse comparisons, desktop/mobile screenshots; actual live Original 37 and Medooyuk 67 DOM and screenshots. `browser/report.json` and PNGs are evidence, not Android/native geometry acceptance.
- Baseline hash sweep: 11 altered baseline inputs, all authorized Reader chapter repairs; all other baseline witness/bundle hashes unchanged.

## Reproduce from the candidate worktrees

```sh
# site-text
node scripts/test-psalms-holam.cjs
python3 scripts/audit_psalms_text.py --app ../app-text --output audit/psalms-text/recheck
python3 scripts/audit_psalms_consumers.py --app ../app-text --canonical /root/ajew-org
# app-text
node tests/psalms-source-conservation.cjs ../site-text ../site-text/audit/psalms-text/app-render-recheck
node tests/test-reader-marks.cjs
node tests/test-reader-edition.cjs
node scripts/verify-succos-study.cjs
npx tsc --noEmit
```

Browser probe requires an isolated Chrome listening on port 9367; `node scripts/probe-psalms-render.cjs`. The original CP1255 Books source is absent at its historical path, so this work does not claim to know whether the encoding defect originated there or in an earlier transformation. Direct tanach.us and Mechon Mamre requests returned 403; the preserved UXLC source was used, and OSHB was fetched independently from GitHub. Browser Use provider returned no CDP endpoint; isolated local Chrome succeeded instead.

The first consumer report mistakenly treated the labeled 24:7–10 opening as 24:1–4. Its invalid report is preserved separately; the corrected audit reads and asserts its explicit title before comparing the actual range.

## Provenance / licensing

- UXLC 2.5, build 27.6, 1 Apr 2026, Christopher V. Kimball / tanach.us, copied byte-exact from `/root/sheva_v0/books/Psalms.xml`; full embedded correction apparatus retained.
- Original work of the Open Scriptures Hebrew Bible available at https://github.com/openscriptures/morphhb. `OSHB-Ps.xml` was fetched from its `wlc/Ps.xml`; `OSHB-revision.json` records GitHub's file revision response. See `OSHB-LICENSE.md` (CC BY 4.0; underlying WLC public domain).
- MAM: [Hebrew Wikisource — Miqra according to the Masorah](https://en.wikisource.org/wiki/User:Dovi/Miqra_according_to_the_Masorah#beginning), Seth (Avi) Kadish with Erel Segal-Halevi and Benjamin Denckla; CC BY-SA 4.0, see `MAM-LICENSE.md`. Frozen CSV copied from `/root/tanach-delivery/MAM-csv/Psalms.csv`. Comparison excerpts retain that attribution/license; no wholesale MAM replacement was made.

No push, deploy, APK build, emulator, Play submission or closure claim. Parent independent source review, shared-renderer integration, standalone Tikun repair, delivered-cache checks and native artifact QA remain gates.
