/**
 * build-torah-gps-index.cjs
 *
 * Scans ALL reader JSON files, extracts English text segments,
 * scores them against 50+ spiritual topics, and builds a searchable index.
 * Output: public/torah-gps-index.json
 */

const fs = require('fs');
const path = require('path');

const READER_DIR = path.join(__dirname, '..', 'public', 'reader');
const OUTPUT_FILE = path.join(__dirname, '..', 'public', 'torah-gps-index.json');
const MAX_RESULTS_PER_TOPIC = 15;
const MIN_SNIPPET_LENGTH = 40;
const MAX_EN_SNIPPET = 220;
const MAX_HE_SNIPPET = 120;

// ─── Topic Definitions ───────────────────────────────────────────────
// Each topic has: id, label, hebrewLabel, keywords (weighted), negativeKeywords
const TOPICS = [
  {
    id: 'joy',
    label: 'Joy & Happiness',
    hebrewLabel: 'שמחה',
    icon: 'sun',
    keywords: ['joy', 'happy', 'happiness', 'rejoice', 'glad', 'gladness', 'cheerful', 'delight', 'joyful', 'joyous', 'simcha', 'simchah', 'celebrate', 'celebration', 'merry', 'bliss', 'elation'],
    boost: ['great joy', 'always be happy', 'it is a great mitzvah', 'rejoice in', 'happiness is', 'true joy', 'serve God with joy', 'serve Hashem with joy']
  },
  {
    id: 'sadness',
    label: 'Sadness & Depression',
    hebrewLabel: 'עצבות',
    icon: 'cloud-rain',
    keywords: ['sad', 'sadness', 'depression', 'depressed', 'melancholy', 'despair', 'despairing', 'grief', 'sorrow', 'sorrowful', 'gloom', 'gloomy', 'downcast', 'heavy heart', 'broken heart', 'low spirits', 'atzvut', 'discouraged', 'hopeless', 'hopelessness'],
    boost: ['never despair', 'forbidden to despair', 'there is no despair', 'sadness is not', 'overcome sadness']
  },
  {
    id: 'prayer',
    label: 'Prayer & Talking to God',
    hebrewLabel: 'תפילה',
    icon: 'hands',
    keywords: ['prayer', 'pray', 'praying', 'tefillah', 'tefilah', 'daven', 'davening', 'supplicate', 'supplication', 'beseech', 'cry out', 'call out', 'hisbodedus', 'hitbodedut', 'meditation', 'meditate', 'seclude', 'seclusion', 'talk to God', 'speak to God', 'pour out', 'outpouring'],
    boost: ['personal prayer', 'hisbodedus', 'hitbodedut', 'talk to God', 'cry out to', 'pour out your heart', 'main weapon']
  },
  {
    id: 'faith',
    label: 'Faith & Trust in God',
    hebrewLabel: 'אמונה',
    icon: 'shield',
    keywords: ['faith', 'emunah', 'emuna', 'trust', 'believe', 'belief', 'bitachon', 'rely', 'reliance', 'confidence in God', 'trust in God', 'faith in God', 'faithful', 'believing', 'certainty'],
    boost: ['simple faith', 'complete faith', 'pure faith', 'faith is', 'emunah is', 'strengthen faith', 'the foundation', 'faith alone']
  },
  {
    id: 'teshuvah',
    label: 'Repentance & Return',
    hebrewLabel: 'תשובה',
    icon: 'rotate-left',
    keywords: ['repent', 'repentance', 'teshuvah', 'teshuva', 'return', 'returning', 'confession', 'confess', 'regret', 'remorse', 'atonement', 'atone', 'forgive', 'forgiveness', 'sin', 'sins', 'transgression', 'iniquity', 'sinned', 'wrongdoing'],
    boost: ['teshuvah', 'repentance is', 'return to God', 'never too late', 'even if', 'no matter what', 'start anew', 'begin anew']
  },
  {
    id: 'livelihood',
    label: 'Money & Livelihood',
    hebrewLabel: 'פרנסה',
    icon: 'coins',
    keywords: ['money', 'livelihood', 'parnassah', 'parnasa', 'wealth', 'wealthy', 'rich', 'riches', 'poverty', 'poor', 'sustenance', 'income', 'earn', 'earning', 'business', 'commerce', 'trade', 'profit', 'financial', 'prosper', 'prosperity', 'abundance'],
    boost: ['livelihood comes', 'parnassah', 'sustenance from', 'wealth is', 'earning a living', 'money is']
  },
  {
    id: 'anger',
    label: 'Anger & Patience',
    hebrewLabel: 'כעס',
    icon: 'fire',
    keywords: ['anger', 'angry', 'rage', 'wrath', 'fury', 'furious', 'irritate', 'irritation', 'temper', 'patience', 'patient', 'impatient', 'annoy', 'annoyed', 'frustrate', 'frustrated', 'calm', 'composure'],
    boost: ['anger is', 'when angry', 'overcome anger', 'patience is', 'slow to anger', 'anger damages', 'guard against anger']
  },
  {
    id: 'marriage',
    label: 'Marriage & Relationships',
    hebrewLabel: 'שלום בית',
    icon: 'heart',
    keywords: ['marriage', 'married', 'wife', 'husband', 'spouse', 'wedding', 'shalom bayit', 'shalom bayis', 'couple', 'relationship', 'love', 'partner', 'companion', 'domestic peace', 'harmony', 'family', 'children', 'child'],
    boost: ['shalom bayit', 'peace in the home', 'husband and wife', 'marriage is', 'love between']
  },
  {
    id: 'fear',
    label: 'Fear & Anxiety',
    hebrewLabel: 'פחד',
    icon: 'bolt',
    keywords: ['fear', 'afraid', 'anxiety', 'anxious', 'worry', 'worried', 'panic', 'terror', 'terrified', 'dread', 'fright', 'frighten', 'scared', 'nervous', 'apprehension', 'concern', 'phobia', 'stress', 'stressed'],
    boost: ['do not fear', 'fear not', 'narrow bridge', 'not to fear', 'overcome fear', 'anxiety is', 'worry not', 'the main thing is not to fear']
  },
  {
    id: 'healing',
    label: 'Health & Healing',
    hebrewLabel: 'רפואה',
    icon: 'heart-pulse',
    keywords: ['heal', 'healing', 'health', 'healthy', 'sick', 'sickness', 'illness', 'disease', 'cure', 'remedy', 'medicine', 'doctor', 'physician', 'recover', 'recovery', 'pain', 'suffering', 'affliction', 'body'],
    boost: ['healing comes', 'cure for', 'remedy is', 'healing through', 'sick person']
  },
  {
    id: 'obstacles',
    label: 'Obstacles & Tests',
    hebrewLabel: 'נסיונות',
    icon: 'mountain',
    keywords: ['obstacle', 'obstacles', 'test', 'tests', 'trial', 'trials', 'tribulation', 'challenge', 'difficulty', 'difficult', 'hardship', 'struggle', 'struggling', 'barrier', 'hindrance', 'opposition', 'resistance', 'setback', 'adversity'],
    boost: ['obstacles are', 'overcome obstacles', 'every obstacle', 'no obstacle', 'test of faith', 'the main test']
  },
  {
    id: 'torah_study',
    label: 'Torah Study',
    hebrewLabel: 'לימוד תורה',
    icon: 'book-open',
    keywords: ['torah study', 'learn', 'learning', 'study', 'studying', 'student', 'teacher', 'teaching', 'lesson', 'wisdom', 'knowledge', 'understanding', 'intellect', 'insight', 'scholarship', 'sage'],
    boost: ['torah study', 'learn torah', 'studying torah', 'torah learning', 'engage in torah', 'wisdom of torah']
  },
  {
    id: 'tzaddik',
    label: 'The Tzaddik',
    hebrewLabel: 'צדיק',
    icon: 'star',
    keywords: ['tzaddik', 'tzadik', 'righteous', 'righteous one', 'holy man', 'rebbe', 'rabbi', 'master', 'leader', 'sage', 'true tzaddik', 'connecting to the tzaddik'],
    boost: ['true tzaddik', 'the tzaddik', 'connecting to the tzaddik', 'through the tzaddik', 'righteous one']
  },
  {
    id: 'shabbat',
    label: 'Shabbat & Holy Days',
    hebrewLabel: 'שבת',
    icon: 'candle',
    keywords: ['shabbat', 'shabbos', 'sabbath', 'yom tov', 'holiday', 'rosh hashana', 'rosh hashanah', 'yom kippur', 'sukkot', 'pesach', 'passover', 'shavuot', 'purim', 'chanukah', 'hanukkah', 'holy day', 'festival'],
    boost: ['shabbat is', 'on shabbat', 'the holiness of shabbat', 'sabbath day']
  },
  {
    id: 'humility',
    label: 'Humility',
    hebrewLabel: 'ענוה',
    icon: 'leaf',
    keywords: ['humble', 'humility', 'humbleness', 'meek', 'meekness', 'lowly', 'lowliness', 'modest', 'modesty', 'selfless', 'selflessness', 'ego', 'pride', 'arrogance', 'arrogant', 'haughty', 'conceited', 'vanity', 'anava'],
    boost: ['true humility', 'humility is', 'humble oneself', 'lower oneself', 'nullify the ego']
  },
  {
    id: 'gratitude',
    label: 'Gratitude & Thankfulness',
    hebrewLabel: 'הודאה',
    icon: 'gift',
    keywords: ['thank', 'thanks', 'thankful', 'thankfulness', 'grateful', 'gratitude', 'appreciate', 'appreciation', 'acknowledge', 'praise', 'bless', 'blessing', 'blessed', 'hodaa'],
    boost: ['give thanks', 'be thankful', 'gratitude to God', 'thank God', 'praise Hashem']
  },
  {
    id: 'peace',
    label: 'Peace & Harmony',
    hebrewLabel: 'שלום',
    icon: 'dove',
    keywords: ['peace', 'peaceful', 'shalom', 'harmony', 'harmonious', 'tranquil', 'tranquility', 'serenity', 'serene', 'calm', 'calmness', 'unity', 'united', 'reconcile', 'reconciliation', 'conflict', 'dispute', 'quarrel', 'strife', 'argument', 'controversy', 'machloket'],
    boost: ['peace is', 'pursuit of peace', 'shalom is', 'peace between', 'great is peace']
  },
  {
    id: 'truth',
    label: 'Truth & Honesty',
    hebrewLabel: 'אמת',
    icon: 'scale',
    keywords: ['truth', 'true', 'honest', 'honesty', 'integrity', 'sincere', 'sincerity', 'genuine', 'authentic', 'emet', 'emes', 'falsehood', 'lie', 'lies', 'deception', 'deceit', 'hypocrisy'],
    boost: ['truth is', 'seek truth', 'the truth', 'honest person', 'path of truth']
  },
  {
    id: 'courage',
    label: 'Courage & Strength',
    hebrewLabel: 'גבורה',
    icon: 'shield-check',
    keywords: ['courage', 'courageous', 'brave', 'bravery', 'strength', 'strong', 'mighty', 'power', 'powerful', 'fortitude', 'valor', 'bold', 'boldness', 'determination', 'determined', 'persist', 'persistence', 'persevere', 'perseverance', 'endure', 'endurance', 'never give up'],
    boost: ['be strong', 'never give up', 'strengthen yourself', 'have courage', 'gevurah']
  },
  {
    id: 'holiness',
    label: 'Holiness & Purity',
    hebrewLabel: 'קדושה',
    icon: 'sparkles',
    keywords: ['holy', 'holiness', 'sacred', 'sanctify', 'sanctification', 'pure', 'purity', 'purify', 'purification', 'kedusha', 'kadosh', 'clean', 'cleanliness', 'impure', 'impurity', 'tumah', 'tahara'],
    boost: ['holiness is', 'become holy', 'sanctify yourself', 'level of holiness', 'purity of']
  },
  {
    id: 'speech',
    label: 'Speech & Words',
    hebrewLabel: 'דיבור',
    icon: 'message',
    keywords: ['speech', 'speak', 'speaking', 'word', 'words', 'tongue', 'mouth', 'language', 'talk', 'talking', 'conversation', 'lashon', 'lashon hara', 'gossip', 'slander', 'guard your tongue', 'silence', 'silent'],
    boost: ['power of speech', 'guard your tongue', 'lashon hara', 'holy speech', 'words have', 'speech is']
  },
  {
    id: 'desire',
    label: 'Desire & Temptation',
    hebrewLabel: 'תאוה',
    icon: 'flame',
    keywords: ['desire', 'desires', 'temptation', 'tempted', 'lust', 'craving', 'crave', 'appetite', 'urge', 'passion', 'passions', 'yetzer', 'yetzer hara', 'evil inclination', 'taavah', 'taavot', 'indulgence', 'physical desire', 'bodily'],
    boost: ['overcome desire', 'break the desire', 'evil inclination', 'guard against', 'rectify desire']
  },
  {
    id: 'charity',
    label: 'Charity & Giving',
    hebrewLabel: 'צדקה',
    icon: 'hand-heart',
    keywords: ['charity', 'tzedakah', 'tzedaka', 'give', 'giving', 'generous', 'generosity', 'donate', 'donation', 'tithe', 'tithing', 'maaser', 'alms', 'kindness', 'chesed', 'help', 'helping', 'benevolence'],
    boost: ['give charity', 'tzedakah is', 'acts of kindness', 'chesed is', 'generosity brings']
  },
  {
    id: 'meditation',
    label: 'Meditation & Mindfulness',
    hebrewLabel: 'התבודדות',
    icon: 'brain',
    keywords: ['meditate', 'meditation', 'mindful', 'mindfulness', 'contemplat', 'reflect', 'reflection', 'introspect', 'introspection', 'awareness', 'conscious', 'consciousness', 'hisbodedus', 'hitbodedut', 'seclude', 'seclusion', 'alone', 'solitude', 'field', 'nature'],
    boost: ['hisbodedus', 'hitbodedut', 'go out to the field', 'seclude yourself', 'speak to God alone', 'personal meditation']
  },
  {
    id: 'music',
    label: 'Music & Song',
    hebrewLabel: 'נגינה',
    icon: 'music',
    keywords: ['music', 'song', 'sing', 'singing', 'melody', 'tune', 'niggun', 'nigun', 'instrument', 'dance', 'dancing', 'clap', 'clapping', 'chant', 'chanting', 'praise', 'musical'],
    boost: ['song is', 'through music', 'melody of', 'sing to God', 'songs of praise', 'holy melody']
  },
  {
    id: 'water',
    label: 'Mikvah & Water',
    hebrewLabel: 'מקוה',
    icon: 'droplet',
    keywords: ['mikvah', 'mikve', 'mikveh', 'water', 'immerse', 'immersion', 'purify', 'purification', 'bath', 'bathe', 'bathing', 'river', 'ocean', 'sea', 'spring', 'wellspring', 'rain'],
    boost: ['mikvah is', 'immerse in', 'purification through water', 'the mikvah']
  },
  {
    id: 'suffering',
    label: 'Suffering & Pain',
    hebrewLabel: 'יסורים',
    icon: 'bandage',
    keywords: ['suffer', 'suffering', 'pain', 'painful', 'anguish', 'agony', 'torment', 'afflict', 'affliction', 'tribulation', 'distress', 'misery', 'miserable', 'hardship', 'yisurim', 'travail'],
    boost: ['suffering is', 'through suffering', 'purpose of suffering', 'afflictions are', 'yisurim']
  },
  {
    id: 'death',
    label: 'Death & Mourning',
    hebrewLabel: 'אבלות',
    icon: 'tombstone',
    keywords: ['death', 'die', 'dying', 'dead', 'mourn', 'mourning', 'grief', 'grieve', 'grieving', 'loss', 'bereave', 'bereavement', 'funeral', 'burial', 'grave', 'afterlife', 'world to come', 'olam haba', 'resurrection', 'soul', 'departed'],
    boost: ['death is', 'world to come', 'afterlife', 'the soul after', 'comfort the mourner']
  },
  {
    id: 'children',
    label: 'Children & Parenting',
    hebrewLabel: 'חינוך',
    icon: 'baby',
    keywords: ['child', 'children', 'son', 'daughter', 'parent', 'parenting', 'raise', 'raising', 'educate', 'education', 'chinuch', 'youth', 'young', 'baby', 'infant', 'boy', 'girl', 'offspring', 'seed', 'generation', 'next generation'],
    boost: ['raise children', 'educate children', 'chinuch', 'children are', 'the next generation']
  },
  {
    id: 'sleep',
    label: 'Sleep & Dreams',
    hebrewLabel: 'שינה',
    icon: 'moon',
    keywords: ['sleep', 'sleeping', 'dream', 'dreams', 'dreaming', 'night', 'nighttime', 'awake', 'awaken', 'wake', 'waking', 'insomnia', 'rest', 'resting', 'slumber', 'midnight', 'tikkun chatzot'],
    boost: ['sleep is', 'before sleep', 'midnight prayer', 'tikkun chatzot', 'dreams are']
  },
  {
    id: 'eating',
    label: 'Eating & Food',
    hebrewLabel: 'אכילה',
    icon: 'utensils',
    keywords: ['eat', 'eating', 'food', 'meal', 'bread', 'drink', 'drinking', 'fast', 'fasting', 'hunger', 'hungry', 'appetite', 'kosher', 'taste', 'table', 'feast', 'blessing on food', 'brachah', 'bracha'],
    boost: ['eating is', 'holy eating', 'rectify eating', 'eating in holiness', 'the table is']
  },
  {
    id: 'forgiveness',
    label: 'Forgiveness',
    hebrewLabel: 'סליחה',
    icon: 'handshake',
    keywords: ['forgive', 'forgiveness', 'forgiving', 'pardon', 'mercy', 'merciful', 'compassion', 'compassionate', 'rachamim', 'clemency', 'overlook', 'let go', 'release', 'absolve'],
    boost: ['forgive others', 'God forgives', 'mercy and forgiveness', 'compassion is', 'ask for forgiveness']
  },
  {
    id: 'eretz_yisrael',
    label: 'The Land of Israel',
    hebrewLabel: 'ארץ ישראל',
    icon: 'globe',
    keywords: ['israel', 'eretz yisrael', 'holy land', 'jerusalem', 'yerushalayim', 'temple', 'beit hamikdash', 'zion', 'promised land', 'land of israel'],
    boost: ['eretz yisrael', 'the land of israel', 'jerusalem is', 'the holy land', 'yearning for israel']
  },
  {
    id: 'loneliness',
    label: 'Loneliness',
    hebrewLabel: 'בדידות',
    icon: 'person',
    keywords: ['lonely', 'loneliness', 'alone', 'isolated', 'isolation', 'abandoned', 'forsaken', 'rejected', 'outcast', 'solitary', 'disconnected', 'alienated'],
    boost: ['feeling alone', 'God is with you', 'never alone', 'even when alone', 'no one is truly alone']
  },
  {
    id: 'pride',
    label: 'Pride & Ego',
    hebrewLabel: 'גאוה',
    icon: 'crown',
    keywords: ['pride', 'proud', 'ego', 'arrogance', 'arrogant', 'haughty', 'conceit', 'conceited', 'vain', 'vanity', 'gaava', 'gaavah', 'self-importance', 'boast', 'boasting', 'inflate', 'superiority'],
    boost: ['pride is', 'arrogance is', 'ego is', 'destroy pride', 'overcome the ego', 'humility versus pride']
  },
  {
    id: 'redemption',
    label: 'Redemption & Mashiach',
    hebrewLabel: 'גאולה',
    icon: 'sunrise',
    keywords: ['redemption', 'redeem', 'redeemed', 'mashiach', 'moshiach', 'messiah', 'messianic', 'geulah', 'salvation', 'save', 'saved', 'savior', 'deliver', 'deliverance', 'freedom', 'liberation', 'exile', 'galut'],
    boost: ['the redemption', 'mashiach will', 'geulah', 'bring mashiach', 'hasten the redemption', 'end of exile']
  },
  {
    id: 'nature',
    label: 'Nature & Creation',
    hebrewLabel: 'בריאה',
    icon: 'tree',
    keywords: ['nature', 'creation', 'world', 'heaven', 'earth', 'sky', 'star', 'stars', 'sun', 'moon', 'tree', 'trees', 'flower', 'grass', 'mountain', 'sea', 'ocean', 'river', 'animal', 'bird', 'garden', 'field'],
    boost: ['see God in nature', 'creation reveals', 'the beauty of', 'go out to the field', 'every blade of grass']
  },
  {
    id: 'judgment',
    label: 'Judgment & Justice',
    hebrewLabel: 'דין',
    icon: 'gavel',
    keywords: ['judgment', 'judge', 'judging', 'justice', 'just', 'court', 'verdict', 'decree', 'decree', 'din', 'dinim', 'strict judgment', 'prosecut', 'accus', 'defend', 'defense', 'merit', 'guilty', 'innocent', 'vindicate'],
    boost: ['sweeten the judgments', 'mitigate judgment', 'harsh decrees', 'judgment is', 'strict justice']
  },
  {
    id: 'simplicity',
    label: 'Simplicity & Sincerity',
    hebrewLabel: 'תמימות',
    icon: 'heart-simple',
    keywords: ['simple', 'simplicity', 'sincere', 'sincerity', 'pure', 'purity', 'wholehearted', 'wholeheartedness', 'temimut', 'tamim', 'straightforward', 'innocent', 'innocence', 'naive', 'genuine', 'unpretentious'],
    boost: ['simple faith', 'serve God simply', 'simplicity is', 'with sincerity', 'wholehearted service', 'be simple']
  },
  {
    id: 'confession',
    label: 'Confession & Viduy',
    hebrewLabel: 'וידוי',
    icon: 'scroll',
    keywords: ['confess', 'confession', 'viduy', 'vidui', 'admit', 'acknowledge', 'disclose', 'reveal', 'open up', 'unburden'],
    boost: ['confess before', 'the power of confession', 'viduy is']
  },
  {
    id: 'jealousy',
    label: 'Jealousy & Envy',
    hebrewLabel: 'קנאה',
    icon: 'eye',
    keywords: ['jealous', 'jealousy', 'envy', 'envious', 'covet', 'coveting', 'kinah', 'competition', 'competitive', 'compare', 'comparison', 'resentment', 'resent', 'grudge'],
    boost: ['jealousy is', 'overcome jealousy', 'envy leads', 'do not be jealous']
  },
  {
    id: 'patience',
    label: 'Patience & Waiting',
    hebrewLabel: 'סבלנות',
    icon: 'hourglass',
    keywords: ['patience', 'patient', 'wait', 'waiting', 'endure', 'endurance', 'long-suffering', 'tolerance', 'tolerant', 'forbearance', 'slow to anger', 'persevere', 'perseverance', 'withstand'],
    boost: ['patience is', 'be patient', 'wait for God', 'hope and wait', 'with patience']
  },
  {
    id: 'kindness',
    label: 'Kindness & Chesed',
    hebrewLabel: 'חסד',
    icon: 'hand-holding-heart',
    keywords: ['kindness', 'kind', 'chesed', 'hesed', 'loving-kindness', 'benevolence', 'benevolent', 'goodness', 'good deed', 'good deeds', 'gentle', 'gentleness', 'compassion', 'compassionate', 'caring', 'tender'],
    boost: ['acts of kindness', 'chesed is', 'loving-kindness', 'be kind to', 'great kindness']
  },
  {
    id: 'beginning',
    label: 'Starting Fresh',
    hebrewLabel: 'התחלה חדשה',
    icon: 'seedling',
    keywords: ['begin', 'beginning', 'start', 'starting', 'fresh', 'new', 'renewal', 'renew', 'restart', 'anew', 'again', 'first step', 'initiative'],
    boost: ['start anew', 'begin again', 'each day is new', 'always start', 'the main thing is to begin', 'never too late to begin']
  },
  {
    id: 'mind',
    label: 'Mind & Thoughts',
    hebrewLabel: 'מחשבה',
    icon: 'brain',
    keywords: ['thought', 'thoughts', 'think', 'thinking', 'mind', 'mental', 'intellect', 'intellectual', 'reason', 'reasoning', 'logic', 'imagination', 'fantasy', 'confusion', 'confused', 'clarity', 'clear mind', 'focus', 'concentrate', 'concentration', 'machshava'],
    boost: ['guard your thoughts', 'holy thoughts', 'thought is', 'the mind is', 'confusing thoughts']
  },
  {
    id: 'world_to_come',
    label: 'The World to Come',
    hebrewLabel: 'עולם הבא',
    icon: 'infinity',
    keywords: ['world to come', 'olam haba', 'eternal', 'eternity', 'afterlife', 'paradise', 'gan eden', 'garden of eden', 'reward', 'punishment', 'gehinom', 'gehinnom', 'next world', 'spiritual world', 'heavenly', 'heaven'],
    boost: ['the world to come', 'olam haba', 'eternal reward', 'spiritual worlds', 'gan eden']
  },
  {
    id: 'community',
    label: 'Community & Fellowship',
    hebrewLabel: 'קהילה',
    icon: 'people',
    keywords: ['community', 'congregation', 'fellowship', 'gathering', 'together', 'unity', 'united', 'group', 'friend', 'friends', 'friendship', 'companionship', 'brotherhood', 'connection', 'bond', 'bonding', 'kibbutz'],
    boost: ['community is', 'gather together', 'unity of Israel', 'fellowship of', 'good friends']
  },
  {
    id: 'character',
    label: 'Character Traits (Middot)',
    hebrewLabel: 'מידות',
    icon: 'diamond',
    keywords: ['character', 'trait', 'traits', 'middot', 'midot', 'attribute', 'attributes', 'quality', 'qualities', 'virtue', 'virtues', 'behavior', 'conduct', 'refinement', 'refine', 'improve', 'self-improvement', 'mussar', 'musar'],
    boost: ['character traits', 'middot', 'refine character', 'good traits', 'work on middot']
  },
  {
    id: 'doubt',
    label: 'Doubt & Confusion',
    hebrewLabel: 'ספקות',
    icon: 'question',
    keywords: ['doubt', 'doubts', 'doubtful', 'question', 'questions', 'questioning', 'uncertain', 'uncertainty', 'confuse', 'confusion', 'confused', 'perplexed', 'bewildered', 'skeptic', 'skepticism', 'heresy', 'heretic', 'apikorus', 'atheism'],
    boost: ['overcome doubt', 'questions and answers', 'even when in doubt', 'doubt is', 'strengthen against doubt']
  },
  {
    id: 'gratitude_to_god',
    label: 'Closeness to God',
    hebrewLabel: 'קרבת ה׳',
    icon: 'hand-sparkles',
    keywords: ['close to God', 'closeness', 'dvekut', 'devekut', 'deveikus', 'attachment', 'cleave', 'cleaving', 'connect', 'connection to God', 'bond with God', 'relationship with God', 'near to God', 'divine presence', 'shechinah', 'shekhinah'],
    boost: ['draw close to God', 'closeness to God', 'dvekut', 'cleave to God', 'the divine presence']
  },
  {
    id: 'travel',
    label: 'Travel to the Tzaddik',
    hebrewLabel: 'נסיעה לצדיק',
    icon: 'route',
    keywords: ['travel', 'journey', 'pilgrimage', 'uman', 'breslov', 'visit', 'traveling', 'road', 'path', 'way', 'wandering', 'rosh hashana in uman'],
    boost: ['travel to the tzaddik', 'journey to', 'uman rosh hashana', 'pilgrimage to', 'the path to']
  }
];

