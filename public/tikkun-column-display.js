/* Generated from services/tikunColumnDisplay.ts; do not hand-edit. */
(function(root){const exports={};const data=root.TikkunColumnPointing={columns:{},refs:[]};const nav=root.TikkunColumnNavigation={verses:{}};const require=id=>id.includes("selection-index")?nav:data;
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.COLUMN_POINTING_AVAILABLE = void 0;
exports.fixedColumnUnits = fixedColumnUnits;
exports.clampColumnZoom = clampColumnZoom;
exports.fixedDisplaySize = fixedDisplaySize;
exports.getColumnPointingRecords = getColumnPointingRecords;
exports.pointingRecord = pointingRecord;
exports.filterColumnMarks = filterColumnMarks;
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
function esc(s) {
    return s.replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}
/** Authentic pointing is a clearly labelled companion OUTSIDE fixed ink until
 * a genuine compatible font exists. Exact strings/marks are never normalized.
 * No marks are attached to a changed ketiv or an edition-differing word. */
function renderColumnPointingAdvice(column, nikud = false, taamim = false) {
    if (!nikud && !taamim)
        return '';
    const records = getColumnPointingRecords(column);
    if (!records)
        return '<p class="pointing-unavailable notice">ניקוד העמוד אינו זמין</p>';
    const qere = [...new Map(records.filter(r => r.status === 'ketiv-qere' && r.qere).map(r => [r.ref, r])).values()];
    const differingRuns = (Array.isArray(pointing.differences) ? pointing.differences : []).filter(r => r && Array.isArray(r.columns) && r.columns.includes(column) && Array.isArray(r.uxlc) && Array.isArray(r.fixed) && [...r.uxlc, ...r.fixed].every(s => typeof s === 'string'));
    const differences = records.filter(r => r.status === 'source-difference').length;
    return '<aside class="column-pointing-advice"><p class="pointing-unavailable notice" role="status">ניקוד על כתב העמוד אינו זמין בגופן המקור. הכתב והשורות נשארו ללא שינוי. הקריאה האמיתית מוצגת בנפרד להלן — אין זה ניקוד הכתיב.</p>' +
        `<details><summary>קריאה נלווית · UXLC · מחוץ לכתב העמוד${differences ? ` · ${differences} מילים שונות בנוסח` : ''}</summary><div class="column-companion" dir="rtl" lang="he">` +
        records.map(r => r.status === 'exact' ? `<span data-pointing-ref="${esc(r.ref)}">${esc(filterColumnMarks(r.t, nikud, taamim))}</span>` :
            `<span class="column-source-difference">[${esc(r.s)} · ${r.status === 'ketiv-qere' ? 'כתיב/קרי — אין ניקוד מועתק' : 'הבדל נוסח — ניקוד אינו זמין'}]</span>`).join(' ') +
        '</div>' + differingRuns.map(r => `<p class="column-edition-difference">שינוי נוסח — אין ניקוד מועתק · כתב העמוד: ${esc(r.fixed.join(' ') || '[ללא מילה מקבילה]')} · כתיב UXLC בנפרד: ${esc(r.uxlc.join(' ') || '[ללא מילה מקבילה]')}</p>`).join('') + qere.map(r => `<p class="column-qere"><bdi dir="ltr">${esc(r.ref)}</bdi> · קרי בנפרד: <span>${esc(filterColumnMarks(r.qere, nikud, taamim))}</span></p>`).join('') + '</details></aside>';
}

root.TikkunColumnDisplay=exports;})(window);
