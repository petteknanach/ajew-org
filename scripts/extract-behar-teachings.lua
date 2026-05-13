-- Add Behar teachings from docx to the parsha page
-- This script creates a JSON file with all 14 teachings, corrected Hebrew from LH sources, and English translations

local json = require('json')
local lh_dir = '/root/ajew-org/public/reader/likutay-halachos'

-- Teaching data extracted from docx, matched to LH sources
-- Each teaching: {verse_ref, verse_text, source_ref, lh_part, lh_torrating, hebrew, english}

-- The 14 teachings with their LH source mappings
local teachings = {
  -- Teaching 1: Vayikra 25:5 - פריקה וטעינה ד אות ו
  {
    verse = "ויקרא כ\"ה ה'",
    verseText = "שנת שבתון יהיה לארץ",
    source = "לקוטי הלכות - הלכות פריקה וטעינה ד - אות ו",
    part = 8, torah = 15, letter = "ז"
  },
  -- Teaching 2: Vayikra 25:6 - שכירות פועלים ב אות ה
  {
    verse = "ויקרא כ\"ה ו'",
    verseText = "והיתה שבת הארץ",
    source = "לקוטי הלכות - הלכות שכירות פועלים ב - אות ה",
    part = 8, torah = 48, letter = "ה"
  },
  -- Teaching 3: Vayikra 25:6 (continued) - שכירות פועלים ב אות ו
  {
    verse = "ויקרא כ\"ה ו'",
    verseText = "לנקותו ולהעלותו",
    source = "לקוטי הלכות - הלכות שכירות פועלים ב - אות ו",
    part = 8, torah = 48, letter = "ו"
  },
  -- Teaching 4: Vayikra 25:14 - בית הכנסת ו אות כד
  {
    verse = "ויקרא כ\"ה י\"ד",
    verseText = "כי תמכרו ממכר לעמיתך",
    source = "לקוטי הלכות - הלכות בית הכנסת ו - אות כ\"ד",
    part = 1, torah = 55, letter = "כד"
  },
  -- Teaching 5: Vayikra 25:14 (2nd) - שלוחין ה אות לט
  {
    verse = "ויקרא כ\"ה י\"ד",
    verseText = "אל תונו איש את אחיו",
    source = "לקוטי הלכות - הלכות שלוחין ה - אות ל\"ט",
    part = 7, torah = 81, letter = "לט"
  },
  -- Teaching 6: Vayikra 25:23 - גביעת חוב מלקוחות א
  {
    verse = "ויקרא כ\"ה כ\"ג",
    verseText = "והארץ לא תמכר לצמתת",
    source = "לקוטי הלכות - הלכות גביעת חוב מלקוחות א",
    part = 8, torah = 33, letter = "א"
  },
  -- Teaching 7: Vayikra 25:25 - חזקת קרקעות ב אות נ
  {
    verse = "ויקרא כ\"ה כ\"נ",
    verseText = "הארין היא בחינת אמונה",
    source = "לקוטי הלכות - הלכות חזקת קרקעות ב - אות נ'",
    part = 7, torah = 51, letter = "נ"
  },
  -- Teaching 8: Vayikra 25:35 - פסח ו אות יב
  {
    verse = "ויקרא כ\"ה ל\"ה",
    verseText = "וכי ימוך אחיך",
    source = "לקוטי הלכות - הלכות פסח ו - אות י\"ב",
    part = 3, torah = 27, letter = "יב"
  },
  -- Teaching 9: Vayikra 25:37 - רבית א אות מג
  {
    verse = "ויקרא כ\"ה ל\"ז",
    verseText = "את כספך לא תתן לו בנשך",
    source = "לקוטי הלכות - הלכות רבית א - אות מ\"ג",
    part = 4, torah = 73, letter = "מג"
  },
  -- Teaching 10: Vayikra 25:37 (2nd) - אפותיקי ב אות ב
  {
    verse = "ויקרא כ\"ה ל\"ז",
    verseText = "עבודה זרה נקראת חובה",
    source = "לקוטי הלכות - הלכות אפותיקי ב - אות ב'",
    part = 8, torah = 48, letter = "ב"
  },
  -- Teaching 11: Vayikra 25:37 (3rd) - רבית א אות מד
  {
    verse = "ויקרא כ\"ה ל\"ז",
    verseText = "חלוה הוא בחינת מיעוט חירוח",
    source = "לקוטי הלכות - הלכות רבית א - אות מ\"ד",
    part = 4, torah = 73, letter = "מד"
  },
  -- Teaching 12: Vayikra 25:43 - בית הכנסת א אות יח
  {
    verse = "ויקרא כ\"ה מ\"ג",
    verseText = "לא תרדה בו בפרך",
    source = "לקוטי הלכות - הלכות בית הכנסת א - אות י\"ח",
    part = 1, torah = 50, letter = "יח"
  },
  -- Teaching 13: Vayikra 25:46 - בית הכנסת א אות יח
  {
    verse = "ויקרא כ\"ה מ\"ו",
    verseText = "והתנחלתם אתם לבניכם",
    source = "לקוטי הלכות - הלכות בית הכנסת א - אות י\"ח",
    part = 1, torah = 50, letter = "יח"
  },
  -- Teaching 14: Vayikra 25:55 - בית הכנסת א אות יט
  {
    verse = "ויקרא כ\"ה נ\"ה",
    verseText = "כי לי בני ישראל עבדים",
    source = "לקוטי הלכות - הלכות בית הכנסת א - אות י\"ט",
    part = 1, torah = 50, letter = "יט"
  },
}

-- Read LH file and extract content for a specific letter
local function get_lh_letter(part, torrating, letter)
  local f = string.format("%s/part-%d/torrating-%d.json", lh_dir, part, torrating)
  local file = io.open(f, 'r')
  if not file then return nil, nil end
  local content = file:read('*a')
  file:close()
  local data = json.decode(content)
  
  -- Find segments matching the letter
  local he_parts = {}
  local en_parts = {}
  local capturing = false
  
  for _, seg in ipairs(data.segments or {}) do
    local he = seg.he or ""
    local en = seg.en or ""
    
    if he:find("אות " .. letter, 1, true) == 1 then
      capturing = true
      table.insert(he_parts, he)
      table.insert(en_parts, en)
    elseif capturing and he:find("^אות ") == 1 then
      break
    elseif capturing and #he > 0 then
      table.insert(he_parts, he)
      table.insert(en_parts, en)
    end
  end
  
  return table.concat(he_parts, "\n"), table.concat(en_parts, "\n")
end

-- Main: extract all teachings
local results = {}
for i, t in ipairs(teachings) do
  local he, en = get_lh_letter(t.part, t.torrating, t.letter)
  
  table.insert(results, {
    verse = t.verse,
    verseText = t.verseText,
    source = t.source,
    he = he,
    en = en
  })
  
  if he then
    print(string.format("✓ Teaching %d: %s - %s", i, t.verse, t.source))
  else
    print(string.format("✗ Teaching %d: %s - %s (Part %d Torah %d)", i, t.verse, t.source, t.part, t.torrating))
  end
end

print(string.format("\nFound %d/%d teachings", #results, #teachings))

-- Save results
local out = json.encode(results, {indent = 2})
local outFile = io.open('/root/ajew-org/public/data/behar-teachings.json', 'w')
outFile:write(out)
outFile:close()
print("Saved to public/data/behar-teachings.json")
