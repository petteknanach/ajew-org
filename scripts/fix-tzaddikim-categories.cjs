/**
 * fix-tzaddikim-categories.cjs
 * Re-categorizes tzaddikim entries currently marked "other" into more specific categories
 * based on name patterns, notes, dates, and biographical info in chinuch.org entries.
 */

const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'public', 'data', 'tzaddikim-database.json');
const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

// Track changes
const changes = {};
let unchanged = 0;

// ============================================================
// BIBLICAL figures - actual biblical people (not rabbis named after them)
// We check: no "Rav"/"Rabbi" prefix, and known biblical names/titles
// ============================================================
const biblicalExactNames = new Set([
  'adam', 'eve', 'noah', 'abraham', 'sarah', 'isaac', 'rebecca', 'rebekah',
  'jacob', 'rachel', 'leah', 'joseph', 'moses', 'aaron', 'miriam',
  'joshua', 'caleb', 'samuel', 'saul', 'david', 'solomon',
  'elijah', 'elisha', 'isaiah', 'jeremiah', 'ezekiel', 'daniel',
  'esther', 'mordechai', 'ruth', 'boaz', 'naomi', 'deborah',
  'gideon', 'samson', 'job', 'jonah', 'hosea', 'amos', 'micah',
  'habakkuk', 'zephaniah', 'haggai', 'zechariah', 'malachi',
  'ezra', 'nehemiah', 'obadiah', 'joel', 'nahum',
  'reuben', 'simeon', 'levi', 'judah', 'issachar', 'zebulun',
  'dan', 'naphtali', 'gad', 'asher', 'benjamin',
  'lot', 'seth', 'enoch', 'methuselah', 'lamech', 'shem',
  'hagar', 'keturah', 'zilpah', 'bilhah',
]);

const biblicalTitlePatterns = [
  /^king\s+(david|solomon|saul|hezekiah|josiah|jehoshaphat)/i,
  /^queen\s+esther/i,
  /^(moshe|aharon|yehoshua|shmuel|dovid|shlomo|eliyahu|elisha|yeshayahu|yirmiyahu|yechezkel|daniel)\s*$/i,
  /^(avraham|yitzchak|yaakov|yosef|binyamin|reuven|shimon|levi|yehuda|dan|naftali|gad|asher|zevulun|yissachar)\s*$/i,
  /^(sarah|rivka|rochel|leah|miriam|devorah|rus|esther|chana)\s*$/i,
];

const biblicalNotePatterns = [
  /patriarch/i, /matriarch/i, /^son of jacob$/i, /^son of israel$/i,
  /built (the )?temple/i, /built (the )?ark$/i, /first man/i, /first woman/i,
  /^prophet$/i, /twelve tribes/i, /twelve spies/i,
];

