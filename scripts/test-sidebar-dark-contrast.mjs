// Fail-first: the site sidebar must stay readable in dark mode.
//
// Root cause: src/components/Navigation.astro colours .sidebar-link (and the
// logo tagline) with var(--ds-text-primary, #1a1a1a). Those tokens live in
// src/styles/design-system.css, which only src/styles/main.css imports, and
// NO layout imports main.css. So the variable is never defined, every link
// falls back to the dark literal, and the whole sidebar renders dark grey on
// the dark navy body. Reproduced on live ajew.org at 1280px in dark mode.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = (p) => readFileSync(path.join(root, p), 'utf8');

function lum(hex) {
  const h = hex.replace('#', '');
  const c = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

test('the --ds-* tokens Navigation.astro depends on are actually loaded site-wide', () => {
  // A token file nothing imports is dead CSS: every var() using it silently
  // resolves to its fallback literal, which is how the sidebar went dark.
  // Walk imports for real. Do not seed the walk with a file the layout does
  // not reference, or this passes vacuously.
  const layout = read('src/layouts/Layout.astro');
  const stylesheetsIn = (src, base) => {
    const out = [];
    for (const m of src.matchAll(/@import\s+["']([^"']+\.css)["']/g)) {
      out.push(path.posix.normalize(path.posix.join(base, m[1])));
    }
    for (const m of src.matchAll(/import\s+["']([^"']+\.css)["']/g)) {
      out.push(path.posix.normalize(path.posix.join(base, m[1])));   // Astro frontmatter
    }
    for (const m of src.matchAll(/["'](\/[^"']+\.css)["']/g)) {
      out.push(m[1].replace(/^\//, ''));           // public/ stylesheet
    }
    return out;
  };
  const reachable = new Set();
  const queue = [{ src: layout, base: 'layouts' }];
  const tokenFiles = new Set();
  while (queue.length) {
    const { src, base } = queue.pop();
    for (const rel of stylesheetsIn(src, base)) {
      if (reachable.has(rel)) continue;
      reachable.add(rel);
      const onDisk = path.join(root, 'src', rel);
      if (existsSync(onDisk)) {
        const text = readFileSync(onDisk, 'utf8');
        if (text.includes('--ds-text-primary')) tokenFiles.add(rel);
        queue.push({ src: text, base: path.posix.dirname(rel) });
      }
    }
  }
  assert.ok(
    tokenFiles.size > 0,
    'no reachable stylesheet defines --ds-text-primary, so every var() in '
    + 'Navigation.astro falls back to its light literal. '
    + `Reachable stylesheets: ${[...reachable].join(', ') || '(none)'}`,
  );
});

test('sidebar link text has a dark-mode colour of its own', () => {
  const nav = read('src/components/Navigation.astro');
  // The base state must be themed. :hover/.active rules alone leave the
  // resting link on the light literal in dark mode.
  assert.match(
    nav,
    /\[data-theme="(?:dark|night)"\][^{]*\.sidebar-link\s*\{[^}]*color:/s,
    '.sidebar-link needs a dark-mode color rule for its base state',
  );
});

test('dark-mode sidebar colours clear 4.5:1 on the dark body surface', () => {
  const nav = read('src/components/Navigation.astro');
  const body = read('src/layouts/Layout.astro');
  // The layout declares --color-bg twice: the light default first, the dark
  // value inside the dark block. Take the LAST one, or this measures light text
  // on a light ground and passes for the wrong reason.
  const bgMatches = [...body.matchAll(/--color-bg:\s*(#[0-9a-f]{6})/gi)].map((m) => m[1]);
  const darkBg = bgMatches[bgMatches.length - 1] || '#1a1a2e';
  const rules = nav.matchAll(/\[data-theme="(?:dark|night)"\][^{]*\{([^}]*)\}/g);
  const colors = [];
  for (const r of rules) {
    // Only text colour properties. A `border-left-color` in the same block is
    // a decoration and is legitimately low-contrast against the body.
    for (const m of r[1].matchAll(/(?:^|;)\s*(?<![-\w])color:\s*(#[0-9a-f]{6})/gi)) {
      colors.push(m[1]);
    }
  }
  assert.ok(colors.length, 'no dark-mode sidebar colour found');
  for (const c of colors) {
    assert.ok(ratio(c, darkBg) >= 4.5, `${c} on ${darkBg} is ${ratio(c, darkBg).toFixed(2)}:1`);
  }
});
