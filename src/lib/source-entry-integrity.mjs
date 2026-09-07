// Source citations, not array positions, determine destinations.
export function quoteSourceUrl(citation) {
  if (citation === 'The Petek') return '/my-flame';
  const match = /^LM (I|II):([1-9]\d*)$/.exec(citation);
  if (!match) throw new Error(`Unsupported quote citation: ${citation}`);
  return `/reader/likutay-moharan/${match[1] === 'II' ? 2 : 1}/${match[2]}`;
}

// Limits are from the canonical Likutay Tefilos book index, not guessed repairs.
export function unverifiedPrayerReferences(topic) {
  return [1, 2].flatMap(part => [...new Set(topic[`part${part}_prayers`] || [])]
    .filter(number => !Number.isInteger(number) || number < 1 || number > (part === 1 ? 152 : 59))
    .map(number => `${part === 1 ? 'I' : 'II'}:${number}`));
}

export function prayerReferences(topic) {
  return [1, 2].flatMap(part => [...new Set(topic[`part${part}_prayers`] || [])]
    .filter(number => Number.isInteger(number) && number > 0 && number <= (part === 1 ? 152 : 59))
    .map(number => ({
      label: `${part === 1 ? 'I' : 'II'}:${number}`,
      href: `/reader/likutay-tefilos/${part}/${number}`,
    })));
}

export function firstPrayerUrl(topic) {
  return prayerReferences(topic)[0]?.href ?? null;
}
