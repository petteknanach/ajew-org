import fs from 'node:fs';
import path from 'node:path';

// Route IDs authenticated against the existing parsha route and part-1 index.
export const PARSHA_READER = Object.freeze({
  bereishit: '1/1', noach: '1/2', 'lech-lecha': '1/3', vayeira: '1/4',
  'chayei-sarah': '1/5', toldot: '1/6', vayeitzei: '1/7', vayishlach: '1/8',
  vayeishev: '1/9', mikeitz: '1/10', vayigash: '1/11', vayechi: '1/12',
});
export function qualifiedIndexes(cwd = process.cwd()) {
  const root = path.join(cwd, 'public/data/breslov-parsha');
  return fs.readdirSync(root, {withFileTypes: true})
    .filter(entry => entry.isDirectory() && /^qualified-\d+-\d+$/.test(entry.name))
    .sort((a, b) => Number(a.name.split('-')[1]) - Number(b.name.split('-')[1]))
    .map(entry => {
      const index = JSON.parse(fs.readFileSync(path.join(root, entry.name, 'index.json'), 'utf8'));
      if (index.schema !== 'qualified-parsha-three-consumer-index/v1') throw Error(`Invalid qualified index ${entry.name}`);
      return {namespace: entry.name, index};
    });
}
export function publicJSON(url, cwd = process.cwd()) {
  if (typeof url !== 'string' || !url.startsWith('/') || url.includes('..') || /[?#\\]/.test(url)) throw Error('Invalid qualified source URL');
  return JSON.parse(fs.readFileSync(path.join(cwd, 'public', url), 'utf8'));
}
export function mergeQualified(selections) {
  if (!selections.length) return null;
  const units = new Map(), notes = new Map();
  for (const selection of selections) {
    for (const unit of [...(selection.units || []), ...(selection.apparatus || [])]) {
      if (units.has(unit.id) && JSON.stringify(units.get(unit.id)) !== JSON.stringify(unit)) throw Error(`Conflicting qualified source owner ${unit.id}`);
      units.set(unit.id, unit);
    }
    for (const note of selection.globalQualifications || []) {
      if (notes.has(note.id) && JSON.stringify(notes.get(note.id)) !== JSON.stringify(note)) throw Error(`Conflicting qualified source note ${note.id}`);
      notes.set(note.id, note);
    }
  }
  return {...selections[0], revision: selections.map(s => s.revision).join('+'),
    scopeNotice: [...new Set(selections.map(s => s.scopeNotice).filter(Boolean))].join('\n\n'),
    apparatusScopeNotice: [...new Set(selections.map(s => s.apparatusScopeNotice).filter(Boolean))].join('\n\n'),
    units: [...units.values()], apparatus: [], globalQualifications: [...notes.values()],
    sourceComplete: false};
}
export function qualifiedParsha(slug, indexes = qualifiedIndexes(), cwd = process.cwd()) {
  const selections = [], coverages = [];
  for (const {index} of indexes) {
    const coverage = index.parshas?.[slug];
    if (!coverage) continue;
    const master = publicJSON(index.masterUrl, cwd);
    if (master.schema !== 'qualified-parsha-public-master/v1') throw Error('Invalid qualified master');
    const byId = new Map([...(master.units || []), ...(master.apparatus || [])].map(u => [u.id, u]));
    const ids = [...coverage.mainIds, ...coverage.apparatusIds];
    const units = ids.map(id => {
      const unit = byId.get(id);
      if (!unit || unit.parsha !== slug) throw Error(`Missing qualified source owner ${id}`);
      return unit;
    });
    selections.push({...master, units, apparatus: []}); coverages.push(coverage);
  }
  return {selection: mergeQualified(selections), coverage: coverages[0] || null};
}
export function qualifiedChapter(chapter, indexes = qualifiedIndexes(), cwd = process.cwd()) {
  const matches = indexes.filter(({index}) => index.chapters?.[String(chapter)]);
  return {matches, selection: mergeQualified(matches.map(({index}) => {
    const data = publicJSON(index.chapters[String(chapter)].url, cwd);
    if (data.schema !== 'qualified-parsha-chapter-commentary/v1') throw Error('Invalid qualified chapter');
    return data;
  }))};
}
// Status is a separate reading qualification, never a certification claim.
export function fieldStatus(pair, language) {
  const value = pair.sourceStatus?.[language];
  return typeof value === 'string' ? value : value?.status || '';
}
export function fieldStatusLabel(pair, language) {
  const status = fieldStatus(pair, language);
  if (!status) return '';
  return `${language === 'he' ? 'Hebrew' : 'English'} — ${status === 'held' || status.startsWith('held-') ? 'unresolved source reading; see qualifications' : status.replaceAll('-', ' ')}`;
}

// BEGIN source-bound note89/v1 (identical in the three owning adapters)
function note89Binding(units) {
  var b = {"schema":"qualified-note-end-binding/v1","mainId":"b-p146-m01","noteId":"b-p146-n01","parsha":"vayeitzei","verseRef":{"book":"bereishit","chapter":28,"verse":12},"number":"89","position":"end","pair":{"id":"146-body","kind":"body","he":"עִקַּר כָּל הַתִּקּוּנִים הֵם עַל יְדֵי אִתְעָרוּתָא דִּלְתַתָּא, כִּי ה' יִתְבָּרַךְ רוֹצֶה שֶׁדַּיְקָא אֲנַחְנוּ נַעֲבֹד אוֹתוֹ מִזֶּה הָעוֹלָם, וּכְמוֹ שֶׁאָמַר אֲדוֹנֵנוּ מוֹרֵנוּ וְרַבֵּנוּ לְכַמָּה מֵאֲנָשָׁיו, אִם הָיָה הַקָּדוֹשׁ בָּרוּךְ הוּא רוֹצֶה לַעֲבֹד אֶת עַצְמוֹ בְּעַצְמוֹ לֹא הָיָה צָרִיךְ אוֹתְךָ וְכוּ'.","en":"The essential part of all the rectifications is through an awakening from below, for Hashem, blessed be He, wants specifically us to serve Him from this world. And as our master, teacher, and Rebbe said to several of his followers: If the Holy One, blessed be He, wanted to serve Himself by Himself, He would not need you, etc."},"fieldSha256":{"he":"e6ba145bb3be5c33f3382fc306977ff1edf09cf757dabe6661a5c428eb70eb91","en":"af358ad38ed73db3d4eef9fe70ca0b104a35d4df1dfc45bb8a299f6f18b8f415"},"notePairs":[{"id":"89-146-right","kind":"note_body","he":"פט. בחיי מוהר\"ן (סימן ש\"ל): אמר אני יכול לעשות מכלכם צדיקים גמורים נוראים, אבל מה יהיה אם כן יעבוד השם יתברך בעצמו את עצמו (כלומר שרצונו הוא שאנחנו בעצמנו נתיגע בכחו ועצותיו הקדושים להשיג עבודת השם. אבל לא שהוא יתן הכל לגמרי). וכן שמעתי עוד בכמה לשונות שאמר, אני יכול לתן יראה להאדם עד שיצא מחייו ויתבטל במציאות. ופעם אחת בקש מאתו אחד מאנשי שלומנו הרבה בענין זה שיתן לו יראה. (וכמדומה לי הכותב שזה היה ר' שמעון המשמש שלו (מכת\"י)) ודבר עמו רבנו זכרונו לברכה דברים כעין הנ\"ל שבודאי יכול לתן [לו] יראה עצומה רק שאין זה תכלית, כי אם כן יתבטל במציאות. והאיש הנ\"ל היה משתוקק אף על פי כן שיאיר עליו יראה עצומה, ואחר כך יצא האיש מלפניו ונפל עליו יראה עצומה ומפלגת מאד, והתחיל לצעק להשם יתברך בקולות משנות מה שלא","en":"89. In Chayay Moharan (item 330): He said, I can make all of you into awesome, consummate righteous people, but what would happen? In that case Hashem, blessed be He, would serve Himself. (That is, [Rabbainu's] will is that we ourselves exert ourselves through his strength and his holy counsels to attain the service of Hashem, but not that he give everything entirely.) And I also heard in several expressions that he said, I can give a person fear to the point that he departs from his life and is nullified in existence. And once, one of our fellowship begged him greatly concerning this, that he give him fear. (And it seems to me, the writer, that this was Rabbi Shimon, his attendant (from a manuscript).) And Rabbainu, of blessed memory, spoke with him in terms such as those above: that he certainly could give [him] tremendous fear, but that this is not the ultimate purpose, for if so he would be nullified in existence. And that man nevertheless longed for tremendous fear to shine upon him. And afterward the man went out from before him, and tremendous, exceedingly extraordinary fear fell upon him. And he began to cry out to Hashem, blessed be He, in strange cries such as he had never"},{"id":"89-146-left","kind":"note_body","he":"היה רגיל בכך עד שכמעט יצא מחיותו. ונמשך כך עד למחרתו. ולמחרת נכנס אצלו ושאל אותו רבנו זכרונו לברכה אם הגיע אליו יראה, השיב לו האיש הנ\"ל שוב איני רוצה בזה, ובקש מאתו שיקח ממנו זאת וחזר ולקח ממנו ושב לקדמותו. וכן אמר לאחד אם הייתי מעביר ידי על עיניך היית רואה גדולות ונפלאות, אבל איני רוצה בזה, רק שאתה בעצמך תתיגע בעבודת השם עד שתזכה למה שתזכה. וכן אמר לי פעם אחת בענין זה אם היה השם יתברך בעצמו רוצה, שהוא יתברך בעצמו יעבד את עצמו, אם כן לא היה צריך אותך. (כלומר שהצדיק יכול להמשיך רצון השם יתברך שיעוררהו בעבודתו אף על פי שיעשה מה שיעשה וראוי לרחקו אף על פי כן יכול הצדיק לעורר רחמי השם יתברך עליו שיקרבהו לעבודתו אבל לא שהשם יתברך יעשה הכל בעצמו). ע\"כ. ובליקוטי הלכות (דברים הנוהגים בסעודה הלכה ד' אות י\"ד):","en":"been accustomed to, until he almost departed from his vitality. And this continued until the following day. And on the following day he entered his presence, and Rabbainu, of blessed memory, asked him whether fear had reached him. That man answered him, I no longer want this, and begged him to take this away from him. And he again took it away from him, and he returned to his former state. And he also said to one: If I were to pass my hand over your eyes, you would see great and wondrous things, but I do not want this; rather, you yourself should exert yourself in the service of Hashem until you attain what you attain. And he also once said to me concerning this: If Hashem, blessed be He, Himself wanted Himself to serve Himself, then He would not need you. (That is, the righteous person can draw forth the will of Hashem, blessed be He, that He awaken him in His service—even though he does what he does and deserves to be distanced, nevertheless the righteous person can arouse Hashem's mercy upon him, that He draw him near to His service; but not that Hashem do everything Himself.) End of quotation. And in Likutay Halachos (Dvurim HaNoahagim BaS'ooduh [Practices at a Meal], Halacha 4, item 14):"},{"id":"89-147-right","kind":"note_body","he":"ובודאי יש כח ביד הצדיק לטול הבחירה מהאדם ולהחזירו בתשובה, אבל אין זה תיקון מאחר שאינו עושה תשובה בבחירתו. ע\"כ. ועי' בספר בן לאשרי להרה\"ק רבי יצחק הכהן זצ\"ל (סוף חלק ג' בקונטרס \"מקבילות הלולאות\" אות","en":"And certainly the righteous person has the power to take away a person's free choice and bring him back in repentance, but this is not a rectification, since he does not repent by his own choice. End of quotation. And see the book Ben L'Ashray, by the holy Rabbi Yitzchak HaKoahain, of blessed righteous memory (at the end of Part 3, in the booklet \"מקבילות הלולאות\" [Parallel Loops], item"},{"id":"89-147-left","kind":"note_body","he":"א') שכתב בשם האור החיים הק' \"משה רבינו ע\"ה שהיה רבו הפרטי של יהושע, להכלל ישראל היה רב כללי, ועל כן היה כחו של משה רבינו ע\"ה לטול מן יהושע את הבחירה שלא יהיה בעצת מרגלים\" ע\"כ.","en":"1), who wrote in the name of the holy Oar HaChayim: \"Moshe Rabbainu, peace be upon him, who was Yehoshua's personal teacher, was a general teacher for the collective of Israel. And therefore Moshe Rabbainu, peace be upon him, had the power to take away Yehoshua's free choice, so that he would not participate in the counsel of the spies.\" End of quotation."}]};
  if (!Array.isArray(units)) return null;
  var mains = units.filter(function(u) { return u && u.id === b.mainId; });
  var notes = units.filter(function(u) { return u && u.id === b.noteId; });
  if (mains.length !== 1 || notes.length !== 1) return null;
  var main = mains[0], note = notes[0];
  var role = function(u) { return u.sourceKind || u.source_kind || (u.kind === 'apparatus' ? 'note' : u.kind); };
  if (role(main) !== 'main' || role(note) !== 'note' || main.parsha !== b.parsha || note.parsha !== b.parsha ||
      note.owner_main_id !== b.mainId || !main.verseRef || ['book','chapter','verse'].some(function(k) { return main.verseRef[k] !== b.verseRef[k]; }) ||
      !Array.isArray(main.pairs) || !Array.isArray(note.pairs)) return null;
  var pairs = main.pairs.filter(function(p) { return p && p.id === b.pair.id; });
  if (pairs.length !== 1 || ['kind','he','en'].some(function(k) { return pairs[0][k] !== b.pair[k]; }) ||
      note.pairs.length !== b.notePairs.length || note.pairs.some(function(p,i) {
        return !p || ['id','kind','he','en'].some(function(k) { return p[k] !== b.notePairs[i][k]; });
      })) return null;
  // Exact full-field equality is the binding; sourceStatus digests are not trusted.
  return {mainId:b.mainId, noteId:b.noteId, pairId:b.pair.id, number:b.number};
}
function note89Reference(binding, unit, pair, target) {
  if (!binding || unit.id !== binding.mainId || pair.id !== binding.pairId) return '';
  return '<sup data-note89-marker><a data-note89-ref role="doc-noteref" aria-label="Printed note 89" href="#'+target+'">89</a></sup>';
}
function note89Activate(event, rootSelector) {
  var link = event.target && event.target.closest('[data-note89-ref]');
  var root = link && link.closest(rootSelector);
  if (!root) return;
  var id = link.getAttribute('href').slice(1);
  var target = Array.prototype.find.call(root.querySelectorAll('[data-note89-target]'), function(n) { return n.id === id; });
  if (!target) return;
  event.preventDefault();
  for (var p = target; p && p !== root; p = p.parentNode) if (p.tagName && p.tagName.toLowerCase() === 'details') p.open = true;
  var body = target.querySelector('details'); if (body) body.open = true;
  target.focus(); target.scrollIntoView({block:'nearest'});
}
// END source-bound note89/v1

function note89QualificationText(q) {
  if (q.owner === 'b-p146-n01' &&
      ((q.id === 'note89-current-qualification' && q.placement === 'after_owner' && q.pair_id === null) ||
       (q.id === 'note89-source-locator' && q.placement === 'after_pair' && q.pair_id === '89-146-right')) &&
      q.text === "The author confirms note89’s marker at the END of paragraph 146-body, owned by b-p146-m01, ending עַצְמוֹ בְּעַצְמוֹ לֹא הָיָה צָרִיךְ אוֹתְךָ וְכוּ'. The complete note remains an independent apparatus body in its existing order; its association is now established, not uncertain. The author also confirms that note89 prints item330 and the corresponding source is item330; the earlier 333 discrepancy was our transcription/review error, not a printed variant.") return 'Printed note 89 follows the paragraph ending “He would not need you, etc.” Its citation is Chayay Moharan, item 330.';
  return q.text;
}

export {note89Binding, note89Reference, note89QualificationText};
