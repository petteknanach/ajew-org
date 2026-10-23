import fs from 'node:fs';
import path from 'node:path';

function regularSection(directory, number) {
  if (!Number.isSafeInteger(number) || number < 1) return false;
  try { return fs.lstatSync(path.join(directory, `section-${number}.json`)).isFile(); }
  catch (error) { if (error?.code === 'ENOENT') return false; throw error; }
}

export function ruzinSections(directory) {
  return fs.readdirSync(directory).flatMap((name) => {
    const match = /^section-([1-9][0-9]*)\.json$/.exec(name);
    if (!match) return [];
    const number = Number(match[1]);
    if (!Number.isSafeInteger(number)) throw new Error('Unsafe Ruzin source identifier');
    return regularSection(directory, number) ? [number] : [];
  }).sort((a, b) => a - b);
}

export function ruzinSectionPaths(directory) {
  return ruzinSections(directory).map((number) => ({ params: { part: '1', torah: String(number) } }));
}

export function ruzinNavigation(directory, part, number) {
  const url = (next) => `/reader/ramchal-ruzin-gineezin/1/${next}/`;
  if (part !== 1 || !regularSection(directory, number)) return { prevUrl: null, nextUrl: null };
  return {
    prevUrl: regularSection(directory, number - 1) ? url(number - 1) : null,
    nextUrl: regularSection(directory, number + 1) ? url(number + 1) : null,
  };
}

export function ruzinDirectory(directory) {
  return ruzinSections(directory).map((number) => {
    const data = JSON.parse(fs.readFileSync(path.join(directory, `section-${number}.json`), 'utf8'));
    if (data.torah !== number || !Array.isArray(data.segments) || !data.segments.length || !data.title) {
      throw new Error(`Ruzin source identity/body mismatch: section ${number}`);
    }
    return {
      number, displayNumber: String(number),
      title: data.title, hebrewTitle: data.hebrewTitle || '',
      hasEnglish: data.segments.some((segment) => typeof segment.en === 'string' && segment.en.trim()),
      url: `/reader/ramchal-ruzin-gineezin/1/${number}/`,
    };
  });
}
