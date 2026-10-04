/* Generated from services/tikunBoundaries.ts */
(function(root){const exports={};
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BOUNDARY_CSS = exports.unavailableBoundaries = exports.boundaryKey = void 0;
exports.boundaryHash = boundaryHash;
exports.validateBoundaries = validateBoundaries;
exports.visibleBoundary = visibleBoundary;
exports.observeBoundaries = observeBoundaries;
exports.decorateSourceBoundaries = decorateSourceBoundaries;
exports.decorateBoundaries = decorateBoundaries;
const boundaryKey = (r) => `${r.column}/${r.row}/${r.group}/${r.word}`;
exports.boundaryKey = boundaryKey;
const unavailableBoundaries = (reason = 'Boundary map unavailable') => ({ status: 'unavailable', reason, records: {}, coverage: 'unavailable' });
exports.unavailableBoundaries = unavailableBoundaries;
/** SHA-256 over UTF-8 JSON.stringify(parsed payload), no normalization/sorting.
 * Portable on offline Hermes as well as browsers; tested against node:crypto. */
function boundaryHash(value) {
    const text = unescape(encodeURIComponent(JSON.stringify(value)));
    const bytes = Array.from(text, c => c.charCodeAt(0));
    const bitLength = bytes.length * 8;
    bytes.push(128);
    while (bytes.length % 64 !== 56)
        bytes.push(0);
    const high = Math.floor(bitLength / 0x100000000), low = bitLength >>> 0;
    for (const n of [high, low])
        for (let s = 24; s >= 0; s -= 8)
            bytes.push((n >>> s) & 255);
    const k = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
    const h = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    const rot = (x, n) => (x >>> n) | (x << (32 - n));
    for (let o = 0; o < bytes.length; o += 64) {
        const w = [];
        for (let i = 0; i < 16; i++)
            w[i] = (bytes[o + i * 4] << 24) | (bytes[o + i * 4 + 1] << 16) | (bytes[o + i * 4 + 2] << 8) | bytes[o + i * 4 + 3];
        for (let i = 16; i < 64; i++) {
            const a = w[i - 15], b = w[i - 2];
            w[i] = (w[i - 16] + (rot(a, 7) ^ rot(a, 18) ^ (a >>> 3)) + w[i - 7] + (rot(b, 17) ^ rot(b, 19) ^ (b >>> 10))) | 0;
        }
        let [a, b, c, d, e, f, g, hh] = h;
        for (let i = 0; i < 64; i++) {
            const t = (hh + (rot(e, 6) ^ rot(e, 11) ^ rot(e, 25)) + ((e & f) ^ (~e & g)) + k[i] + w[i]) | 0;
            const u = ((rot(a, 2) ^ rot(a, 13) ^ rot(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
            hh = g;
            g = f;
            f = e;
            e = (d + t) | 0;
            d = c;
            c = b;
            b = a;
            a = (t + u) | 0;
        }
        [a, b, c, d, e, f, g, hh].forEach((n, i) => h[i] = (h[i] + n) | 0);
    }
    return h.map(n => (n >>> 0).toString(16).padStart(8, '0')).join('');
}
function validateBoundaries(payload, pins, fixed, pointing) {
    try {
        const hash = /^[a-f0-9]{64}$/;
        if (pins?.schema !== 1 || !hash.test(pins.fixedSha256) || !hash.test(pins.pointingSha256) || !pins.mapSha256 || !hash.test(pins.mapSha256))
            throw Error('Approved boundary map unavailable');
        if (boundaryHash(fixed) !== pins.fixedSha256 || boundaryHash(pointing) !== pins.pointingSha256)
            throw Error('Boundary source hash mismatch');
        if (boundaryHash(payload) !== pins.mapSha256)
            throw Error('Boundary map hash mismatch');
        const complete = payload?.schema === 2;
        const fields = complete ? 'candidateSha256,coverage,gaps,kind,records,schema,sources' : 'coverage,gaps,kind,records,schema,sources';
        if (!payload || Object.keys(payload).sort().join(',') !== fields || !payload.sources || Object.keys(payload.sources).sort().join(',') !== 'fixedSha256,pointingSha256' || (!complete && payload.schema !== 1) || payload.kind !== 'tikun-word-boundaries' || payload.coverage !== (complete ? 'complete' : 'partial') || (complete && payload.candidateSha256 !== 'a06ea2b44ffe4ef96b50568092062272b7532a44fe0ea66ed02c9c0d09cbb539') || payload.sources?.fixedSha256 !== pins.fixedSha256 || payload.sources?.pointingSha256 !== pins.pointingSha256 || !Array.isArray(payload.records) || !Array.isArray(payload.gaps))
            throw Error('Boundary schema mismatch');
        const records = Object.create(null);
        const seen = new Set();
        for (const r of payload.records) {
            if (!r || Object.keys(r).sort().join(',') !== (complete ? 'book,boundaryConfidence,chapter,column,group,isEnd,isStart,parsha,pointingStatus,row,verse,word' : 'book,chapter,column,group,isEnd,isStart,parsha,row,verse,word') || (complete && (r.boundaryConfidence !== 'all-optimal-written-alignments' || !['exact', 'source-difference', 'ketiv-qere'].includes(r.pointingStatus))) || ![r.column, r.row, r.chapter, r.verse].every(n => Number.isInteger(n) && n > 0) || ![r.group, r.word].every(n => Number.isInteger(n) && n >= 0) || !/^tanach-(bereishit|shemos|vayikra|bamidbar|devarim)$/.test(r.book) || typeof r.parsha !== 'string' || !r.parsha.trim() || r.parsha.length > 80 || /[<>\x00-\x1f]/.test(r.parsha) || typeof r.isStart !== 'boolean' || typeof r.isEnd !== 'boolean')
                throw Error('Invalid boundary record');
            const fragment = fixed.pages?.[r.column]?.[r.row - 1]?.g?.flat()?.[r.group];
            if (typeof fragment !== 'string' || !fragment.match(/[^\s\u05BE]+/g)?.filter((w) => /[א-ת]/.test(w))[r.word])
                throw Error('Boundary coordinate outside source');
            const key = (0, exports.boundaryKey)(r);
            if (seen.has(key))
                throw Error('Duplicate boundary coordinate');
            seen.add(key);
            records[key] = Object.freeze({ ...r });
        }
        // Gaps are physical coordinates, explicitly separate from mapped records.
        // Omitted coordinates ALWAYS remain unavailable, even if gaps is empty.
        for (const g of payload.gaps) {
            if (typeof g !== 'string' || !/^[1-9]\d*\/[1-9]\d*\/(0|[1-9]\d*)\/(0|[1-9]\d*)$/.test(g) || seen.has(g))
                throw Error('Invalid/overlapping boundary gap');
            const [column, row, group, word] = g.split('/').map(Number), fragment = fixed.pages?.[column]?.[row - 1]?.g?.flat()?.[group];
            if (typeof fragment !== 'string' || !fragment.match(/[^\s\u05BE]+/g)?.filter((w) => /[א-ת]/.test(w))[word])
                throw Error('Boundary gap outside source');
            seen.add(g);
        }
        if (complete) {
            if (payload.gaps.length || payload.records.length !== 79976)
                throw Error('Incomplete physical coverage');
            let i = 0, starts = 0, ends = 0;
            const units = new Set();
            let previous = null;
            for (const [column, lines] of Object.entries(fixed.pages))
                for (const [ri, line] of lines.entries())
                    for (const [group, fragment] of line.g.flat().entries())
                        for (const [word] of (fragment.match(/[^\s\u05BE]+/g) ?? []).filter(w => /[א-ת]/.test(w)).entries()) {
                            const r = payload.records[i++];
                            if (!r || (0, exports.boundaryKey)(r) !== `${column}/${ri + 1}/${group}/${word}`)
                                throw Error('Physical order/coverage mismatch');
                            const ref = `${r.book}/${r.chapter}/${r.verse}`, prior = previous ? `${previous.book}/${previous.chapter}/${previous.verse}` : null;
                            const start = ref !== prior;
                            if (r.isStart !== start || (previous && previous.isEnd !== start))
                                throw Error('Source-unit boundary mismatch');
                            if (start) {
                                if (units.has(ref))
                                    throw Error('Noncontiguous source unit');
                                units.add(ref);
                            }
                            else if (previous?.parsha !== r.parsha)
                                throw Error('Parsha splits source unit');
                            starts += Number(r.isStart);
                            ends += Number(r.isEnd);
                            previous = r;
                        }
            if (i !== 79976 || starts !== 5853 || ends !== 5853 || !previous?.isEnd)
                throw Error('Source-unit coverage mismatch');
        }
        return { status: 'ready', reason: complete ? 'Source-edition labels; end symbols are location metadata, not original punctuation. Includes Bamidbar 25:19 and Shemos 20:26.' : 'Partial boundary map — unmapped words unavailable', records, coverage: complete ? 'complete' : 'partial' };
    }
    catch (e) {
        return (0, exports.unavailableBoundaries)(e instanceof Error ? e.message : 'Invalid boundary map');
    }
}
/** Run identically in site, trusted RN-Web parent and the nonce-local bridge.
 * Inspect EVERY physical word, not only known records: never skip an unmapped
 * visible word in search of a nearby known reference. Hit-test after clipping
 * to scroll viewports and fixed/sticky chrome. RTL reading order breaks ties. */
function visibleBoundary(doc) {
    const win = doc.defaultView;
    const candidates = [];
    doc.querySelectorAll('.study-word[data-boundary-key]').forEach(el => candidates.push({ key: el.getAttribute('data-boundary-key'), rect: el.getBoundingClientRect(), element: el }));
    doc.querySelectorAll('[data-boundary-fragment]').forEach(el => {
        try {
            const meta = JSON.parse(el.getAttribute('data-boundary-fragment'));
            // Range measurement leaves canonical bare ink and shaping untouched.
            if (el.textContent !== meta.source) {
                candidates.push({ key: '', rect: el.getBoundingClientRect(), element: el, invalid: true });
                return;
            }
            const walker = doc.createTreeWalker(el, 4), nodes = [];
            let node, offset = 0;
            while ((node = walker.nextNode())) {
                const end = offset + (node.textContent?.length ?? 0);
                nodes.push({ node, start: offset, end });
                offset = end;
            }
            let word = 0;
            for (const match of meta.source.matchAll(/[^\s\u05BE]+/g)) {
                if (!/[א-ת]/.test(match[0]))
                    continue;
                const index = word++, start = match.index, end = start + match[0].length;
                const a = nodes.find(n => n.end > start), b = nodes.find(n => n.end >= end);
                if (!a || !b)
                    continue;
                const range = doc.createRange();
                range.setStart(a.node, start - a.start);
                range.setEnd(b.node, end - b.start);
                candidates.push({ key: meta.prefix + '/' + index, rect: range.getBoundingClientRect(), element: el });
            }
        }
        catch {
            candidates.push({ key: '', rect: el.getBoundingClientRect(), element: el, invalid: true });
        }
    });
    const inView = candidates.filter(({ rect: r, element }) => {
        if (r.bottom <= 0 || r.top >= win.innerHeight || r.right <= 0 || r.left >= win.innerWidth || r.width <= 0 || r.height <= 0)
            return false;
        let left = Math.max(0, r.left), right = Math.min(win.innerWidth, r.right), top = Math.max(0, r.top), bottom = Math.min(win.innerHeight, r.bottom);
        for (let p = element.parentElement; p; p = p.parentElement) {
            const css = win.getComputedStyle(p), b = p.getBoundingClientRect();
            if (/(auto|scroll|hidden|clip)/.test(css.overflowX)) {
                left = Math.max(left, b.left);
                right = Math.min(right, b.right);
            }
            if (/(auto|scroll|hidden|clip)/.test(css.overflowY)) {
                top = Math.max(top, b.top);
                bottom = Math.min(bottom, b.bottom);
            }
        }
        if (right - left < Math.min(4, r.width) || bottom - top < r.height * .6)
            return false;
        // Most of the word must be unobscured; the center alone can sit beneath a
        // sticky bar or a dialog. Three horizontal points at two vertical levels.
        return [.3, .7].every(y => [.2, .5, .8].every(x => { const hit = doc.elementFromPoint(left + (right - left) * x, top + (bottom - top) * y); return !!hit && (element === hit || element.contains(hit)); }));
    });
    inView.sort((a, b) => Math.abs(a.rect.top - b.rect.top) > 2 ? a.rect.top - b.rect.top : b.rect.right - a.rect.right);
    const first = inView[0];
    if (!first || first.invalid)
        return { status: 'unavailable', key: null, record: null };
    try {
        const raw = first.element.getAttribute('data-boundary-record'), fragment = first.element.getAttribute('data-boundary-fragment');
        const record = raw ? JSON.parse(raw) : fragment ? JSON.parse(fragment).records[Number(first.key.split('/')[3])] ?? null : null;
        return { status: record ? 'ready' : 'unavailable', key: first.key, record };
    }
    catch {
        return { status: 'unavailable', key: first.key, record: null };
    }
}
function observeBoundaries(doc, receive, inspect) {
    const win = doc.defaultView;
    let frame = 0, disposed = false, last = '';
    const scan = () => { frame = 0; if (disposed)
        return; const v = inspect(doc), key = JSON.stringify(v); if (key !== last) {
        last = key;
        receive(v);
    } };
    const schedule = () => { if (!frame)
        frame = win.requestAnimationFrame(scan); };
    doc.addEventListener('scroll', schedule, { passive: true, capture: true });
    win.addEventListener('resize', schedule);
    const resize = new win.ResizeObserver(schedule);
    resize.observe(doc.body);
    const mutation = new win.MutationObserver(() => { last = ''; schedule(); });
    mutation.observe(doc.body, { childList: true, subtree: true });
    void doc.fonts.ready.then(schedule);
    schedule();
    return () => { disposed = true; win.cancelAnimationFrame(frame); resize.disconnect(); mutation.disconnect(); doc.removeEventListener('scroll', schedule, true); win.removeEventListener('resize', schedule); };
}
exports.BOUNDARY_CSS = `.study-word{position:relative}.study-word[data-verse-end="true"]::after{content:'׃';position:absolute;left:-.38em;top:.02em;font:700 1em/1 Arial,sans-serif;color:var(--boundary-color,#176a93);pointer-events:none;user-select:none}.study-word[data-verse-label]::before{content:attr(data-verse-label);position:absolute;right:0;bottom:calc(100% - .12em);font:10px/12px Arial,sans-serif;color:var(--boundary-color,#176a93);white-space:nowrap;pointer-events:none;user-select:none}[data-tk-theme=night]{--boundary-color:#9fddff}`;
/** Metadata attributes only: source DOM text, spans and ink stay identical. */
function decorateSourceBoundaries(html, lines, column, state) {
    const fragments = lines.flatMap((line, ri) => line.g.flat().map((source, group) => ({ source, prefix: `${column}/${ri + 1}/${group}`, records: (source.match(/[^\s\u05BE]+/g) ?? []).filter(w => /[א-ת]/.test(w)).map((_, word) => state.records[`${column}/${ri + 1}/${group}/${word}`] ?? null) })));
    let index = 0;
    return html.replace(/class="(?:tk-)?fixed-fragment"/g, all => {
        const meta = fragments[index++];
        return meta ? all + ' data-boundary-fragment="' + JSON.stringify(meta).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])) + '"' : all;
    });
}
function decorateBoundaries(html, state, labels, ends) {
    const esc = (s) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    return html.replace(/data-boundary-key="([0-9/]+)"/g, (all, key) => {
        const r = state.records[key];
        if (!r)
            return all + ' data-boundary-status="unavailable"';
        return all + ` data-boundary-status="ready" data-boundary-record="${esc(JSON.stringify(r))}"` + (ends && r.isEnd ? ' data-verse-end="true"' : '') + (labels && r.isStart ? ` data-verse-label="${r.chapter}:${r.verse}"` : '');
    });
}

root.TikkunBoundaryPins={"schema":1,"fixedSha256":"d0f4ca04162fc22299a492221cc67b9b3a054cdd77d9441821ea8b217fe69a85","pointingSha256":"47cb0f03b3c2c7df2bdf6cf0609103f2ac5134ff36b038f2e91e188d920a44a6","mapSha256":"7341d3640d3d15e6979f4186a6905ca4246f2907545036d163875cb8d4d0aa8c"}
;root.TikkunBoundaries=exports;})(window);
