const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

// Read the HTML file
const htmlPath = 'C:/Users/Pettek/Downloads/Koachvay Or/090 koachvay_or_diburim_mimoharanas.html';
const jsonPath = 'C:/Users/Pettek/.openclaw/workspace/ajew-org/public/reader/kokhvei-or/section-4.json';
const indexPath = 'C:/Users/Pettek/.openclaw/workspace/ajew-org/public/reader/kokhvei-or/index.json';

const html = fs.readFileSync(htmlPath, 'utf-8');
const json = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

const $ = cheerio.load(html);

// Extract English text from the HTML
// Structure: intro-block + entries with entry-num headers

// Get intro text
const introText = $('.intro-block p').text().trim();

// Get each entry's full English text (combining all p, transcriber, yid elements)
const entries = [];
$('.entry').each((i, el) => {
  const entryEl = $(el);
  const entryNum = entryEl.find('.entry-num').text().trim();

  // Collect all text parts in order
  const parts = [];
  entryEl.children().each((j, child) => {
    const tag = $(child);
    const cls = tag.attr('class') || '';

    if (cls === 'entry-num') return; // skip the header

    if (cls === 'transcriber') {
      parts.push(tag.text().trim());
    } else if (cls === 'yid') {
      parts.push(tag.text().trim());
    } else if (child.tagName === 'p') {
      parts.push(tag.text().trim());
    }
  });

  entries.push({
    num: i + 1,
    header: entryNum,
    text: parts.join('\n\n')
  });
});

console.log(`Found ${entries.length} entries in HTML`);
console.log(`Found ${json.segments.length} segments in JSON`);

// Map entries to segment ranges based on Hebrew text analysis
// The intro block maps to segments 1-2
// Then each entry maps to consecutive segments

// Build the mapping by examining the Hebrew text to find entry boundaries
// Entry boundaries are identified by matching key Hebrew words from each entry's start

