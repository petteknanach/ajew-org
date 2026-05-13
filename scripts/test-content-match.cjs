#!/usr/bin/env node
/**
 * Test positional matching for Orach Chaim 1.
 * 
 * The HTML files in Orach Chaim 1 are:
 * - 010: Hakdamah + Hashkamas 1 (but Hebrew has Hakdamah as #1, Hashkamas Aleph as #2)
 * - 030: Hashkamas 2-3 (Hebrew Hashkamas Beis #3, Gimmel #4)
 * - 040: Hashkamas 4 (Hebrew... wait, Hebrew #4 is Hashkamas Gimmel, not 4)
 * 
 * The Hebrew uses Hebrew letters for sub-halacha numbering:
 * א=1, ב=2, ג=3, ד=4, ה=5, ו=6, ז=7, ח=8, ט=9, י=10
 * 
 * So HTML "Halacha 1" = Hebrew "Aleph" (first sub-halacha)
 * HTML "Halacha 5" = Hebrew "Hei"
 * 
 * But the Hebrew PART files are split differently:
 * - torah-2 = Hashkamas Aleph (just letter א)
 * - torah-3 = Hashkamas Beis (just letter ב)
 * - torah-4 = Hashkamas Gimmel (just letter ג)
 * 
 * While HTML groups them as "Hashkamas 1", "Hashkamas 2-3", "Hashkamas 4", "Hashkamas 5"
 * 
 * The HTML numbering corresponds to the ORIGINAL halacha numbering in Likutay Halachos,
 * while the Hebrew files are split by sub-halacha (א, ב, ג...).
 * 
 * So the mapping is:
 * HTML "Hashkamas 1" (which includes all of Hashkamas) -> Hebrew files 2-7 (Hashkamas א through ה + more)
 * HTML "Hashkamas 2-3" -> Hebrew files 3-4 (Hashkamas ב-ג)
 * HTML "Hashkamas 4" -> Hebrew file 4 (Hashkamas ד)
 * HTML "Hashkamas 5" -> Hebrew file 7 (Hashkamas ה)
 * 
 * Wait, that doesn't work either. Let me just look at the data.

 * Actually, I think the HTML files correspond to the Hebrew files as follows:
 * Each HTML file translates ONE Hebrew sub-halacha.
 * The HTML says "Hashkamas 2" which means "Hashkamas part 2" = Hebrew "Hashkamas Beis"
 * HTML "Hashkamas 5" = Hebrew "Hashkamas Hei"
 * 
 * Let me verify by comparing content.
 */
const fs = require('fs');

// Get HTML text for "Hashkamas 5" (file 050)
function decodeHTML(text) {
  return text
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ').replace(/&mdash;/g, '—')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)));
}

const html5 = fs.readFileSync('/mnt/c/Users/Pettek/LikutayHalachos - project by claude/English/Likutay Halachos/Likutay Halachos - Orach Chaim - 1/050 LH_OC1_Hashkamas5.html', 'utf8');
const html5Text = decodeHTML(html5.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
console.log('HTML Hashkamas 5 first 200 chars:');
console.log(html5Text.substring(0, 200));

// Get Hebrew text for Hashkamas Hei (torah 7)
const heb7 = JSON.parse(fs.readFileSync('/root/ajew-org/public/reader/likutay-halachos/part-1/torah-7.json', 'utf8'));
console.log('\nHebrew Hashkamas Hei segments:');
for (let i = 0; i < Math.min(5, heb7.segments.length); i++) {
  const he = (heb7.segments[i].he || heb7.segments[i].he_nikud || '').trim();
  console.log(`  ${i}: ${he.substring(0, 100)}`);
}

// The content should be similar (one is a translation of the other)
// If we can confirm this, then HTML "Hashkamas N" = Hebrew "Hashkamas [letter N]"
