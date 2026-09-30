/* Generated from services/tikunColumnDisplay.ts; do not hand-edit. */
(function(root){const exports={};const data=root.TikkunColumnPointing={columns:{},refs:[]};const nav=root.TikkunColumnNavigation={verses:{}};const require=id=>id.includes("selection-index")?nav:data;
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.STUDY_COLUMN_POINTING_AVAILABLE = exports.COLUMN_POINTING_AVAILABLE = void 0;
exports.fixedColumnUnits = fixedColumnUnits;
exports.clampColumnZoom = clampColumnZoom;
exports.fixedDisplaySize = fixedDisplaySize;
exports.getColumnPointingRecords = getColumnPointingRecords;
exports.pointingRecord = pointingRecord;
exports.filterColumnMarks = filterColumnMarks;
exports.studyDisplaySize = studyDisplaySize;
exports.studyPointingMode = studyPointingMode;
exports.associateStudyWord = associateStudyWord;
exports.renderStudyColumn = renderStudyColumn;
exports.renderColumnPointingAdvice = renderColumnPointingAdvice;
const pointing = require('../assets/data/tikun-fixed/column-pointing.json');
const navigation = require('../assets/data/tikun-fixed/selection-index.json');
/** Fixed Stam has blank vowel/accent glyphs. Do not swap its consonant face,
 * invent anchors or claim that a different reading font is an ink overlay. */
exports.COLUMN_POINTING_AVAILABLE = false;
function fixedColumnUnits(column) {
    return column === 78 ? 28 : column === 242 || column === 243 ? 22 : 21;
}
function clampColumnZoom(value) {
    return Number.isFinite(value) && value > 0 ? Math.min(3, Math.max(.5, value)) : 1;
}
/** Fit scales the entire em-based fixed geometry. It never reflows source text.
 * 36px body padding + 2px border; 1em viewport + .8em external gutter. */
function fixedDisplaySize(width, column, zoom = 1) {
    const safeWidth = Number.isFinite(width) && width > 76 ? width : 320;
    return Math.min(28, (safeWidth - 38) / (fixedColumnUnits(column) + 1.8)) * clampColumnZoom(zoom);
}
function getColumnPointingRecords(column) {
    const fragments = pointing.columns[column];
    if (!fragments || !Array.isArray(pointing.refs))
        return null;
    return Object.entries(fragments).flatMap(([loc, tuples]) => tuples.map(tuple => {
        if (!Array.isArray(tuple) || typeof tuple[0] !== 'string')
            return { s: '', status: 'invalid' };
        const s = tuple[0], ref = typeof tuple[1] === 'number' ? pointing.refs[tuple[1]] : undefined;
        return pointingRecord(tuple.length === 1 ? { s, status: 'source-difference' } :
            tuple[2] === null ? { s, ref, status: 'ketiv-qere', qere: tuple[3] } :
                { s, ref, status: 'exact', t: tuple[2] }, s, { column, row: Number(loc.split(':')[0]) });
    }));
}
function pointingRecord(record, fixedWord, location) {
    const letters = (s) => s.replace(/[^א-ת]/g, '');
    const validRef = /^tanach-(bereishit|shemos|vayikra|bamidbar|devarim)\/\d+\/\d+$/;
    if (!record || !['exact', 'ketiv-qere', 'source-difference'].includes(record.status) || record.s !== fixedWord ||
        (record.status !== 'source-difference' && !validRef.test(record.ref ?? '')) ||
        (record.status !== 'source-difference' && location && !navigation.verses[record.ref ?? '']?.rows.some(r => r[0] === location.column && r[1] <= location.row && r[2] >= location.row)) ||
        (record.status === 'ketiv-qere' && typeof record.qere !== 'string') ||
        (record.status === 'exact' && (typeof record.t !== 'string' || letters(record.t) !== letters(fixedWord)))) {
        return { s: fixedWord, status: 'invalid' };
    }
    return record;
}
function filterColumnMarks(text, nikud, taamim) {
    let result = text;
    if (!nikud)
        result = result.replace(/[\u05B0-\u05BC\u05C1\u05C2\u05C7]/g, '');
    if (!taamim)
        result = result.replace(/[\u0591-\u05AF\u05BD\u05C0]/g, '');
    return result;
}
exports.STUDY_COLUMN_POINTING_AVAILABLE = true;
function studyDisplaySize(width, units, zoom = 1) {
    const w = Number.isFinite(width) && width > 76 ? width : 320;
    return Math.min(28, (w - 38) / (units + 1.8)) * clampColumnZoom(zoom);
}
function studyPointingMode(nikud = false, taamim = false) {
    return nikud ? taamim ? 'full' : 'nikud' : taamim ? 'taamim' : 'bare';
}
function decodeTuple(tuple, s, column, row) {
    if (!tuple)
        return { s, status: 'invalid' };
    return pointingRecord(tuple.length === 1 ? { s: tuple[0], status: 'source-difference' } : tuple[2] === null ?
        { s: tuple[0], ref: pointing.refs[tuple[1]], status: 'ketiv-qere', qere: tuple[3] } :
        { s: tuple[0], ref: pointing.refs[tuple[1]], status: 'exact', t: tuple[2] }, s, { column, row });
}
/** Add ONLY the associated word's original vowel/accent codepoints. Preserve
 * every fixed-source character (including extraordinary dots/nuns), in order.
 * No punctuation, qere, or source-differing consonant enters the study column. */
function associateStudyWord(source, record) {
    if (record.status !== 'exact' || !record.t)
        return source;
    const clusters = record.t.match(/[א-ת][^א-ת]*/g) ?? [];
    if (clusters.map(c => c[0]).join('') !== source.replace(/[^א-ת]/g, ''))
        return source;
    let i = 0;
    return [...source].map(ch => /[א-ת]/.test(ch) ? ch + clusters[i++].slice(1).replace(/[^\u0591-\u05BD\u05BF\u05C1\u05C2\u05C7]/g, '') : ch).join('');
}
/** A separately named pointable representation in ORIGINAL Shlomo outlines,
 * not the source ink. All four presentation fonts retain the same shaping
 * tables, advances, anchors and consonants. Fully associated Unicode remains
 * in the shaping run even when mark INK is hidden. aria-label reflects switches;
 * copying preserves associated Unicode (disclosed in the representation note). */
function renderStudyColumn(column, lines, units, nikud = false, taamim = false, selectedRows = [], site = false) {
    const prefix = site ? 'tk-' : '', mode = studyPointingMode(nikud, taamim);
    let failed = 0;
    const rows = lines.map((line, ri) => {
        const row = ri + 1;
        return `<div${!site && row === selectedRows[0] ? ' id="tikun-selection"' : ''} class="${prefix}fixed-line${line.p ? ` ${prefix}fixed-open` : ''}${line.g.length > 1 ? ` ${prefix}fixed-song` : ''}${selectedRows.includes(row) ? ' fixed-selected' : ''}" data-line="${row}" data-source-line="${line.sourceLine ?? ''}">` + line.g.map((group, gi) => `<div class="${prefix}fixed-group${group.length > 1 ? ` ${prefix}fixed-gapped` : ''}">` + group.map((s, si) => {
            const loc = `${row}:${gi}:${si}`, tuples = pointing.columns[column]?.[loc] ?? [];
            let ti = 0, letter = 0;
            const html = s.replace(/[^\s\u05BE]+/g, word => {
                const hasLetters = /[א-ת]/.test(word), record = hasLetters ? decodeTuple(tuples[ti++], word, column, row) : { s: word, status: 'written-sign' };
                if (record.status === 'invalid')
                    failed++;
                const text = associateStudyWord(word, record);
                const rendered = (text.match(/[א-ת][^א-ת]*|[^א-ת]+/g) ?? []).map(cluster => {
                    if (!/[א-ת]/.test(cluster[0]))
                        return esc(cluster);
                    const currentLetter = letter++;
                    const special = line.L?.[`${gi}:${si}`]?.find(x => x[0] === currentLetter);
                    return special ? `<span class="${prefix}${site ? 'l' : 'fixed-letter'}-${esc(special[1])}">${esc(cluster)}</span>` : esc(cluster);
                }).join('');
                const unavailable = hasLetters && record.status !== 'exact';
                return `<span class="study-word${unavailable ? ' study-unpointed' : ''}" data-source="${esc(word)}" data-pointing-status="${record.status}"${'ref' in record && record.ref ? ` data-pointing-ref="${esc(record.ref)}"` : ''} aria-label="${esc(filterColumnMarks(text, nikud, taamim))}"${unavailable ? ' title="אין ניקוד מועתק · הבדל נוסח או כתיב/קרי"' : ''}>${rendered}</span>`;
            });
            if (ti !== tuples.length)
                failed++;
            return `<span class="${prefix}fixed-fragment" data-study-location="${loc}">${html}</span>`;
        }).join('') + '</div>').join('') + '</div>';
    }).join('');
    if (failed)
        return '<p class="pointing-unavailable notice">מיפוי המילים אינו תקין — תצוגת הלימוד לא מוצגת. עמוד המקור נשאר זמין.</p>';
    const title = `<h2 class="${site ? 'tk-column-label' : ''}">עמוד ${column} / 245 · כתב לימודי מנוקד · Shlomo Stam</h2>`;
    const ink = `<div class="${prefix}fixed-ink study-ink" data-study-mode="${mode}" dir="rtl" lang="he">${rows}</div>`;
    return site ? `<section class="tk-fixed-page study-page" data-column="${column}" style="width:${units}em">${title}${ink}</section>` :
        `<section class="fixed-page study-page" data-column="${column}">${title}${selectedRows.length ? '<a class="fixed-jump" href="#tikun-selection">לקטע שנבחר ↓</a>' : ''}<div class="fixed-viewport" tabindex="0" role="region" aria-label="עמוד לימודי Shlomo Stam · לא כתב המקור"><div class="fixed-column" style="width:${units}em">${ink}</div></div><a class="fixed-jump" href="#tikun-top">לראש העמוד ↑</a></section>`;
}
function esc(s) {
    return s.replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}
/** Authentic pointing is a clearly labelled companion OUTSIDE fixed ink until
 * a genuine compatible font exists. Exact strings/marks are never normalized.
 * No marks are attached to a changed ketiv or an edition-differing word. */
function renderColumnPointingAdvice(column, nikud = false, taamim = false, study = false) {
    if (!nikud && !taamim)
        return '';
    const records = getColumnPointingRecords(column);
    if (!records)
        return '<p class="pointing-unavailable notice">ניקוד העמוד אינו זמין</p>';
    const qere = [...new Map(records.filter(r => r.status === 'ketiv-qere' && r.qere).map(r => [r.ref, r])).values()];
    const differingRuns = (Array.isArray(pointing.differences) ? pointing.differences : []).filter(r => r && Array.isArray(r.columns) && r.columns.includes(column) && Array.isArray(r.uxlc) && Array.isArray(r.fixed) && [...r.uxlc, ...r.fixed].every(s => typeof s === 'string'));
    const differences = records.filter(r => r.status === 'source-difference').length;
    return '<aside class="column-pointing-advice">' + (study ? '<p class="notice">מילים ללא שיוך מדויק נשארות ללא ניקוד ומסומנות בקו מקווקו. קרי והבדלי נוסח מפורטים בנפרד.</p>' : '<p class="pointing-unavailable notice" role="status">ניקוד על כתב העמוד אינו זמין בגופן המקור. הכתב והשורות נשארו ללא שינוי. הקריאה האמיתית מוצגת בנפרד להלן — אין זה ניקוד הכתיב.</p>') +
        `<details><summary>קריאה נלווית · UXLC · מחוץ לכתב העמוד${differences ? ` · ${differences} מילים שונות בנוסח` : ''}</summary><div class="column-companion" dir="rtl" lang="he">` +
        records.map(r => r.status === 'exact' ? `<span data-pointing-ref="${esc(r.ref)}">${esc(filterColumnMarks(r.t, nikud, taamim))}</span>` :
            `<span class="column-source-difference">[${esc(r.s)} · ${r.status === 'ketiv-qere' ? 'כתיב/קרי — אין ניקוד מועתק' : 'הבדל נוסח — ניקוד אינו זמין'}]</span>`).join(' ') +
        '</div>' + differingRuns.map(r => `<p class="column-edition-difference">שינוי נוסח — אין ניקוד מועתק · כתב העמוד: ${esc(r.fixed.join(' ') || '[ללא מילה מקבילה]')} · כתיב UXLC בנפרד: ${esc(r.uxlc.join(' ') || '[ללא מילה מקבילה]')}</p>`).join('') + qere.map(r => `<p class="column-qere"><bdi dir="ltr">${esc(r.ref)}</bdi> · קרי בנפרד: <span>${esc(filterColumnMarks(r.qere, nikud, taamim))}</span></p>`).join('') + '</details></aside>';
}

root.TikkunColumnDisplay=exports;})(window);
