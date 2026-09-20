const FINAL_TO_REGULAR = Object.freeze({ ך: 'כ', ם: 'מ', ן: 'נ', ף: 'פ', ץ: 'צ' });

export function normalizeSearchText(value) {
  return String(value || '').toLowerCase().normalize('NFD')
    .replace(/[\u0591-\u05BD\u05BF\u05C1-\u05C2\u05C4-\u05C5\u05C7\u0300-\u036f]/g, '')
    .replace(/[״"׳']/g, '')
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function regularLetter(value) {
  return FINAL_TO_REGULAR[value] || value;
}

export function minimumMatchCount(requested, groupCount) {
  if (groupCount <= 0) return 0;
  const parsed = Number.parseInt(String(requested || 0), 10);
  return Math.min(groupCount, Math.max(1, Number.isFinite(parsed) ? parsed : 1));
}

export function booleanCandidateClauses(query) {
  // Preserve symbolic operators before normalizing punctuation. This also
  // makes attached negation (`!sorrow`) equivalent to `NOT sorrow`.
  const tokens = String(query || '')
    .replace(/&&/g, ' AND ')
    .replace(/\|\|/g, ' OR ')
    .replace(/!/g, ' NOT ')
    .split(/\s+/)
    .flatMap(token => normalizeSearchText(token).split(' '))
    .filter(Boolean);
  const clauses = [{ include: [], exclude: [] }];
  let negateNext = false;
  for (const token of tokens) {
    if (token === 'or' || token === '||') {
      if (clauses.at(-1).include.length || clauses.at(-1).exclude.length) clauses.push({ include: [], exclude: [] });
      negateNext = false;
      continue;
    }
    if (token === 'and' || token === '&&') continue;
    if (token === 'not' || token === '!') {
      negateNext = true;
      continue;
    }
    (negateNext ? clauses.at(-1).exclude : clauses.at(-1).include).push(token);
    negateNext = false;
  }
  return clauses.filter(clause => clause.include.length || clause.exclude.length);
}

/** Candidate generation with the same OR-of-AND/NOT semantics as booleanMatch. */
export function booleanCandidateIds(postings, query, universe) {
  const ids = new Set();
  for (const clause of booleanCandidateClauses(query)) {
    let candidates;
    if (clause.include.length) {
      const lists = clause.include.map(term => Array.from(postings.get(term) || []));
      if (lists.some(list => !list.length)) continue;
      lists.sort((a, b) => a.length - b.length);
      const otherSets = lists.slice(1).map(list => new Set(list));
      candidates = lists[0].filter(id => otherSets.every(set => set.has(id)));
    } else {
      candidates = Array.from(universe || []);
    }
    const excluded = new Set(clause.exclude.flatMap(term => Array.from(postings.get(term) || [])));
    candidates.forEach(id => { if (!excluded.has(id)) ids.add(id); });
  }
  return Array.from(ids);
}

/** Consume a deterministic bounded candidate page without losing continuation. */
export function candidatePage(ids, cursor = 0, budget = 192) {
  const start = Math.max(0, Number(cursor) || 0);
  const end = Math.min(ids.length, start + Math.max(1, Number(budget) || 1));
  return { ids: ids.slice(start, end), cursor: end, hasMore: end < ids.length };
}

export function booleanMatch(text, query) {
  const tokenSet = new Set(normalizeSearchText(text).split(' ').filter(Boolean));
  const clauses = booleanCandidateClauses(query);
  return clauses.length > 0 && clauses.some(clause =>
    clause.include.every(term => tokenSet.has(term)) &&
    clause.exclude.every(term => !tokenSet.has(term))
  );
}

/** Match variant groups inside a real token window, in either order. */
export function proximityMatch(tokens, groups, maxDistance) {
  if (!groups.length) return false;
  const normalizedTokens = tokens.map(normalizeSearchText);
  const sets = groups.map(group => new Set(group.map(normalizeSearchText).filter(Boolean)));
  if (sets.some(set => set.size === 0)) return false;
  if (sets.length === 1) return normalizedTokens.some(token => sets[0].has(token));

  const hits = [];
  normalizedTokens.forEach((token, position) => {
    sets.forEach((set, group) => {
      if (set.has(token)) hits.push({ position, group });
    });
  });
  const counts = new Array(sets.length).fill(0);
  let covered = 0;
  let left = 0;
  const limit = Math.max(0, Number(maxDistance) || 0);
  for (let right = 0; right < hits.length; right++) {
    if (counts[hits[right].group]++ === 0) covered++;
    while (covered === sets.length) {
      if (hits[right].position - hits[left].position <= limit) return true;
      if (--counts[hits[left].group] === 0) covered--;
      left++;
    }
  }
  return false;
}

// Target letters for acronym/end-letters matching.
// Spaced acronym ("נ נח נחמ נחמן מאומן"): one letter per space-separated
// part — the part count is the letter count, never the character count of
// the concatenated string. Single-token acronym ("רמבם"): every character
// is a letter. The candidate pre-filter and the verifier must agree on this.
export function acronymTargetLetters(letters, useLastLetter = false) {
  const clean = normalizeSearchText(letters);
  const tokens = clean.split(/\s+/).filter(Boolean);
  if (!tokens.length) return [];
  const pick = word => {
    const chars = Array.from(word);
    if (!chars.length) return '';
    const letter = useLastLetter ? chars[chars.length - 1] : chars[0];
    return useLastLetter ? regularLetter(letter) : letter;
  };
  const raw = tokens.length > 1 ? tokens.map(pick) : Array.from(tokens[0]);
  return raw.filter(Boolean);
}

export function acronymMatch(tokens, letters, order = 'consecutive', useLastLetter = false) {
  const cleanTokens = tokens.map(normalizeSearchText).filter(Boolean);
  const target = acronymTargetLetters(letters, useLastLetter);
  if (!target.length || cleanTokens.length < target.length) return { match: false, matchedWords: [] };
  const tokenLetters = cleanTokens.map(word => {
    const chars = Array.from(word);
    const letter = useLastLetter ? chars.at(-1) : chars[0];
    return useLastLetter ? regularLetter(letter) : letter;
  });

  if (order === 'any') {
    const remaining = [...target];
    const matchedWords = [];
    tokenLetters.forEach((letter, index) => {
      const at = remaining.indexOf(letter);
      if (at >= 0) {
        remaining.splice(at, 1);
        matchedWords.push(cleanTokens[index]);
      }
    });
    return remaining.length ? { match: false, matchedWords: [] } : { match: true, matchedWords };
  }

  for (let start = 0; start <= tokenLetters.length - target.length; start++) {
    if (target.every((letter, offset) => tokenLetters[start + offset] === letter)) {
      return { match: true, matchedWords: cleanTokens.slice(start, start + target.length) };
    }
  }
  return { match: false, matchedWords: [] };
}

// Letter-mode (acronym/end-letters) postings carry no relevance signal —
// candidate ids arrive in raw postings order, so with early-stop verification
// the first visible page was whatever the intersection happened to list.
// Ordering candidates by book priority before verification makes the first
// page surface the highest-priority works (Likutay Moharan first); Load more
// continues over the remaining candidates in the same order, so nothing is
// stranded. Ties keep the original postings order (stable sort).
export function orderByBookPriority(ids, priorityOf) {
  return ids
    .map((id, index) => ({ id, index, priority: priorityOf(id) || 0 }))
    .sort((a, b) => (b.priority - a.priority) || (a.index - b.index))
    .map(entry => entry.id);
}

// Raw-text {start, end} of `needle` inside `raw` under search normalization
// (nikud/case/punctuation folded exactly like normalizeSearchText), so a
// normalized match maps back to raw coordinates for match-centered snippets.
function normalizedRangeCore(raw, needle) {
  const target = normalizeSearchText(needle);
  if (!raw || !target) return null;
  let normalized = '';
  const rawOffsets = [];
  let pendingSpace = false;
  for (let offset = 0; offset < raw.length;) {
    const point = raw.codePointAt(offset);
    const char = String.fromCodePoint(point);
    const width = char.length;
    const folded = char.toLowerCase().normalize('NFD')
      .replace(/[\u0591-\u05BD\u05BF\u05C1-\u05C2\u05C4-\u05C5\u05C7\u0300-\u036f״"׳']/g, '');
    for (const foldedChar of folded) {
      if (/^[\p{L}\p{N}]$/u.test(foldedChar)) {
        if (pendingSpace && normalized) {
          normalized += ' ';
          rawOffsets.push(offset);
        }
        pendingSpace = false;
        normalized += foldedChar;
        rawOffsets.push(offset);
      } else {
        pendingSpace = true;
      }
    }
    offset += width;
  }
  const at = normalized.indexOf(target);
  if (at < 0) return null;
  return { start: rawOffsets[at], end: (rawOffsets[at + target.length - 1] ?? raw.length - 1) + 1 };
}

// Smallest raw-text window covering the tightest leading cluster of matched
// words: every word's first occurrence is collected, sorted by position, and
// the window extends in document order only while the next occurrence starts
// within `gap` characters — so any-order matches scattered across the
// document center the snippet instead of swallowing it. Returns {start, end}
// or null when none of the words are found.
export function matchWindowAround(raw, words, gap = 800) {
  if (!raw || !Array.isArray(words) || !words.length) return null;
  const found = [];
  for (const word of new Set(words.map(word => String(word || '')).filter(Boolean))) {
    const range = normalizedRangeCore(raw, word);
    if (range) found.push(range);
  }
  if (!found.length) return null;
  found.sort((a, b) => a.start - b.start);
  const window = { start: found[0].start, end: found[0].end };
  for (const range of found.slice(1)) {
    if (range.start - window.end > gap) break;
    window.end = Math.max(window.end, range.end);
  }
  return window;
}
