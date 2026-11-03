'use strict';
document.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-copy-link]');
  if (!button) return;
  try {
    await navigator.clipboard.writeText(button.dataset.copyLink);
    button.textContent = 'Copied';
  } catch (_) { button.textContent = 'Copy the page address'; }
});


// Browser-only enrichment of one immutable published post; RSS/no-JS stay unchanged.
(async () => {
  const path = '/blog/p/6cf48f1f8a6644a18543a6e966082bd5';
  if (location.pathname !== path && location.pathname !== path + '/') return;
  const marker = 'yom-kippur-hebrew-translation';
  const state = Symbol.for('ajew.yom-kippur-illustrated.v1');
  if (globalThis[state] || document.getElementById(marker)) return;
  const expected = ["HH", "Written by Gemini ", "The Mathematical Paradox Hidden inside Yom Kippur and Teshuvah", "There is a famous math puzzle known as the Coin Rotation Paradox. If you take a small coin and roll it perfectly around the outside edge of a larger coin that is exactly 6 times its size, how many times will the small coin rotate by the time it makes one full trip?", "Our immediate intuition says 6 times, because the surface of the large coin is exactly 6 times longer than the perimeter of the small one. But if you actually run the experiment, the small coin will rotate exactly 7 times.", "Where does that extra turn come from? It doesn't come from the surface distance. It comes from the curved path of the journey itself. By making a full 360-degree loop around the center, the moving coin gets one \"bonus\" rotation from the perspective of the universe. The exact same thing happens with the Earth: while we count 365 days in a year relative to the Sun, the Earth physically spins 366 times relative to the distant stars.", "This hidden, uncounted \"plus-one\" dimension is a perfect physical parable for a deep spiritual secret found in the Torah.", "The Day Outside of Time", "King David writes a cryptic phrase in Psalms (139:16):", "יָמִים יוּצָרוּ וְלוֹ אֶחָד בָּהֶם", "\"The days were fashioned, and...\"", "This verse contains a profound linguistic feature in Jewish tradition known as a Krei and Ktiv—where a word is written one way but read out loud as another, intentionally holding two opposite meanings simultaneously.", "• How it is WRITTEN (Ktiv): It uses the word לֹא (with an Aleph), meaning \"Not.\" Written this way, the verse reads: \"The days were fashioned, and not one of them remained.\" This speaks to the absolute vulnerability of time—how every day evaporates into history the moment it passes.", "• How it is READ (Krei): It is pronounced as לוֹ (with a Vav), meaning \"For Him\" or \"To it.\" Read this way, the verse transforms completely into: \"The days were fashioned, and He has one among them\" (or \"there is one special day belonging to them\").", "The Sages of the Midrash teach that this specific, hidden \"One\" day refers to Yom Kippur.", "Just like the hidden 366th rotation of the Earth that we don't count on our standard calendars, Yom Kippur is the \"plus-one\" day of the year. The numerical value (Gematria) of the name Satan (הַשָּׂטָן) is exactly 364. The commentators explain that the Accuser has permission to prosecute humanity on 364 days of the year, but on Yom Kippur—the 365th day—he has no power. It is a day completely removed from the natural matrix of time, judgment, and physical constraints.", "Rebbe Nachman and Teshuvah \"Above Time\"", "In Likutey Moharan, Rebbe Nachman of Breslov takes this concept a step deeper by connecting it to the mechanics of Teshuvah (repentance/return).", "Rebbe Nachman explains that standard human life operates inside regular time—where actions have immutable consequences, and the past is locked away. However, the root of true Teshuvah stems from a spiritual realm called Binah, which exists completely \"Above Time\" (לְמַעְלָה מֵהַזְּמַן).", "When a person genuinely turns back to the Divine, they aren't just fixing a past mistake within the timeline. They are stepping off the flat \"surface\" of regular daily life and tapping into that cosmic, uncounted \"plus-one\" dimension. From this elevated perspective, time expands, boundaries break down, and a person is granted the supernatural ability to rewrite their own history—metaphorically turning past deliberate sins into structural merits.", "The Coin Rotation Paradox reminds us that the universe is engineered with hidden dimensions. What looks like a standard cycle from the inside actually contains an extra, transcendent turn from the outside. When we tap into the power of Teshuvah and the holiness of Yom Kippur, we enter that exact space: the day that is \"not\" (Lo) part of standard time, because it belongs entirely \"to Him\" (Lo).", "Taking the Paradox Deeper: The Spiritual Center of gravity", "If you look at the Coin Rotation Paradox through modern astronomy, the \"hidden extra turn\" (366 physical rotations vs. 365 solar days) only exists because the Earth is moving in a heliocentric orbit around the Sun.", "But if we look at the universe through the lens of the Talmud and traditional Torah thought, the perspective is geocentric—the Earth is the stationary center point of the physical cosmos. From a purely geocentric view, the Earth doesn't orbit, so that physical, astronomical \"extra turn\" disappears.", "How do we reconcile this? We elevate the perspective from astronomy to theology.", "The true model of reality isn't heliocentric or geocentric; it is Theocentric. Everything in existence—every planet, every soul, every molecule of time—revolves around Hakadosh Baruch Hu. The entire physical matrix of the 365-day year is a massive spiritual gear orbiting the Divine.", "Because creation is making a full annual loop around its Creator, the geometric law of the paradox still demands a hidden, transcendent \"+1\" turn in the full count.", "That extra turn is Yom Kippur.", "The standard 364 days of the year represent the physical surface distance we travel through—a realm bound by nature, time, and the consequences of our mistakes (the Gematria of ha-Satan, the Accuser, is exactly 364). But Yom Kippur is the 365th turn. It is the day that doesn't belong to the regular surface of the calendar. It is the \"bonus turn\" generated purely by our alignment with the Divine Center.", "When we enter Yom Kippur, we step into the cosmic axis point where regular time stops, the past can be rewritten through Teshuvah, and we touch the Day that is entirely \"Above Time.\"", "Part 3: The Internal Orbit and the \"Minus One\" of Nullification", "Let’s take the Coin Rotation Paradox to its ultimate spiritual extreme.", "Previously, we looked at a small circle rolling on the outside of a larger circle, which mathematically forces a \"+1\" bonus rotation. We mapped this to the standard 364 days of the year orbiting the Divine from the outside, with Yom Kippur as the 365th \"transcendent\" turn.", "But there is a second half to this geometric law. What happens if the smaller circle rolls on the inside rim of the larger circle?", "Because it is looping inside, its orbital direction opposes its own spinning axis. Instead of gaining a rotation, it loses exactly one rotation (-1). If the ratio is 6:1 on the outside, it turns 7 times; but if it rolls on the inside, it turns exactly 5 times.", "This is the secret of the highest spiritual state: Bittul (Self-Nullification).", "When a person feels separate from God, they are \"outside\" the circle. They experience the friction of the world, the 364 days of standard natural law, and the constant striving to \"add\" holiness.", "But on Yom Kippur, we don't look at God from the outside. We enter inside Him. We recognize that \"There is no place empty of Him\" (לית אתר פנוי מיניה). We realize that our entire lives, and all 365 days of the year, are actually turning inside the ultimate, infinite space of the Divine.", "The moment you step inside the Divine Reality, the mathematical formula flips to Minus One.", "That \"Minus One\" is the ego being completely subtracted. It is the elimination of the Yetzer Hara (the Evil Inclination). On Yom Kippur, we don't eat, drink, or engage in physical survival because we have subtracted our independent, physical existence. We are completely nullified inside the Center.", "This is the deepest understanding of Rebbe Nachman’s concept of being \"Above Time\" (לְמַעְלָה מֵהַזְּמַן). You don't get above time by adding more time; you get above time by subtracting time entirely.", "When the 365 days turn inside HY, that hidden -1 collapses the clock. The past, the present, and the future merge into one singular point of absolute purity. We become completely still at the center of the Creator, where time ceases to exist, and only the Divine remains.", "Na NaCh NaChMa NaChMaN MAyUMaN "];
  const expectedImages = [{"url": "/blog/media/yom-kippur-outside-5afb29b3b906.svg", "sha256": "5afb29b3b906ed9593b3de8b6580df58dc166cd3eee85a45a2785795957e5e29", "width": 900, "height": 820, "title": "Rolling outside — equal-size coins", "alt": "One clockwise orbit produces two clockwise spins for equal-size coins. At a 6:1 radius ratio, the count is seven.", "caption": "One clockwise orbit produces two clockwise spins for equal-size coins. At a 6:1 radius ratio, the count is seven.", "after_paragraph": 6}, {"url": "/blog/media/yom-kippur-inside-f1b34c7f7fe4.svg", "sha256": "f1b34c7f7fe4751d495d99f08fccec844615e273e7999be8d41d6412fbd44723", "width": 900, "height": 820, "title": "Rolling inside — the missing turn", "alt": "The centre travels clockwise while the small circle spins counterclockwise. At a 6:1 radius ratio: 6 − 1 = 5 spins.", "caption": "The centre travels clockwise while the small circle spins counterclockwise. At a 6:1 radius ratio: 6 − 1 = 5 spins.", "after_paragraph": 34}];
  const title = 'Yom Kippur - the day above time';
  const sidecar = '/blog/media/yom-kippur-illustrated-eacf29734e2c.json';
  const payloadHash = 'eacf29734e2c5965c0704beaa45f791519745ce32ff1418d7860f88a9c097ef3';
  const articles = document.querySelectorAll('article.blog-post.post-card');
  const headings = document.querySelectorAll('.post-page-header h1');
  if (articles.length !== 1 || headings.length !== 1) return;
  const article = articles[0];
  // Match writer.py's text/BR serialization, not layout-dependent innerText.
  function paragraphText(p) {
    let text = '';
    for (const n of p.childNodes) {
      if (n.nodeType === 3) text += n.textContent;
      else if (n.nodeType === 1 && n.tagName === 'BR' && !n.childNodes.length) text += '\n';
      else return null;
    }
    return text;
  }
  const paragraphs = Array.from(article.children);
  function sourceMatches() {
    return headings[0].isConnected && headings[0].textContent === title && article.isConnected &&
      paragraphs.length === 43 && article.children.length === 43 &&
      paragraphs.every((p, i) => article.children[i] === p && p.tagName === 'P' &&
        paragraphText(p) === expected[i]);
  }
  if (!sourceMatches()) return;
  globalThis[state] = true; // Also blocks concurrent initializers before fetch resolves.
  function requireValue(ok, message) { if (!ok) throw new Error(message); }
  function keysEqual(value, keys) {
    return value && typeof value === 'object' && !Array.isArray(value) &&
      Object.keys(value).sort().join(',') === keys.slice().sort().join(',');
  }
  function mediaURL(value) {
    requireValue(typeof value === 'string' && /^\/blog\/media\/[a-z0-9-]+\.svg$/.test(value), 'Invalid media path');
    const url = new URL(value, location.origin);
    requireValue(url.origin === location.origin && url.pathname === value && !url.search && !url.hash,
      'Nonlocal media asset');
    return value;
  }
  try {
    const response = await fetch(sidecar, {mode: 'same-origin', credentials: 'omit', cache: 'no-store', redirect: 'error'});
    requireValue(response.ok, 'Sidecar request failed');
    requireValue((response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase() === 'application/json',
      'Sidecar must be JSON');
    const bytes = await response.arrayBuffer();
    const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)),
      n => n.toString(16).padStart(2, '0')).join('');
    requireValue(digest === payloadHash, 'Sidecar SHA256 mismatch');
    const data = JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(bytes));
    requireValue(keysEqual(data, ['schema', 'post_id', 'source_version', 'source_body_sha256', 'source_title',
      'source_paragraphs', 'images', 'hebrew_title', 'hebrew_paragraphs', 'heading_indexes']), 'Invalid schema keys');
    requireValue(data.schema === 1 && data.post_id === '6cf48f1f8a6644a18543a6e966082bd5' &&
      data.source_version === 2 && data.source_body_sha256 === 'e5414cd078e760d81ec26429957f6d11976afd3df5178ebc6ba13b26cb6de3c5' &&
      data.source_title === title, 'Source identity mismatch');
    requireValue(Array.isArray(data.source_paragraphs) && data.source_paragraphs.length === 43 &&
      data.source_paragraphs.every((p, i) => p === expected[i]), 'Source paragraphs mismatch');
    requireValue(typeof data.hebrew_title === 'string' && data.hebrew_title.length > 0 &&
      Array.isArray(data.hebrew_paragraphs) && data.hebrew_paragraphs.length === 43 &&
      data.hebrew_paragraphs.every(p => typeof p === 'string' && p.length > 0), 'Invalid Hebrew paragraphs');
    requireValue(JSON.stringify(data.heading_indexes) === '[2,7,16,21,30]', 'Invalid Hebrew headings');
    requireValue(Array.isArray(data.images) && data.images.length === 2, 'Invalid image count');
    data.images.forEach((image, i) => {
      const pin = expectedImages[i];
      requireValue(keysEqual(image, Object.keys(pin)) && Object.keys(pin).every(k => image[k] === pin[k]),
        'Image metadata mismatch');
      mediaURL(image.url);
      requireValue(image.width === 900 && image.height === 820, 'Invalid image dimensions');
    });
    // Construct off-DOM. Only reviewed plain text is assigned; no HTML interpretation.
    const figures = data.images.map(image => {
      const figure = document.createElement('figure');
      figure.style.cssText = 'width:100%;max-width:900px;margin:2rem auto;';
      const img = document.createElement('img');
      img.src = mediaURL(image.url);
      img.alt = image.alt;
      img.title = image.title;
      img.width = image.width;
      img.height = image.height;
      img.style.cssText = 'display:block;width:100%;max-width:900px;height:auto;';
      const caption = document.createElement('figcaption');
      caption.textContent = image.caption;
      caption.style.cssText = 'font-size:18px;line-height:1.6;margin-top:0.75rem;';
      figure.append(img, caption);
      return figure;
    });
    const section = document.createElement('section');
    section.id = marker;
    section.lang = 'he';
    section.dir = 'rtl';
    section.setAttribute('aria-labelledby', marker + '-title');
    section.style.cssText = 'clear:both;box-sizing:border-box;width:100%;max-width:900px;margin:3rem auto;padding:1rem;font-size:24px;line-height:1.9;text-align:right;overflow-wrap:anywhere;';
    const heading = document.createElement('h2');
    heading.id = marker + '-title';
    heading.textContent = data.hebrew_title;
    heading.style.cssText = 'font-size:28px;line-height:1.6;margin:1.5rem 0;';
    section.append(heading);
    data.hebrew_paragraphs.forEach((text, i) => {
      const p = document.createElement(data.heading_indexes.includes(i) ? 'h2' : 'p');
      p.textContent = text;
      p.style.cssText = 'font-size:24px;line-height:1.9;margin:1.25rem 0;white-space:pre-line;';
      section.append(p);
    });
    // Recheck after asynchronous work: never attach a stale translation to edited prose.
    requireValue(sourceMatches() && !document.getElementById(marker), 'Live source changed while loading');
    paragraphs[6].after(figures[0]);
    paragraphs[34].after(figures[1]);
    article.after(section);
    return true;
  } catch (error) {
    // Keep the original English intact; expose real failures, never claim success.
    console.error('Yom Kippur enrichment not applied:', error);
    return false;
  }
})();