const segmentMapping = [
  // intro (segments 1-2)
  { type: 'intro', segments: [1, 2] },
  // §1 - starts with אָמַר פַּעַם אַחַת לִבְנוֹ (seg 3), continues to seg 4
  { entry: 0, segments: [3, 4] },
  // §2 - starts with עַל אוֹדוֹת אֲסֵפָתֵנוּ (seg 5), continues to seg 6
  { entry: 1, segments: [5, 6] },
  // §3 - starts with עוֹד אָמַר פַּעַם אַחַת (seg 7), continues to seg 8
  { entry: 2, segments: [7, 8] },
  // §4 - starts with שָׁמַעְתִּי מֵר' נַחְמָן (seg 9), continues through seg 13
  { entry: 3, segments: [9, 10, 11, 12, 13] },
  // §5 - starts with אָמַר פַּעַם אַחַת בְּזֶה הַלָּשׁוֹן (seg 14), continues to seg 15
  { entry: 4, segments: [14, 15] },
  // §6 - starts with פַּעַם אַחַת עָמַד לְפָנָיו ר' נַחְמָן (seg 16), continues to seg 17
  { entry: 5, segments: [16, 17] },
  // §7 - starts with ר' שִׂמְחָה חֲתַן (seg 18), continues to seg 19
  { entry: 6, segments: [18, 19] },
  // §8 - starts with שָׁמַעְתִּי מֵאֶחָד מֵאַנְשֵׁי (seg 20), continues to seg 21
  { entry: 7, segments: [20, 21] },
  // §9 - starts with דִּבֵּר פַּעַם אַחַת מֵהַדֶּרֶךְ (seg 22), continues to seg 23
  { entry: 8, segments: [22, 23] },
  // §10 - starts with סִפֵּר שֶׁהַבַּעַל שֵׁם (seg 24), continues through seg 28
  { entry: 9, segments: [24, 25, 26, 27, 28] },
  // §11 - starts with בְּעִנְיַן לִמּוּד שֻׁלְחָן (seg 29), continues to seg 30
  { entry: 10, segments: [29, 30] },
  // §12 - starts with דִּבֵּר פַּעַם אַחַת מִמַּה שֶּׁאִיתָא (seg 31), continues to seg 32
  { entry: 11, segments: [31, 32] },
  // §13 - starts with בְּעֵת שֶׁשָּׁלַח (seg 33), continues to seg 34
  { entry: 12, segments: [33, 34] },
  // §14 - starts with דִּבֵּר פַּעַם אַחַת מֵהַחַבְרַיָּא (seg 35), continues to seg 36
  { entry: 13, segments: [35, 36] },
  // §15 - starts with יֵשׁ לִי לְלַמֵּד זְכוּת (seg 37), continues to seg 38
  { entry: 14, segments: [37, 38] },
  // §16 - starts with אָמַר, הַיֵּצֶר הָרָע (seg 39), continues to seg 40
  { entry: 15, segments: [39, 40] },
  // §17 - starts with דִּבְּרוּ לְפָנָיו פַּעַם (seg 41), continues to seg 42
  { entry: 16, segments: [41, 42] },
  // §18 - starts with פַּעַם אַחַת בָּא אֵלָיו (seg 43), continues to seg 44
  { entry: 17, segments: [43, 44] },
  // §19 - starts with עוֹד דִּבֵּר פַּעַם אַחַת (seg 45), continues to seg 46
  { entry: 18, segments: [45, 46] },
  // §20 - starts with פַּעַם אַחַת דִּבֵּר עִם אֵיזֶה (seg 47), continues to seg 48
  { entry: 19, segments: [47, 48] },
  // §21 - starts with אָמַר: שֶׁכַּמָּה גְּדוֹלִים (seg 49), continues to seg 50
  { entry: 20, segments: [49, 50] },
  // §22 - starts with אָמַר: מַה שֶּׁהַשֵּׁם (seg 51), continues to seg 52
  { entry: 21, segments: [51, 52] },
  // §23 - starts with וְסִפֵּר, שֶׁפַּעַם אַחַת בְּלֵיל (seg 53), continues to seg 54
  { entry: 22, segments: [53, 54] },
  // §24 - starts with אָמַר שֶׁעַכְשָׁו (seg 55), continues through seg 61
  { entry: 23, segments: [55, 56, 57, 58, 59, 60, 61] },
  // §25 - starts with אָמַר, אֲמִירַת סִפְרֵי (seg 62), continues to seg 63
  { entry: 24, segments: [62, 63] },
  // §26 - starts with עוֹד אָמַר שֶׁגַּם (seg 64), continues to seg 65
  { entry: 25, segments: [64, 65] },
  // §27 - starts with שָׁמַעְתִּי מֵר' אַהֲרֹן (seg 66), continues to seg 67
  { entry: 26, segments: [66, 67] },
  // §28 - starts with אָמַר הַמַּעְתִּיק (seg 68), continues through seg 70
  { entry: 27, segments: [68, 69, 70] },
  // §29 - starts with דִּבֵּר פַּעַם אַחַת מִתַּבְעֵרַת (seg 71), continues to seg 72
  { entry: 28, segments: [71, 72] },
  // §30 - starts with עוֹד פַּעַם אַחַת דִּבֵּר (seg 73), continues to seg 74
  { entry: 29, segments: [73, 74] },
  // §31 - starts with פַּעַם אַחַת עָמַד לְפָנָיו צְבִי (seg 75), continues through seg 79
  { entry: 30, segments: [75, 76, 77, 78, 79] },
  // §32 - starts with פַּעַם אַחַת בְּעֶרֶב רֹאשׁ (seg 80), continues to seg 81
  { entry: 31, segments: [80, 81] },
  // §33 - starts with גַּם בְּכָל עֲשֶׂרֶת (seg 82), continues to seg 83
  { entry: 32, segments: [82, 83] },
  // §34 - starts with לְעִנְיַן הָאֱמוּנָה (seg 84), continues to seg 85
  { entry: 33, segments: [84, 85] },
  // §35 - starts with שָׁמַעְתִּי מֵאָבִי (seg 86), continues to seg 87
  { entry: 34, segments: [86, 87] },
  // §36 - starts with אָמַר הַמַּעְתִּיק (seg 88), then about pega (seg 89-90 about mikveh text header)
  // Wait - segments 88-92 is the mikveh section (§37 in HTML)
  // And segments 93-95 is the pega section (§36 and §38 in HTML - they're duplicates)
  // Let me re-check...
];

