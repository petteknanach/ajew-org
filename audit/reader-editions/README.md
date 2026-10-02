# General Reader edition followup — candidate only

This change fixes the website's former `medooyuk.js` button, which silently replaced Original Hebrew with UXLC merely to enable special nikud. It does **not** edit any raw Hebrew, annotations, frozen rules, gold, fonts, or standalone Tikun Haklali.

## Contract

- All 39 Tanach Reader route templates load one source-exact adapter and one edition controller. Original Hebrew remains the default. Its pointed `he_nikud || he` and bare `he` are preserved exactly.
- `reader-source-exact.js` borrows only recorded classifications after the same conservative whole-verse gate as app `services/readerMarkedHebrew.ts`. App/site parity is checked across all owned source verses. No normalization, guessed classifications, qere-to-ketiv attachment or relaxed vowel matching.
- The independent **UXLC annotated alternative** is explicit, persisted, Hebrew-only, and never presented as corrected Original text. It enumerates actual verse identities, including all alternative-only verses. Qere remains underlined independently of emphasis. Source differences, including UXLC's editorial internal maqaf at Psalms 67:2, are disclosed.
- `reader-source-tails.json` is the exact 27-entry reading-tail subset of the existing app `tikunKetiv.json`, not newly composed text. It is bound to full source tokens and fails closed on a changed source. Raw source files remain untouched.
- Special emphasis is optional/persisted independently. Legacy `ajew-special-nikud=1` migrates to Original + emphasis requested, **not** UXLC. The versioned new preference preserves later explicit off choices. Original loads no metadata while emphasis is off.
- Unmatched Original verses remain plain. Counts state source-matched eligibility, not universal classification. Unavailable UXLC is empty with an honest status, Original action and retry; it never falls back under a false edition label.
- Original DOM nodes are retained through edition roundtrips. Search highlights contiguous displayed text, then restores emphasis when cleared. Bare text, copy/share and edition-labelled URLs reflect the actual display. English/font/theme preferences survive roundtrips; special paint uses the dedicated existing face and plain text returns to the selected face. Original-only exports are labelled Original.
- The two legacy Reader scripts used competing mode/font/theme/keyboard handlers. A route-scoped bridge now makes the general Reader the sole state owner **only where this edition controller is active**; unrelated routes retain existing behavior.

## Verified

- `scripts/test-reader-editions.cjs`: **142,907 checks**, **14 rejecting controls**. 39 books / 929 chapters / 23,207 Original verses; **834 eligible**. Psalms **8 / 2,527** eligible. Full 23,213-verse alternative matches the app parse model and actual site renderer, including source-bound tails. Every input is SHA-256 pinned and rechecked.
- `scripts/test-reader-editions-web.py`: actual Astro pages + real JS/CSS/fonts/source in Chromium 151, **390px and 1365px**. Source on/off, controls, editorial maqaf, search, bare, share, qere/tail, 176-verse last result, language/font persistence, night font, browser back, migration, delayed completion, failure/retry all pass.
- Cold network-failure controls block the service worker so it cannot legitimately satisfy a failed request from a warm cache. Ordinary viewport tests run with normal service-worker behavior.
- Existing site mobile-controls and Reader-search suites: **131 passing tests**.
- App followup: TypeScript passes; 12 adapter/edition unit tests; whole-corpus source audits; real Reader/RN-Web/shared-iframe browser suite **16 groups each at 390px and 1365px**, no page errors. These use labelled native-I/O/router/audio/XP doubles, not an Android artifact.

## Reproduce

From the site worktree (both sibling worktrees need their existing dependencies):

```sh
node scripts/test-reader-editions.cjs ../app-reader-followup ../reader-followup-evidence
node --test scripts/test-reader-search-boundaries.mjs scripts/test-mobile-reader-controls.mjs
NODE_OPTIONS=--max-old-space-size=3072 ./node_modules/.bin/astro dev --host 127.0.0.1 --port 4387
# Separate foreground terminal; Python environment must contain Playwright.
/root/social-cdp-venv/bin/python scripts/test-reader-editions-web.py http://127.0.0.1:4387 ../reader-followup-evidence/browser
```

From app:

```sh
npx tsc --noEmit
node --test tests/test-reader-marks.cjs tests/test-reader-edition.cjs
node tests/audit-reader-marks.cjs ../site-reader-followup/public/reader ../reader-followup-evidence/app-audit
node tests/audit-reader-edition.cjs ../site-reader-followup/public/reader ../reader-followup-evidence/app-audit
node tests/build-reader-marks-ui.cjs ../site-reader-followup/public/reader ../reader-followup-evidence/app-ui
/root/social-cdp-venv/bin/python tests/test-reader-edition-web.py ../reader-followup-evidence/app-ui
# Optional final argument selects desktop width; use a separate evidence directory.
```

## Evidence / limitations

Mirrored handoff, patches, changed-file snapshots and evidence: `C:\Users\Pettek\Ajew-Nikud-Repair-20261002\reader-followup`.

Earlier failing runs are retained, not counted as passes: a screenshot attempted a `display:contents` wrapper; mobile Tools initially needed opening; a real duplicate-v2-state bug and ignored font CSS were fixed; an initial attempt to put the app toggle in its virtualized header scrolled away from the qere under test and was reverted; a newly mounted iframe batch required bounded readiness without filtering pending frames. The default 2GB Astro dev heap exhausted after repeated hot reloads; a scoped 3GB restart passed. A warm service worker correctly defeated an intended network-failure control; cold failure was then exercised explicitly.

No emulator, native build, push, deployment or Play operation performed. No new geometric/font-paint claim: inherited fonts are reused. Parent must integrate these scoped commits and repeat native/artifact/deployment gates independently.
