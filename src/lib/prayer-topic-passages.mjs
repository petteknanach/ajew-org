import { createHash } from 'node:crypto';

// Reviewed topic-to-original-Hebrew paragraph mappings only.
// This registry does not approve English or alternate pointing fields.
export const reviewedPrayerPassages = Object.freeze(
  [
  {
    "topic": "אֱמוּנָה",
    "href": "/reader/likutay-tefilos/1/7",
    "part": 1,
    "prayer": 7,
    "index": 1,
    "heSha256": "29c11d5f5df286021ec30028b9afc8ddda276f37fb0d05f608c434ab4ef1446d"
  },
  {
    "topic": "שִׂמְחָה",
    "href": "/reader/likutay-tefilos/1/10",
    "part": 1,
    "prayer": 10,
    "index": 6,
    "heSha256": "3fdc278c9882f347ea1a0a85f4507d20d253927d96075a5f8cfab04f160c9d9e"
  },
  {
    "topic": "רְפוּאָה",
    "href": "/reader/likutay-tefilos/1/14",
    "part": 1,
    "prayer": 14,
    "index": 11,
    "heSha256": "87ff864cfdafeb0e97ac7bb35117095b6cb8b3ce2caed3464c38286acb5ce428"
  },
  {
    "topic": "בָּנִים",
    "href": "/reader/likutay-tefilos/1/14",
    "part": 1,
    "prayer": 14,
    "index": 9,
    "heSha256": "aa9397b49de6b46c39312475addf8ed063f55bb9b828e353411646c8e8774413"
  },
  {
    "topic": "מָמוֹן וּפַרְנָסָה",
    "href": "/reader/likutay-tefilos/1/4",
    "part": 1,
    "prayer": 4,
    "index": 8,
    "heSha256": "5ad2ca5510ea2dcc8a598e93e7d788ae63630455dc14c2d975d56bb4cd23cd4e"
  },
  {
    "topic": "תְשׁוּבָה",
    "href": "/reader/likutay-tefilos/1/6",
    "part": 1,
    "prayer": 6,
    "index": 2,
    "heSha256": "1448e8c138922b613a6d3a4db779c8c06dee65e12757ae82a5bfed4655664de8"
  },
  {
    "topic": "תְּפִלָה",
    "href": "/reader/likutay-tefilos/1/1",
    "part": 1,
    "prayer": 1,
    "index": 6,
    "heSha256": "1ad5a43f7ade57bc5416291f2d5ec35cd85e2dc5871e7252b5fac4926f0344d1"
  },
  {
    "topic": "אֱמֶת",
    "href": "/reader/likutay-tefilos/1/7",
    "part": 1,
    "prayer": 7,
    "index": 4,
    "heSha256": "1d8f85e63262de68b9c1494047765bc197d695e4df4d412da52b5fe770cae70c"
  },
  {
    "topic": "שָׁלוֹם",
    "href": "/reader/likutay-tefilos/1/14",
    "part": 1,
    "prayer": 14,
    "index": 13,
    "heSha256": "7649f1e90afc2b64ba390893b2d0788fed7efccbb99cbae7a93170b5c00fa439"
  },
  {
    "topic": "אֶרֶץ־יִשְׂרָאֵל",
    "href": "/reader/likutay-tefilos/1/7",
    "part": 1,
    "prayer": 7,
    "index": 4,
    "heSha256": "1d8f85e63262de68b9c1494047765bc197d695e4df4d412da52b5fe770cae70c"
  },
  {
    "topic": "יִרְאָה",
    "href": "/reader/likutay-tefilos/1/5",
    "part": 1,
    "prayer": 5,
    "index": 7,
    "heSha256": "7c0c12114c0692963e972a0189768e0075efb1e40743840bc422724dceadb12e"
  },
  {
    "topic": "שַׁבָּת",
    "href": "/reader/likutay-tefilos/2/13",
    "part": 2,
    "prayer": 13,
    "index": 2,
    "heSha256": "b2e03358f290c095dc569a25ae0a31b9e16ceec64ebe8effdf907d9ce5b628b0"
  }
].map((target) => Object.freeze(target)),
);

export function createPrayerTopicHrefResolver(readPrayer) {
  const sourceCache = new Map();
  return function prayerTopicHref(topicName, href) {
    const target = reviewedPrayerPassages.find(
      (entry) => entry.topic === topicName && entry.href === href,
    );
    if (!target) return href;
    const key = `${target.part}/${target.prayer}`;
    if (!sourceCache.has(key)) {
      let snapshot = null;
      try {
        const doc = readPrayer(target.part, target.prayer);
        if (doc?.book === 'likutay-tefilos' && doc.part === target.part &&
            doc.torah === target.prayer && Array.isArray(doc.segments)) {
          snapshot = Object.freeze(doc.segments.map((segment) => Object.freeze({
            index: segment?.index,
            he: typeof segment?.he === 'string' ? segment.he : null,
          })));
        }
      } catch {
        // Keep the existing page-level reference on unavailable source.
      }
      sourceCache.set(key, snapshot);
    }
    const segments = sourceCache.get(key);
    if (!segments) return href;
    const matches = segments.filter((segment) =>
      Number.isInteger(segment.index) && segment.index === target.index);
    if (matches.length !== 1 || typeof matches[0].he !== 'string') return href;
    const digest = createHash('sha256').update(matches[0].he, 'utf8').digest('hex');
    return digest === target.heSha256 ? `${href}#seg-${target.index}` : href;
  };
}
