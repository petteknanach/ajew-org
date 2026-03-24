/**
 * build-torah-lens-index.cjs
 *
 * Scans the reader JSON files for relevant teachings and builds a mapping
 * of 30 event types to Torah sources, for the Torah Lens feature.
 *
 * Output: public/torah-lens-index.json
 */

const fs = require('fs');
const path = require('path');

const READER_DIR = path.join(__dirname, '..', 'public', 'reader');
const OUTPUT = path.join(__dirname, '..', 'public', 'torah-lens-index.json');

// ─────────────────────────────────────────────────────────
// Event type definitions with keywords and Torah mappings
// ─────────────────────────────────────────────────────────

const EVENT_TYPES = [
  {
    id: 'fire',
    label: 'Fire / Destruction',
    labelHe: 'אש / חורבן',
    icon: '🔥',
    keywords: ['fire', 'burn', 'blaze', 'arson', 'wildfire', 'inferno', 'flame', 'destruction', 'destroy', 'demolish', 'ruin', 'devastation', 'conflagration'],
    keywordsHe: ['אש', 'שריפה', 'חורבן', 'להבה', 'דליקה'],
    searchTerms: ['fire', 'burn', 'destruction', 'judgment', 'flame', 'anger', 'wrath', 'consume'],
    analysis: "Fire in Torah thought represents din (strict judgment) descending into the world. R' Nachman teaches that fire comes where shalom (peace) is lacking, because peace is the vessel that holds all blessing. When we see fire, it is a call to increase peace between people and to sweeten harsh judgments through heartfelt prayer, which is the weapon that can reach the root of all decrees.",
    analysisHe: "אש במחשבת התורה מייצגת דין (משפט קשה) היורד לעולם. רבי נחמן מלמד שאש באה במקום שחסר שלום, כי השלום הוא הכלי שמחזיק את כל הברכה.",
    breslovSources: [
      { book: 'likutay-moharan', part: 1, torah: 14, title: 'Likutay Moharan 14', titleHe: 'ליקוטי מוהר"ן י"ד', desc: 'Drawing peace into the world — peace is the vessel for all blessing and sweetens harsh judgments', url: '/reader/likutay-moharan/part-1/torah-14' },
      { book: 'likutay-moharan', part: 1, torah: 2, title: 'Likutay Moharan 2', titleHe: 'ליקוטי מוהר"ן ב\'', desc: 'Prayer is the weapon of Mashiach — through prayer one can sweeten all judgments at their root', url: '/reader/likutay-moharan/part-1/torah-2' },
      { book: 'likutay-moharan', part: 1, torah: 5, title: 'Likutay Moharan 5', titleHe: 'ליקוטי מוהר"ן ה\'', desc: 'Joy transforms strict judgments (dinim) — through holy joy one can convert judgment to mercy', url: '/reader/likutay-moharan/part-1/torah-5' },
      { book: 'likutay-moharan', part: 1, torah: 10, title: 'Likutay Moharan 10', titleHe: 'ליקוטי מוהר"ן י\'', desc: 'The Tzaddik sweetens judgments — how the righteous leader elevates harsh decrees', url: '/reader/likutay-moharan/part-1/torah-10' },
      { book: 'likutay-moharan', part: 1, torah: 250, title: 'Likutay Moharan 250', titleHe: 'ליקוטי מוהר"ן ר"נ', desc: 'Fire of controversy and its rectification through truth', url: '/reader/likutay-moharan/part-1/torah-250' },
      { book: 'likutay-tefilos', part: 1, torah: 14, title: 'Likutay Tefilos 14', titleHe: 'ליקוטי תפילות י"ד', desc: 'Prayer for peace in the world and sweetening of harsh judgments', url: '/reader/likutay-tefilos/part-1/prayer-14' },
    ],
    traditionalSources: [
      { source: 'Zohar, Bereishis 27a', desc: 'Fire of judgment (esh din) descends when the left side is aroused without being included in the right (chesed)' },
      { source: 'Talmud, Shabbat 119b', desc: 'Fire comes to a city only because of desecration of Shabbat' },
      { source: 'Ramchal, Derech Hashem 2:3', desc: 'Natural events are instruments of divine providence — destruction is a call to return to the Source' },
    ]
  },
  {
    id: 'flood',
    label: 'Flood / Water Disaster',
    labelHe: 'מבול / אסון מים',
    icon: '🌊',
    keywords: ['flood', 'flooding', 'tsunami', 'deluge', 'overflow', 'inundation', 'water disaster', 'dam break', 'tidal wave', 'storm surge', 'mudslide'],
    keywordsHe: ['מבול', 'שיטפון', 'צונאמי', 'הצפה'],
    searchTerms: ['flood', 'water', 'drown', 'mabul', 'overflow', 'rain', 'sea'],
    analysis: "The Mabul (Great Flood) came because of theft and immorality. Water represents chesed (kindness) — but chesed without boundaries becomes destructive. R' Nachman teaches that the flood waters represent the overwhelming thoughts and worries that drown the mind, and the Teyva (Ark) — which also means 'word' — is the refuge of holy speech and prayer. When we see flooding, it reminds us that even kindness needs the boundaries of Torah.",
    analysisHe: "המבול בא בגלל גזל ועריות. מים מייצגים חסד — אבל חסד בלי גבולות הופך להרס.",
    breslovSources: [
      { book: 'likutay-moharan', part: 1, torah: 8, title: 'Likutay Moharan 8', titleHe: 'ליקוטי מוהר"ן ח\'', desc: 'The Teyva (Ark/Word) — entering the words of prayer as Noah entered the Ark, a shelter from the flood of worldly confusion', url: '/reader/likutay-moharan/part-1/torah-8' },
      { book: 'likutay-moharan', part: 1, torah: 56, title: 'Likutay Moharan 56', titleHe: 'ליקוטי מוהר"ן נ"ו', desc: 'The melody of water — how the song of creation flows through all of nature', url: '/reader/likutay-moharan/part-1/torah-56' },
      { book: 'likutay-moharan', part: 2, torah: 8, title: 'Likutay Moharan II 8', titleHe: 'ליקוטי מוהר"ן תניינא ח\'', desc: 'The great teaching on faith — every person must cross the narrow bridge of life without fear', url: '/reader/likutay-moharan/part-2/torah-8' },
      { book: 'likutay-moharan', part: 1, torah: 64, title: 'Likutay Moharan 64', titleHe: 'ליקוטי מוהר"ן ס"ד', desc: 'Coming to Pharaoh (the source of chaos) — confronting the deepest places of concealment', url: '/reader/likutay-moharan/part-1/torah-64' },
      { book: 'likutay-tefilos', part: 1, torah: 8, title: 'Likutay Tefilos 8', titleHe: 'ליקוטי תפילות ח\'', desc: 'Prayer to be saved from the floodwaters of confusion and to find the holy words', url: '/reader/likutay-tefilos/part-1/prayer-8' },
    ],
    traditionalSources: [
      { source: 'Zohar, Noach 67b', desc: 'The Mabul came through the opening of the "windows of heaven" — when the upper waters of judgment are released without mercy' },
      { source: 'Talmud, Sanhedrin 108a', desc: 'The generation of the Flood was judged by water because they corrupted their ways upon the earth' },
      { source: 'Ramchal, Mesillas Yesharim Ch. 1', desc: 'This world is like a raging sea — only Torah and mitzvos keep a person afloat' },
    ]
  },
  {
    id: 'war',
    label: 'War / Military Conflict',
    labelHe: 'מלחמה / עימות צבאי',
    icon: '⚔️',
    keywords: ['war', 'conflict', 'battle', 'military', 'invasion', 'attack', 'combat', 'army', 'weapon', 'missile', 'bomb', 'airstrike', 'troops', 'soldier', 'defense', 'front line', 'ceasefire'],
    keywordsHe: ['מלחמה', 'עימות', 'קרב', 'צבא', 'טיל', 'פצצה', 'חיילים'],
    searchTerms: ['war', 'battle', 'fight', 'enemy', 'sword', 'weapon', 'peace', 'conflict', 'victory'],
    analysis: "R' Nachman reveals that all wars in the world stem from disputes among Torah scholars, and the root of all conflict is a lack of emunah (faith). True victory is not through physical might but through prayer — the weapon of Mashiach. Every war in the physical world reflects a spiritual battle between holiness and impurity. The path to peace begins with seeking peace in one's own heart and home.",
    analysisHe: "רבי נחמן מגלה שכל המלחמות בעולם נובעות ממחלוקות בין תלמידי חכמים, ושורש כל הסכסוך הוא חוסר אמונה.",
    breslovSources: [
      { book: 'likutay-moharan', part: 1, torah: 2, title: 'Likutay Moharan 2', titleHe: 'ליקוטי מוהר"ן ב\'', desc: 'Prayer is the weapon of Mashiach — the ultimate victory comes through prayer, not physical warfare', url: '/reader/likutay-moharan/part-1/torah-2' },
      { book: 'likutay-moharan', part: 1, torah: 14, title: 'Likutay Moharan 14', titleHe: 'ליקוטי מוהר"ן י"ד', desc: 'Drawing peace into the world — raising God\'s honor to its root brings universal peace', url: '/reader/likutay-moharan/part-1/torah-14' },
      { book: 'likutay-moharan', part: 1, torah: 75, title: 'Likutay Moharan 75', titleHe: 'ליקוטי מוהר"ן ע"ה', desc: 'Wars come from dispute among Torah scholars — the spiritual root of physical conflict', url: '/reader/likutay-moharan/part-1/torah-75' },
      { book: 'likutay-moharan', part: 2, torah: 44, title: 'Likutay Moharan II 44', titleHe: 'ליקוטי מוהר"ן תניינא מ"ד', desc: 'The importance of praying for peace and for the welfare of the nation', url: '/reader/likutay-moharan/part-2/torah-44' },
      { book: 'likutay-moharan', part: 2, torah: 1, title: 'Likutay Moharan II 1', titleHe: 'ליקוטי מוהר"ן תניינא א\'', desc: 'Tiku Emunah — the blast of faith that shatters all barriers and brings the ultimate redemption', url: '/reader/likutay-moharan/part-2/torah-1' },
      { book: 'likutay-tefilos', part: 1, torah: 2, title: 'Likutay Tefilos 2', titleHe: 'ליקוטי תפילות ב\'', desc: 'Prayer for the power of prayer to overcome all enemies', url: '/reader/likutay-tefilos/part-1/prayer-2' },
    ],
    traditionalSources: [
      { source: 'Zohar, Vayikra 14b', desc: 'When Israel below is fragmented, the nations above are empowered — unity below brings peace above' },
      { source: 'Talmud, Megillah 3a', desc: 'When the shofar is blown in a city, shall not the people tremble? (Amos 3:6)' },
      { source: 'Ramchal, Derech Hashem 2:4', desc: 'Wars and national upheavals serve as instruments of divine judgment and correction' },
    ]
  },
  {
    id: 'earthquake',
    label: 'Earthquake / Tremor',
    labelHe: 'רעידת אדמה',
    icon: '🌍',
    keywords: ['earthquake', 'tremor', 'seismic', 'quake', 'aftershock', 'fault line', 'tectonic', 'collapse', 'rubble', 'shaking'],
    keywordsHe: ['רעידת אדמה', 'רעש', 'רעד'],
    searchTerms: ['earthquake', 'tremble', 'shake', 'fall', 'collapse', 'foundation', 'ground'],
    analysis: "When the earth trembles, it reflects that the foundations of the world are shaking. R' Nachman teaches that the foundations of the world rest on truth and faith. When these are weakened — when falsehood and atheism spread — the very ground beneath us becomes unstable. An earthquake is Heaven's call to strengthen our foundations: emunah, tefillah, and Torah.",
    analysisHe: "כשהאדמה רועדת, זה משקף שיסודות העולם רועדים. רבי נחמן מלמד שיסודות העולם עומדים על אמת ואמונה.",
    breslovSources: [
      { book: 'likutay-moharan', part: 2, torah: 5, title: 'Likutay Moharan II 5', titleHe: 'ליקוטי מוהר"ן תניינא ה\'', desc: 'The world stands on emunah (faith) — when faith weakens, the very foundations tremble', url: '/reader/likutay-moharan/part-2/torah-5' },
      { book: 'likutay-moharan', part: 1, torah: 64, title: 'Likutay Moharan 64', titleHe: 'ליקוטי מוהר"ן ס"ד', desc: 'Approaching the source of concealment — finding God even in the deepest darkness', url: '/reader/likutay-moharan/part-1/torah-64' },
      { book: 'likutay-moharan', part: 2, torah: 1, title: 'Likutay Moharan II 1', titleHe: 'ליקוטי מוהר"ן תניינא א\'', desc: 'Emunah is the foundation — all of creation is sustained by faith', url: '/reader/likutay-moharan/part-2/torah-1' },
      { book: 'likutay-moharan', part: 1, torah: 4, title: 'Likutay Moharan 4', titleHe: 'ליקוטי מוהר"ן ד\'', desc: 'The Tzaddik is the foundation of the world (Yesod Olam)', url: '/reader/likutay-moharan/part-1/torah-4' },
      { book: 'likutay-tefilos', part: 2, torah: 5, title: 'Likutay Tefilos II 5', titleHe: 'ליקוטי תפילות ח"ב ה\'', desc: 'Prayer to strengthen faith when the world feels unstable', url: '/reader/likutay-tefilos/part-2/prayer-5' },
    ],
    traditionalSources: [
      { source: 'Talmud, Berachot 59a', desc: 'Earthquakes occur when Hashem looks at the world and sees idolatry — He sighs and the earth shakes' },
      { source: 'Zohar, Vayeira 117a', desc: 'The earth trembles when strict judgment is aroused below' },
      { source: 'Ramchal, Derech Hashem 4:4', desc: 'Natural disasters serve as wake-up calls for humanity to examine its ways' },
    ]
  },
  {
    id: 'economic-crisis',
    label: 'Economic Crisis / Financial',
    labelHe: 'משבר כלכלי',
    icon: '📉',
    keywords: ['economy', 'economic', 'recession', 'depression', 'inflation', 'market crash', 'stock market', 'unemployment', 'bankruptcy', 'debt', 'financial crisis', 'collapse', 'interest rate', 'currency', 'trade war', 'supply chain'],
    keywordsHe: ['כלכלה', 'משבר', 'אינפלציה', 'מיתון', 'אבטלה', 'חוב'],
    searchTerms: ['livelihood', 'money', 'wealth', 'poverty', 'sustenance', 'parnasa', 'bread', 'commerce'],
    analysis: "R' Nachman teaches that livelihood (parnasa) comes from emunah (faith). When a person has complete faith, their sustenance flows easily. Economic crises remind us that true wealth is not in markets but in our connection to Hashem. The way to sweeten financial difficulty is through charity (tzedakah), which opens the channels of blessing, and through hitbodedut (personal prayer), speaking to Hashem about our needs with simple trust.",
    analysisHe: "רבי נחמן מלמד שפרנסה באה מאמונה. כשלאדם יש אמונה שלמה, פרנסתו זורמת בקלות.",
    breslovSources: [
      { book: 'likutay-moharan', part: 2, torah: 7, title: 'Likutay Moharan II 7', titleHe: 'ליקוטי מוהר"ן תניינא ז\'', desc: 'Livelihood depends on da\'at (holy knowledge) — the more connected to Hashem, the easier sustenance flows', url: '/reader/likutay-moharan/part-2/torah-7' },
      { book: 'likutay-moharan', part: 1, torah: 13, title: 'Likutay Moharan 13', titleHe: 'ליקוטי מוהר"ן י"ג', desc: 'Charity opens the gates of sustenance — giving tzedakah is the key to receiving blessing', url: '/reader/likutay-moharan/part-1/torah-13' },
      { book: 'likutay-moharan', part: 1, torah: 23, title: 'Likutay Moharan 23', titleHe: 'ליקוטי מוהר"ן כ"ג', desc: 'Through joy one draws down abundance — sadness constricts the channels of blessing', url: '/reader/likutay-moharan/part-1/torah-23' },
      { book: 'likutay-moharan', part: 1, torah: 69, title: 'Likutay Moharan 69', titleHe: 'ליקוטי מוהר"ן ס"ט', desc: 'Desire for money pulls a person away from holiness — the rectification of financial desire', url: '/reader/likutay-moharan/part-1/torah-69' },
      { book: 'likutay-moharan', part: 2, torah: 1, title: 'Likutay Moharan II 1', titleHe: 'ליקוטי מוהר"ן תניינא א\'', desc: 'Everything depends on emunah — faith sustains even through financial hardship', url: '/reader/likutay-moharan/part-2/torah-1' },
      { book: 'likutay-tefilos', part: 2, torah: 7, title: 'Likutay Tefilos II 7', titleHe: 'ליקוטי תפילות ח"ב ז\'', desc: 'Prayer for honest livelihood and freedom from financial worry', url: '/reader/likutay-tefilos/part-2/prayer-7' },
    ],
    traditionalSources: [
      { source: 'Talmud, Ta\'anit 8b', desc: 'Blessing is found only in things hidden from the eye — true sustenance comes through trust in Hashem' },
      { source: 'Zohar, Terumah 156b', desc: 'The world\'s sustenance flows through the mazal (spiritual pipeline) — tzedakah opens it' },
      { source: 'Ramchal, Mesillas Yesharim Ch. 21', desc: 'Trust in Hashem (bitachon) is the foundation of receiving sustenance' },
    ]
  },
  {
    id: 'disease',
    label: 'Disease / Pandemic',
    labelHe: 'מחלה / מגפה',
    icon: '🦠',
    keywords: ['disease', 'plague', 'pandemic', 'epidemic', 'virus', 'outbreak', 'infection', 'contagion', 'quarantine', 'vaccine', 'covid', 'illness', 'sick', 'health crisis', 'pathogen', 'public health'],
    keywordsHe: ['מחלה', 'מגפה', 'וירוס', 'הידבקות', 'בידוד'],
    searchTerms: ['disease', 'sick', 'heal', 'plague', 'doctor', 'remedy', 'cure', 'health', 'illness', 'pain'],
    analysis: "R' Nachman teaches that all illness originates from a lack of joy. Sadness weakens the body and spirit, while simcha (joy) is the greatest medicine. Plagues come to awaken teshuvah (repentance) and to remind us of our mortality so that we use each day wisely. The ultimate healer is Hashem, and the Tzaddik who can reach the root of suffering can bring healing to the entire generation.",
    analysisHe: "רבי נחמן מלמד שכל מחלה נובעת מחוסר שמחה. עצבות מחלישה את הגוף והנפש, בעוד שמחה היא הרפואה הגדולה ביותר.",
    breslovSources: [
      { book: 'likutay-moharan', part: 2, torah: 24, title: 'Likutay Moharan II 24', titleHe: 'ליקוטי מוהר"ן תניינא כ"ד', desc: 'It is a great mitzvah to be joyful always — joy is the foundation of health and spiritual life', url: '/reader/likutay-moharan/part-2/torah-24' },
      { book: 'likutay-moharan', part: 1, torah: 14, title: 'Likutay Moharan 14', titleHe: 'ליקוטי מוהר"ן י"ד', desc: 'Peace and healing are connected — where there is peace, there is wholeness (shleimut)', url: '/reader/likutay-moharan/part-1/torah-14' },
      { book: 'likutay-moharan', part: 2, torah: 3, title: 'Likutay Moharan II 3', titleHe: 'ליקוטי מוהר"ן תניינא ג\'', desc: 'Finding the good points — searching for merit even in times of suffering brings spiritual healing', url: '/reader/likutay-moharan/part-2/torah-3' },
      { book: 'likutay-moharan', part: 1, torah: 31, title: 'Likutay Moharan 31', titleHe: 'ליקוטי מוהר"ן ל"א', desc: 'The song of healing — the ten kinds of melody contain the power to heal body and soul', url: '/reader/likutay-moharan/part-1/torah-31' },
      { book: 'likutay-moharan', part: 1, torah: 277, title: 'Likutay Moharan 277', titleHe: 'ליקוטי מוהר"ן רע"ז', desc: 'Medicine and healing — understanding the spiritual roots of physical remedies', url: '/reader/likutay-moharan/part-1/torah-277' },
      { book: 'sipurey-maasiyos', part: 0, torah: 3, title: 'Sipurey Maasiyos - The Cripple', titleHe: 'סיפורי מעשיות - החיגר', desc: 'The story teaches about the connection between joy, music, and healing', url: '/reader/sipurey-maasiyos/story-3' },
    ],
    traditionalSources: [
      { source: 'Talmud, Berachot 5a', desc: 'If suffering comes upon a person, let them examine their deeds — illness prompts self-reflection' },
      { source: 'Zohar, Pinchas 213a', desc: 'All healing comes from the supernal Tree of Life — connecting to Torah is the root of all cures' },
      { source: 'Ramchal, Derech Hashem 2:3', desc: 'Suffering purifies the soul and draws a person closer to their purpose' },
    ]
  },
  {
    id: 'political-upheaval',
    label: 'Political Upheaval',
    labelHe: 'סערה פוליטית',
    icon: '🏛️',
    keywords: ['political', 'election', 'revolution', 'coup', 'protest', 'demonstration', 'government', 'regime', 'power', 'overthrow', 'democracy', 'dictatorship', 'impeachment', 'uprising', 'civil unrest', 'political crisis'],
    keywordsHe: ['פוליטיקה', 'בחירות', 'מהפכה', 'הפגנה', 'ממשלה', 'שלטון'],
    searchTerms: ['king', 'kingdom', 'rule', 'leader', 'govern', 'authority', 'power', 'honor', 'throne'],
    analysis: "R' Nachman teaches that 'there is no king without a people' — all leadership and authority ultimately derives from Hashem's sovereignty. Political upheaval reflects the reshuffling of divine providence (hashgacha). The rise and fall of leaders is orchestrated from Above to move the world toward its rectification. Our role is to pray for righteous leadership and to strengthen our own inner sovereignty — mastery over our desires.",
    analysisHe: "רבי נחמן מלמד ש'אין מלך בלא עם' — כל מנהיגות וסמכות נובעת בסופו של דבר ממלכות ה'.",
    breslovSources: [
      { book: 'likutay-moharan', part: 1, torah: 56, title: 'Likutay Moharan 56', titleHe: 'ליקוטי מוהר"ן נ"ו', desc: 'The concept of Malkhut (sovereignty) — understanding leadership, authority, and the songs of creation', url: '/reader/likutay-moharan/part-1/torah-56' },
      { book: 'likutay-moharan', part: 1, torah: 77, title: 'Likutay Moharan 77', titleHe: 'ליקוטי מוהר"ן ע"ז', desc: 'Hashem will be King over all the earth — revealing divine sovereignty through Torah and prayer', url: '/reader/likutay-moharan/part-1/torah-77' },
      { book: 'likutay-moharan', part: 1, torah: 6, title: 'Likutay Moharan 6', titleHe: 'ליקוטי מוהר"ן ו\'', desc: 'Repentance and honor — how teshuvah restores fallen honor and rectifies leadership', url: '/reader/likutay-moharan/part-1/torah-6' },
      { book: 'likutay-moharan', part: 1, torah: 14, title: 'Likutay Moharan 14', titleHe: 'ליקוטי מוהר"ן י"ד', desc: 'Raising God\'s honor to its root — the connection between true honor and peace', url: '/reader/likutay-moharan/part-1/torah-14' },
      { book: 'likutay-moharan', part: 2, torah: 7, title: 'Likutay Moharan II 7', titleHe: 'ליקוטי מוהר"ן תניינא ז\'', desc: 'Honor and knowledge — when leaders lack true knowledge, governance falters', url: '/reader/likutay-moharan/part-2/torah-7' },
    ],
    traditionalSources: [
      { source: 'Talmud, Berachot 58a', desc: 'The heart of kings and rulers is in the hand of Hashem' },
      { source: 'Zohar, Vayera 100a', desc: 'All kingdoms receive their power from the Supernal Kingdom — when it shifts, kingdoms below shift' },
      { source: 'Ramchal, Da\'at Tevunot 36', desc: 'The rise and fall of nations serves the ultimate purpose of revealing divine truth' },
    ]
  },
  {
    id: 'death-of-leader',
    label: 'Death of Leader / Public Figure',
    labelHe: 'פטירת מנהיג / דמות ציבורית',
    icon: '🕯️',
    keywords: ['death', 'died', 'passing', 'funeral', 'mourning', 'leader died', 'assassination', 'memorial', 'obituary', 'loss', 'tribute', 'public figure', 'icon', 'legend', 'legacy'],
    keywordsHe: ['מוות', 'נפטר', 'פטירה', 'אבל', 'הלוויה', 'הספד'],
    searchTerms: ['death', 'die', 'tzaddik', 'passing', 'mourning', 'soul', 'depart', 'generation', 'loss'],
    analysis: "R' Nachman teaches that when a Tzaddik or great leader passes from the world, it creates a spiritual void that the generation must fill through increased Torah, prayer, and good deeds. The passing of a notable figure is a wake-up call for the entire generation — reminding us that life is finite and every day must count. At the same time, the righteous continue to influence the world from the Next World even more powerfully than in this one.",
    analysisHe: "רבי נחמן מלמד שכשצדיק או מנהיג גדול נפטר מהעולם, זה יוצר חלל רוחני שהדור צריך למלא.",
    breslovSources: [
      { book: 'likutay-moharan', part: 1, torah: 4, title: 'Likutay Moharan 4', titleHe: 'ליקוטי מוהר"ן ד\'', desc: 'The Tzaddik is the foundation of the world — the righteous leader sustains and elevates the entire generation', url: '/reader/likutay-moharan/part-1/torah-4' },
      { book: 'likutay-moharan', part: 1, torah: 61, title: 'Likutay Moharan 61', titleHe: 'ליקוטי מוהר"ן ס"א', desc: 'The power of the Tzaddik\'s teachings endures beyond physical death', url: '/reader/likutay-moharan/part-1/torah-61' },
      { book: 'likutay-moharan', part: 1, torah: 66, title: 'Likutay Moharan 66', titleHe: 'ליקוטי מוהר"ן ס"ו', desc: 'Understanding death and the eternal nature of the soul', url: '/reader/likutay-moharan/part-1/torah-66' },
      { book: 'likutay-moharan', part: 2, torah: 8, title: 'Likutay Moharan II 8', titleHe: 'ליקוטי מוהר"ן תניינא ח\'', desc: 'The world is a narrow bridge — do not fear death, for the soul lives on eternally', url: '/reader/likutay-moharan/part-2/torah-8' },
      { book: 'sichos-haran', part: 0, torah: 225, title: 'Sichos HaRan 225', titleHe: 'שיחות הר"ן רכ"ה', desc: 'R\' Nachman\'s teachings about the soul\'s journey after death', url: '/reader/sichos-haran/sicha-225' },
    ],
    traditionalSources: [
      { source: 'Talmud, Moed Katan 28a', desc: 'The death of the righteous atones like the destruction of the Beis HaMikdash' },
      { source: 'Zohar, Acharei Mot 56b', desc: 'The Tzaddik after passing ascends to a higher level and continues to advocate for the generation' },
      { source: 'Ramchal, Derech Hashem 2:3', desc: 'The soul continues its journey and growth in the World to Come' },
    ]
  },
  {
    id: 'terrorism',
    label: 'Terrorist Attack / Violence',
    labelHe: 'פיגוע / אלימות',
    icon: '💔',
    keywords: ['terrorist', 'terrorism', 'attack', 'shooting', 'bombing', 'hostage', 'massacre', 'violence', 'mass shooting', 'stabbing', 'extremism', 'radical', 'innocent', 'victims', 'terror'],
    keywordsHe: ['פיגוע', 'טרור', 'ירי', 'אלימות', 'חטיפה', 'טבח'],
    searchTerms: ['enemy', 'evil', 'wicked', 'suffer', 'innocent', 'blood', 'cry', 'justice', 'revenge', 'save'],
    analysis: "When innocent blood is shed, the Torah demands that we do not become numb or accept it as normal. R' Nachman teaches that the deepest suffering comes from a world where God's light is most concealed. Even in the darkest tragedy, the Torah perspective insists: there is a God who sees, who cares, and who will bring ultimate justice. Our response must be to increase in light — more prayer, more kindness, more Torah — to push back the darkness.",
    analysisHe: "כאשר דם נקי נשפך, התורה דורשת שלא נהיה אדישים. רבי נחמן מלמד שהסבל העמוק ביותר בא מעולם שבו אור ה' מוסתר ביותר.",
    breslovSources: [
      { book: 'likutay-moharan', part: 1, torah: 64, title: 'Likutay Moharan 64', titleHe: 'ליקוטי מוהר"ן ס"ד', desc: 'Come to Pharaoh — finding God even in the deepest concealment and darkest evil', url: '/reader/likutay-moharan/part-1/torah-64' },
      { book: 'likutay-moharan', part: 2, torah: 8, title: 'Likutay Moharan II 8', titleHe: 'ליקוטי מוהר"ן תניינא ח\'', desc: 'The world is a narrow bridge — do not be afraid; fear is the real enemy', url: '/reader/likutay-moharan/part-2/torah-8' },
      { book: 'likutay-moharan', part: 2, torah: 1, title: 'Likutay Moharan II 1', titleHe: 'ליקוטי מוהר"ן תניינא א\'', desc: 'Faith pierces through all darkness — emunah is the light that no evil can extinguish', url: '/reader/likutay-moharan/part-2/torah-1' },
      { book: 'likutay-moharan', part: 1, torah: 5, title: 'Likutay Moharan 5', titleHe: 'ליקוטי מוהר"ן ה\'', desc: 'Joy transforms harsh judgment — even in suffering, finding the spark of holiness', url: '/reader/likutay-moharan/part-1/torah-5' },
      { book: 'likutay-moharan', part: 2, torah: 12, title: 'Likutay Moharan II 12', titleHe: 'ליקוטי מוהר"ן תניינא י"ב', desc: 'There are those who go through the greatest darkness yet emerge into the greatest light', url: '/reader/likutay-moharan/part-2/torah-12' },
      { book: 'likutay-tefilos', part: 2, torah: 1, title: 'Likutay Tefilos II 1', titleHe: 'ליקוטי תפילות ח"ב א\'', desc: 'Prayer for faith and strength when facing terror and tragedy', url: '/reader/likutay-tefilos/part-2/prayer-1' },
    ],
    traditionalSources: [
      { source: 'Talmud, Sanhedrin 37a', desc: 'Whoever destroys a single soul, it is as if they destroyed an entire world' },
      { source: 'Zohar, Shemos 2a', desc: 'Even in the deepest exile and suffering, the Shechinah (Divine Presence) is with Israel' },
      { source: 'Ramchal, Da\'at Tevunot 40', desc: 'The suffering of the righteous and innocent will ultimately be revealed as purposeful in the World to Come' },
    ]
  },
  {
    id: 'natural-disaster',
    label: 'Natural Disaster (General)',
    labelHe: 'אסון טבע',
    icon: '🌋',
    keywords: ['natural disaster', 'disaster', 'catastrophe', 'calamity', 'devastation', 'emergency', 'rescue', 'relief', 'aid', 'crisis', 'volcano', 'eruption', 'landslide', 'avalanche'],
    keywordsHe: ['אסון טבע', 'אסון', 'קטסטרופה', 'הר געש'],
    searchTerms: ['nature', 'disaster', 'world', 'judgment', 'creation', 'tremble', 'heaven', 'earth'],
    analysis: "R' Nachman teaches that nature is not separate from Hashem — it is the garment through which divine providence operates. When nature turns destructive, it is a message from the Creator calling His children to wake up and return. The Hebrew word for nature (hateva) has the same letters as 'drowned' (nitba), hinting that within the natural world, holiness is submerged and waiting to be revealed through our prayers and mitzvos.",
    analysisHe: "רבי נחמן מלמד שהטבע אינו נפרד מה' — הוא הלבוש שדרכו פועלת ההשגחה האלוקית.",
    breslovSources: [
      { book: 'likutay-moharan', part: 1, torah: 52, title: 'Likutay Moharan 52', titleHe: 'ליקוטי מוהר"ן נ"ב', desc: 'Gratitude and praise to Hashem in all circumstances — recognizing providence even in calamity', url: '/reader/likutay-moharan/part-1/torah-52' },
      { book: 'likutay-moharan', part: 2, torah: 5, title: 'Likutay Moharan II 5', titleHe: 'ליקוטי מוהר"ן תניינא ה\'', desc: 'Emunah — faith that everything Hashem does is for the good, even what we cannot understand', url: '/reader/likutay-moharan/part-2/torah-5' },
      { book: 'likutay-moharan', part: 1, torah: 56, title: 'Likutay Moharan 56', titleHe: 'ליקוטי מוהר"ן נ"ו', desc: 'Each blade of grass sings its song — nature itself contains divine praise and purpose', url: '/reader/likutay-moharan/part-1/torah-56' },
      { book: 'likutay-moharan', part: 1, torah: 5, title: 'Likutay Moharan 5', titleHe: 'ליקוטי מוהר"ן ה\'', desc: 'Sweetening harsh judgments through joy — transforming gevurah (strictness) into chesed (kindness)', url: '/reader/likutay-moharan/part-1/torah-5' },
      { book: 'likutay-moharan', part: 2, torah: 8, title: 'Likutay Moharan II 8', titleHe: 'ליקוטי מוהר"ן תניינא ח\'', desc: 'The whole world is a narrow bridge — courage and faith in times of danger', url: '/reader/likutay-moharan/part-2/torah-8' },
    ],
    traditionalSources: [
      { source: 'Talmud, Yevamot 63a', desc: 'Calamities come to the world only on account of Israel — to inspire their return to Hashem' },
      { source: 'Zohar, Noach 69a', desc: 'All creation responds to the spiritual state of humanity — nature reflects the soul of the world' },
      { source: 'Ramchal, Derech Hashem 2:5', desc: 'Nothing in the physical world happens by chance — every event serves a divine purpose' },
    ]
  },
  {
    id: 'famine',
    label: 'Famine / Hunger / Drought',
    labelHe: 'רעב / בצורת',
    icon: '🏜️',
    keywords: ['famine', 'hunger', 'starvation', 'drought', 'food shortage', 'crop failure', 'malnutrition', 'food crisis', 'water shortage', 'desertification', 'food insecurity'],
    keywordsHe: ['רעב', 'בצורת', 'מחסור', 'יובש', 'רעבון'],
    searchTerms: ['hunger', 'bread', 'food', 'famine', 'sustenance', 'eat', 'thirst', 'rain', 'grain'],
    analysis: "The Torah reveals that famine is not merely a physical phenomenon but reflects a spiritual hunger. The prophet Amos warned of a time when there would be a famine 'not of bread, nor thirst for water, but of hearing the words of Hashem.' R' Nachman teaches that physical hunger parallels the soul's hunger for connection to its Creator. The remedy is Torah study and prayer, which nourish both body and soul.",
    analysisHe: "התורה מגלה שרעב אינו רק תופעה פיזית אלא משקף רעב רוחני.",
    breslovSources: [
      { book: 'likutay-moharan', part: 1, torah: 47, title: 'Likutay Moharan 47', titleHe: 'ליקוטי מוהר"ן מ"ז', desc: 'Nourishment of body and soul — the connection between physical eating and spiritual elevation', url: '/reader/likutay-moharan/part-1/torah-47' },
      { book: 'likutay-moharan', part: 1, torah: 62, title: 'Likutay Moharan 62', titleHe: 'ליקוטי מוהר"ן ס"ב', desc: 'Crying out to Hashem in times of need — prayers for sustenance and provision', url: '/reader/likutay-moharan/part-1/torah-62' },
      { book: 'likutay-moharan', part: 2, torah: 7, title: 'Likutay Moharan II 7', titleHe: 'ליקוטי מוהר"ן תניינא ז\'', desc: 'Livelihood and sustenance — understanding the spiritual channels of provision', url: '/reader/likutay-moharan/part-2/torah-7' },
      { book: 'likutay-moharan', part: 1, torah: 13, title: 'Likutay Moharan 13', titleHe: 'ליקוטי מוהר"ן י"ג', desc: 'Tzedakah (charity) sweetens harsh decrees and draws down blessing', url: '/reader/likutay-moharan/part-1/torah-13' },
      { book: 'likutay-moharan', part: 1, torah: 17, title: 'Likutay Moharan 17', titleHe: 'ליקוטי מוהר"ן י"ז', desc: 'Eating in holiness elevates the sparks of creation', url: '/reader/likutay-moharan/part-1/torah-17' },
    ],
    traditionalSources: [
      { source: 'Talmud, Ta\'anit 11a', desc: 'When there is famine in the city, a person should not eat to excess — solidarity with those who suffer' },
      { source: 'Zohar, Miketz 193a', desc: 'Famine comes when the higher spiritual channels of abundance are blocked' },
      { source: 'Ramchal, Derech Hashem 2:3', desc: 'Physical lack reflects spiritual disconnection — the cure is reconnection' },
    ]
  },
  {
    id: 'scandal',
    label: 'Scandal / Corruption',
    labelHe: 'שערורייה / שחיתות',
    icon: '🔍',
    keywords: ['scandal', 'corruption', 'fraud', 'bribery', 'embezzlement', 'coverup', 'abuse', 'misconduct', 'exposure', 'whistleblower', 'investigation', 'indictment', 'crime', 'dishonest'],
    keywordsHe: ['שערורייה', 'שחיתות', 'מרמה', 'שוחד', 'חשיפה'],
    searchTerms: ['truth', 'lie', 'falsehood', 'honest', 'judge', 'justice', 'corruption', 'shame', 'expose'],
    analysis: "R' Nachman teaches that truth is the seal of the Holy One — and falsehood cannot endure forever. When scandals are revealed, it is Hashem's light breaking through the darkness of concealment. The exposure of corruption is itself a form of rectification (tikkun). Our response should be to strengthen our own commitment to truth (emes) in speech, business, and relationships.",
    analysisHe: "רבי נחמן מלמד שאמת היא חותמו של הקב\"ה — ושקר לא יכול להתקיים לנצח.",
    breslovSources: [
      { book: 'likutay-moharan', part: 1, torah: 51, title: 'Likutay Moharan 51', titleHe: 'ליקוטי מוהר"ן נ"א', desc: 'Truth and falsehood — the power of truth to overcome all deception', url: '/reader/likutay-moharan/part-1/torah-51' },
      { book: 'likutay-moharan', part: 1, torah: 64, title: 'Likutay Moharan 64', titleHe: 'ליקוטי מוהר"ן ס"ד', desc: 'Faith, truth, and repentance — the spiritual roots of honesty and integrity', url: '/reader/likutay-moharan/part-1/torah-64' },
      { book: 'likutay-moharan', part: 1, torah: 6, title: 'Likutay Moharan 6', titleHe: 'ליקוטי מוהר"ן ו\'', desc: 'Teshuvah restores what sin has corrupted — repentance is available to everyone', url: '/reader/likutay-moharan/part-1/torah-6' },
      { book: 'likutay-moharan', part: 1, torah: 10, title: 'Likutay Moharan 10', titleHe: 'ליקוטי מוהר"ן י\'', desc: 'True judgment and humility — how justice must be administered with mercy', url: '/reader/likutay-moharan/part-1/torah-10' },
      { book: 'sefer-hamidos', part: 0, torah: 1, title: 'Sefer HaMidos - Truth', titleHe: 'ספר המידות - אמת', desc: 'R\' Nachman\'s collected teachings on the attribute of truth', url: '/reader/sefer-hamidos/topic-1' },
    ],
    traditionalSources: [
      { source: 'Talmud, Shabbat 104a', desc: 'Truth stands on its own (emes has two feet), falsehood cannot stand (sheker has only points)' },
      { source: 'Zohar, Bereishis 2a', desc: 'Truth is the foundation of the world — when truth is compromised, the world itself is endangered' },
      { source: 'Ramchal, Mesillas Yesharim Ch. 11', desc: 'The trait of cleanliness (nekiyut) — maintaining integrity in all dealings' },
    ]
  },
  {
    id: 'discovery',
    label: 'Discovery / Scientific Breakthrough',
    labelHe: 'גילוי / פריצת דרך מדעית',
    icon: '🔬',
    keywords: ['discovery', 'breakthrough', 'scientific', 'research', 'invention', 'innovation', 'nobel', 'experiment', 'achievement', 'milestone', 'advance', 'progress', 'technology breakthrough'],
    keywordsHe: ['גילוי', 'פריצת דרך', 'מדע', 'חדשנות', 'המצאה'],
    searchTerms: ['wisdom', 'knowledge', 'discover', 'new', 'understand', 'intellect', 'creation', 'wonder'],
    analysis: "R' Nachman teaches that every piece of wisdom and every discovery in the world contains a spark of divine wisdom waiting to be elevated. True chochmah (wisdom) recognizes that all knowledge ultimately points back to the Creator. Scientific breakthroughs remind us of the infinite depth of Creation and the divine intelligence embedded in every atom. The task is to use new knowledge to serve Hashem and benefit humanity.",
    analysisHe: "רבי נחמן מלמד שכל חכמה וכל גילוי בעולם מכיל ניצוץ של חכמה אלוקית שמחכה להתעלות.",
    breslovSources: [
      { book: 'likutay-moharan', part: 1, torah: 1, title: 'Likutay Moharan 1', titleHe: 'ליקוטי מוהר"ן א\'', desc: 'Contemplating the intellect in all things — finding divine wisdom in every aspect of creation', url: '/reader/likutay-moharan/part-1/torah-1' },
      { book: 'likutay-moharan', part: 1, torah: 64, title: 'Likutay Moharan 64', titleHe: 'ליקוטי מוהר"ן ס"ד', desc: 'The depths of wisdom and understanding — seeking truth beyond surface appearances', url: '/reader/likutay-moharan/part-1/torah-64' },
      { book: 'likutay-moharan', part: 1, torah: 4, title: 'Likutay Moharan 4', titleHe: 'ליקוטי מוהר"ן ד\'', desc: 'Holy knowledge (da\'at) — the highest form of wisdom that connects all understanding to its Source', url: '/reader/likutay-moharan/part-1/torah-4' },
      { book: 'likutay-moharan', part: 2, torah: 12, title: 'Likutay Moharan II 12', titleHe: 'ליקוטי מוהר"ן תניינא י"ב', desc: 'The greatest wisdom is to not be wise at all — true humility before the infinite Creator', url: '/reader/likutay-moharan/part-2/torah-12' },
      { book: 'likutay-moharan', part: 1, torah: 24, title: 'Likutay Moharan 24', titleHe: 'ליקוטי מוהר"ן כ"ד', desc: 'The unification of all wisdoms under Torah — every science reflects a facet of divine wisdom', url: '/reader/likutay-moharan/part-1/torah-24' },
    ],
    traditionalSources: [
      { source: 'Talmud, Niddah 31a', desc: 'There are three partners in the creation of a person — science reveals the wisdom of the Creator' },
      { source: 'Zohar, Bereishis 134a', desc: 'All wisdoms of the world have roots in the supernal wisdom — Torah is the blueprint of creation' },
      { source: 'Ramchal, Derech Hashem 1:2', desc: 'The purpose of creation is for Hashem to bestow goodness — every discovery reveals more of this goodness' },
    ]
  },
  {
    id: 'miracle',
    label: 'Miracle / Rescue / Survival',
    labelHe: 'נס / הצלה / הישרדות',
    icon: '✨',
    keywords: ['miracle', 'miraculous', 'rescue', 'survive', 'survival', 'saved', 'extraordinary', 'wonder', 'incredible', 'hero', 'amazing rescue', 'against all odds', 'divine intervention'],
    keywordsHe: ['נס', 'הצלה', 'הישרדות', 'פלא', 'גיבור'],
    searchTerms: ['miracle', 'save', 'rescue', 'wonder', 'providence', 'faith', 'trust', 'Hashem', 'praise'],
    analysis: "R' Nachman teaches that miracles are happening constantly — the problem is that we are too asleep to notice them. When an obvious miracle or rescue occurs, it opens our eyes to see Hashem's hand in everything. Recognizing miracles strengthens emunah and brings more miracles. Our response should be praise, thanksgiving, and sharing the story to inspire others — for publicizing miracles (pirsumei nisa) draws down more divine light.",
    analysisHe: "רבי נחמן מלמד שניסים קורים כל הזמן — הבעיה היא שאנחנו ישנים מכדי לשים לב.",
    breslovSources: [
      { book: 'likutay-moharan', part: 1, torah: 7, title: 'Likutay Moharan 7', titleHe: 'ליקוטי מוהר"ן ז\'', desc: 'Seeing Hashem\'s hand in everything — recognizing divine providence in daily life', url: '/reader/likutay-moharan/part-1/torah-7' },
      { book: 'likutay-moharan', part: 2, torah: 5, title: 'Likutay Moharan II 5', titleHe: 'ליקוטי מוהר"ן תניינא ה\'', desc: 'Emunah reveals miracles — the stronger our faith, the more we see Hashem\'s wonders', url: '/reader/likutay-moharan/part-2/torah-5' },
      { book: 'likutay-moharan', part: 2, torah: 1, title: 'Likutay Moharan II 1', titleHe: 'ליקוטי מוהר"ן תניינא א\'', desc: 'Faith is the foundation of all miracles — through emunah, the impossible becomes possible', url: '/reader/likutay-moharan/part-2/torah-1' },
      { book: 'likutay-moharan', part: 1, torah: 2, title: 'Likutay Moharan 2', titleHe: 'ליקוטי מוהר"ן ב\'', desc: 'Prayer draws miracles — the weapon of Mashiach that can overturn all natural limitations', url: '/reader/likutay-moharan/part-1/torah-2' },
      { book: 'likutay-moharan', part: 1, torah: 52, title: 'Likutay Moharan 52', titleHe: 'ליקוטי מוהר"ן נ"ב', desc: 'Gratitude and praise — how thanking Hashem for past miracles draws future ones', url: '/reader/likutay-moharan/part-1/torah-52' },
    ],
    traditionalSources: [
      { source: 'Talmud, Niddah 31a', desc: 'One who experiences a miracle does not recognize it — we must train ourselves to see divine intervention' },
      { source: 'Zohar, Beshalach 56a', desc: 'When Israel praises Hashem for miracles, it opens the gates of heaven for more salvation' },
      { source: 'Ramchal, Derech Hashem 2:5', desc: 'Miracles and nature are both expressions of divine will — they differ only in frequency, not in source' },
    ]
  },
  {
    id: 'peace',
    label: 'Peace Treaty / Reconciliation',
    labelHe: 'הסכם שלום / פיוס',
    icon: '🕊️',
    keywords: ['peace', 'treaty', 'ceasefire', 'reconciliation', 'agreement', 'accord', 'truce', 'diplomacy', 'negotiation', 'harmony', 'unity', 'cooperation', 'compromise'],
    keywordsHe: ['שלום', 'הסכם', 'פיוס', 'הפסקת אש', 'דיפלומטיה'],
    searchTerms: ['peace', 'shalom', 'unity', 'harmony', 'love', 'brotherhood', 'reconcile'],
    analysis: "Peace (shalom) is the vessel that contains all blessing. R' Nachman teaches that true peace is not merely the absence of conflict but the integration of opposites into a higher unity. Every peace in this world reflects the supernal peace — the unification of Hashem's Name. When we see peace taking root between nations, it is a glimpse of the ultimate peace of the Messianic era.",
    analysisHe: "שלום הוא הכלי שמחזיק את כל הברכה. רבי נחמן מלמד ששלום אמיתי אינו רק היעדר סכסוך אלא שילוב של הפכים לאחדות גבוהה יותר.",
    breslovSources: [
      { book: 'likutay-moharan', part: 1, torah: 14, title: 'Likutay Moharan 14', titleHe: 'ליקוטי מוהר"ן י"ד', desc: 'Peace is the vessel for all blessing — how to draw peace into the world through Torah', url: '/reader/likutay-moharan/part-1/torah-14' },
      { book: 'likutay-moharan', part: 1, torah: 80, title: 'Likutay Moharan 80', titleHe: 'ליקוטי מוהר"ן פ\'', desc: 'Making peace between people — the great merit of those who pursue reconciliation', url: '/reader/likutay-moharan/part-1/torah-80' },
      { book: 'likutay-moharan', part: 1, torah: 27, title: 'Likutay Moharan 27', titleHe: 'ליקוטי מוהר"ן כ"ז', desc: 'Ahavat Yisrael (love of fellow Jews) — the foundation upon which peace is built', url: '/reader/likutay-moharan/part-1/torah-27' },
      { book: 'likutay-moharan', part: 2, torah: 1, title: 'Likutay Moharan II 1', titleHe: 'ליקוטי מוהר"ן תניינא א\'', desc: 'The ultimate peace will come through faith — emunah unifies all hearts', url: '/reader/likutay-moharan/part-2/torah-1' },
      { book: 'likutay-tefilos', part: 1, torah: 14, title: 'Likutay Tefilos 14', titleHe: 'ליקוטי תפילות י"ד', desc: 'R\' Nosson\'s prayer for universal peace', url: '/reader/likutay-tefilos/part-1/prayer-14' },
    ],
    traditionalSources: [
      { source: 'Talmud, Uktzin 3:12', desc: 'Hashem found no vessel that can contain blessing except peace' },
      { source: 'Zohar, Terumah 170b', desc: 'Shalom is the Name of Hashem — every act of peace reveals the divine' },
      { source: 'Ramchal, Mesillas Yesharim Ch. 19', desc: 'The pursuit of peace (rodef shalom) is among the highest spiritual attainments' },
    ]
  },
  {
    id: 'building',
    label: 'Building / Construction',
    labelHe: 'בנייה / פיתוח',
    icon: '🏗️',
    keywords: ['building', 'construction', 'development', 'infrastructure', 'architecture', 'urban', 'housing', 'renovation', 'project', 'landmark', 'skyline', 'tower', 'bridge'],
    keywordsHe: ['בנייה', 'פיתוח', 'תשתיות', 'דיור', 'מגדל'],
    searchTerms: ['build', 'house', 'temple', 'construct', 'establish', 'foundation', 'wall', 'gate'],
    analysis: "Every act of building in this world reflects the building of the spiritual Beis HaMikdash (Holy Temple). R' Nachman teaches that the true 'building' is the construction of the soul through Torah, prayer, and good deeds. Physical construction should inspire us to ask: What am I building in my spiritual life? What legacy am I constructing for eternity?",
    analysisHe: "כל מעשה בנייה בעולם הזה משקף את בניית בית המקדש הרוחני.",
    breslovSources: [
      { book: 'likutay-moharan', part: 1, torah: 2, title: 'Likutay Moharan 2', titleHe: 'ליקוטי מוהר"ן ב\'', desc: 'The spiritual Temple built through prayer — each prayer is a stone in the eternal edifice', url: '/reader/likutay-moharan/part-1/torah-2' },
      { book: 'likutay-moharan', part: 1, torah: 20, title: 'Likutay Moharan 20', titleHe: 'ליקוטי מוהר"ן כ\'', desc: 'Tikkun HaKlali — the general rectification that repairs all spiritual structures', url: '/reader/likutay-moharan/part-1/torah-20' },
      { book: 'likutay-moharan', part: 1, torah: 61, title: 'Likutay Moharan 61', titleHe: 'ליקוטי מוהר"ן ס"א', desc: 'Building the world through truth — construction that endures must be founded on honesty', url: '/reader/likutay-moharan/part-1/torah-61' },
      { book: 'likutay-moharan', part: 1, torah: 7, title: 'Likutay Moharan 7', titleHe: 'ליקוטי מוהר"ן ז\'', desc: 'Creating vessels for divine light — the spiritual architecture of the soul', url: '/reader/likutay-moharan/part-1/torah-7' },
    ],
    traditionalSources: [
      { source: 'Talmud, Shabbat 114a', desc: 'A Torah scholar is called a "builder" — one who builds the world through wisdom' },
      { source: 'Zohar, Terumah 127a', desc: 'The building of the Mishkan (Tabernacle) mirrors the creation of the world' },
      { source: 'Ramchal, Derech Hashem 1:2', desc: 'The purpose of creation is to build a dwelling place for divine presence in the lower worlds' },
    ]
  },
  {
    id: 'education',
    label: 'Education / Schools / Children',
    labelHe: 'חינוך / ילדים',
    icon: '📚',
    keywords: ['education', 'school', 'university', 'children', 'student', 'teacher', 'learning', 'curriculum', 'graduation', 'literacy', 'classroom', 'youth', 'generation', 'training'],
    keywordsHe: ['חינוך', 'בית ספר', 'ילדים', 'תלמידים', 'מורים', 'לימודים'],
    searchTerms: ['children', 'teach', 'learn', 'student', 'Torah', 'education', 'youth', 'raise', 'generation'],
    analysis: "R' Nachman teaches that the breath of children studying Torah is what sustains the entire world. Education is not merely the transmission of information but the kindling of a flame — inspiring the next generation to connect with their Creator. Every child carries a unique purpose, and the role of education is to help each soul discover and fulfill its mission.",
    analysisHe: "רבי נחמן מלמד שהבל פיהם של תינוקות של בית רבן הוא שמקיים את כל העולם.",
    breslovSources: [
      { book: 'likutay-moharan', part: 1, torah: 1, title: 'Likutay Moharan 1', titleHe: 'ליקוטי מוהר"ן א\'', desc: 'Torah is the source of all wisdom — learning Torah in order to teach is the highest form of study', url: '/reader/likutay-moharan/part-1/torah-1' },
      { book: 'likutay-moharan', part: 1, torah: 282, title: 'Likutay Moharan 282', titleHe: 'ליקוטי מוהר"ן רפ"ב', desc: 'The simplicity of pure prayer — teaching children to speak to Hashem naturally', url: '/reader/likutay-moharan/part-1/torah-282' },
      { book: 'likutay-moharan', part: 2, torah: 7, title: 'Likutay Moharan II 7', titleHe: 'ליקוטי מוהר"ן תניינא ז\'', desc: 'Da\'at (knowledge) as the root of all — educating the mind and heart together', url: '/reader/likutay-moharan/part-2/torah-7' },
      { book: 'likutay-moharan', part: 2, torah: 24, title: 'Likutay Moharan II 24', titleHe: 'ליקוטי מוהר"ן תניינא כ"ד', desc: 'Joy in learning — creating an atmosphere of simcha that makes Torah learning come alive', url: '/reader/likutay-moharan/part-2/torah-24' },
      { book: 'sichos-haran', part: 0, torah: 29, title: 'Sichos HaRan 29', titleHe: 'שיחות הר"ן כ"ט', desc: 'R\' Nachman on the importance of raising children with love and patience', url: '/reader/sichos-haran/sicha-29' },
    ],
    traditionalSources: [
      { source: 'Talmud, Shabbat 119b', desc: 'The world is sustained only by the breath of schoolchildren studying Torah' },
      { source: 'Zohar, Vayakhel 196a', desc: 'Children\'s prayers ascend higher than any other — their pure souls have direct access' },
      { source: 'Ramchal, Derech Hashem 4:2', desc: 'Each soul descends with a unique mission — education must help reveal it' },
    ]
  },
  {
    id: 'marriage',
    label: 'Marriage / Family / Birth',
    labelHe: 'נישואין / משפחה / לידה',
    icon: '💍',
    keywords: ['marriage', 'wedding', 'family', 'birth', 'baby', 'newborn', 'couple', 'love', 'relationship', 'spouse', 'husband', 'wife', 'pregnancy', 'engagement', 'fertility', 'parent'],
    keywordsHe: ['נישואין', 'חתונה', 'משפחה', 'לידה', 'תינוק', 'זוגיות'],
    searchTerms: ['marriage', 'bride', 'groom', 'love', 'couple', 'birth', 'child', 'family', 'shalom', 'home'],
    analysis: "R' Nachman teaches that every marriage reflects the cosmic union between the Holy One and the Shechinah. Building a Jewish home is the greatest act of creation a person can do — for every child born is a new world. Marriage requires siyata d'Shmaya (divine assistance), and the key to shalom bayit (domestic peace) is humility, patience, and constant prayer.",
    analysisHe: "רבי נחמן מלמד שכל נישואין משקפים את הייחוד העליון בין הקב\"ה לשכינה.",
    breslovSources: [
      { book: 'likutay-moharan', part: 1, torah: 6, title: 'Likutay Moharan 6', titleHe: 'ליקוטי מוהר"ן ו\'', desc: 'Marriage and holiness — the deep connection between teshuvah and building a holy home', url: '/reader/likutay-moharan/part-1/torah-6' },
      { book: 'likutay-moharan', part: 1, torah: 14, title: 'Likutay Moharan 14', titleHe: 'ליקוטי מוהר"ן י"ד', desc: 'Shalom — peace in the home is the vessel for all blessings', url: '/reader/likutay-moharan/part-1/torah-14' },
      { book: 'likutay-moharan', part: 1, torah: 56, title: 'Likutay Moharan 56', titleHe: 'ליקוטי מוהר"ן נ"ו', desc: 'Song and melody in the home — joy that sustains the marriage bond', url: '/reader/likutay-moharan/part-1/torah-56' },
      { book: 'likutay-moharan', part: 2, torah: 8, title: 'Likutay Moharan II 8', titleHe: 'ליקוטי מוהר"ן תניינא ח\'', desc: 'The narrow bridge of relationships — overcoming challenges with faith and courage', url: '/reader/likutay-moharan/part-2/torah-8' },
      { book: 'likutay-moharan', part: 1, torah: 23, title: 'Likutay Moharan 23', titleHe: 'ליקוטי מוהר"ן כ"ג', desc: 'Joy draws down spiritual abundance into the home', url: '/reader/likutay-moharan/part-1/torah-23' },
    ],
    traditionalSources: [
      { source: 'Talmud, Sotah 17a', desc: 'When husband and wife merit, the Shechinah dwells between them' },
      { source: 'Zohar, Bereishis 49a', desc: 'Every soul has a destined partner — marriage is the reunion of two halves' },
      { source: 'Ramchal, Mesillas Yesharim Ch. 26', desc: 'Holiness in the home draws divine presence into the physical world' },
    ]
  },
  {
    id: 'poverty',
    label: 'Poverty / Homelessness',
    labelHe: 'עוני / חוסר בית',
    icon: '🏚️',
    keywords: ['poverty', 'poor', 'homeless', 'homelessness', 'destitute', 'inequality', 'welfare', 'hunger', 'shelter', 'charity', 'aid', 'disadvantaged', 'struggling'],
    keywordsHe: ['עוני', 'חוסר בית', 'אי שוויון', 'צדקה', 'עזרה'],
    searchTerms: ['poor', 'poverty', 'charity', 'give', 'help', 'mercy', 'compassion', 'bread', 'hungry'],
    analysis: "R' Nachman reveals that poverty can be a spiritual test but also a gateway to closeness with Hashem. The Torah commands us to open our hands wide to the poor. Charity (tzedakah) is not merely helping others — it is a tikkun (repair) for the world and for one's own soul. Every person who gives, even a little, becomes a partner with Hashem in sustaining creation.",
    analysisHe: "רבי נחמן מגלה שעוני יכול להיות מבחן רוחני אבל גם שער לקרבת ה'.",
    breslovSources: [
      { book: 'likutay-moharan', part: 1, torah: 13, title: 'Likutay Moharan 13', titleHe: 'ליקוטי מוהר"ן י"ג', desc: 'The immense power of tzedakah — charity opens all gates and sweetens all judgments', url: '/reader/likutay-moharan/part-1/torah-13' },
      { book: 'likutay-moharan', part: 2, torah: 4, title: 'Likutay Moharan II 4', titleHe: 'ליקוטי מוהר"ן תניינא ד\'', desc: 'Hisbodedus (personal prayer) — even the poorest person can speak to Hashem', url: '/reader/likutay-moharan/part-2/torah-4' },
      { book: 'likutay-moharan', part: 2, torah: 7, title: 'Likutay Moharan II 7', titleHe: 'ליקוטי מוהר"ן תניינא ז\'', desc: 'Livelihood flows from da\'at — knowledge of Hashem is the root of sustenance', url: '/reader/likutay-moharan/part-2/torah-7' },
      { book: 'likutay-moharan', part: 2, torah: 3, title: 'Likutay Moharan II 3', titleHe: 'ליקוטי מוהר"ן תניינא ג\'', desc: 'Finding good points even in the depths of poverty and hardship', url: '/reader/likutay-moharan/part-2/torah-3' },
      { book: 'likutay-moharan', part: 2, torah: 24, title: 'Likutay Moharan II 24', titleHe: 'ליקוטי מוהר"ן תניינא כ"ד', desc: 'Simcha (joy) even in poverty — joy itself is a form of wealth', url: '/reader/likutay-moharan/part-2/torah-24' },
    ],
    traditionalSources: [
      { source: 'Talmud, Bava Batra 10a', desc: 'Tzedakah is equal to all mitzvot combined — it saves from death and elevates the giver' },
      { source: 'Zohar, Terumah 162b', desc: 'The poor person who cries out awakens mercy from the highest levels' },
      { source: 'Ramchal, Mesillas Yesharim Ch. 19', desc: 'Compassion and chesed (kindness) are the pillars of divine service' },
    ]
  },
  {
    id: 'technology',
    label: 'Technology / AI / Automation',
    labelHe: 'טכנולוגיה / בינה מלאכותית',
    icon: '🤖',
    keywords: ['technology', 'AI', 'artificial intelligence', 'automation', 'robot', 'machine learning', 'algorithm', 'digital', 'internet', 'cyber', 'data', 'software', 'computing', 'tech'],
    keywordsHe: ['טכנולוגיה', 'בינה מלאכותית', 'אוטומציה', 'רובוט', 'דיגיטלי'],
    searchTerms: ['wisdom', 'creation', 'new', 'generation', 'knowledge', 'tool', 'speech', 'world'],
    analysis: "R' Nachman teaches that every generation has its unique tests and tools. Technology, like all of creation, is neutral — it can be used for holiness or for its opposite. The Torah perspective sees AI and technology as reflections of the divine attribute of chochmah (wisdom) given to humanity. The key question is: Are we using these tools to come closer to Hashem, or are they pulling us further away?",
    analysisHe: "רבי נחמן מלמד שלכל דור יש את המבחנים והכלים הייחודיים שלו. טכנולוגיה, כמו כל הבריאה, היא ניטרלית.",
    breslovSources: [
      { book: 'likutay-moharan', part: 1, torah: 1, title: 'Likutay Moharan 1', titleHe: 'ליקוטי מוהר"ן א\'', desc: 'Finding divine wisdom in all things — even in human creations, there is a spark of the Creator', url: '/reader/likutay-moharan/part-1/torah-1' },
      { book: 'likutay-moharan', part: 1, torah: 54, title: 'Likutay Moharan 54', titleHe: 'ליקוטי מוהר"ן נ"ד', desc: 'The power of speech and language — understanding how words shape reality', url: '/reader/likutay-moharan/part-1/torah-54' },
      { book: 'likutay-moharan', part: 1, torah: 64, title: 'Likutay Moharan 64', titleHe: 'ליקוטי מוהר"ן ס"ד', desc: 'The test of knowledge — when wisdom grows, so does the potential for both good and harm', url: '/reader/likutay-moharan/part-1/torah-64' },
      { book: 'likutay-moharan', part: 2, torah: 5, title: 'Likutay Moharan II 5', titleHe: 'ליקוטי מוהר"ן תניינא ה\'', desc: 'Faith above intellect — emunah must guide how we use knowledge and technology', url: '/reader/likutay-moharan/part-2/torah-5' },
      { book: 'likutay-moharan', part: 2, torah: 12, title: 'Likutay Moharan II 12', titleHe: 'ליקוטי מוהר"ן תניינא י"ב', desc: 'Not being wise in one\'s own eyes — humility in the face of human achievement', url: '/reader/likutay-moharan/part-2/torah-12' },
    ],
    traditionalSources: [
      { source: 'Talmud, Shabbat 75a', desc: 'Whoever knows how to calculate seasons and constellations and fails to do so — the Torah expects us to use knowledge wisely' },
      { source: 'Zohar, Vayeira 117a', desc: 'In the end of days, the wellsprings of wisdom will be opened — a prediction of information age' },
      { source: 'Ramchal, Derech Hashem 1:3', desc: 'Humanity was created to master the physical world and elevate it to serve the divine' },
    ]
  },
  {
    id: 'environmental',
    label: 'Environmental / Climate',
    labelHe: 'סביבתי / אקלים',
    icon: '🌱',
    keywords: ['environment', 'climate', 'global warming', 'pollution', 'deforestation', 'carbon', 'emission', 'sustainability', 'ecology', 'endangered', 'conservation', 'green', 'recycle', 'ozone', 'biodiversity'],
    keywordsHe: ['סביבה', 'אקלים', 'התחממות', 'זיהום', 'בריאות הסביבה'],
    searchTerms: ['earth', 'tree', 'nature', 'world', 'creation', 'plant', 'garden', 'land', 'fruit'],
    analysis: "The Torah begins with creation and entrusts humanity as guardians of the earth. R' Nachman reveals that every blade of grass has a unique song and purpose. Environmental degradation reflects a disconnection from the awareness that the world belongs to Hashem. The remedy is to restore our role as stewards — appreciating nature as a divine gift, not as a resource to exploit.",
    analysisHe: "התורה מתחילה עם הבריאה ומפקידה את האנושות כשומרי הארץ.",
    breslovSources: [
      { book: 'likutay-moharan', part: 1, torah: 56, title: 'Likutay Moharan 56', titleHe: 'ליקוטי מוהר"ן נ"ו', desc: 'Every blade of grass sings a song — the melody of creation and the sanctity of nature', url: '/reader/likutay-moharan/part-1/torah-56' },
      { book: 'likutay-moharan', part: 2, torah: 11, title: 'Likutay Moharan II 11', titleHe: 'ליקוטי מוהר"ן תניינא י"א', desc: 'Hisbodedus in nature — going out to the fields and forests to connect with Hashem through creation', url: '/reader/likutay-moharan/part-2/torah-11' },
      { book: 'likutay-moharan', part: 1, torah: 1, title: 'Likutay Moharan 1', titleHe: 'ליקוטי מוהר"ן א\'', desc: 'Finding the divine intellect in all of creation — seeing Hashem through nature', url: '/reader/likutay-moharan/part-1/torah-1' },
      { book: 'likutay-moharan', part: 1, torah: 52, title: 'Likutay Moharan 52', titleHe: 'ליקוטי מוהר"ן נ"ב', desc: 'Gratitude for creation — praising Hashem for the world He made', url: '/reader/likutay-moharan/part-1/torah-52' },
    ],
    traditionalSources: [
      { source: 'Talmud, Shabbat 67b', desc: 'Bal tashchit — the prohibition against needless destruction applies to all of creation' },
      { source: 'Zohar, Bereishis 32a', desc: 'The earth has a soul — mistreating it has spiritual consequences' },
      { source: 'Ramchal, Derech Hashem 1:2', desc: 'The physical world is meant to be elevated, not destroyed — stewardship is a divine mandate' },
    ]
  },
  {
    id: 'antisemitism',
    label: 'Antisemitism / Persecution',
    labelHe: 'אנטישמיות / רדיפה',
    icon: '✡️',
    keywords: ['antisemitism', 'antisemitic', 'persecution', 'hate crime', 'discrimination', 'pogrom', 'holocaust', 'intolerance', 'bigotry', 'hatred', 'jewish', 'anti-jewish', 'genocide'],
    keywordsHe: ['אנטישמיות', 'רדיפה', 'שנאת ישראל', 'אפליה', 'שואה'],
    searchTerms: ['Israel', 'exile', 'enemy', 'hatred', 'suffer', 'persecute', 'nation', 'protect', 'redeem'],
    analysis: "R' Nachman teaches that antisemitism is a spiritual phenomenon rooted in the nations' unconscious resistance to the light of Torah that Israel carries. The hatred intensifies when the world most needs the spiritual light that only Israel can provide. Our response is not to despair but to strengthen our identity, increase in Torah and mitzvos, and trust that Hashem protects His people — for 'the Eternal One of Israel does not lie.'",
    analysisHe: "רבי נחמן מלמד שאנטישמיות היא תופעה רוחנית השורשית בהתנגדות האומות לאור התורה שישראל נושא.",
    breslovSources: [
      { book: 'likutay-moharan', part: 2, torah: 1, title: 'Likutay Moharan II 1', titleHe: 'ליקוטי מוהר"ן תניינא א\'', desc: 'Emunah — strengthening faith when persecution arises; faith is the light that darkness cannot overcome', url: '/reader/likutay-moharan/part-2/torah-1' },
      { book: 'likutay-moharan', part: 1, torah: 64, title: 'Likutay Moharan 64', titleHe: 'ליקוטי מוהר"ן ס"ד', desc: 'Coming to Pharaoh — confronting the source of evil and finding Hashem even there', url: '/reader/likutay-moharan/part-1/torah-64' },
      { book: 'likutay-moharan', part: 2, torah: 8, title: 'Likutay Moharan II 8', titleHe: 'ליקוטי מוהר"ן תניינא ח\'', desc: 'The world is a narrow bridge — not to be afraid even when surrounded by enemies', url: '/reader/likutay-moharan/part-2/torah-8' },
      { book: 'likutay-moharan', part: 1, torah: 33, title: 'Likutay Moharan 33', titleHe: 'ליקוטי מוהר"ן ל"ג', desc: 'Am Yisrael and the Torah — the eternal bond between the Jewish people and their mission', url: '/reader/likutay-moharan/part-1/torah-33' },
      { book: 'likutay-moharan', part: 1, torah: 5, title: 'Likutay Moharan 5', titleHe: 'ליקוטי מוהר"ן ה\'', desc: 'Joy in the face of adversity — transforming fear and suffering into spiritual elevation', url: '/reader/likutay-moharan/part-1/torah-5' },
    ],
    traditionalSources: [
      { source: 'Talmud, Shabbat 89a', desc: 'Sinai — from there descended hatred (sinah) to the nations, because Israel received the Torah' },
      { source: 'Zohar, Shemos 17a', desc: 'In every generation, Amalek arises — but Hashem is at war with Amalek for all generations' },
      { source: 'Ramchal, Da\'at Tevunot 154', desc: 'Israel\'s suffering serves to purify and elevate the world toward its ultimate rectification' },
    ]
  },
  {
    id: 'unity',
    label: 'Unity / Gathering / Community',
    labelHe: 'אחדות / קהילה',
    icon: '🤝',
    keywords: ['unity', 'gathering', 'community', 'solidarity', 'togetherness', 'assembly', 'rally', 'cooperation', 'collective', 'together', 'united', 'movement', 'congregation'],
    keywordsHe: ['אחדות', 'קהילה', 'ליכוד', 'סולידריות', 'ביחד', 'קיבוץ גלויות'],
    searchTerms: ['unity', 'together', 'gather', 'community', 'one', 'love', 'Israel', 'heart', 'people'],
    analysis: "R' Nachman teaches that the ultimate purpose of creation is unity — 'that they may all be one.' When people gather in love and common purpose, they create a vessel for the Shechinah (Divine Presence). Gathering to the Tzaddik (hitkarevut) is one of the highest forms of this unity. Every act of communal gathering reflects the future ingathering of exiles and the unity of all souls.",
    analysisHe: "רבי נחמן מלמד שהתכלית הסופית של הבריאה היא אחדות.",
    breslovSources: [
      { book: 'likutay-moharan', part: 1, torah: 34, title: 'Likutay Moharan 34', titleHe: 'ליקוטי מוהר"ן ל"ד', desc: 'The power of gathering — when Jews come together, the Shechinah rests among them', url: '/reader/likutay-moharan/part-1/torah-34' },
      { book: 'likutay-moharan', part: 1, torah: 27, title: 'Likutay Moharan 27', titleHe: 'ליקוטי מוהר"ן כ"ז', desc: 'Love of fellow Jews — the foundation of true community and the vessel for divine light', url: '/reader/likutay-moharan/part-1/torah-27' },
      { book: 'likutay-moharan', part: 1, torah: 14, title: 'Likutay Moharan 14', titleHe: 'ליקוטי מוהר"ן י"ד', desc: 'Peace and unity — drawing peace into the world through communal Torah and prayer', url: '/reader/likutay-moharan/part-1/torah-14' },
      { book: 'likutay-moharan', part: 1, torah: 56, title: 'Likutay Moharan 56', titleHe: 'ליקוטי מוהר"ן נ"ו', desc: 'The song of the future — a melody that unites all voices into one harmonious song', url: '/reader/likutay-moharan/part-1/torah-56' },
      { book: 'likutay-moharan', part: 2, torah: 1, title: 'Likutay Moharan II 1', titleHe: 'ליקוטי מוהר"ן תניינא א\'', desc: 'Emunah unites all hearts — faith is the common ground of all souls', url: '/reader/likutay-moharan/part-2/torah-1' },
    ],
    traditionalSources: [
      { source: 'Talmud, Berachot 6a', desc: 'Whenever ten Jews pray together, the Shechinah is with them' },
      { source: 'Zohar, Acharei Mot 73b', desc: 'Unity below awakens unity Above — bringing the Holy One and the Shechinah together' },
      { source: 'Ramchal, Mesillas Yesharim Ch. 19', desc: 'Love and unity among Israel is the ultimate spiritual achievement' },
    ]
  },
  {
    id: 'space',
    label: 'Space / Astronomy',
    labelHe: 'חלל / אסטרונומיה',
    icon: '🚀',
    keywords: ['space', 'astronomy', 'planet', 'star', 'galaxy', 'universe', 'rocket', 'astronaut', 'satellite', 'mars', 'moon', 'telescope', 'comet', 'asteroid', 'cosmic', 'NASA', 'orbit'],
    keywordsHe: ['חלל', 'כוכב', 'כוכב לכת', 'יקום', 'טלסקופ', 'ירח'],
    searchTerms: ['heaven', 'star', 'creation', 'world', 'above', 'glory', 'wonder', 'vast'],
    analysis: "The heavens declare the glory of God. R' Nachman teaches that when we look at the vastness of the cosmos, we should be filled with awe at the greatness of the Creator. Every star, every galaxy, was created with a purpose. The vastness of space humbles us and reminds us that human understanding is infinitely small compared to Hashem's wisdom. Space exploration is humanity gazing toward heaven — may that gaze lead to genuine recognition of the Creator.",
    analysisHe: "השמים מספרים כבוד א-ל. רבי נחמן מלמד שכשמסתכלים על מרחבי היקום, צריכים להתמלא ביראת הכבוד מגדולת הבורא.",
    breslovSources: [
      { book: 'likutay-moharan', part: 1, torah: 1, title: 'Likutay Moharan 1', titleHe: 'ליקוטי מוהר"ן א\'', desc: 'Contemplating the divine intellect in all of creation — from the smallest atom to the greatest galaxy', url: '/reader/likutay-moharan/part-1/torah-1' },
      { book: 'likutay-moharan', part: 1, torah: 5, title: 'Likutay Moharan 5', titleHe: 'ליקוטי מוהר"ן ה\'', desc: 'The fear of Hashem through contemplating His greatness — awe before the infinite Creator', url: '/reader/likutay-moharan/part-1/torah-5' },
      { book: 'likutay-moharan', part: 2, torah: 12, title: 'Likutay Moharan II 12', titleHe: 'ליקוטי מוהר"ן תניינא י"ב', desc: 'The greatest wisdom is to know that we know nothing — humility before the vastness of creation', url: '/reader/likutay-moharan/part-2/torah-12' },
      { book: 'likutay-moharan', part: 1, torah: 56, title: 'Likutay Moharan 56', titleHe: 'ליקוטי מוהר"ן נ"ו', desc: 'The song of creation — every element of the cosmos sings its unique melody', url: '/reader/likutay-moharan/part-1/torah-56' },
    ],
    traditionalSources: [
      { source: 'Talmud, Berachot 10a', desc: 'The soul fills the body as Hashem fills the world — as Above, so below' },
      { source: 'Zohar, Bereishis 1b', desc: 'With ten utterances the world was created — the cosmos is sustained by divine speech' },
      { source: 'Ramchal, Derech Hashem 1:5', desc: 'The physical universe, in all its vastness, is a garment for spiritual reality' },
    ]
  },
  {
    id: 'justice',
    label: 'Justice / Court / Law',
    labelHe: 'צדק / משפט / חוק',
    icon: '⚖️',
    keywords: ['justice', 'court', 'trial', 'verdict', 'law', 'legal', 'judge', 'supreme court', 'ruling', 'sentence', 'acquittal', 'conviction', 'legislation', 'rights', 'lawsuit'],
    keywordsHe: ['צדק', 'משפט', 'בית משפט', 'פסק דין', 'חוק', 'שופט'],
    searchTerms: ['judge', 'justice', 'law', 'right', 'trial', 'merit', 'sin', 'punishment', 'mercy'],
    analysis: "R' Nachman teaches that true justice flows from the Torah, which is the blueprint of all morality and law. Human courts are meant to reflect the Heavenly Court (Beis Din Shel Ma'alah). When we see justice pursued or perverted in the world, it is a reminder that there is an ultimate Judge who sees all and judges with perfect truth. The highest form of justice is when judgment is tempered with mercy.",
    analysisHe: "רבי נחמן מלמד שצדק אמיתי נובע מהתורה, שהיא תכנית האב של כל המוסר והחוק.",
    breslovSources: [
      { book: 'likutay-moharan', part: 1, torah: 10, title: 'Likutay Moharan 10', titleHe: 'ליקוטי מוהר"ן י\'', desc: 'True judgment — the Tzaddik who judges with wisdom, humility, and mercy', url: '/reader/likutay-moharan/part-1/torah-10' },
      { book: 'likutay-moharan', part: 1, torah: 5, title: 'Likutay Moharan 5', titleHe: 'ליקוטי מוהר"ן ה\'', desc: 'Transforming strict judgment (din) into mercy — sweetening decrees through joy and prayer', url: '/reader/likutay-moharan/part-1/torah-5' },
      { book: 'likutay-moharan', part: 1, torah: 14, title: 'Likutay Moharan 14', titleHe: 'ליקוטי מוהר"ן י"ד', desc: 'Raising honor to its root (fear of God) — true justice requires fear of Heaven', url: '/reader/likutay-moharan/part-1/torah-14' },
      { book: 'likutay-moharan', part: 2, torah: 3, title: 'Likutay Moharan II 3', titleHe: 'ליקוטי מוהר"ן תניינא ג\'', desc: 'Judging others favorably — finding the good point even in those who seem guilty', url: '/reader/likutay-moharan/part-2/torah-3' },
      { book: 'likutay-moharan', part: 1, torah: 51, title: 'Likutay Moharan 51', titleHe: 'ליקוטי מוהר"ן נ"א', desc: 'Truth and justice — the inseparable connection between honesty and righteous judgment', url: '/reader/likutay-moharan/part-1/torah-51' },
    ],
    traditionalSources: [
      { source: 'Talmud, Shabbat 10a', desc: 'A judge who renders a truthful verdict becomes a partner with Hashem in creation' },
      { source: 'Zohar, Yisro 78a', desc: 'The supernal court judges with perfect balance of justice and mercy' },
      { source: 'Ramchal, Derech Hashem 2:2', desc: 'Divine judgment operates on principles that transcend human understanding' },
    ]
  },
  {
    id: 'immigration',
    label: 'Immigration / Exile / Refugees',
    labelHe: 'הגירה / גלות / פליטים',
    icon: '🚶',
    keywords: ['immigration', 'immigrant', 'refugee', 'exile', 'migration', 'asylum', 'border', 'displaced', 'deportation', 'diaspora', 'homeland', 'citizenship', 'aliyah'],
    keywordsHe: ['הגירה', 'גלות', 'פליטים', 'מהגרים', 'עלייה', 'גירוש'],
    searchTerms: ['exile', 'galut', 'wander', 'land', 'home', 'return', 'stranger', 'settle', 'redemption'],
    analysis: "The Jewish people know exile more intimately than any nation. R' Nachman teaches that exile (galut) is not just physical displacement but a spiritual condition — the Shechinah itself is in exile. When we see refugees and displaced people, we should feel the pain of the universal exile and pray for the ultimate redemption. Every person seeking a home reflects the soul seeking its true Home with Hashem.",
    analysisHe: "העם היהודי מכיר את הגלות יותר מכל עם. רבי נחמן מלמד שגלות אינה רק עקירה פיזית אלא מצב רוחני.",
    breslovSources: [
      { book: 'likutay-moharan', part: 1, torah: 64, title: 'Likutay Moharan 64', titleHe: 'ליקוטי מוהר"ן ס"ד', desc: 'The deepest exile — finding Hashem even in the most foreign and dark places', url: '/reader/likutay-moharan/part-1/torah-64' },
      { book: 'likutay-moharan', part: 2, torah: 8, title: 'Likutay Moharan II 8', titleHe: 'ליקוטי מוהר"ן תניינא ח\'', desc: 'The narrow bridge — not being afraid during uncertain journeys and transitions', url: '/reader/likutay-moharan/part-2/torah-8' },
      { book: 'likutay-moharan', part: 1, torah: 21, title: 'Likutay Moharan 21', titleHe: 'ליקוטי מוהר"ן כ"א', desc: 'The Land of Israel — the longing for home and the spiritual power of Eretz Yisrael', url: '/reader/likutay-moharan/part-1/torah-21' },
      { book: 'likutay-moharan', part: 2, torah: 1, title: 'Likutay Moharan II 1', titleHe: 'ליקוטי מוהר"ן תניינא א\'', desc: 'Faith during transition — emunah sustains through all displacement and upheaval', url: '/reader/likutay-moharan/part-2/torah-1' },
      { book: 'likutay-moharan', part: 1, torah: 13, title: 'Likutay Moharan 13', titleHe: 'ליקוטי מוהר"ן י"ג', desc: 'Charity for the displaced — the merit of helping those in need', url: '/reader/likutay-moharan/part-1/torah-13' },
    ],
    traditionalSources: [
      { source: 'Talmud, Megillah 29a', desc: 'Everywhere Israel was exiled, the Shechinah was exiled with them' },
      { source: 'Zohar, Shemos 2a', desc: 'The final redemption will gather all exiles — physical and spiritual — back to their Source' },
      { source: 'Ramchal, Da\'at Tevunot 40', desc: 'Exile serves to scatter sparks of holiness throughout the world for eventual gathering' },
    ]
  },
  {
    id: 'medical-breakthrough',
    label: 'Medical Breakthrough / Healing',
    labelHe: 'פריצת דרך רפואית / ריפוי',
    icon: '💊',
    keywords: ['medical', 'medicine', 'cure', 'treatment', 'therapy', 'surgery', 'healing', 'recovery', 'health', 'hospital', 'doctor', 'patient', 'clinical trial', 'pharmaceutical', 'drug', 'remedy'],
    keywordsHe: ['רפואה', 'תרופה', 'ריפוי', 'בריאות', 'בית חולים', 'רופא'],
    searchTerms: ['heal', 'cure', 'medicine', 'doctor', 'sick', 'health', 'remedy', 'body', 'soul'],
    analysis: "R' Nachman, whose teachings on healing are among the most profound in Jewish thought, reveals that the soul and body are deeply interconnected. Every medical breakthrough is a revelation of divine mercy. The Torah permits doctors to heal, but reminds us that the ultimate Healer is Hashem. Our response to medical breakthroughs should be gratitude — and the recognition that spiritual healing (through teshuvah, tefillah, and simcha) goes even deeper.",
    analysisHe: "רבי נחמן, שתורותיו על ריפוי הן מהעמוקות ביותר במחשבה היהודית, מגלה שהנשמה והגוף קשורים עמוקות.",
    breslovSources: [
      { book: 'likutay-moharan', part: 1, torah: 277, title: 'Likutay Moharan 277', titleHe: 'ליקוטי מוהר"ן רע"ז', desc: 'Medicine and healing — the spiritual roots behind physical remedies and treatments', url: '/reader/likutay-moharan/part-1/torah-277' },
      { book: 'likutay-moharan', part: 2, torah: 24, title: 'Likutay Moharan II 24', titleHe: 'ליקוטי מוהר"ן תניינא כ"ד', desc: 'Joy is the greatest medicine — simcha heals body and soul', url: '/reader/likutay-moharan/part-2/torah-24' },
      { book: 'likutay-moharan', part: 1, torah: 31, title: 'Likutay Moharan 31', titleHe: 'ליקוטי מוהר"ן ל"א', desc: 'The ten kinds of melody — music and song as instruments of healing', url: '/reader/likutay-moharan/part-1/torah-31' },
      { book: 'likutay-moharan', part: 2, torah: 3, title: 'Likutay Moharan II 3', titleHe: 'ליקוטי מוהר"ן תניינא ג\'', desc: 'Finding the good points — hope and positivity as pathways to recovery', url: '/reader/likutay-moharan/part-2/torah-3' },
      { book: 'likutay-moharan', part: 1, torah: 14, title: 'Likutay Moharan 14', titleHe: 'ליקוטי מוהר"ן י"ד', desc: 'Peace and wholeness — shalom is the root of all healing', url: '/reader/likutay-moharan/part-1/torah-14' },
    ],
    traditionalSources: [
      { source: 'Talmud, Bava Kamma 85a', desc: 'The Torah gives permission to heal — doctors are agents of divine healing' },
      { source: 'Zohar, Pinchas 217a', desc: 'Every cure in the lower world has a corresponding spiritual root in the upper world' },
      { source: 'Ramchal, Derech Hashem 2:3', desc: 'Physical healing reflects spiritual healing — the body and soul heal together' },
    ]
  },
  {
    id: 'teshuvah',
    label: 'Religious Awakening / Teshuvah',
    labelHe: 'התעוררות דתית / תשובה',
    icon: '🕎',
    keywords: ['religious', 'spiritual', 'awakening', 'revival', 'teshuvah', 'repentance', 'return', 'faith', 'conversion', 'inspiration', 'pilgrimage', 'devotion', 'renewal', 'redemption'],
    keywordsHe: ['תשובה', 'התעוררות', 'אמונה', 'גאולה', 'חזרה בתשובה'],
    searchTerms: ['teshuvah', 'repent', 'return', 'heart', 'soul', 'holy', 'prayer', 'faith', 'awaken'],
    analysis: "R' Nachman teaches that no one is ever too far to return. Teshuvah (return to Hashem) is the most powerful force in creation — it can transform darkness into light and sins into merits. When we witness spiritual awakenings, it is a sign that the light of Mashiach is drawing nearer. Every soul that returns sends ripples of holiness through the entire universe.",
    analysisHe: "רבי נחמן מלמד שאף אחד אינו רחוק מכדי לחזור. תשובה היא הכוח החזק ביותר בבריאה.",
    breslovSources: [
      { book: 'likutay-moharan', part: 1, torah: 6, title: 'Likutay Moharan 6', titleHe: 'ליקוטי מוהר"ן ו\'', desc: 'Teshuvah — the great teaching on repentance and its power to rectify everything', url: '/reader/likutay-moharan/part-1/torah-6' },
      { book: 'likutay-moharan', part: 2, torah: 12, title: 'Likutay Moharan II 12', titleHe: 'ליקוטי מוהר"ן תניינא י"ב', desc: 'There is no despair at all — the foundational principle that return is always possible', url: '/reader/likutay-moharan/part-2/torah-12' },
      { book: 'likutay-moharan', part: 2, torah: 3, title: 'Likutay Moharan II 3', titleHe: 'ליקוטי מוהר"ן תניינא ג\'', desc: 'Azamra — finding the good points; even a little good is the beginning of teshuvah', url: '/reader/likutay-moharan/part-2/torah-3' },
      { book: 'likutay-moharan', part: 2, torah: 1, title: 'Likutay Moharan II 1', titleHe: 'ליקוטי מוהר"ן תניינא א\'', desc: 'Emunah — faith that teshuvah is always accepted and always transformative', url: '/reader/likutay-moharan/part-2/torah-1' },
      { book: 'likutay-moharan', part: 2, torah: 4, title: 'Likutay Moharan II 4', titleHe: 'ליקוטי מוהר"ן תניינא ד\'', desc: 'Hisbodedus — personal prayer as the gateway to teshuvah and genuine connection', url: '/reader/likutay-moharan/part-2/torah-4' },
      { book: 'meshivas-nefesh', part: 0, torah: 1, title: 'Meshivas Nefesh 1', titleHe: 'משיבת נפש א\'', desc: 'Restoring the soul — encouragement for those beginning the journey of return', url: '/reader/meshivas-nefesh/section-1' },
    ],
    traditionalSources: [
      { source: 'Talmud, Yoma 86a', desc: 'Through teshuvah from love, intentional sins are transformed into merits' },
      { source: 'Zohar, Nasso 122a', desc: 'The power of teshuvah reaches higher than the Torah itself — it preceded creation' },
      { source: 'Ramchal, Mesillas Yesharim Ch. 4', desc: 'Watchfulness (zehirut) is the first step of the soul\'s return journey' },
    ]
  },
  {
    id: 'prosperity',
    label: 'Financial Prosperity / Wealth',
    labelHe: 'שגשוג כלכלי / עושר',
    icon: '💰',
    keywords: ['prosperity', 'wealth', 'rich', 'boom', 'growth', 'profit', 'success', 'abundance', 'fortune', 'billionaire', 'millionaire', 'luxury', 'stock rally', 'bull market'],
    keywordsHe: ['שגשוג', 'עושר', 'הצלחה', 'שפע', 'רווח'],
    searchTerms: ['wealth', 'rich', 'money', 'abundance', 'bless', 'success', 'prosper', 'sustain'],
    analysis: "R' Nachman teaches that wealth is a test no less challenging than poverty. The purpose of financial blessing is to use it for Torah, chesed (kindness), and tzedakah (charity). True prosperity is not measured by bank accounts but by closeness to Hashem. When we see economic growth, we should ask: Is this wealth being used to reveal God's glory, or to hide it? The wisest person is one who is rich but uses wealth as if poor — with humility and generosity.",
    analysisHe: "רבי נחמן מלמד שעושר הוא מבחן לא פחות מאתגר מעוני.",
    breslovSources: [
      { book: 'likutay-moharan', part: 2, torah: 7, title: 'Likutay Moharan II 7', titleHe: 'ליקוטי מוהר"ן תניינא ז\'', desc: 'Livelihood and knowledge — true prosperity flows from connection to Hashem', url: '/reader/likutay-moharan/part-2/torah-7' },
      { book: 'likutay-moharan', part: 1, torah: 69, title: 'Likutay Moharan 69', titleHe: 'ליקוטי מוהר"ן ס"ט', desc: 'The test of wealth — overcoming the desire for money that pulls one away from holiness', url: '/reader/likutay-moharan/part-1/torah-69' },
      { book: 'likutay-moharan', part: 1, torah: 13, title: 'Likutay Moharan 13', titleHe: 'ליקוטי מוהר"ן י"ג', desc: 'Tzedakah — using wealth for charity is the key to sustained blessing', url: '/reader/likutay-moharan/part-1/torah-13' },
      { book: 'likutay-moharan', part: 1, torah: 23, title: 'Likutay Moharan 23', titleHe: 'ליקוטי מוהר"ן כ"ג', desc: 'Joy and abundance — holy joy draws down spiritual and physical prosperity', url: '/reader/likutay-moharan/part-1/torah-23' },
      { book: 'sichos-haran', part: 0, torah: 51, title: 'Sichos HaRan 51', titleHe: 'שיחות הר"ן נ"א', desc: 'R\' Nachman on the proper attitude toward money and material possessions', url: '/reader/sichos-haran/sicha-51' },
    ],
    traditionalSources: [
      { source: 'Talmud, Avot 4:1', desc: 'Who is rich? One who is happy with their lot — true wealth is inner contentment' },
      { source: 'Zohar, Vayechi 227a', desc: 'Wealth given from Above carries a test — to see if it will be used for holiness' },
      { source: 'Ramchal, Mesillas Yesharim Ch. 1', desc: 'All worldly pleasures are only tests — the soul\'s true enjoyment is closeness to Hashem' },
    ]
  },
  {
    id: 'storm',
    label: 'Storm / Wind / Hurricane',
    labelHe: 'סערה / רוח / הוריקן',
    icon: '🌪️',
    keywords: ['storm', 'hurricane', 'tornado', 'cyclone', 'typhoon', 'wind', 'thunderstorm', 'lightning', 'blizzard', 'gale', 'hail', 'weather', 'tempest', 'squall', 'monsoon'],
    keywordsHe: ['סערה', 'הוריקן', 'טורנדו', 'רוח', 'ברק', 'סופה'],
    searchTerms: ['wind', 'storm', 'thunder', 'lightning', 'heaven', 'cloud', 'rain', 'blow', 'power'],
    analysis: "Storms in Torah thought represent the ruach (spirit/wind) of divine power moving through the world. R' Nachman teaches that the winds of the world correspond to the breaths of Torah and prayer. When storms rage, they remind us of the awesome power of the Creator and our smallness before Him. The appropriate response is the blessing on thunder and lightning — recognizing that Hashem's power fills the entire world.",
    analysisHe: "סערות במחשבת התורה מייצגות את רוח הכוח האלוקי הנעה בעולם.",
    breslovSources: [
      { book: 'likutay-moharan', part: 1, torah: 8, title: 'Likutay Moharan 8', titleHe: 'ליקוטי מוהר"ן ח\'', desc: 'The storm and the Ark — finding shelter in holy words when the world is turbulent', url: '/reader/likutay-moharan/part-1/torah-8' },
      { book: 'likutay-moharan', part: 1, torah: 56, title: 'Likutay Moharan 56', titleHe: 'ליקוטי מוהר"ן נ"ו', desc: 'The melodies of nature — wind and storms have their own divine song', url: '/reader/likutay-moharan/part-1/torah-56' },
      { book: 'likutay-moharan', part: 2, torah: 5, title: 'Likutay Moharan II 5', titleHe: 'ליקוטי מוהר"ן תניינא ה\'', desc: 'Emunah in the storm — maintaining faith when the world feels chaotic and frightening', url: '/reader/likutay-moharan/part-2/torah-5' },
      { book: 'likutay-moharan', part: 2, torah: 8, title: 'Likutay Moharan II 8', titleHe: 'ליקוטי מוהר"ן תניינא ח\'', desc: 'The narrow bridge — courage in the face of overwhelming natural forces', url: '/reader/likutay-moharan/part-2/torah-8' },
      { book: 'likutay-moharan', part: 1, torah: 5, title: 'Likutay Moharan 5', titleHe: 'ליקוטי מוהר"ן ה\'', desc: 'Sweetening harsh judgments — how joy and prayer can calm the storms of judgment', url: '/reader/likutay-moharan/part-1/torah-5' },
    ],
    traditionalSources: [
      { source: 'Talmud, Berachot 59a', desc: 'On thunder, say: Blessed is He whose power fills the world. On lightning: who performs the work of creation' },
      { source: 'Zohar, Vayeira 99b', desc: 'The four winds correspond to the four letters of Hashem\'s Name — storms are divine speech' },
      { source: 'Ramchal, Derech Hashem 4:6', desc: 'Natural phenomena serve as vessels for spiritual influence from the higher worlds' },
    ]
  }
];

