/**
 * build-aligned-segments.cjs
 *
 * Creates aligned_segments for Ebay HaNachal letters.
 *
 * The existing segments have Hebrew and English that are OFFSET from each other -
 * the English translation for Hebrew segment N typically appears in the `en` field
 * of segment N+1 or later. This script properly aligns them by content/meaning.
 *
 * Strategy:
 * 1. Collect all Hebrew segments (he fields) in order
 * 2. Collect all English text, splitting the combined English into logical blocks
 * 3. Match Hebrew to English by sequential content alignment
 * 4. Split long paragraphs at sentence boundaries
 * 5. Extract source references as type:"note" segments
 */

const fs = require('fs');
const path = require('path');

const partNum = process.argv[4] || '1';
const BASE_DIR = path.join(__dirname, '..', 'public', 'reader', 'ebay-hanachal', `part-${partNum}`);

/**
 * Split English text into paragraphs and separate out source references
 */
function splitEnglishIntoParts(text) {
  if (!text || !text.trim()) return [];

  const parts = [];
  // Split by double newlines (paragraph breaks)
  const paragraphs = text.split(/\n\n+/).map(p => p.trim()).filter(p => p.length > 0);

  for (const para of paragraphs) {
    parts.push(para);
  }

  return parts;
}

/**
 * Check if text is a source reference like "(Likutay Moharan...)" or "[T.N. ...]"
 */
