// Qualified transport for multiple supplied editions and unpaired source parts.
// No browser/storage side effects; callers supply their frozen source records.
export function editionAwareSnapshot(data, index, pathname) {
  const publications = [data.sourcePublication, ...(data.sourcePublications || [])];
  const byEdition = new Map();
  for (const publication of publications) {
    if (!publication || typeof publication.edition !== 'string' || byEdition.has(publication.edition) ||
        !Number.isSafeInteger(publication.volume) || publication.volume < 1 ||
        !/^[a-f0-9]{64}$/.test(publication.enSHA256) || !/^[a-f0-9]{64}$/.test(publication.heSHA256) ||
        !Array.isArray(publication.units)) throw new Error('Invalid source edition');
    const units = new Map();
    for (const unit of publication.units) {
      if (!unit || typeof unit.unit !== 'string' || typeof unit.title !== 'string' || units.has(unit.unit)) throw new Error('Invalid source unit');
      units.set(unit.unit, unit);
    }
    byEdition.set(publication.edition, { publication, units });
  }
  const rows = index == null ? data.segments : data.segments.filter(row => String(row.index) === String(index));
  if (!rows.length || new Set(rows.map(row => String(row.index))).size !== rows.length) throw new Error('Source selection not found or ambiguous');
  const active = new Map(), occurrences = [], labels = [];
  const mixed = new Set(rows.map(row => row.sourceEdition)).size > 1;
  const text = rows.map(row => {
    const entry = byEdition.get(row.sourceEdition);
    if (!entry || !entry.units.has(row.sourceUnit)) throw new Error('Unqualified source owner');
    const { publication, units } = entry;
    active.set(publication.edition, publication);
    const fragment = row.sourceRole === 'supplied_english_source_paragraph';
    const related = row.relatedReferences;
    if (fragment && (row.sourceReference != null || row.exclusiveBilingualOwnerAsserted !== false ||
        row.editorialAid !== false || !Array.isArray(related) || !related.length ||
        related.some(ref => !Number.isSafeInteger(ref) || ref < 1) || new Set(related).size !== related.length ||
        row.he !== '' || row.he_nikud !== '')) throw new Error('Unsupported supplied-English association');
    if (typeof row.en !== 'string' || typeof row.he_nikud !== 'string') throw new Error('Incomplete source fields');
    const title = (mixed ? `Volume ${publication.volume} · ` : '') + units.get(row.sourceUnit).title;
    const label = fragment
      ? `${title} — additional supplied English paragraph; related references ${related.map(ref => `[${ref}]`).join(', ')}`
      : `${title}${row.sourceReference == null ? '' : ` [${row.sourceReference}]`}`;
    const notes = [...(publication.sourceQualifications || []), ...(row.translatorNotes || []), ...(row.sourceQualifications || [])];
    if (notes.some(note => !note || typeof note.id !== 'string' || typeof note.text !== 'string') ||
        new Set(notes.map(note => note.id)).size !== notes.length || (fragment && !row.sourceQualifications?.length)) {
      throw new Error('Invalid source qualification membership');
    }
    labels.push(label);
    occurrences.push({ index: row.index, sourceEdition: publication.edition, sourceUnit: row.sourceUnit,
      orderedQualificationIds: notes.map(note => note.id), qualifications: notes });
    return [label, row.he_nikud, row.en,
      ...(notes.length ? ['Source qualifications — separate from the original teaching', ...notes.map(note => note.text)] : [])]
      .filter(value => value.length).join('\n\n');
  }).join('\n\n────────\n\n');
  const selected = [...active.values()];
  const edition = selected.map(publication => publication.edition).join('+');
  const selection = index == null ? 'all' : String(index);
  const header = selected.map(publication => `Source edition: Likutay Halachos, Volume ${publication.volume}.`).join('\n');
  const clone = value => JSON.parse(JSON.stringify(value));
  return {
    _key: `${pathname}#${selection}@${edition}`,
    ref: index == null ? data.title : labels[0], refHe: data.hebrewTitle || '',
    he: '', en: '', savedText: `${header}\n\n${text}`,
    readerUrl: index == null ? pathname : `${pathname}#seg-${index}`,
    sourceEdition: edition,
    sourceReference: index == null ? null : rows[0].sourceReference ?? null,
    sourceEnglishSHA256: selected.length === 1 ? selected[0].enSHA256 : '',
    sourceHebrewSHA256: selected.length === 1 ? selected[0].heSHA256 : '',
    sourceQualification: 'Full source bodies, ordered qualifications and nonexclusive English reference spans retained separately.',
    qualifiedFullBody: clone({ schema: 'lh-publication-selected-source-v1',
      publications: selected.map(publication => ({ ...publication, units: publication.units.map(unit => ({ unit: unit.unit, title: unit.title })) })),
      records: rows, qualificationOccurrences: occurrences }),
    addedAt: Date.now(), note: '', tag: ''
  };
}