// ─── Helper Functions ─────────────────────────────────────────────────

function getAllJsonFiles(dir) {
  let results = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results = results.concat(getAllJsonFiles(fullPath));
      } else if (entry.name.endsWith('.json') && !entry.name.includes('index') && !entry.name.includes('catalog')) {
        results.push(fullPath);
      }
    }
  } catch (e) { /* skip unreadable dirs */ }
  return results;
}

function cleanEnglishText(text) {
  if (!text) return '';
  // Remove verse references, formatting artifacts
  return text
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/[\u0590-\u05FF\uFB1D-\uFB4F]+/g, '') // Remove Hebrew chars from English text
    .replace(/\//g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncateSnippet(text, maxLen) {
  if (text.length <= maxLen) return text;
  const cut = text.lastIndexOf(' ', maxLen);
  return text.substring(0, cut > 0 ? cut : maxLen) + '...';
}

function scoreSegment(enText, topic) {
  const lower = enText.toLowerCase();
  let score = 0;

  // Keyword matching
  for (const kw of topic.keywords) {
    const kwLower = kw.toLowerCase();
    // Use word boundary matching for single words, substring for phrases
    if (kw.includes(' ')) {
      // Phrase matching
      let idx = 0;
      while ((idx = lower.indexOf(kwLower, idx)) !== -1) {
        score += 3;
        idx += kwLower.length;
      }
    } else {
      // Word matching with simple boundary check
      const regex = new RegExp('\\b' + kwLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'gi');
      const matches = lower.match(regex);
      if (matches) {
        score += matches.length * 2;
      }
    }
  }

  // Boost phrases (higher weight)
  if (topic.boost) {
    for (const phrase of topic.boost) {
      if (lower.includes(phrase.toLowerCase())) {
        score += 5;
      }
    }
  }

  // Length bonus: prefer meatier segments
  const wordCount = enText.split(/\s+/).length;
  if (wordCount > 50) score += 1;
  if (wordCount > 100) score += 1;

  return score;
}

