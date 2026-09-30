# חק לישראל — bounded Nach parity candidate

## Contract

- Navi and Kesuvim use independent **six-verse** windows: the source start verse
  (normally 1) plus `6 × earlier scheduled slots on the same book/chapter`.
  Historical miluy counts (6/4/5/6/5) are still displayed as historical kavana,
  not used to select verses and not claimed equivalent to this study policy.
- Endpoints are bounded by the actual owned chapter. Short windows identify the
  actual count and chapter endpoint; exhausted windows identify that no verses
  remain. No next chapter is introduced. Missing chapter text is disclosed.
- The actual schedule has **no Friday Nach slots**. That absence is disclosed,
  not replaced with an invented Friday chapter. Six full weekdays are tested,
  including Friday's unchanged Torah and visible unavailable-Nach notices.
- Torah remains literal source schedule. נצבים / וילך / וזאת הברכה
  Thursday-night tails remain **14/4/15** verses, not a claim of completing 26.
  Date-anchor selection and visible cycle-end Friday fallback remain unchanged.
- Literal plene `תהילים` was **absent from the assigned baseline's lookup**;
  explicit `tanach-tehillim` alias is added alongside `תהלים`. No source labels
  are rewritten. The actual schedule contains 95 plene slots.
- No prayer, kavana, commentary, marked renderer, JSON source, nikud, or
  third-party text is replaced/imported. No external text-site requests occur.

## Reproduce (no local build)

From the candidate worktree:

```sh
node --check public/chok.js
node --check scripts/test-chok-nach-regimen.cjs
node scripts/test-chok-marked-init.cjs public /root/ajew-org/public
node scripts/test-chok-nach-regimen.cjs public /root/ajew-org/public REPORT.json --all-slots
python3 scripts/test-chok-nach-browser.py . /root/ajew-org/public EVIDENCE_ROOT
python3 scripts/test-chok-nach-conservation.py . dd8a269b6 SOURCE_BEFORE.json CONSERVATION.json
```

Transform `src/pages/reader/chok.astro` with `@astrojs/compiler` to check syntax;
its only change is `/chok.js?v=13` → `/chok.js?v=14`.

## Recorded gates

Evidence root:
`/root/.local/share/ajew-app-improvements-20260930/evidence/site-chok-regimen`

Hash-matched recovery mirror:
`/mnt/c/Users/Pettek/Ajew-App-Improvements-20260930/site-chok-regimen`

- Inherited full-init suite: 42/42 assertions before and after; untouched.
- Dedicated normal suite: 60/60. Full default init on all six weekdays,
  real short/empty Navi and Kesuvim cases, plene mapping, three date-cycle
  anchors, Friday fallback, and literal source-tail regressions.
- Exhaustive suite: **1165/1165**, all **540 scheduled Nach slots** exercised
  through actual initialization across **54 weeks**. All **374 Torah slots**
  validated against actual chapter ranges. **87 actual JSON files** parsed.
- Chromium: **12/12** at 390 and 1280 pixels; bounded/full/short/empty/plene
  cases, visible disclosures, shared marked renderer, exact verse refs, all
  requests local, and no page errors. Two representative screenshots inspected.
- Conservation: **88/88 frozen files** unchanged (87 owned JSONs plus shared
  renderer). All JS outside Nach block/plene alias and the Astro pin-only edit
  compare exactly to assigned baseline.
  All **212 consumed source files** in the exhaustive run rehash unchanged.
- Three negative controls rejected: restoring miluy-controlled windows (15
  failures), omitting boundary notices (4), phantom header endpoints (2).
- Syntax checks and Astro transform pass.

Preserved failures: the first new test scaffolding run omitted outer-VM
`URLSearchParams`; its log is retained, then the harness was corrected without
changing the inherited fixture or assertions. The meaningful baseline red run
was 33/60, including Monday/Tuesday/Thursday ranges and missing plene mapping.
An optional exhaustive serial run timed out at 150 seconds with only passing
partial assertions; its log is retained. The completed exhaustive run uses four
independent VM contexts at a time, bounded in memory and without network.

## Qualification / integration

This is a **local candidate**, not an upstream/main, deployed, or native release.
Browser evidence uses the exact Chok body/styles/scripts from the Astro source
without shared Layout; it is not a full emitted page or native device proof.
No push, Astro build, deployment, Play/native action, shared search builder,
canonical main edit, or source redistribution was performed. Parent owns
integration/cache reconciliation and later release verification.
