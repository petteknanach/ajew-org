import fs from 'node:fs';
import path from 'node:path';

// Route IDs authenticated against the existing parsha route and part-1 index.
export const PARSHA_READER = Object.freeze({
  bereishit: '1/1', noach: '1/2', 'lech-lecha': '1/3', vayeira: '1/4',
  'chayei-sarah': '1/5', toldot: '1/6', vayeitzei: '1/7', vayishlach: '1/8',
  vayeishev: '1/9', mikeitz: '1/10', vayigash: '1/11', vayechi: '1/12',
});
export function qualifiedIndexes(cwd = process.cwd()) {
  const root = path.join(cwd, 'public/data/breslov-parsha');
  return fs.readdirSync(root, {withFileTypes: true})
    .filter(entry => entry.isDirectory() && /^qualified-\d+-\d+$/.test(entry.name))
    .sort((a, b) => Number(a.name.split('-')[1]) - Number(b.name.split('-')[1]))
    .map(entry => {
      const index = JSON.parse(fs.readFileSync(path.join(root, entry.name, 'index.json'), 'utf8'));
      if (index.schema !== 'qualified-parsha-three-consumer-index/v1') throw Error(`Invalid qualified index ${entry.name}`);
      return {namespace: entry.name, index};
    });
}
export function publicJSON(url, cwd = process.cwd()) {
  if (typeof url !== 'string' || !url.startsWith('/') || url.includes('..') || /[?#\\]/.test(url)) throw Error('Invalid qualified source URL');
  return JSON.parse(fs.readFileSync(path.join(cwd, 'public', url), 'utf8'));
}
export function mergeQualified(selections) {
  if (!selections.length) return null;
  const units = new Map(), notes = new Map();
  for (const selection of selections) {
    for (const unit of [...(selection.units || []), ...(selection.apparatus || [])]) {
      if (units.has(unit.id) && JSON.stringify(units.get(unit.id)) !== JSON.stringify(unit)) throw Error(`Conflicting qualified source owner ${unit.id}`);
      units.set(unit.id, unit);
    }
    for (const note of selection.globalQualifications || []) {
      if (notes.has(note.id) && JSON.stringify(notes.get(note.id)) !== JSON.stringify(note)) throw Error(`Conflicting qualified source note ${note.id}`);
      notes.set(note.id, note);
    }
  }
  return {...selections[0], revision: selections.map(s => s.revision).join('+'),
    scopeNotice: [...new Set(selections.map(s => s.scopeNotice).filter(Boolean))].join('\n\n'),
    apparatusScopeNotice: [...new Set(selections.map(s => s.apparatusScopeNotice).filter(Boolean))].join('\n\n'),
    units: [...units.values()], apparatus: [], globalQualifications: [...notes.values()],
    sourceComplete: false};
}
export function qualifiedParsha(slug, indexes = qualifiedIndexes(), cwd = process.cwd()) {
  const selections = [], coverages = [];
  for (const {index} of indexes) {
    const coverage = index.parshas?.[slug];
    if (!coverage) continue;
    const master = publicJSON(index.masterUrl, cwd);
    if (master.schema !== 'qualified-parsha-public-master/v1') throw Error('Invalid qualified master');
    const byId = new Map([...(master.units || []), ...(master.apparatus || [])].map(u => [u.id, u]));
    const ids = [...coverage.mainIds, ...coverage.apparatusIds];
    const units = ids.map(id => {
      const unit = byId.get(id);
      if (!unit || unit.parsha !== slug) throw Error(`Missing qualified source owner ${id}`);
      return unit;
    });
    selections.push({...master, units, apparatus: []}); coverages.push(coverage);
  }
  return {selection: mergeQualified(selections), coverage: coverages[0] || null};
}
export function qualifiedChapter(chapter, indexes = qualifiedIndexes(), cwd = process.cwd()) {
  const matches = indexes.filter(({index}) => index.chapters?.[String(chapter)]);
  return {matches, selection: mergeQualified(matches.map(({index}) => {
    const data = publicJSON(index.chapters[String(chapter)].url, cwd);
    if (data.schema !== 'qualified-parsha-chapter-commentary/v1') throw Error('Invalid qualified chapter');
    return data;
  }))};
}
// Status is a separate reading qualification, never a certification claim.
export function fieldStatus(pair, language) {
  const value = pair.sourceStatus?.[language];
  return typeof value === 'string' ? value : value?.status || '';
}
export function fieldStatusLabel(pair, language) {
  const status = fieldStatus(pair, language);
  if (!status) return '';
  return `${language === 'he' ? 'Hebrew' : 'English'} — ${status === 'held' || status.startsWith('held-') ? 'unresolved source reading; see qualifications' : status.replaceAll('-', ' ')}`;
}