function getBookDisplayName(bookId, catalog) {
  const book = catalog.books.find(b => b.id === bookId);
  if (book) return { title: book.title, hebrewTitle: book.hebrewTitle };
  // Try to derive from folder name
  const name = bookId
    .replace(/^misc-/, '')
    .replace(/^tanach-/, 'Tanach: ')
    .replace(/^talmud-bavli-/, 'Talmud: ')
    .replace(/^mishna-/, 'Mishna: ')
    .replace(/^rambam-/, 'Rambam: ')
    .replace(/^zohar-/, 'Zohar: ')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
  return { title: name, hebrewTitle: '' };
}

// ─── Main Build ───────────────────────────────────────────────────────

function build() {
  console.log('Building Torah GPS Index...');
  console.log(`Topics: ${TOPICS.length}`);

  // Load catalog
  let catalog = { books: [] };
  try {
    catalog = JSON.parse(fs.readFileSync(path.join(READER_DIR, 'catalog.json'), 'utf8'));
  } catch (e) {
    console.warn('Could not load catalog.json, using fallback names');
  }

  // Find all JSON files
  const allFiles = getAllJsonFiles(READER_DIR);
  console.log(`Found ${allFiles.length} JSON files to scan`);

  // Initialize topic results
  const topicResults = {};
  for (const t of TOPICS) {
    topicResults[t.id] = [];
  }

  let scanned = 0;
  let withEnglish = 0;
  let totalSegments = 0;

  for (const filePath of allFiles) {
    scanned++;
    if (scanned % 500 === 0) {
      console.log(`  Scanned ${scanned}/${allFiles.length} files...`);
    }

    let data;
    try {
      data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (e) {
      continue;
    }

    const segments = data.segments || [];
    if (!segments.length) continue;

    // Extract book info from file path
    const relPath = path.relative(READER_DIR, filePath).replace(/\\/g, '/');
    const parts = relPath.split('/');
    const bookId = parts[0];
    let partNum = null;
    let torahFile = parts[parts.length - 1].replace('.json', '');

    // Detect part number from path
    for (const p of parts) {
      const m = p.match(/^part-(\d+)$/);
      if (m) { partNum = parseInt(m[1]); break; }
    }

    // Get torah number from filename
    const torahMatch = torahFile.match(/(?:torah|chapter|daf|tractate|perek|book|siman|letter|section|halacha|tefila|sicha|story|mishna|volume)-?(\d+)/i);
    const torahNum = torahMatch ? parseInt(torahMatch[1]) : null;

    // Build reader URL
    let readerUrl = `/reader/${bookId}`;
    if (partNum) readerUrl += `/part-${partNum}`;
    readerUrl += `/${torahFile}`;

    const bookInfo = getBookDisplayName(bookId, catalog);

    // Also use metadata themes if available (LM has them)
    const metaThemes = (data.themes || []).map(t => t.toLowerCase());

    for (const seg of segments) {
      if (!seg.en || seg.en.trim().length < MIN_SNIPPET_LENGTH) continue;

      withEnglish++;
      totalSegments++;
      const enClean = cleanEnglishText(seg.en);
      if (enClean.length < MIN_SNIPPET_LENGTH) continue;

      // Score against all topics
      for (const topic of TOPICS) {
        let score = scoreSegment(enClean, topic);

        // Bonus if metadata themes match
        if (metaThemes.length > 0) {
          for (const kw of topic.keywords) {
            if (metaThemes.some(t => t.includes(kw.toLowerCase()))) {
              score += 3;
              break;
            }
          }
        }

        if (score >= 4) {
          topicResults[topic.id].push({
            score,
            book: bookId,
            bookTitle: bookInfo.title,
            bookHe: bookInfo.hebrewTitle,
            part: partNum,
            torah: torahNum,
            segment: seg.index || 0,
            en: truncateSnippet(enClean, MAX_EN_SNIPPET),
            he: seg.he_nikud ? truncateSnippet(seg.he_nikud, MAX_HE_SNIPPET) : (seg.he ? truncateSnippet(seg.he, MAX_HE_SNIPPET) : ''),
            url: readerUrl
          });
        }
      }
    }
  }

  console.log(`\nScanned ${scanned} files, ${withEnglish} segments with English`);

  // Sort and trim results per topic
  const output = {
    version: 1,
    generated: new Date().toISOString(),
    topicCount: TOPICS.length,
    topics: {},
    topicMeta: TOPICS.map(t => ({
      id: t.id,
      label: t.label,
      hebrewLabel: t.hebrewLabel,
      icon: t.icon,
      resultCount: 0
    }))
  };

  for (const topic of TOPICS) {
    const results = topicResults[topic.id];
    // Sort by score descending
    results.sort((a, b) => b.score - a.score);

    // Deduplicate by URL + segment (keep highest score)
    const seen = new Set();
    const deduped = [];
    for (const r of results) {
      const key = `${r.url}#${r.segment}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(r);
      }
    }

    // Also deduplicate by similar snippets (avoid near-identical results)
    const final = [];
    for (const r of deduped) {
      const isDuplicate = final.some(existing => {
        const overlap = r.en.substring(0, 80) === existing.en.substring(0, 80);
        return overlap;
      });
      if (!isDuplicate) {
        // Remove score from output to save space
        const { score, ...clean } = r;
        final.push(clean);
      }
      if (final.length >= MAX_RESULTS_PER_TOPIC) break;
    }

    output.topics[topic.id] = final;
    const meta = output.topicMeta.find(m => m.id === topic.id);
    if (meta) meta.resultCount = final.length;
  }

  // Write output
  const jsonStr = JSON.stringify(output);
  const sizeMB = (Buffer.byteLength(jsonStr) / (1024 * 1024)).toFixed(2);

  console.log(`\nOutput size: ${sizeMB} MB`);
  console.log('Results per topic:');
  for (const topic of TOPICS) {
    const count = output.topics[topic.id].length;
    if (count > 0) {
      console.log(`  ${topic.label}: ${count} results`);
    } else {
      console.log(`  ${topic.label}: NO RESULTS`);
    }
  }

  fs.writeFileSync(OUTPUT_FILE, jsonStr, 'utf8');
  console.log(`\nSaved to ${OUTPUT_FILE}`);
  console.log('Done!');
}

build();
