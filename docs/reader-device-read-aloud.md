# English device read-aloud

The English control uses installed browser/device speech voices, not an English recording.
It selects complete English bodies from the current original/aligned representation,
including English hidden only by the language selector. It excludes duplicate representations
and UI numbering, uses bounded phrases, exposes real available English voices and reports
unsupported engines, voice-readiness failures, startup stalls and emitted errors honestly.
Pause/resume repeats the current short phrase; stop and stale callback handling respect ownership.
Legacy Listen, its actual keyboard shortcut and recorded playback retain independent controls.

## Regression operands

The `english/` fixtures under `scripts/fixtures/reader-audio/` are authenticated genuine
predecessor HTML/runtime/SW/shim captures, not synthesized production responses.
`consumer-baselines.json.gz` losslessly stores the exact 30 pre-repair template operands
from revision 24e1a6145fb1417b455471f8848ee8f2970b3d99. They retain the complete
URL-change inverse assertion without depending on a moving Git HEAD or local history.
Deliberate later template changes require an independently reviewed corresponding baseline
refresh, not weaker assertions. Compatibility tests read the actual current Reader script.
Tests resolve installed dependencies normally and require no private evidence directory.

The complete initializers and legacy control function bodies execute in DOM/speech adapters.
Those results do not establish actual device speech, native media playback, accessibility
or painted mobile layout. A started engine that never emits its terminal callback is not
covered by the startup timer; Stop remains available. No paid speech service is introduced.
