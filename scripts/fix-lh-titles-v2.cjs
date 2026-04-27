const fs = require('fs');

const translations = {
  'השכמת הבוקר': 'Rising in the Morning', 'לבישת בגדים': 'Dressing', 'הנהגת בית הכסא': 'Lavatory',
  'נטילת ידים שחרית': 'Morning Hand-Washing', 'נטילת ידים לסעודה': 'Hand-Washing for Meals',
  'נטילת ידים': 'Hand-Washing', 'ציצית': 'Tzitzis', 'תפילין': 'Tefillin',
  'ברכת השחר': 'Morning Blessings', 'קריאת שמע': 'Krias Shema',
  'תפלה': 'Prayer', 'תפילה': 'Prayer', 'נשיאת כפים': 'Priestly Blessing',
  'קריאת התורה': 'Torah Reading', 'בית הכנסת': 'Synagogue',
  'ברכת הפירות': 'Fruit Blessings', 'ברכת הריח': 'Fragrance Blessings',
  'ברכת הודאה': 'Thanks Blessings', 'ברכת הנהנין': 'Pleasure Blessings',
  'סעודה': 'Meals', 'ברכת המוציא': 'HaMotzi', 'בציעת הפת': 'Breaking Bread',
  'ברכת המזון': 'Grace After Meals', 'פת שחרית': 'Morning Bread',
  'שבת': 'Shabbos', 'ערובין': 'Eruvin', 'ראש חודש': 'Rosh Chodesh',
  'פסח': 'Pesach', 'ספירת העומר': 'Counting the Omer', 'שבועות': 'Shavuos',
  'תענית': 'Fasting', 'תשעה באב': "Tisha B'Av", 'ראש השנה': 'Rosh Hashana',
  'יום הכפורים': 'Yom Kippur', 'יום כיפור': 'Yom Kippur',
  'סוכה': 'Sukkah', 'לולב': 'Lulav', 'חנוכה': 'Chanukah', 'פורים': 'Purim',
  'מגילה': 'Megillah', 'חול המועד': 'Chol HaMoed', 'יום טוב': 'Yom Tov',
  'שחיטה': 'Slaughter', 'טריפות': 'Treifos', 'בשר בחלב': 'Meat and Milk',
  'תערובות': 'Mixtures', 'מליחה': 'Salting', 'דם': 'Blood',
  'כיסוי הדם': 'Covering Blood', 'ביצים': 'Eggs', 'גיד הנשה': 'Gid HaNasheh',
  'חלב': 'Forbidden Fat', 'עבודת כוכבים': 'Idolatry', 'עבודה זרה': 'Idolatry',
  'נדה': 'Niddah', 'מילה': 'Circumcision', 'פדיון בכור': 'Redeeming Firstborn',
  'כבוד רבו': 'Honoring Teachers', 'תלמוד תורה': 'Torah Study',
  'צדקה': 'Charity', 'מזוזה': 'Mezuzah', 'כלאים': 'Kilayim', 'ערלה': 'Orlah',
  'ביכורים': 'Bikkurim', 'תרומות ומעשרות': 'Terumos and Maasros',
  'הפרשת חלה': 'Separating Challah', 'חלה': 'Challah',
  'שמיטה': 'Shemittah', 'נדרים': 'Vows', 'שבועות': 'Oaths',
  'דיינים': 'Judges', 'עדות': 'Testimony', 'טוען ונטען': 'Claims',
  'אונאה': 'Fraud', 'אונאה ומקח טעות': 'Fraud and Mistaken Sales',
  'מקח וממכר': 'Commerce', 'שלוחין': 'Agents',
  'נזיקין': 'Damages', 'נזקי שכנים': 'Neighbor Damages',
  'פקדון': 'Deposits', 'שאלה ופקדון': 'Borrowing and Deposits',
  'חלוקת שותפים': 'Division of Partners', 'שותפין': 'Partners',
  'גיטין': 'Divorce', 'קידושין': 'Marriage', 'כתובות': 'Kesubos',
  'פריה ורביה': 'Procreation', 'יבום': 'Levirate Marriage',
  'הלואה': 'Loans', 'הלוואה': 'Loans', 'ריבית': 'Interest', 'משכון': 'Collateral',
  'שכירות פועלים': 'Hiring Workers', 'שכירות': 'Hiring',
  'גניבה': 'Theft', 'גזלה': 'Robbery', 'גניבה וגזילה': 'Theft and Robbery',
  'אבידה ומציאה': 'Lost and Found', 'נחלות': 'Inheritance',
  'אפוטרופוס': 'Guardian', 'מתנה': 'Gifts', 'שומרים': 'Guardians',
  'חושן משפט': 'Choshen Mishpat', 'אבן העזר': 'Even HaEzer',
  'יורה דעה': 'Yoreh Deah', 'אורח חיים': 'Orach Chaim',
  'סימני בהמה וחיה טהורה': 'Signs of Kosher Animals',
  'סימנים': 'Signs', 'ברכות': 'Blessings',
  'חזקה': 'Possession', 'טהרה': 'Purity', 'מקוה': 'Mikvah',
  'הכשר כלים': 'Koshering Vessels', 'כלים': 'Vessels',
  'שילוח הקן': 'Sending Away Mother Bird', 'כיבוד אב ואם': 'Honoring Parents',
  'אבלות': 'Mourning', 'בקור חולים': 'Visiting the Sick',
  'שמירת הגוף': 'Guarding the Body', 'תפלת המנחה': 'Minchah',
  'תפילת המנחה': 'Minchah', 'תפלת ערבית': 'Maariv', 'תפילת ערבית': 'Maariv',
  'קריאת שמע שעל המטה': 'Bedtime Shema', 'חצות': 'Midnight',
  'השמטות': 'Supplements', 'הוספות': 'Additions', 'הקדמה': 'Introduction',
  'פתיחה': 'Opening', 'הלכות גדולות': 'Great Laws',
  'שלום': 'Peace', 'רוצח': 'Murder', 'גרים': 'Converts',
  'שותפות': 'Partnership', 'מתנת שכיב מרע': 'Deathbed Gift',
  'ירושה': 'Inheritance', 'אישות': 'Marriage Laws',
  'נטיעה': 'Planting', 'כשרות': 'Kashrus',
};