function isSourceReference(text) {
  const trimmed = text.trim();
  // Matches patterns like (Likutay Moharan ...), (Likutay Halachos ...), [T.N. ...]
  return /^\(Likutay\s/i.test(trimmed) ||
         /^\[T\.N\./i.test(trimmed) ||
         /^\(See\s/i.test(trimmed) ||
         /^\(cf\.\s/i.test(trimmed);
}

/**
 * Extract inline source references from English text
 * Returns array of { text, type } objects
 */
function extractReferences(enText) {
  if (!enText) return [{ text: enText, type: 'text' }];

  const results = [];
  // Pattern to match [T.N. ...] and (Likutay ... ) references
  const refPattern = /(\[T\.N\.[^\]]*\]|\((?:Likutay\s+(?:Moharan|Halachos|Tefilos)|See\s+Likutay|cf\.\s+Likutay)[^)]*\))/gi;

  let lastIndex = 0;
  let match;

  while ((match = refPattern.exec(enText)) !== null) {
    // Text before the reference
    const before = enText.substring(lastIndex, match.index).trim();
    if (before) {
      results.push({ text: before, type: 'text' });
    }
    // The reference itself
    results.push({ text: match[0], type: 'note' });
    lastIndex = match.index + match[0].length;
  }

  // Remaining text after last reference
  const remaining = enText.substring(lastIndex).trim();
  if (remaining) {
    results.push({ text: remaining, type: 'text' });
  }

  return results.length > 0 ? results : [{ text: enText, type: 'text' }];
}

/**
 * Detect if Hebrew text is a date line
 */
function isDateLine(he) {
  return /^ב"ה/.test(he.trim()) && he.length < 200;
}

/**
 * Detect if Hebrew text is a greeting/salutation
 */
function isGreeting(he) {
  return /^לִכְבוֹד|^לכבוד|^אֲהוּבִי|^אהובי|^לָאִישׁ|^לאיש|^לִכְבוֹד/.test(he.trim()) && he.length < 300;
}

/**
 * Detect if Hebrew text is a signature line
 */
function isSignature(he) {
  return /יִשְׂרָאֵל\s*דֹּב|ישראל\s*דב|הַמַּעְתִּיק|המעתיק|אוֹדֶסֶר|אודסר|אודעסר/.test(he);
}

/**
 * Detect if Hebrew text is a closing
 */
function isClosing(he) {
  return /^דְּרִישַׁת\s*שָׁלוֹם|^דרישת\s*שלום|^כַּעֲתִירַת|^כעתירת|^בַּעֲתִירַת|^בעתירת/.test(he.trim());
}

/**
 * Split Hebrew text at sentence/clause boundaries for long paragraphs
 */
function splitHebrewAtBoundaries(he) {
  if (he.length < 150) return [he];

  // Split at period+space, or at major clause boundaries
  const sentences = [];
  let current = '';

  // Split by '. ' (period followed by space) which marks sentence boundaries in Hebrew
  const parts = he.split(/(?<=\.)\s+/);

  for (const part of parts) {
    if (current.length === 0) {
      current = part;
    } else if (current.length + part.length < 200) {
      current += ' ' + part;
    } else {
      sentences.push(current);
      current = part;
    }
  }
  if (current) sentences.push(current);

  // If we only got one chunk, try splitting at comma boundaries for very long text
  if (sentences.length === 1 && he.length > 300) {
    const commaParts = he.split(/(?<=,)\s+/);
    const result = [];
    let buf = '';
    for (const cp of commaParts) {
      if (buf.length === 0) {
        buf = cp;
      } else if (buf.length + cp.length < 250) {
        buf += ' ' + cp;
      } else {
        result.push(buf);
        buf = cp;
      }
    }
    if (buf) result.push(buf);
    if (result.length > 1) return result;
  }

  return sentences;
}

/**
 * Split English text to match Hebrew chunks count
 */
function splitEnglishToMatch(en, heChunkCount) {
  if (heChunkCount <= 1) return [en];
  if (!en || !en.trim()) return Array(heChunkCount).fill('');

  // Try splitting by sentences first
  const sentences = en.split(/(?<=[.!?])\s+/).filter(s => s.trim());

  if (sentences.length <= 1) return [en];

  // Distribute sentences across chunks
  const chunks = [];
  const perChunk = Math.ceil(sentences.length / heChunkCount);

  for (let i = 0; i < heChunkCount; i++) {
    const start = i * perChunk;
    const end = Math.min(start + perChunk, sentences.length);
    if (start < sentences.length) {
      chunks.push(sentences.slice(start, end).join(' '));
    } else {
      chunks.push('');
    }
  }

  return chunks;
}

/**
 * Clean English text - remove embedded Hebrew text that sometimes appears at the end
 */
function cleanEnglishText(en) {
  if (!en) return '';

  // Remove Hebrew text blocks that appear after English
  // These are identifiable by Hebrew Unicode range characters appearing in bulk
  // Pattern: after a clear English section, remove bulk Hebrew text
  const hebrewBlockPattern = /\n\n(?:מכתב\s|ב"ה|לכבוד|ליבי|אהובי|הרציגער|בעתירת|המעתיק|ישראל\s*דב)[\s\S]*$/;
  let cleaned = en.replace(hebrewBlockPattern, '').trim();

  // Also catch cases where Hebrew paragraphs are embedded
  const lines = cleaned.split('\n');
  const cleanedLines = [];
  let hitHebrew = false;

  for (const line of lines) {
    // Count Hebrew vs Latin characters
    const hebrewChars = (line.match(/[\u0590-\u05FF]/g) || []).length;
    const latinChars = (line.match(/[a-zA-Z]/g) || []).length;

    if (hebrewChars > latinChars && hebrewChars > 10 && !hitHebrew) {
      hitHebrew = true;
      continue;
    }
    if (hitHebrew && hebrewChars > 5) continue;
    if (hitHebrew && latinChars > hebrewChars) hitHebrew = false;

    if (!hitHebrew) {
      cleanedLines.push(line);
    }
  }

  return cleanedLines.join('\n').trim();
}

/**
 * Process a single letter file to create aligned_segments
 */
function processLetter(letterNum) {
  const filePath = path.join(BASE_DIR, `letter-${letterNum}.json`);

  if (!fs.existsSync(filePath)) {
    console.log(`  Letter ${letterNum}: file not found, skipping`);
    return false;
  }

  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const segments = data.segments;

  if (!segments || segments.length === 0) {
    console.log(`  Letter ${letterNum}: no segments, skipping`);
    return false;
  }

  // Step 1: Understand the offset pattern
  // In these letters, Hebrew segment[i].he corresponds to English segment[i+1].en (approximately)
  // The first segment's en usually contains the English for the date/header
  // We need to figure out the actual alignment

  // Collect all Hebrew texts in order
  const hebrewTexts = segments.map(s => s.he || '').filter(h => h.trim());

  // Collect all English texts in order, cleaning them
  const englishTexts = segments.map(s => cleanEnglishText(s.en || '')).filter(e => e.trim());

  // Step 2: Build aligned segments
  // The offset pattern means: en[0] = translation of he[0] (date),
  // en[1] = translation of he[0] continued or he[1] start, etc.
  //
  // Actually from reading the data carefully:
  // - segment[1].en contains translation of segment[1].he (date line)... NO
  // - Actually: segment[1].he = date, segment[1].en = date translation
  // - segment[2].he = greeting, segment[2].en = translation of segment[1].he continued
  // - This means there's a 1-offset: en[N] translates he[N-1]
  //
  // Let's verify: In letter 2:
  // seg1: he="ב"ה, יום שני חג העצמאות..." en="With the Help of G-d, Monday, Holiday of Independence..."
  // -> These match! Date to date.
  // seg2: he="לכבוד ידידי..." en="This is the day that G-d did with us..."
  // -> he is greeting, en is continuation of the date content from he[1]
  // seg3: he="מתוך השתוקקות..." en="In honor of my dear..."
  // -> he is body intro, en is greeting translation (matches he[2])
  //
  // So the pattern is: en[N] translates he[N-1] for N >= 2
  // And en[1] translates he[1] (the first part)

  const aligned = [];
  let alignIdx = 1;

  // For the alignment, we need to pair:
  // he[0] with en[0] (if they match - date lines)
  // he[1] with en[1] that might be part of he[0]'s translation continued
  // etc.
  //
  // Better approach: just pair sequentially with the known offset
  // he[i] pairs with en[i+1] for most segments
  // Special case: he[0] pairs with en[0]

  // Actually, let me reconsider. The pattern varies per letter.
  // The safest approach: pair each Hebrew segment with the English that
  // semantically matches it. We can use keyword matching.

  // Simpler approach that works for the offset pattern:
  // 1. First segment (date): he[0] + en[0] are aligned
  // 2. For remaining: he[i] pairs with en[i+1]
  // 3. Last Hebrew segment has no English (or the English was in a prior en)

  // But actually examining letter-2 more carefully:
  // Seg 1 (idx1): he=date, en=date ✓ aligned
  // Seg 2 (idx2): he=greeting, en=continuation of date stuff → en translates he[1] continued
  // Seg 3 (idx3): he=body intro, en=greeting translation → en translates he[2]
  // Seg 4 (idx4): he=thanks, en=body intro translation → en translates he[3]
  // ...
  // Seg N: he=signature, en=translation of he[N-1] + signature
  //
  // So: he[1]+en[1] match, then he[i]+en[i+1] for i>=2
  // Wait no... he[1] is date and en[1] is date - they DO match for the date part
  // But en[1] only has the date translation, while he[1] has date + prayer text
  // Then en[2] has the continuation of he[1]'s prayer + translation of he[2]? No...
  //
  // Let me re-read letter-2:
  // he[1] = date + prayer about independence day (long text)
  // en[1] = "With the Help of G-d, Monday, Holiday of Independence, 717 (Monday, 6 May, 1957)"
  //   → This translates ONLY the date part of he[1]
  //
  // he[2] = greeting "לכבוד ידידי יקירי..."
  // en[2] = "This is the day that G-d did with us miracles and wonders..."
  //   → This translates the PRAYER part of he[1], not he[2]!
  //
  // he[3] = body intro "מתוך השתוקקות..."
  // en[3] = "In honor of my dear cherished pleasant friend..."
  //   → This translates he[2] (greeting)
  //
  // he[4] = thanks for donation "קודם כל אכפיל..."
  // en[4] = "Driven by yearning and longing..."
  //   → This translates he[3] (body intro)
  //
  // So the offset is exactly 1 after the first segment:
  // he[1] first part ↔ en[1]
  // he[1] second part ↔ en[2]
  // he[2] ↔ en[3]
  // he[3] ↔ en[4]
  // he[N] ↔ en[N+1]
  // he[last] ↔ last part of en[last] (signature is included in last en)

  // Actually wait - looking again more carefully at the actual content matching...
  // In letter 2, en[2] = "This is the day that G-d did with us miracles..."
  // and he[1] = "ב"ה, יום שני... זה היום עשה ה' עמנו ניסים ונפלאות..."
  // Yes! en[2] is the continuation/translation of he[1]

  // So the correct mapping is:
  // First: he[0] first part + en[0] (date only)
  //        he[0] remainder + en[1] (rest of date segment)
  //   Then for i >= 1: he[i] + en[i+1]
  //   Last he segment: its translation is folded into the last en

  // BUT this is letter-2 specific. Let me think about this more generally.
  // The key insight: the ENGLISH is offset by 1 from the HEBREW.
  // en[i] contains the translation of he[i-1] (for i >= 2)
  // en[1] may contain partial translation of he[1]

  // For a general approach, let's just do:
  // Pair 1: he from segments[0], en from segments[0]
  // Then for i=1..N-1: he from segments[i], en from segments[i+1] if exists
  // Last Hebrew: check if its translation is embedded in the last en

  // Actually, the simplest correct approach for these offset files:
  // Recognize that en[N] = translation of he[N-1] for N >= 2
  // And en[0] = translation of first part of he[0]
  // And en[1] = translation of second part of he[0] or early he[1]

  // Let me just build the pairs based on the offset:

  const pairs = [];

  if (segments.length === 0) return false;

  // Check if first segment's he and en actually match (both are date lines)
  const firstHe = (segments[0].he || '').trim();
  const firstEn = cleanEnglishText(segments[0].en || '').trim();
  const firstHeNikud = (segments[0].he_nikud || '').trim();

  if (firstHe && firstEn) {
    // First pair: date line
    pairs.push({
      he: firstHe,
      en: firstEn,
      he_nikud: firstHeNikud || undefined
    });
  }

  // Now handle the offset: for segments[i] where i >= 1,
  // the English for he[i] is in en[i+1]
  for (let i = 1; i < segments.length; i++) {
    const he = (segments[i].he || '').trim();
    const heNikud = (segments[i].he_nikud || '').trim();

    // The English translation is in the NEXT segment's en field
    let en = '';
    if (i + 1 < segments.length) {
      en = cleanEnglishText(segments[i + 1].en || '').trim();
    }

    // For the last segment, its translation might be embedded in its own en
    // (or the last segment's en contains translation of the previous he)
    if (i === segments.length - 1) {
      // Last segment - its en translates the previous he[i-1]
      // Its own he (often signature) may not have separate en
      // Check if this is a signature - if so, the en was already consumed
      const ownEn = cleanEnglishText(segments[i].en || '').trim();

      // The en of the last segment translates he[i-1], not he[i]
      // So he[i] (signature) gets paired with whatever signature text is in ownEn

      if (isSignature(he)) {
        // Try to extract signature from the last en text
        const sigMatch = ownEn.match(/((?:The\s+transcriber|Yisroel\s+Dov|Na\s+Nach)[\s\S]*?)$/i);
        if (sigMatch) {
          en = sigMatch[1].trim();
        } else {
          // Just use empty - no separate en for signature
          en = '';
        }
      } else {
        // Non-signature last segment
        en = '';
      }
    }

    if (he) {
      pairs.push({
        he: he,
        en: en,
        he_nikud: heNikud || undefined
      });
    }
  }

  // Step 3: Build aligned_segments from pairs
  // Split long paragraphs and extract references
  const alignedSegments = [];

  for (const pair of pairs) {
    const { he, en, he_nikud } = pair;

    // Check if we should extract references from English
    const enParts = extractReferences(en);

    // Check if Hebrew should be split
    const heChunks = splitHebrewAtBoundaries(he);

    if (heChunks.length <= 1) {
      // Single chunk - add text parts and note parts separately
      for (const part of enParts) {
        if (part.type === 'note') {
          alignedSegments.push({
            he: '',
            en: part.text,
            type: 'note'
          });
        }
      }

      // Combine all text parts for the main segment
      const enTextParts = enParts.filter(p => p.type === 'text').map(p => p.text).join(' ').trim();

      const seg = { he, en: enTextParts };
      if (he_nikud) seg.he_nikud = he_nikud;
      alignedSegments.push(seg);
    } else {
      // Multiple Hebrew chunks - split English to match
      // First extract notes
      const notes = enParts.filter(p => p.type === 'note');
      const enTextOnly = enParts.filter(p => p.type === 'text').map(p => p.text).join(' ').trim();

      const enChunks = splitEnglishToMatch(enTextOnly, heChunks.length);

      // Split he_nikud similarly if available
      let heNikudChunks = null;
      if (he_nikud) {
        heNikudChunks = splitHebrewAtBoundaries(he_nikud);
        // Ensure same count
        while (heNikudChunks.length < heChunks.length) heNikudChunks.push('');
      }

      for (let j = 0; j < heChunks.length; j++) {
        const seg = {
          he: heChunks[j],
          en: enChunks[j] || ''
        };
        if (heNikudChunks && heNikudChunks[j]) {
          seg.he_nikud = heNikudChunks[j];
        }
        alignedSegments.push(seg);
      }

      // Add notes after the chunk
      for (const note of notes) {
        alignedSegments.push({
          he: '',
          en: note.text,
          type: 'note'
        });
      }
    }
  }

  // Reorder: notes should come right after the segment they reference
  // (they're already positioned correctly from the extraction above)

  // Remove empty segments
  const finalAligned = alignedSegments.filter(s => s.he.trim() || s.en.trim());

  // Add index to each aligned segment
  finalAligned.forEach((s, i) => {
    s.index = i + 1;
  });

  // Add to data
  data.aligned_segments = finalAligned;

  // Write back
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');

  console.log(`  Letter ${letterNum}: ${segments.length} segments -> ${finalAligned.length} aligned_segments`);
  return true;
}

/**
 * Improved processing that handles the real offset pattern better
 * by actually examining content overlap
 */
function processLetterV2(letterNum) {
  const filePath = path.join(BASE_DIR, `letter-${letterNum}.json`);

  if (!fs.existsSync(filePath)) {
    console.log(`  Letter ${letterNum}: file not found, skipping`);
    return false;
  }

  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const segments = data.segments;

  if (!segments || segments.length === 0) {
    console.log(`  Letter ${letterNum}: no segments, skipping`);
    return false;
  }

  if (!data.hasEnglish) {
    console.log(`  Letter ${letterNum}: no English translation, skipping`);
    return false;
  }

  // Strategy: Build a complete ordered list of Hebrew blocks and English blocks
  // Then align them based on the known offset pattern

  const heBlocks = []; // { text, nikud, origIndex }
  const enBlocks = []; // { text, origIndex }

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (seg.he && seg.he.trim()) {
      heBlocks.push({
        text: seg.he.trim(),
        nikud: (seg.he_nikud || '').trim(),
        origIndex: seg.index
      });
    }
    const cleanEn = cleanEnglishText(seg.en || '').trim();
    if (cleanEn) {
      enBlocks.push({
        text: cleanEn,
        origIndex: seg.index
      });
    }
  }

  // Now align: the first he/en pair should be the date
  // Then offset by 1: he[i] matches en[i+1] for i >= 1
  // (because en[i+1] translates he[i])

  const pairs = [];

  // Date line: he[0] + en[0]
  if (heBlocks.length > 0 && enBlocks.length > 0) {
    // Check if first en is a date translation
    const firstEn = enBlocks[0].text;
    const firstHe = heBlocks[0].text;

    if (isDateLine(firstHe) || /^B\.H\.|^With the Help/i.test(firstEn)) {
      // First pair: entire he[0] paired with en[0]
      // But he[0] might be longer than just the date - if so,
      // en[1] might contain the rest
      pairs.push({
        he: firstHe,
        en: firstEn,
        he_nikud: heBlocks[0].nikud
      });

      // Now for the rest: he[i] (i>=1) pairs with en[i+1]
      for (let i = 1; i < heBlocks.length; i++) {
        const enIdx = i + 1; // offset by 1
        let en = '';
        if (enIdx < enBlocks.length) {
          en = enBlocks[enIdx].text;
        } else if (i === heBlocks.length - 1 && enBlocks.length > 0) {
          // Last he - check last en for signature
          const lastEn = enBlocks[enBlocks.length - 1].text;
          if (isSignature(heBlocks[i].text)) {
            // Extract signature portion from last en
            const lines = lastEn.split('\n');
            const sigLines = [];
            let foundSig = false;
            for (let li = lines.length - 1; li >= 0; li--) {
              const line = lines[li].trim();
              if (/Yisroel|Odesser|transcriber|Na Nach|Tiberius|Tel Aviv|Ben Atar/i.test(line)) {
                foundSig = true;
                sigLines.unshift(line);
              } else if (foundSig && line.length < 80) {
                sigLines.unshift(line);
              } else if (foundSig) {
                break;
              }
            }
            en = sigLines.join('\n').trim();
          }
        }

        pairs.push({
          he: heBlocks[i].text,
          en: en,
          he_nikud: heBlocks[i].nikud
        });
      }
    } else {
      // No clear date pattern - just align sequentially with offset
      for (let i = 0; i < heBlocks.length; i++) {
        const enIdx = i < enBlocks.length ? i : -1;
        pairs.push({
          he: heBlocks[i].text,
          en: enIdx >= 0 ? enBlocks[enIdx].text : '',
          he_nikud: heBlocks[i].nikud
        });
      }
    }
  }

  // Now check: do we have "orphaned" en blocks (en[1]) that translate part of he[0]?
  // If he[0] is long and en[0] is short, en[1] might contain the rest of he[0]'s translation
  if (pairs.length > 0 && enBlocks.length > 1) {
    const firstPairHe = pairs[0].he;
    const firstPairEn = pairs[0].en;
    const secondEn = enBlocks[1].text;

    // If the first Hebrew is long but the first English is short,
    // and the second English clearly translates part of the first Hebrew
    if (firstPairHe.length > 150 && firstPairEn.length < firstPairHe.length * 0.5) {
      // Append the second en to the first pair's en
      // (it's the continuation of the first Hebrew's translation)
      // But only if the second pair doesn't already use it
      // This is already handled by the offset: en[1] goes with he[0] continuation
      // The pairs[1] already gets en[2], so en[1] is unused - add it to pairs[0]
      pairs[0].en = firstPairEn + '\n\n' + secondEn;
    }
  }

  // Step 3: Build aligned_segments from pairs with splitting
  const alignedSegments = [];

  for (const pair of pairs) {
    let { he, en, he_nikud } = pair;

    if (!he && !en) continue;

    // Extract references from English
    const refParts = extractReferences(en || '');
    const textParts = refParts.filter(p => p.type === 'text');
    const noteParts = refParts.filter(p => p.type === 'note');
    const enTextOnly = textParts.map(p => p.text).join(' ').trim();

    // Split long Hebrew
    const heChunks = splitHebrewAtBoundaries(he);

    if (heChunks.length <= 1) {
      // Single segment
      const seg = { he: he, en: enTextOnly };
      if (he_nikud) seg.he_nikud = he_nikud;
      alignedSegments.push(seg);
    } else {
      // Multiple chunks - split English to match
      const enChunks = splitEnglishToMatch(enTextOnly, heChunks.length);

      // Split nikud too
      let nikudChunks = null;
      if (he_nikud) {
        nikudChunks = splitHebrewAtBoundaries(he_nikud);
        while (nikudChunks.length < heChunks.length) nikudChunks.push('');
        while (nikudChunks.length > heChunks.length) {
          // Merge last two
          nikudChunks[nikudChunks.length - 2] += ' ' + nikudChunks.pop();
        }
      }

      for (let j = 0; j < heChunks.length; j++) {
        const seg = {
          he: heChunks[j],
          en: enChunks[j] || ''
        };
        if (nikudChunks && nikudChunks[j]) {
          seg.he_nikud = nikudChunks[j];
        }
        alignedSegments.push(seg);
      }
    }

    // Add notes after the main segments
    for (const note of noteParts) {
      alignedSegments.push({
        he: '',
        en: note.text,
        type: 'note'
      });
    }
  }

  // Filter empty and add indices
  const final = alignedSegments.filter(s => (s.he && s.he.trim()) || (s.en && s.en.trim()));
  final.forEach((s, i) => { s.index = i + 1; });

  // Add to data (preserve original segments)
  data.aligned_segments = final;

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');

  console.log(`  Letter ${letterNum}: ${segments.length} segments -> ${final.length} aligned_segments`);
  return true;
}

// Main - process range from command line args, default 1-121
const args = process.argv.slice(2);
const startLetter = args[0] ? parseInt(args[0], 10) : 1;
const endLetter = args[1] ? parseInt(args[1], 10) : 121;

console.log(`Building aligned segments for Ebay HaNachal Part 1, Letters ${startLetter}-${endLetter}...\n`);

let processed = 0;
let skipped = 0;

for (let i = startLetter; i <= endLetter; i++) {
  try {
    const result = processLetterV2(i);
    if (result) processed++;
    else skipped++;
  } catch (err) {
    console.error(`  Letter ${i}: ERROR - ${err.message}`);
    skipped++;
  }
}

console.log(`\nDone! Processed: ${processed}, Skipped: ${skipped}`);