// ─────────────────────────────────────────────────────────
// Scan reader JSON files for actual snippets
// ─────────────────────────────────────────────────────────

function getSnippet(bookDir, filePattern, maxLen = 300) {
  try {
    const filePath = path.join(READER_DIR, bookDir, filePattern);
    if (!fs.existsSync(filePath)) return null;
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    // Get English text from first few meaningful segments
    const segments = data.segments || [];
    for (const seg of segments) {
      if (seg.en && seg.en.length > 40) {
        const text = seg.en.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
        return text.length > maxLen ? text.substring(0, maxLen) + '...' : text;
      }
    }
    return null;
  } catch (e) {
    return null;
  }
}

function resolveUrl(source) {
  // Verify the reader URL exists by checking the JSON file
  const url = source.url;
  if (!url) return false;

  // Map URL to file path
  const parts = url.replace('/reader/', '').split('/');
  let jsonPath;

  if (parts.length === 2) {
    // e.g., /reader/sefer-hamidos/topic-1
    jsonPath = path.join(READER_DIR, parts[0], parts[1] + '.json');
  } else if (parts.length === 3) {
    // e.g., /reader/likutay-moharan/part-1/torah-14
    jsonPath = path.join(READER_DIR, parts[0], parts[1], parts[2] + '.json');
  }

  return jsonPath && fs.existsSync(jsonPath);
}

