import catalog from '../data/kabala-catalog.json';

export interface KabalaSection { number: number; title: string }
export interface KabalaEntry {
  id: string;
  title: string;
  group: string;
  kind: 'txt' | 'doc' | 'pdf';
  sections: KabalaSection[];
  download: string;
  reader: string;
  aliasOf?: string | null;
}

export const entries: KabalaEntry[] = catalog.entries;
const byId = new Map(entries.map(entry => [entry.id, entry]));
const textId = /^kabala-[0-9a-f]{12}$/;
const fileId = /^[A-Za-z0-9_-]+$/;

export function representation(entry: KabalaEntry): KabalaEntry {
  const seen = new Set<string>();
  while (entry.aliasOf) {
    if (seen.has(entry.id)) throw new Error(`Circular Kabala alias: ${entry.id}`);
    seen.add(entry.id);
    const target = byId.get(entry.aliasOf);
    if (!target || (target.kind === 'pdf') !== (entry.kind === 'pdf')) {
      throw new Error(`Invalid Kabala alias: ${entry.id}`);
    }
    entry = target;
  }
  return entry;
}

export const textEntries = entries.filter(entry => entry.kind !== 'pdf' && !entry.aliasOf);
if (!entries.length || byId.size !== entries.length) throw new Error('Empty or duplicate Kabala catalog');
for (const entry of entries) {
  if (!entry.title?.trim() || !entry.group?.trim() || !['txt', 'doc', 'pdf'].includes(entry.kind)) {
    throw new Error(`Invalid Kabala catalog entry: ${entry.id}`);
  }
  const target = representation(entry);
  const pdf = target.kind === 'pdf';
  if (!fileId.test(target.id) || /\s/.test(target.id) || (!pdf && !textId.test(target.id))) {
    throw new Error(`Invalid Kabala representation ID: ${target.id}`);
  }
  if (!entry.aliasOf) {
    const expected = `/kabala-files/${target.id}.${pdf ? 'pdf' : 'txt'}`;
    if (target.download !== expected || (pdf && target.reader !== expected)) {
      throw new Error(`Invalid Kabala file URL: ${target.id}`);
    }
    if (!pdf) {
      const numbers = new Set(target.sections.map(section => section.number));
      if (!numbers.size || numbers.size !== target.sections.length ||
          target.sections.some(section => !Number.isSafeInteger(section.number) || section.number < 1 ||
            section.number > numbers.size || !section.title?.trim())) {
        throw new Error(`Invalid Kabala section list: ${target.id}`);
      }
    }
  }
}

export const kinds = { txt: 'טקסט', doc: 'מסמך', pdf: 'מסמך מצולם או מעומד' } as const;
export const directoryHref = (id: string) => `/kabala/${id}/`;
export const sectionHref = (id: string, number: number) => `/reader/${id}/1/${number}/`;
export const sectionJsonHref = (id: string, number: number) => `/reader/${id}/volume-1/torah-${number}.json`;
export const orderedSections = (entry: KabalaEntry) => [...entry.sections].sort((a, b) => a.number - b.number);
export const downloadName = (entry: KabalaEntry) => {
  const name = entry.title.replace(/[<>:"/\\|?*\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g, ' ').trim().replace(/[. ]+$/, '');
  return `${name || 'ספר קבלה'}.${entry.kind === 'pdf' ? 'pdf' : 'txt'}`;
};