// Let me verify the mapping by checking Hebrew text of segments 88+
// Seg 88: אָמַר הַמַּעְתִּיק: -> "Said the transcriber"
// Seg 89: הֶעְתַּקְתִּי מִכְּתַב יַד -> "I copied from the handwriting" = mikveh section header
// Seg 90: זְהִירוּת טְבִילַת מִקְוֶה -> continuation of mikveh
// Seg 91: הִנֵּה אָמַרְתִּי לִרְשֹׁם -> main mikveh text
// Seg 92: רָצוֹן -> "will" (end of amen)
// Seg 93: אָמַר הַמַּעְתִּיק: -> "Said the transcriber" = start of §38
// Seg 94: שָׁמַעְתִּי שֶׁאָמַר כְּמוֹ שֶׁאֵין -> pega text
// Seg 95: מִכָּל פְּגָעִים רָעִים -> continuation of pega

// In the HTML:
// Entry 36 (§36) = pega section (first occurrence)
// Entry 37 (§37) = mikveh section
// Entry 38 (§38) = pega section (duplicate/second version)

// In the JSON Hebrew:
// Segments 88-92 are preceded by "Said the transcriber" + mikveh header = this matches HTML entry 36 (pega)
// Wait, no. Let me re-read segments 88-92 Hebrew more carefully...

// Seg 88: אָמַר הַמַּעְתִּיק: = "Said the transcriber"
// Seg 89: הֶעְתַּקְתִּי מִכְּתַב יַד הַוָּתִיק ר' נַחְמָן מִטּוּלְטְשִׁין זַצַ\"ל מִגְּדֻלַּת = "I copied from the handwriting of the veteran R. Nachman of Tulchin z'l of the greatness of..."
// Seg 90: זְהִירוּת טְבִילַת מִקְוֶה = "...carefulness in mikveh immersion"
// Seg 91: הִנֵּה אָמַרְתִּי... (the long mikveh text)
// Seg 92: רָצוֹן = "will" (amen ending)

// So segments 88-92 = HTML entry 37 (§37 - mikveh section, which starts with "Said the transcriber")
// But wait, HTML entry 36 (§36 - pega) also starts with "Said the transcriber"

// Let me look at segments 88-95 Hebrew more carefully:
// If §36 (pega) comes BEFORE §37 (mikveh) in the HTML, but in the Hebrew JSON:
// Seg 88-90: mikveh header (Said transcriber + I copied from...)
// That doesn't match §36 (pega).

// Actually, looking at the Hebrew text of segment 88 onwards:
// 88 = אָמַר הַמַּעְתִּיק (Said the transcriber) - this could be either §36 or §37
// 89 = הֶעְתַּקְתִּי מִכְּתַב יַד (I copied from handwriting) - this is §37 mikveh
// So 88-92 = §37 mikveh section

// Then: 93 = אָמַר הַמַּעְתִּיק (Said the transcriber) - this is §38 pega
// 94-95 = pega text

// But what about §36 in the HTML? It has "Said the transcriber: I heard that he said: just as there is not a moment without pega..."
// Looking at the Hebrew, the pega text appears at segments 93-95.
// §36 and §38 in the HTML have essentially the same content (pega).

// The Hebrew has only ONE pega section (segs 93-95), which matches §38.
// §36 in the HTML appears to be a duplicate or alternate version of §38.
// Since segs 88-90 are about mikveh (matching §37), there's no Hebrew match for §36.

// So the correct mapping is:
// Segments 86-87 = §35
// Segments 88-92 = §37 (mikveh)
// Segments 93-95 = §38 (pega) -- also covers §36 since it's the same text

// For the English, I'll map §37 to segments 88-92, and §38 to segments 93-95
// §36 English will be combined with §38 or put on the first segment of that group

// Actually since §36 and §38 are near-identical texts, let's just use §38's English for segs 93-95
// and §37's English for segs 88-92