function enrichSources(eventType) {
  // Try to add actual snippets from the reader JSON files
  for (const src of eventType.breslovSources) {
    const url = src.url;
    const parts = url.replace('/reader/', '').split('/');
    let filePath;

    if (parts.length === 2) {
      filePath = parts[0] + '/' + parts[1] + '.json';
    } else if (parts.length === 3) {
      filePath = parts[0] + '/' + parts[1] + '/' + parts[2] + '.json';
    }

    if (filePath) {
      const snippet = getSnippet('', filePath);
      if (snippet) {
        src.snippet = snippet;
      }
    }

    // Verify URL exists
    src.verified = resolveUrl(src);
  }
}

// ─────────────────────────────────────────────────────────
// Build and write the index
// ─────────────────────────────────────────────────────────

function buildIndex() {
  console.log('Building Torah Lens index...');
  console.log(`Processing ${EVENT_TYPES.length} event types...`);

  let totalSources = 0;
  let verifiedSources = 0;
  let snippetsFound = 0;

  for (const evt of EVENT_TYPES) {
    enrichSources(evt);
    for (const src of evt.breslovSources) {
      totalSources++;
      if (src.verified) verifiedSources++;
      if (src.snippet) snippetsFound++;
    }
  }

  const index = {
    version: 1,
    generated: new Date().toISOString(),
    eventTypeCount: EVENT_TYPES.length,
    totalBreslovSources: totalSources,
    verifiedSources,
    snippetsFound,
    baseVerse: {
      he: 'כִּי לֹא יַעֲשֶׂה אֲדֹנָי ה\' דָּבָר כִּי אִם גָּלָה סוֹדוֹ אֶל עֲבָדָיו הַנְּבִיאִים',
      en: 'For the Lord God does nothing without revealing His counsel to His servants the prophets.',
      ref: 'Amos 3:7'
    },
    secondaryVerse: {
      he: 'הִכְרַתִּי גוֹיִם נָשַׁמּוּ פִנּוֹתָם הֶחֱרַבְתִּי חוּצוֹתָם מִבְּלִי עוֹבֵר נִצְדּוּ עָרֵיהֶם מִבְּלִי אִישׁ מֵאֵין יוֹשֵׁב. אָמַרְתִּי אַךְ תִּירְאִי אוֹתִי תִּקְחִי מוּסָר',
      en: 'I have cut off nations, their towers are desolate; I have made their streets waste... I said: Surely you will fear Me, you will accept correction.',
      ref: 'Tzefania 3:6-7'
    },
    eventTypes: EVENT_TYPES.map(evt => ({
      id: evt.id,
      label: evt.label,
      labelHe: evt.labelHe,
      icon: evt.icon,
      keywords: evt.keywords,
      keywordsHe: evt.keywordsHe,
      analysis: evt.analysis,
      analysisHe: evt.analysisHe,
      breslovSources: evt.breslovSources.map(s => ({
        title: s.title,
        titleHe: s.titleHe,
        desc: s.desc,
        url: s.url,
        snippet: s.snippet || null,
        verified: s.verified || false
      })),
      traditionalSources: evt.traditionalSources
    }))
  };

  fs.writeFileSync(OUTPUT, JSON.stringify(index, null, 2), 'utf8');

  console.log(`\nTorah Lens Index built successfully!`);
  console.log(`  Event types: ${EVENT_TYPES.length}`);
  console.log(`  Total Breslov sources: ${totalSources}`);
  console.log(`  Verified (file exists): ${verifiedSources}/${totalSources}`);
  console.log(`  With English snippets: ${snippetsFound}/${totalSources}`);
  console.log(`  Output: ${OUTPUT}`);
  console.log(`  Size: ${(fs.statSync(OUTPUT).size / 1024).toFixed(1)} KB`);
}

buildIndex();
