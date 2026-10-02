import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const path = 'src/components/CompactYahrzeit.astro';
const source = readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const baseline = execFileSync('git', ['show', 'abac4560d:' + path], { encoding: 'utf8' });

test('Chok owns a normal-flow date widget rather than a source-covering fixed overlay', () => {
  assert.match(source, /chokHeader\.prepend\(box\)/);
  assert.match(source, /box\.classList\.add\('chok-yahrzeit'\)/);
  assert.match(source, /\.compact-yahrzeit\.chok-yahrzeit,\s*\.compact-yahrzeit\.lens-yahrzeit\s*\{[^}]*position:\s*relative/s);
  assert.match(source, /\.compact-yahrzeit\.chok-yahrzeit,\s*\.compact-yahrzeit\.lens-yahrzeit\s*\{[^}]*inset:\s*auto/s);
  assert.equal((source.match(/!box\.classList\.contains\('chok-yahrzeit'\)/g) || []).length, 3,
    'success, timeout and error paths all retain opt-in disclosure');
});

test('Date records, source lookup and rendered descriptions are byte-conserved', () => {
  const immutable = text => text.slice(text.indexOf('  // Hebrew month names mapping'), text.indexOf('  // Main initialization'));
  assert.equal(immutable(source), immutable(baseline));
});

test('Existing Reader/other-route interactions are preserved', () => {
  const interactions = text => text.slice(text.indexOf('  // Mobile toggle'), text.indexOf('</script>'));
  assert.equal(interactions(source), interactions(baseline));
  assert.equal(source.slice(0, source.indexOf('<script>')), baseline.slice(0, baseline.indexOf('<script>')));
  const styles = baseline.slice(baseline.indexOf('<style>'), baseline.indexOf('</style>'));
  assert.ok(source.includes(styles), 'original styles remain byte-conserved; component-owned overrides follow');
});

test('Lens dates use opt-in header flow on success, timeout and error', () => {
  assert.match(source, /lensHeader\.prepend\(box\)/);
  assert.match(source, /box\.classList\.add\('lens-yahrzeit'\)/);
  assert.equal((source.match(/!box\.classList\.contains\('lens-yahrzeit'\)/g) || []).length, 3);
  assert.match(source, /\.compact-yahrzeit\.lens-yahrzeit:not\(\.collapsed\)\s*\{[^}]*overflow-y:\s*auto/s);
});

test('Reader candle has a 44px target fully inside its bordered 48px gutter wrapper', () => {
  const overrides = source.slice(source.indexOf("  /* Reader's 44px button"));
  assert.match(overrides, /@media \(max-width: 768px\)/);
  for (const dimension of ['min-width', 'max-width', 'min-height', 'max-height']) {
    assert.ok(overrides.includes(`${dimension}: 48px !important;`));
  }
  assert.match(overrides, /border-radius: 0 8px 8px 0 !important/);
  assert.match(overrides, /\.toggle-btn\s*\{[^}]*inset: 0 !important;[^}]*width: 44px;[^}]*height: 44px;/s);
});