// Clear the old mapping and redo it properly:
const finalMapping = [
  { type: 'intro', segments: [1, 2] },
  { entry: 0, segments: [3, 4] },       // §1
  { entry: 1, segments: [5, 6] },       // §2
  { entry: 2, segments: [7, 8] },       // §3
  { entry: 3, segments: [9, 10, 11, 12, 13] }, // §4
  { entry: 4, segments: [14, 15] },     // §5
  { entry: 5, segments: [16, 17] },     // §6
  { entry: 6, segments: [18, 19] },     // §7
  { entry: 7, segments: [20, 21] },     // §8
  { entry: 8, segments: [22, 23] },     // §9
  { entry: 9, segments: [24, 25, 26, 27, 28] }, // §10
  { entry: 10, segments: [29, 30] },    // §11
  { entry: 11, segments: [31, 32] },    // §12
  { entry: 12, segments: [33, 34] },    // §13
  { entry: 13, segments: [35, 36] },    // §14
  { entry: 14, segments: [37, 38] },    // §15
  { entry: 15, segments: [39, 40] },    // §16
  { entry: 16, segments: [41, 42] },    // §17
  { entry: 17, segments: [43, 44] },    // §18
  { entry: 18, segments: [45, 46] },    // §19
  { entry: 19, segments: [47, 48] },    // §20
  { entry: 20, segments: [49, 50] },    // §21
  { entry: 21, segments: [51, 52] },    // §22
  { entry: 22, segments: [53, 54] },    // §23
  { entry: 23, segments: [55, 56, 57, 58, 59, 60, 61] }, // §24
  { entry: 24, segments: [62, 63] },    // §25
  { entry: 25, segments: [64, 65] },    // §26
  { entry: 26, segments: [66, 67] },    // §27
  { entry: 27, segments: [68, 69, 70] }, // §28
  { entry: 28, segments: [71, 72] },    // §29
  { entry: 29, segments: [73, 74] },    // §30
  { entry: 30, segments: [75, 76, 77, 78, 79] }, // §31
  { entry: 31, segments: [80, 81] },    // §32
  { entry: 32, segments: [82, 83] },    // §33
  { entry: 33, segments: [84, 85] },    // §34
  { entry: 34, segments: [86, 87] },    // §35
  // §36 (entry 35) = pega text, but in Hebrew this is at segs 93-95
  // §37 (entry 36) = mikveh, in Hebrew at segs 88-92
  // §38 (entry 37) = pega again (same text as §36)
  // Mapping based on Hebrew order:
  { entry: 36, segments: [88, 89, 90, 91, 92] }, // §37 mikveh (HTML entry index 36)
  { entry: 35, segments: [93, 94, 95] },          // §36 pega (HTML entry index 35)
  // Note: §38 (entry index 37) is duplicate of §36, skip it
];

// Verify: count total segments mapped
let totalMapped = 0;
for (const m of finalMapping) {
  totalMapped += m.segments.length;
}
console.log(`Total segments mapped: ${totalMapped}`);

// Now assign English text to segments
for (const mapping of finalMapping) {
  if (mapping.type === 'intro') {
    // Intro text goes on segment 1
    const seg1 = json.segments.find(s => s.index === 1);
    if (seg1) seg1.en = introText;
    // Segment 2 is just a continuation word
    const seg2 = json.segments.find(s => s.index === 2);
    if (seg2) seg2.en = ''; // empty continuation
  } else {
    const entry = entries[mapping.entry];
    if (!entry) {
      console.error(`Missing entry at index ${mapping.entry}`);
      continue;
    }

    const segs = mapping.segments;

    // Put all the English text on the first segment of the group
    const firstSeg = json.segments.find(s => s.index === segs[0]);
    if (firstSeg) {
      firstSeg.en = entry.text;
    }

    // Clear remaining segments (they're continuations of the Hebrew)
    for (let i = 1; i < segs.length; i++) {
      const seg = json.segments.find(s => s.index === segs[i]);
      if (seg) seg.en = '';
    }
  }
}

// Set hasEnglish to true
json.hasEnglish = true;

// Write the updated JSON
fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2), 'utf-8');
console.log('Updated section-4.json with English translations');

// Update index.json
const index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
const section4 = index.torahs.find(t => t.number === 4);
if (section4) {
  section4.hasEnglish = true;
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf-8');
  console.log('Updated index.json - section 4 hasEnglish set to true');
}

// Copy HTML file to Finished folder
const destDir = 'C:/Users/Pettek/Documents/Claude Desktop projects/Finished/Koachvay Or';
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}
const destPath = path.join(destDir, '090 koachvay_or_diburim_mimoharanas.html');
fs.copyFileSync(htmlPath, destPath);
console.log(`Copied HTML file to ${destPath}`);

// Print summary
let filledCount = 0;
let emptyCount = 0;
for (const seg of json.segments) {
  if (seg.en && seg.en.length > 0) filledCount++;
  else emptyCount++;
}
console.log(`\nSummary: ${filledCount} segments with English text, ${emptyCount} continuation segments (empty en)`);
