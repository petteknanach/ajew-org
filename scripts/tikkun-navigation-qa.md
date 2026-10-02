# Tikun navigation candidate QA

Paired with the app navigation lane based on 7a68fc5; website base abac4560d.

`public/tikkun.js` now defaults to the existing pointable study face, versions the
one-time legacy-source-default migration, preserves subsequent Original ink
choices, observes short taps passively, and keeps independent mark switches.
Original ink and all source-difference/ketiv/qere disclosures remain unchanged.
No font/data/mark-rule edits.

Column ownership uses physical aligned rows and canonical book/chapter/verse
order rather than JSON insertion order or incomplete upstream `v` arrays.
A pending independent-reading fetch cannot reset newer column/chapter navigation;
a pending parsha callback is ignored after the reader explicitly moves elsewhere.
Changing books resets the chapter anchor synchronously, even when reading fails.

Verification (from this site tree):

```sh
node --check public/tikkun.js
node scripts/test-tikkun-renderer.cjs
OUT=/mnt/c/Users/Pettek/Ajew-Nikud-Repair-20261002/navigation/evidence
node scripts/test-tikkun-column-display.cjs "$OUT" ../app-navigation
PY=/root/.local/share/ajew-nikud-repair-20261002/navigation-venv/bin/python
"$PY" ../app-navigation/tests/tikun-navigation-browser.py --site . --out "$OUT"
"$PY" ../app-navigation/tests/tikun-navigation-layout.py --site . --out "$OUT"
"$PY" ../app-navigation/tests/tikun-navigation-race.py --site . --out "$OUT"
```

The joint browser tests require the app's actual RN-Web harness, built using
`node tests/build-tikun-ui-harness.cjs ../site-navigation/public/reader/medooyuk "$OUT"`
and its `node tests/tikun-navigation.cjs "$OUT"` fixture command from that app.

Passed: all 245 physical columns forward and 244 back on real controls, exact
row/group/source conservation; all five book boundaries; phone tap/left/right
swipe/long-press/cancel and independent switches; 36 joint song/width/theme cases
with all four modes and fit/zoom; original-choice persistence; reading-unavailable
book switches. Baseline race replay returns 201 or 200 after requesting 202;
candidate stays at 202 in column, chapter and parsha cases. Existing renderer
sweep passed all 39 corpus hash checks and 23,213 verses.

Receipts/screenshots are in the Windows navigation/evidence mirror. Site browser
scope is actual authored page body + assets, not a full shared Layout build or
production deploy. No push, deployment, release or emulator actions were taken.