let totalFixed = 0;
for (let part = 1; part <= 8; part++) {
  const p = `public/reader/likutay-halachos/part-${part}/index.json`;
  if (!fs.existsSync(p)) continue;
  const idx = JSON.parse(fs.readFileSync(p, 'utf8'));
  let fixed = 0;

  for (const torah of (idx.torahs || [])) {
    if (torah.title && !/^(Halacha|Prayer|Section|Letter) \d+/.test(torah.title)) continue;

    const he = (torah.hebrewTitle || '').replace(/[\u0591-\u05C7]/g, '').trim();

    // Try longest match first
    const sortedKeys = Object.keys(translations).sort((a, b) => b.length - a.length);
    for (const heb of sortedKeys) {
      if (he.includes(heb)) {
        const afterMatch = he.substring(he.indexOf(heb) + heb.length).trim();
        torah.title = translations[heb] + (afterMatch ? ' ' + afterMatch : '');
        fixed++;
        break;
      }
    }
  }

  fs.writeFileSync(p, JSON.stringify(idx, null, 2), 'utf8');
  totalFixed += fixed;
  console.log(`Part ${part}: ${fixed} more fixed`);
}
console.log(`\nTotal newly fixed: ${totalFixed}`);

// V3 - additional translations
const moreTranslations = {
  'משא ומתן': 'Business',
  'עירובי תחומין': 'Eruv Techumin',
  'הושענא רבה': 'Hoshana Rabba',
  'ענין ד\' פרשיות': 'Four Parshiyos',
  'מתנות כהונה': 'Priestly Gifts',
  'אבר מן החי': 'Limb from Living Animal',
  'בשר שנתעלם מן העין': 'Unsupervised Meat',
  'בשר שנתעלם מו העין': 'Unsupervised Meat',
  'דברים היוצאים מן החי': 'Products of Living Animals',
  'סימני עוף טהור': 'Signs of Kosher Birds',
  'דגים': 'Fish',
  'תולעים': 'Worms/Insects',
  'מאכלי עכו"ם': 'Non-Jewish Food',
  'נותן טעם לפגם': 'Spoiled Flavor',
  'יין נסך': 'Non-Jewish Wine',
  'הלכות יין נסך': 'Non-Jewish Wine',
  'כלי היין': 'Wine Vessels',
  'עבודת אלילים': 'Idol Worship',
  'חוקות העכו"ם': 'Gentile Customs',
  'מעונן ומנחש': 'Divination',
  'לא ילבש גבר': 'Cross-Dressing Prohibition',
  'קרחה וכתובת קעקע': 'Baldness and Tattoos',
  'קרחה ושריטה': 'Baldness and Scratching',
  'גילוח': 'Shaving',
  'מקוואות': 'Mikvaos',
  'מלמדים': 'Teachers',
  'עבדים': 'Servants',
  'ספר תורה': 'Torah Scroll',
  'חדש': 'New Grain',
  'כלאי אילן': 'Tree Grafting',
  'כלאי הכרם': 'Vineyard Mixtures',
  'כלאי בהמה': 'Animal Crossbreeding',
  'כלאי בגדים': 'Mixed Fabrics',
  'בכור בהמה טהורה': 'Firstborn Kosher Animal',
  'פדיון פטר חמור': 'Redeeming Firstborn Donkey',
  'ראשית הגז': 'First Shearing',
  'אבילות': 'Mourning',
  'נידוי וחרם': 'Excommunication',
  'סוטה': 'Suspected Wife',
  'אונס ומפתה': 'Rape and Seduction',
  'גביית מלוה': 'Debt Collection',
  'גביות חוב מהיתומים': 'Collecting from Orphans',
  'גביית חוב מהלקוחות': 'Collecting from Buyers',
  'העושה שליח לגבות חובו': 'Agent for Debt Collection',
  'כח והרשאה': 'Power of Attorney',
  'שליחות והרשאה': 'Agency and Authorization',
  'ערב': 'Guarantor',
  'חזקת מטלטלין': 'Possession of Movables',
  'חזקת קרקעות': 'Possession of Land',
  'שותפים בקרקע': 'Land Partners',
  'מצרנות': 'Neighbor Rights',
  'מכירה': 'Sale',
  'פריקה וטעינה': 'Loading and Unloading',
  'הפקר ונכסי הגר': 'Ownerless Property',
  'אפטרופוס': 'Guardian',
  'אומנין': 'Craftsmen',
  'חכירות וקבלנות': 'Leasing and Contracting',
  'שומר שכר': 'Paid Guardian',
  'שוכר': 'Renter',
  'שאלה': 'Borrowing',
  'גזילה': 'Robbery',
  'חובל בחבירו': 'Injuring Another',
  'שמירת הנפש': 'Preserving Life',
  'מאבד ממון חבירו': 'Destroying Property',
  'מוסר': 'Informer',
  'נזקי ממון': 'Property Damages',
  'מעקה': 'Fence/Railing',
};

for (let part = 1; part <= 8; part++) {
  const p = `public/reader/likutay-halachos/part-${part}/index.json`;
  if (!fs.existsSync(p)) continue;
  const idx = JSON.parse(fs.readFileSync(p, 'utf8'));
  let fixed = 0;
  for (const torah of (idx.torahs || [])) {
    if (!/^(Halacha|Prayer|Section|Letter) \d+/.test(torah.title || '')) continue;
    const he = (torah.hebrewTitle || '').replace(/[\u0591-\u05C7]/g, '').trim();
    const sortedKeys = Object.keys(moreTranslations).sort((a, b) => b.length - a.length);
    for (const heb of sortedKeys) {
      if (he.includes(heb)) {
        const afterMatch = he.substring(he.indexOf(heb) + heb.length).trim();
        torah.title = moreTranslations[heb] + (afterMatch ? ' ' + afterMatch : '');
        fixed++;
        break;
      }
    }
  }
  fs.writeFileSync(p, JSON.stringify(idx, null, 2), 'utf8');
  if (fixed > 0) console.log(`Part ${part}: ${fixed} more fixed`);
}
