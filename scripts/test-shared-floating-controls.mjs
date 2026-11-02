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
  assert.match(source, /\.compact-yahrzeit\.chok-yahrzeit,\s*\.compact-yahrzeit\.lens-yahrzeit,\s*\.compact-yahrzeit\.tikkun-yahrzeit\s*\{[^}]*position:\s*relative/s);
  assert.match(source, /\.compact-yahrzeit\.chok-yahrzeit,\s*\.compact-yahrzeit\.lens-yahrzeit,\s*\.compact-yahrzeit\.tikkun-yahrzeit\s*\{[^}]*inset:\s*auto/s);
  assert.equal((source.match(/!box\.classList\.contains\('chok-yahrzeit'\)/g) || []).length, 3,
    'success, timeout and error paths all retain opt-in disclosure');
});

test('Date records, source lookup and rendered descriptions are byte-conserved', () => {
  const immutable = text => text.slice(text.indexOf('  // Hebrew month names mapping'), text.indexOf('  // Main initialization'));
  assert.equal(immutable(source), immutable(baseline));
});

test('Existing Reader/other-route interactions are preserved', () => {
  // Invert only the four reviewed hub-only UI blocks for this legacy nonhub guard.
  // Other six tests (including sacred-date/source checks) are deliberately untouched.
  let conservedSource = source;
  if (source.includes("const calendarHubPaths =")) {
    const reviewedHubDelta = [{"after":"// Only these discovery hubs opt into mobile expanded-calendar flow.\nconst calendarHubPaths = [\"/\", \"/reader\", \"/reader/\", \"/resources\", \"/resources/\"];\nconst isCalendarHub = calendarHubPaths.includes(Astro.url.pathname);\n","before":""},{"after":"<div class:list={[\"compact-yahrzeit collapsed\", { \"hub-yahrzeit\": isCalendarHub }]} id=\"compactYahrzeit\" style=\"display: none;\">\n","before":"<div class=\"compact-yahrzeit collapsed\" id=\"compactYahrzeit\" style=\"display: none;\">\n"},{"after":"    if (!collapsed && box.classList.contains('hub-yahrzeit') && window.matchMedia('screen and (max-width: 768px)').matches) {\n      // The hub host moves from a fixed trigger to flow before main.\n      // Reset its own scroller, then reveal below the real fixed header.\n      // Instant scrolling overrides Layout's smooth behavior; stay synchronous\n      // so no queued focus can survive collapse, dismissal or another action.\n      box.scrollTo({ top: 0, behavior: 'instant' });\n      const header = document.querySelector('header.mobile-header');\n      const headerBottom = Math.max(0, header?.getBoundingClientRect().bottom ?? 0);\n      const top = Math.max(0, window.scrollY + box.getBoundingClientRect().top - headerBottom - 8);\n      window.scrollTo({ top, behavior: 'instant' });\n      document.getElementById('yahrzeitCloseBtn').focus({ preventScroll: true });\n    } else {\n      (collapsed ? toggle : document.getElementById('yahrzeitCloseBtn')).focus({ preventScroll: true });\n    }\n","before":"    (collapsed ? toggle : document.getElementById('yahrzeitCloseBtn')).focus({ preventScroll: true });\n"},{"after":"  /* Expanded hub dates occupy flow before main; collapsed placement is unchanged. */\n  @media screen and (max-width: 768px) {\n    .compact-yahrzeit.hub-yahrzeit:not(.collapsed) {\n      position: relative;\n      inset: auto;\n      flex-shrink: 0;\n      box-sizing: border-box;\n      width: calc(100% - 2rem);\n      max-width: 320px;\n      max-height: 320px;\n      max-height: min(50dvh, 320px);\n      margin: 64px auto 0;\n      padding-top: max(3.25rem, calc(44px + .5rem));\n      overflow-y: auto;\n      opacity: 1;\n      transition: none;\n    }\n    .compact-yahrzeit.hub-yahrzeit:not(.collapsed) .close-btn {\n      width: 44px;\n      height: 44px;\n      border-radius: 8px;\n    }\n  }\n","before":""}];
    for (const {after, before} of reviewedHubDelta) {
      assert.equal(conservedSource.split(after).length, 2, "Exactly one reviewed hub block may differ");
      conservedSource = conservedSource.replace(after, before);
    }
  }
  const interactions = text => text.slice(text.indexOf('  // Mobile toggle'), text.indexOf('</script>'));
  assert.equal(interactions(conservedSource), interactions(baseline));
  assert.equal(conservedSource.slice(0, conservedSource.indexOf('<script>')), baseline.slice(0, baseline.indexOf('<script>')));
  const styles = baseline.slice(baseline.indexOf('<style>'), baseline.indexOf('</style>'));
  assert.ok(conservedSource.includes(styles), 'original styles remain byte-conserved; component-owned overrides follow');
});

test('Lens dates use opt-in header flow on success, timeout and error', () => {
  assert.match(source, /lensHeader\.prepend\(box\)/);
  assert.match(source, /box\.classList\.add\('lens-yahrzeit'\)/);
  assert.equal((source.match(/!box\.classList\.contains\('lens-yahrzeit'\)/g) || []).length, 3);
  assert.match(source, /\.compact-yahrzeit\.lens-yahrzeit:not\(\.collapsed\),\s*\.compact-yahrzeit\.tikkun-yahrzeit:not\(\.collapsed\)\s*\{[^}]*overflow-y:\s*auto/s);
});

test('Tikun dates remain normal-flow opt-in on all initialization outcomes', () => {
  assert.match(source, /tikunHeader\.prepend\(box\)/);
  assert.match(source, /box\.classList\.add\('tikkun-yahrzeit'\)/);
  assert.equal((source.match(/!box\.classList\.contains\('tikkun-yahrzeit'\)/g) || []).length, 3,
    'success, timeout and error never auto-expand over Torah ink');
  assert.match(source, /\.compact-yahrzeit\.tikkun-yahrzeit\s*\{[^}]*position:\s*relative/s);
  assert.match(source, /\.compact-yahrzeit\.tikkun-yahrzeit:not\(\.collapsed\)\s*\{[^}]*padding-top:\s*3\.25rem/s);
});

test('Edition controls reserve space outside the TOC hit surface', () => {
  const css = readFileSync(new URL('../src/styles/reader.css', import.meta.url), 'utf8');
  assert.match(css, /\.reader-edition-controls\s*\{[^}]*padding:\s*12px 48px/s);
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
