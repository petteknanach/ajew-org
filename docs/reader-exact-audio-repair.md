# Hebrew exact-track repair (private candidate)

Base: `24e1a6145fb1417b455471f8848ee8f2970b3d99`. No commit, deployment, build, or canonical working-copy edits.

- Likutay Moharan I:51 maps only to `voice-2018-likutay-moharan/track-0042.mp3`. Semantic evidence is the user-supplied listener report plus screenshot. No ASR, agent listening, clip-start timestamp or whole-recording textual alignment is claimed.
- Archive metadata SHA1 `133102735a2d96fb89ca768fb333a3a9dee5ae82` and size `5824145` are runtime identity guards. The parent independently streamed and verified the body SHA256 `4a7830f1a82fb00bff5fa246fe81efe6ea274aead41c0c55f91238308f55ad4b`; the copied evidence fixture records that separate step. Runtime checks metadata, not a newly downloaded whole body.
- All three configured ordinal maps were audited: LM voice-2018's introduction offset, and both Likutay Tefilos `maxTorah:210` maps. None had source-backed ordinal semantics. Remove inference, retain archive browsing. Preserve literal Hebrew filename maps and part markers; ambiguous matches do not select a guessed file.
- Initial load selects the known teaching. Generic open/close preserves manual archive browsing and queue; only the explicitly named Return to this teaching button resets the mapped edition/index, including same-edition browsing. Return selects without autoplay and preserves an already-selected recording/playhead. Every fetch completion is edition/request scoped; no lifetime `torahJumped` latch remains.
- The selected track has a readable teaching label and visible selected position; only the track list scrolls. Prev/next/ended/share continue to use actual archive files; browsing another file does not claim it is the mapped teaching.

## Qualification

Run serially on VPS only (this explicit-file successor uses GIT_DIR=/opt/ajew-org/.git for read-only pinned original git-show test inputs):
```
node --max-old-space-size=256 --check public/audio-player.js
node --max-old-space-size=256 --test --test-concurrency=1 scripts/test-reader-exact-audio.cjs scripts/test-chayay-ace-audio.cjs
node --max-old-space-size=256 scripts/verify-qa-regressions.cjs
AUDIO_PLAYER_BASELINE_REV=24e1a6145fb1417b455471f8848ee8f2970b3d99 node --max-old-space-size=256 --test --test-concurrency=1 --test-name-pattern="Desired contract" scripts/test-reader-exact-audio.cjs
```
The final command intentionally fails: original full initialization selects track 52. Tests execute the complete IIFE in a small DOM adapter with actual configured JSON and captured Archive metadata. Negative cases explicitly mutate copies. Alternate/literal filename metadata are synthetic unit inputs, never production-response claims. Playback rejections use actual rejected JavaScript promises in the adapter; these are not native browser/media playback verification. No browser was launched.

## Parent composition and caches

Pinned-base consumers: `src/layouts/Layout.astro:259` script `/audio-player.js?v=20261013-chayay-ace-r3`; `scripts/verify-qa-regressions.cjs:43` pins that template token; `scripts/test-chayay-ace-audio.cjs` loads the player and asserts JSON request URLs. The latter is updated in this lane. The former two remain byte unchanged for parent composition with the English worker. Newly added regression test also reads the runtime/JSON.

Candidate requests exactly `/audio-sources.json?v=20261105-exact-track-r1`. Real production HEAD receipts (not candidate deployment) are in `../mapping-cache-chain.json`: JS has `Cache-Control: max-age=31536000`, source JSON has no explicit Cache-Control. Live SW is byte-identical to the pinned-base `public/sw.js`: JS is cache-first keyed by full request URL, source JSON is outside its reader-JSON/static/HTML branches and falls through to network. Therefore parent MUST bump the Layout JS query and corresponding QA pin on composed publication; changed JSON already has its own new URL. Do not mistake HTTP 200 on candidate query URLs for candidate content being live.

Source corpus/manuscripts, media-rights suppression, aliases and manifests are unchanged. Existing Sefer HaMidos/Chayay full-init tests are retained and executed.

## Independent review successor

All seven intake file hashes authenticated. Same-edition native rendered Return handler reproduced wrong index 7 instead of 41 on the frozen candidate. Four new review contracts fail against frozen runtime (same-edition return, generic-open browsing preservation, visitor provenance, return/playback-rejection race); all five new contracts pass after corrections. Full suite: 40/40 (35 existing + 5 new). Full recording; section start not indexed is visitor copy; full semantic/body-hash provenance stays in JSON and this document. File mismatch never claims verification. Parent still owns Layout/QA cache-version composition. No native playback, CORS, rendered scroll or accessibility-device verification performed.