function isBiblical(entry) {
  const nameLower = entry.name.toLowerCase().trim();
  // Must NOT be a rabbi
  if (/^(rav |rabbi |r\' |r\. )/i.test(entry.name)) return false;
  // Must NOT be "Rebbe" (chassidic)
  if (/rebbe/i.test(entry.name)) return false;

  if (biblicalExactNames.has(nameLower)) return true;
  for (const pat of biblicalTitlePatterns) {
    if (pat.test(nameLower)) return true;
  }
  // Check notes
  const notes = (entry.notes || '').toLowerCase();
  for (const pat of biblicalNotePatterns) {
    if (pat.test(notes)) return true;
  }
  // Check year - BCE or AM (Anno Mundi) dates
  const year = (entry.year_passed || '').trim();
  if (/BCE/i.test(year) || /AM$/i.test(year)) return true;

  return false;
}

// ============================================================
// TALMUDIC - Tannaim and Amoraim (~0-500 CE)
// ============================================================
const talmudicNames = [
  'hillel the elder', 'shammai', 'rabban gamliel', 'rabban yochanan ben zakkai',
  'ben azzai', 'ben zoma',
];

const talmudicPatterns = [
  /\btanna\b/i, /\bamora\b/i, /\btannaim\b/i, /\bamoraim\b/i,
  /\bmishnah?\b/i, /\btalmud\b/i, /\bgemara\b/i,
  /\bsanhedrin\b/i,
];

// Known talmudic-era rabbis (partial matches)
const talmudicRabbiPatterns = [
  /^rabbi (akiva|meir|shimon bar yochai|yehuda hanasi|yochanan|eliezer|yehoshua|tarfon|gamliel|yishmael|chanina|chiya|ashi|ravina)$/i,
  /^rabbi (akiva|meir|shimon bar yochai|yehuda hanasi)(\s|$)/i,
  /^(rav|rabbi)\s+(akiva|meir|yochanan|eliezer|yehoshua)\s*$/i,
  /^rabban\s/i,
  /^reish lakish/i,
  /^rav (ashi|ravina|huna|chisda|nachman|papa|kahana|sheshet|yosef|zeira)/i,
  /^(abaye|rava|shmuel|rav)\s*$/i,
  /^rabbi shimon bar yochai/i,
  /^rashbi$/i,
];

function isTalmudic(entry) {
  const nameLower = entry.name.toLowerCase().trim();
  const combined = `${entry.name} ${entry.notes || ''}`.toLowerCase();

  if (talmudicNames.includes(nameLower)) return true;

  for (const pat of talmudicRabbiPatterns) {
    if (pat.test(entry.name)) return true;
  }

  // Check notes for talmudic indicators
  for (const pat of talmudicPatterns) {
    if (pat.test(entry.notes || '')) return true;
  }

  // Date-based: ~0 to ~500 CE
  const year = (entry.year_passed || '').trim();
  const ceMatch = year.match(/^~?(\d+)\s*CE$/i);
  if (ceMatch) {
    const y = parseInt(ceMatch[1]);
    if (y <= 500) return true;
  }

  return false;
}

// ============================================================
// RISHONIM (~1000-1500 CE)
// ============================================================
const rishonimNames = [
  /rashi/i, /rambam/i, /ramban/i, /tosafos/i, /tosafot/i,
  /rif\b/i, /rosh\b/i, /rashba/i, /ritva/i, /ran\b/i,
  /meiri/i, /raavad/i, /rabbeinu tam/i, /rabbeinu gershom/i,
  /rabbeinu yonah/i, /rashbam/i, /maharam of rotenburg/i, /maharam of rottenburg/i,
  /rabbeinu asher/i, /tur\b/i, /beis yosef/i, /karo/i,
  /ibn ezra/i, /radak/i, /rabbeinu bachya/i, /rabbeinu bechaye/i,
  /orchos tzadikim/i, /sefer hachinuch/i, /rabbeinu yerucham/i,
  /maharil/i, /maharik/i, /rivash/i, /tashbetz/i,
  /ohr zarua/i, /mordechai\b.*rav/i,
  /rabbeinu chananel/i, /rabbeinu nissim/i,
];

const rishonimNotePatterns = [
  /rishonim/i, /rishon/i,
  /\b(11|12|13|14)th century/i,
  /commentary on.*(talmud|torah|mishnah)/i,
];

function isRishonim(entry) {
  const combined = `${entry.name} ${entry.notes || ''}`;

  for (const pat of rishonimNames) {
    if (pat.test(combined)) return true;
  }
  for (const pat of rishonimNotePatterns) {
    if (pat.test(entry.notes || '')) return true;
  }

  // Date-based
  const year = parseYear(entry.year_passed);
  if (year && year >= 1000 && year <= 1500) return true;

  // Father of Maharam etc
  if (/father of the maharam/i.test(entry.notes || '')) return true;

  return false;
}

// ============================================================
// BRESLOV
// ============================================================
const breslovPatterns = [
  /breslov/i, /breslev/i, /uman/i,
  /\bnachman\b.*\b(breslov|breslev|uman)\b/i,
  /\bnosson\b.*\b(breslov|breslev|nemirov)\b/i,
  /\br['']? nosson\b/i,
];

const breslovNotePatterns = [
  /breslov/i, /breslev/i,
  /student of.*(nachman|rebbe nachman)/i,
  /disciple of.*(nachman|rebbe nachman)/i,
  /likutey/i, /likutay/i,
];

function isBreslov(entry) {
  const combined = `${entry.name} ${entry.notes || ''}`;
  for (const pat of breslovPatterns) {
    if (pat.test(combined)) return true;
  }
  for (const pat of breslovNotePatterns) {
    if (pat.test(entry.notes || '')) return true;
  }
  return false;
}

// ============================================================
// CHASSIDIC - Rebbes, Admorim, and known chassidic courts/towns
// ============================================================
const chassidicTowns = [
  'lubavitch', 'chabad', 'satmar', 'belz', 'vizhnitz', 'viznitz', 'ger', 'gur',
  'alexander', 'amshinov', 'apt', 'berdichev', 'berditchev', 'biala', 'bobov',
  'boyan', 'chernobyl', 'chortkov', 'chortkover', 'dinov', 'dzikov', 'erlau', 'husiatyn',
  'kaliv', 'karlin', 'stolin', 'kalov', 'klausenburg', 'komarno', 'kamorna',
  'kopyczynce', 'koson', 'kotzk', 'kozhnitz', 'lelov', 'lelover', 'lizhensk', 'lublin',
  'machnovka', 'mezhibuzh', 'mezritch', 'mezeritch', 'modzitz', 'modziter', 'munkacs', 'munkatch',
  'nadvorna', 'neshchiz', 'nikolsburg', 'ostrovtsa', 'peshischa', 'piaseczna', 'piltz',
  'premishlan', 'propchitz', 'pshevorsk', 'rachmastrivka', 'radomsk', 'ropshitz',
  'ruzhin', 'sadigura', 'sadigerer', 'sanz', 'skulen', 'skvira', 'slonim', 'spinka',
  'stolin', 'stropkov', 'stropkover', 'stutchin', 'stutchiner', 'tchernobyl', 'toldos',
  'trisk', 'trisker', 'twersky', 'vasloi', 'vasloier', 'volhyn', 'vorka', 'zhidachov',
  'zidichov', 'ziditchov', 'zinkov', 'zlotchov', 'zhitomir',
  'bluzhov', 'bluzhover', 'tolna', 'hornostipol', 'bohush', 'bohusl', 'kosov',
  'sassov', 'rimanov', 'shinova', 'shinover', 'dzhikov', 'seret',
  'sokolov', 'sokolover', 'strikov', 'strikover', 'shtefanesht', 'stephanesti',
  'polonne', 'neskhiz', 'annipol', 'annipoli',
  'chernobyler', 'berditchever', 'kozhnitzer', 'ropshitzer',
  'skver', 'puppa', 'pupa', 'klausenberg', 'sighet', 'kretchnif',
  'kalev', 'lizensk', 'lizhensker',
  'kaminka', 'koritz',
];

const chassidicPatterns = [
  /\brebbe\b/i, /\badmor\b/i, /\bchassid/i, /\bchasid/i, /\bhasid/i,
  /\bbaal shem tov\b/i, /\bbesht\b/i, /\bmaggid of mezritch\b/i,
  /\bmaggid of mezeritch\b/i, /\btanya\b/i, /\bchabad\b/i,
  /\bsfas emes\b/i, /\bsefas emes/i, /\bnoam elimelech\b/i,
  /\bkedushas levi\b/i,
  /\bmei hashiloach\b/i, /\bizhbitz\b/i, /\bizbitz\b/i,
];

const chassidicNotePatterns = [
  /\brebbe\b/i, /\badmor\b/i, /\bchassid/i, /\bchasid/i, /\bhasid/i,
  /founder of.*chassid/i, /founder of.*chasid/i, /founder of.*hasid/i,
  /disciple of.*baal shem/i, /student of.*baal shem/i,
  /disciple of.*(maggid|mezritch|mezeritch)/i,
  /\bchassidic\b/i, /\bchasidic\b/i, /\bhasidic\b/i,
  /\bchassidus\b/i, /\bchasidus\b/i, /\bhasidus\b/i,
];

function isChassidic(entry) {
  const nameLower = entry.name.toLowerCase();
  const combined = `${entry.name} ${entry.notes || ''}`.toLowerCase();

  for (const pat of chassidicPatterns) {
    if (pat.test(entry.name)) return true;
  }
  for (const pat of chassidicNotePatterns) {
    if (pat.test(entry.notes || '')) return true;
  }

  // Check for chassidic town names in the entry name (e.g. "Rav X of Belz")
  for (const town of chassidicTowns) {
    // Look for "of <town>" pattern, or "<town> Rebbe", or just town in name
    const townRe = new RegExp(`\\bof\\s+${town}\\b|\\b${town}\\s+(rebbe|admor|dynasty)\\b|\\b${town}er\\s+rebbe\\b`, 'i');
    if (townRe.test(entry.name)) return true;
    // Also check for "the Xer" pattern
    const theRe = new RegExp(`\\bthe\\s+${town}(er)?\\b`, 'i');
    if (theRe.test(entry.name)) return true;
  }

  // Check for well-known chassidic family names + town combos
  if (/\bof\s+(lubavitch|chabad|satmar|belz|ger|gur|vizhnitz|bobov|breslov|karlin|stolin|slonim|munkacs|spinka|skulen|klausenburg)\b/i.test(combined)) return true;

  return false;
}

// ============================================================
// LITHUANIAN / Yeshiva world
// ============================================================
const lithuanianPatterns = [
  /\bmashgiach\b/i, /\brosh yeshiva\b/i, /\brosh hayeshiva\b/i,
  /\byeshivas?\s+(mir|ponevezh|volozhin|brisk|slobodka|tels|telz|telsh|kelm|novardok|novaradok|chevron|lakewood|chaim berlin|torah vodaath|ner yisrael|beis medrash govoha)\b/i,
  /\bvolozhin\b/i, /\bbrisk\b/i, /\bslobodka\b/i, /\bkelm\b/i,
  /\bnovardok\b/i, /\bnovaradok\b/i, /\bmussar\b/i, /\bmusar\b/i,
];

const lithuanianNames = [
  /\bchafetz chaim\b/i, /\bchofetz chaim\b/i, /\bmishnah berurah\b/i,
  /\bchazon ish\b/i, /\bsteipler\b/i,
  /\bvilna gaon\b/i, /\bgra\b/i,
  /\bnetziv\b/i, /\brav chaim (of )?volozhin/i,
  /\brav (aharon|aryeh) leib shteinman/i,
  /\brav (elazar|elozor) menachem man shach/i,
  /\brav shach\b/i,
];

const lithuanianNotePatterns = [
  /\bmashgiach\b/i, /\brosh yeshiva\b/i, /\brosh hayeshiva\b/i,
  /\bmusar\b/i, /\bmussar\b/i,
  /\byeshiva\b.*\b(mir|ponevezh|volozhin|brisk|slobodka|kelm)\b/i,
  /\blithuanian\b/i, /\blitvish\b/i, /\blitvishe\b/i,
];

function isLithuanian(entry) {
  const combined = `${entry.name} ${entry.notes || ''}`;
  for (const pat of lithuanianPatterns) {
    if (pat.test(combined)) return true;
  }
  for (const pat of lithuanianNames) {
    if (pat.test(entry.name)) return true;
  }
  for (const pat of lithuanianNotePatterns) {
    if (pat.test(entry.notes || '')) return true;
  }

  // Gra / Vilna
  if (/\bvilna\b/i.test(entry.name) && /\b(gra|gaon|eliyahu)\b/i.test(entry.name)) return true;

  return false;
}

// ============================================================
// SEPHARDIC
// ============================================================
const sephardicPatterns = [
  /\bben ish chai\b/i, /\bbaba\s+(sali|baruch|meir|elazar)\b/i,
  /\bovadia\s+yosef\b/i, /\bovadiah\s+yosef\b/i,
  /\bchida\b/i, /\bor hachaim\b/i, /\bohr hachaim\b/i,
  /\barizal\b/i, /\bari (hakadosh|ha-?kadosh|zal)\b/i, /\brav yitzhak luria\b/i,
  /\byosef chaim\b.*\b(baghdad|babylon)\b/i,
  /\bbaghdad\b/i, /\baleppo\b/i, /\bdjerba\b/i, /\bfez\b/i,
  /\bmoroc/i, /\btuni[sz]/i, /\byemen/i, /\biraq/i, /\bpersia/i,
  /\bsephardi/i, /\bmizrachi/i, /\bedot hamizrach/i,
];

const sephardicNotePatterns = [
  /\bsephardi/i, /\bmizrachi/i, /\bben ish chai\b/i,
  /\bbaba\s+(sali|baruch|meir|elazar)\b/i,
  /\bchief rabbi.*\b(israel|iraq|syria|egypt|tunisia|morocco|libya)\b/i,
  /\bkabbalist\b/i, /\bmekubal\b/i,
];

const sephardicRabbiNames = [
  /\brav ovadia\b/i, /\brav yosef caro\b/i, /\bshulchan aruch\b/i,
  /\brav chaim vital\b/i, /\brav chaim atar\b/i,
  /\brav yosef karo\b/i,
];

function isSephardic(entry) {
  const combined = `${entry.name} ${entry.notes || ''}`;
  for (const pat of sephardicPatterns) {
    if (pat.test(combined)) return true;
  }
  for (const pat of sephardicNotePatterns) {
    if (pat.test(entry.notes || '')) return true;
  }
  for (const pat of sephardicRabbiNames) {
    if (pat.test(entry.name)) return true;
  }
  return false;
}

// ============================================================
// ACHARONIM (1500-1800ish, post-Rishonim, pre-Chassidic era authorities)
// ============================================================
const acharonimPatterns = [
  /\bshulchan aruch\b/i, /\bshulchan arukh\b/i,
  /\bmagen avraham\b/i, /\btaz\b/i, /\bshakh\b/i, /\bsma\b/i,
  /\bbach\b/i, /\bpri megadim\b/i, /\bpri chadash\b/i,
  /\bshelah\b/i, /\bshlah\b/i, /\brama\b/i, /\brema\b/i,
  /\bmishnah berurah\b/i,
  /\bpenei yehoshua\b/i, /\bpnei yehoshua\b/i,
  /\bnoda biyehuda\b/i, /\bnodah biyehuda\b/i,
  /\bchatam sofer\b/i, /\bchasam sofer\b/i,
  /\bchayei adam\b/i, /\bkitzur shulchan aruch\b/i,
  /\bsha'agat aryeh\b/i, /\bshaagas aryeh\b/i,
  /\bkorban ha'edah\b/i,
];

const acharonimNotePatterns = [
  /\bacharon/i, /\bhalachic authority\b/i,
  /\bposek\b/i, /\bhalachist\b/i,
  /commentat(or|ry)/i,
  /\bav beis din\b/i, /\bav bet din\b/i,
  /\bdayan\b/i,
];

function isAcharonim(entry) {
  const combined = `${entry.name} ${entry.notes || ''}`;
  for (const pat of acharonimPatterns) {
    if (pat.test(combined)) return true;
  }

  // Date-based: if year is 1500-1800 and has "Rav" prefix
  const year = parseYear(entry.year_passed);
  if (year && year >= 1500 && year <= 1850 && /^rav\s/i.test(entry.name)) {
    // Only if not already caught by chassidic
    return true;
  }

  // Check notes for acharonim indicators (but only combined with being a Rav)
  if (/^rav\s/i.test(entry.name)) {
    for (const pat of acharonimNotePatterns) {
      if (pat.test(entry.notes || '')) return true;
    }
  }

  return false;
}

// ============================================================
// HELPER: Parse year from string
// ============================================================
function parseYear(yearStr) {
  if (!yearStr) return null;
  const str = yearStr.trim();

  // Direct year like "1810" or "1683"
  const directMatch = str.match(/^(\d{3,4})$/);
  if (directMatch) return parseInt(directMatch[1]);

  // Year with prefix like "~1810"
  const approxMatch = str.match(/^~?(\d{3,4})$/);
  if (approxMatch) return parseInt(approxMatch[1]);

  // "1792." or similar with trailing period
  const dotMatch = str.match(/^~?(\d{3,4})\./);
  if (dotMatch) return parseInt(dotMatch[1]);

  // Also try to find a 4-digit year embedded in the name (for chinuch entries)
  return null;
}

// Extract year from chinuch-style long names (e.g., "...born 1920..." or "...1792.")
function extractYearFromName(name) {
  const matches = name.match(/\b(1[0-9]{3})\b/g);
  if (matches && matches.length > 0) {
    // Return the last year found (usually the death year)
    return parseInt(matches[matches.length - 1]);
  }
  return null;
}

// ============================================================
// MAIN CATEGORIZATION LOGIC
// ============================================================
function categorize(entry) {
  // Order matters - more specific categories first

  // 1. Biblical
  if (isBiblical(entry)) return 'biblical';

  // 2. Talmudic
  if (isTalmudic(entry)) return 'talmudic';

  // 3. Breslov (before generic chassidic)
  if (isBreslov(entry)) return 'breslov';

  // 4. Chassidic
  if (isChassidic(entry)) return 'chassidic';

  // 5. Lithuanian
  if (isLithuanian(entry)) return 'lithuanian';

  // 6. Sephardic
  if (isSephardic(entry)) return 'sephardic';

  // 7. Rishonim
  if (isRishonim(entry)) return 'rishonim';

  // 8. Acharonim
  if (isAcharonim(entry)) return 'acharonim';

  // For chinuch entries with long names, try to extract a year from the name
  if (entry.source === 'chinuch' && entry.name.length > 60) {
    const yearFromName = extractYearFromName(entry.name);
    if (yearFromName) {
      if (yearFromName >= 1000 && yearFromName <= 1500) return 'rishonim';
      if (yearFromName >= 1500 && yearFromName <= 1800) return 'acharonim';
    }
  }

  return null; // no change
}

// ============================================================
// PROCESS ALL ENTRIES
// ============================================================
let totalOther = 0;

for (const entry of data.all_tzaddikim) {
  if (entry.category !== 'other') continue;
  totalOther++;

  const newCat = categorize(entry);
  if (newCat) {
    changes[newCat] = (changes[newCat] || 0) + 1;
    entry.category = newCat;
  } else {
    unchanged++;
  }
}

// ============================================================
// SUMMARY
// ============================================================
console.log(`\n=== Tzaddikim Category Fix Summary ===`);
console.log(`Total entries: ${data.all_tzaddikim.length}`);
console.log(`Entries originally "other": ${totalOther}`);
console.log(`\nRe-categorized:`);

let totalChanged = 0;
const sortedChanges = Object.entries(changes).sort((a, b) => b[1] - a[1]);
for (const [cat, count] of sortedChanges) {
  console.log(`  ${cat}: ${count}`);
  totalChanged += count;
}

console.log(`\nTotal re-categorized: ${totalChanged}`);
console.log(`Still "other": ${unchanged}`);

// Final category counts
const finalCats = {};
for (const entry of data.all_tzaddikim) {
  finalCats[entry.category] = (finalCats[entry.category] || 0) + 1;
}
console.log(`\n=== Final Category Distribution ===`);
const sortedFinal = Object.entries(finalCats).sort((a, b) => b[1] - a[1]);
for (const [cat, count] of sortedFinal) {
  console.log(`  ${cat}: ${count}`);
}

// ============================================================
// WRITE BACK
// ============================================================
fs.writeFileSync(dbPath, JSON.stringify(data, null, 2) + '\n', 'utf8');
console.log(`\nUpdated file written to: ${dbPath}`);
