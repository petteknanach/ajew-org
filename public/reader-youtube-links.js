/* Source-scoped watch links only: no embeds or media downloads. */
(() => {
  'use strict';
  if (window.AjewReaderYouTubeLinks) {
    window.AjewReaderYouTubeLinks.init();
    return;
  }

  // Explicit native Reader families from the baseline route inventory.
  // Unknown books fail closed; new route families require an explicit addition.
  const books = new Set([
    'aitzoas-hamivooaroas', 'aitzoas-yeshuroas', 'alim-litrufa',
    'azamra', 'biur-halikutim', 'breiter-seder-hayom',
    'chayay-moharan', 'chayey-moharan', 'chayey-moharan-hosafos',
    'chochma-utvuna', 'chumash-lh', 'ebay-hanachal',
    'fires-of-israel', 'geedoolay-hanachal', 'gevuros-shimshon',
    'hashtatfchus-hanefesh', 'hilchasa-kinachamani', 'hisbodidus-alone-time',
    'kaftor-vaferach-a', 'kitzur-likutay-moharan', 'kokhvei-or',
    'kuntrass-hiskashrus', 'likutay-eitzos', 'likutay-eitzos-basra',
    'likutay-halachos', 'likutay-moharan', 'likutay-nanach',
    'likutay-tefilos', 'meshivas-nefesh', 'michtevay-shmuel',
    'mishna-arachin', 'mishna-avodah-zarah', 'mishna-avot',
    'mishna-bava-batra', 'mishna-bava-kamma', 'mishna-bava-metzia',
    'mishna-bechorot', 'mishna-beitzah', 'mishna-bikkurim',
    'mishna-brachot', 'mishna-chagigah', 'mishna-challah',
    'mishna-chulin', 'mishna-demai', 'mishna-eduyot',
    'mishna-eruvin', 'mishna-gittin', 'mishna-horayot',
    'mishna-kelim', 'mishna-keritot', 'mishna-ketubot',
    'mishna-kiddushin', 'mishna-kilayim', 'mishna-maaser-sheni',
    'mishna-maasrot', 'mishna-machshirin', 'mishna-makkot',
    'mishna-megillah', 'mishna-meilah', 'mishna-menachot',
    'mishna-middot', 'mishna-mikvaot', 'mishna-moed-katan',
    'mishna-nazir', 'mishna-nedarim', 'mishna-niddah',
    'mishna-orlah', 'mishna-parah', 'mishna-peah',
    'mishna-pesachim', 'mishna-rosh-hashana', 'mishna-sanhedrin',
    'mishna-shabbat', 'mishna-shekalim', 'mishna-sheviit',
    'mishna-shevuot', 'mishna-sotah', 'mishna-sukkah',
    'mishna-taanit', 'mishna-taharot', 'mishna-tamid',
    'mishna-temurah', 'mishna-terumot', 'mishna-yevamot',
    'mishna-yoma', 'mishna-zavim', 'mishna-zevachim',
    'nachas-hashulchan', 'otzar-hayirah', 'otzar-nachmani',
    'parparos-lechochma', 'pettek-nanach-commentary', 'praises-of-rabbi-nachman',
    'rambam-ahava', 'rambam-avoda', 'rambam-haflaa',
    'rambam-kedusha', 'rambam-kinyan', 'rambam-korbanot',
    'rambam-mada', 'rambam-mishpatim', 'rambam-nashim',
    'rambam-nezikin', 'rambam-shoftim', 'rambam-tahara',
    'rambam-zeraim', 'rambam-zmanim', 'ramchal-adir-bamuroam',
    'ramchal-asara-perakim', 'ramchal-daas-tevunos', 'ramchal-derech-etz-chaim',
    'ramchal-derech-hashem', 'ramchal-ginzay-ramchal', 'ramchal-klach-pitchei-chochma',
    'ramchal-maamar-haikkarim', 'ramchal-mesillas-yesharim', 'ramchal-otzros-ramchal',
    'ramchal-ruzin-gineezin', 'ramchal-shaaray-ramchal', 'ramchal-tikunim-chadashim',
    'ramchal-yichud-hayeeruh', 'rimzei-hamaasiyos', 'saba-tape-transcripts',
    'sefer-hamidos', 'seven-pillars', 'shemos-hatzadikim',
    'shivchay-haran', 'siach-sarfei-kodesh', 'sichos-chayay-saba',
    'sichos-haran', 'sipurey-maasiyos', 'talmud-bavli-arachin',
    'talmud-bavli-avodah-zarah', 'talmud-bavli-bava-batra', 'talmud-bavli-bava-kamma',
    'talmud-bavli-bava-metzia', 'talmud-bavli-bechorot', 'talmud-bavli-beitza',
    'talmud-bavli-brachot', 'talmud-bavli-chagigah', 'talmud-bavli-chulin',
    'talmud-bavli-eduyot', 'talmud-bavli-eruvin', 'talmud-bavli-gittin',
    'talmud-bavli-horayot', 'talmud-bavli-keritot', 'talmud-bavli-ketubot',
    'talmud-bavli-kiddushin', 'talmud-bavli-makkot', 'talmud-bavli-megillah',
    'talmud-bavli-meilah', 'talmud-bavli-menachot', 'talmud-bavli-moed-katan',
    'talmud-bavli-nazir', 'talmud-bavli-nedarim', 'talmud-bavli-niddah',
    'talmud-bavli-psachim', 'talmud-bavli-rosh-hashana', 'talmud-bavli-sanhedrin',
    'talmud-bavli-shabbat', 'talmud-bavli-shevuot', 'talmud-bavli-shkalim',
    'talmud-bavli-sotah', 'talmud-bavli-sukkah', 'talmud-bavli-taanit',
    'talmud-bavli-tamid', 'talmud-bavli-temurah', 'talmud-bavli-yevamot',
    'talmud-bavli-yoma', 'talmud-bavli-zevachim', 'tanach-amos',
    'tanach-bamidbar', 'tanach-bereishit', 'tanach-chaggai',
    'tanach-daniel', 'tanach-devarim', 'tanach-divrei-hayamim-a',
    'tanach-divrei-hayamim-b', 'tanach-eicha', 'tanach-esther',
    'tanach-ezra', 'tanach-havakkuk', 'tanach-hoshea',
    'tanach-iyov', 'tanach-koheles', 'tanach-malachi',
    'tanach-melachim-a', 'tanach-melachim-b', 'tanach-michah',
    'tanach-mishlei', 'tanach-nachum', 'tanach-nechemia',
    'tanach-ovadya', 'tanach-rus', 'tanach-shemos',
    'tanach-shir-hashirim', 'tanach-shmuel-a', 'tanach-shmuel-b',
    'tanach-shoftim', 'tanach-tehillim', 'tanach-tzefanya',
    'tanach-vayikra', 'tanach-yechezkel', 'tanach-yehoshua',
    'tanach-yeshayahu', 'tanach-yirmiyahu', 'tanach-yoel',
    'tanach-yonah', 'tanach-zecharya', 'tefilos-haboker',
    'toldos-adam', 'uzi-meshulam-prison-letter', 'vidui-devarim-breiter',
    'yemei-hatlaos', 'yemei-moharnat', 'yereach-haeitanim',
    'yikra-dshabbata', 'yimay-shmuel', 'yisroel-saba',
    'zimras-haaretz', 'zohar-bamidbar', 'zohar-bereishit',
    'zohar-devarim', 'zohar-hadash', 'zohar-hakdama',
    'zohar-shemos', 'zohar-tikunim', 'zohar-vayikra'
  ]);
  const positive = n => Number.isSafeInteger(n) && n > 0;
  const section = s => typeof s === 'string' && s.length <= 80 &&
    /^(?:0|[1-9][0-9]*|[a-z][a-z0-9]*(?:-[a-z0-9]+)*)$/.test(s);
  function parseRoute(path) {
    const siman = /^\/reader\/chayey-moharan\/siman\/([1-9][0-9]*)\/?$/.exec(path);
    if (siman && section(siman[1])) return { book: 'chayey-moharan', part: 1, torah: siman[1], routeType: 'siman' };
    const match = /^\/reader\/([a-z][a-z0-9-]*)\/([1-9][0-9]*)\/([^/]+)\/?$/.exec(path);
    if (!match || !books.has(match[1]) || !positive(Number(match[2])) || !section(match[3])) return null;
    return { book: match[1], part: Number(match[2]), torah: match[3], routeType: 'section' };
  }
  function sameRoute(a, b) {
    return a && b && a.book === b.book && a.part === b.part && a.torah === b.torah &&
      (a.routeType ?? 'section') === (b.routeType ?? 'section');
  }
  function validEntry(e, route) {
    if (!e || typeof e !== 'object' || !sameRoute(e, route) ||
        !(e.routeType === undefined || ['section', 'siman'].includes(e.routeType)) ||
        (e.routeType === 'siman' && (e.book !== 'chayey-moharan' || e.part !== 1 || !/^[1-9][0-9]*$/.test(e.torah))) ||
        !(e.annotation === undefined || (typeof e.annotation === 'string' && e.annotation.length <= 800)) ||
        !positive(e.part) || !section(e.torah) ||
        !(e.segment === null || positive(e.segment)) ||
        !['he', 'en'].includes(e.language) || !['song', 'story', 'teaching'].includes(e.kind) ||
        typeof e.videoId !== 'string' || !/^[A-Za-z0-9_-]{11}$/.test(e.videoId) ||
        !['title', 'channel'].every(k => typeof e[k] === 'string' && e[k].trim() && e[k].length <= 500) ||
        typeof e.sourceUrl !== 'string' || e.sourceUrl.length > 600) return false;
    // Keep the supplied exact source URL, but never accept foreign/unsafe URLs,
    // queries, encoded aliases, credentials or aligned ordinal coordinates.
    if (!e.sourceUrl.startsWith('https://ajew.org/reader/') && !e.sourceUrl.startsWith('/reader/')) return false;
    try {
      const url = new URL(e.sourceUrl, 'https://ajew.org');
      return url.origin === 'https://ajew.org' && !url.username && !url.password && !url.search &&
        sameRoute(parseRoute(url.pathname), route) &&
        e.sourceUrl.split('#')[0].replace(/^https:\/\/ajew\.org/, '') === url.pathname &&
        url.hash === (e.segment === null ? '' : '#seg-' + e.segment) &&
        !/[\s\\%]/.test(e.sourceUrl);
    } catch (_) { return false; }
  }

  let pending = null;
  let state = null;
  function node(tag, className, text) {
    const result = document.createElement(tag);
    if (className) result.className = className;
    if (text !== undefined) result.textContent = text;
    return result;
  }
  function link(url, text) {
    const result = node('a', '', text);
    result.href = url;
    result.target = '_blank';
    result.rel = 'noopener noreferrer';
    return result;
  }
  function makeGroup(segment, entries) {
    const details = node('details', 'reader-youtube-links');
    // Native copy/share/save strip .ajew-segment-actions descendants. Mark
    // only the inner action nodes, not the details itself: a direct-child
    // action bar marker would suppress the native teaching-action initializer.
    const summary = node('summary', 'ajew-segment-actions', 'YouTube watch links');
    const qualification = node('p', 'reader-youtube-qualification ajew-segment-actions');
    const list = node('ul', 'reader-youtube-list ajew-segment-actions');
    details.append(summary, qualification, list); // Closed native, keyboard-accessible details.
    const rows = entries.map(e => {
      const row = node('li', 'reader-youtube-row');
      row.lang = e.language;
      row.dir = e.language === 'he' ? 'rtl' : 'ltr';
      row.append(link('https://www.youtube.com/watch?v=' + e.videoId, e.title));
      row.append(node('span', 'reader-youtube-meta',
        (e.language === 'he' ? 'Hebrew' : 'English') + ' · ' +
        (e.kind === 'teaching' ? 'Teaching video' : e.kind === 'story' ? 'Story adaptation' : 'Video-song') + ' · ' + e.channel));
      if (e.kind === 'teaching') row.append(node('span', 'reader-youtube-annotation',
        'Lecture/commentary on the linked source, not a literal reading.'));
      row.append(link(e.sourceUrl, 'Reader source' + (segment === null ? '' : ' · paragraph ' + segment)));
      if (e.annotation) row.append(node('span', 'reader-youtube-annotation', e.annotation));
      list.append(row);
      return { row, language: e.language };
    });
    return { segment, details, summary, qualification, rows };
  }
  function setHidden(el, hidden) {
    if (el.hidden !== hidden) el.hidden = hidden;
  }
  function setText(el, text) {
    if (el.textContent !== text) el.textContent = text;
  }
  function hiddenSource(el, content) {
    for (let current = el; current; current = current.parentElement) {
      const css = window.getComputedStyle(current);
      if (current.hidden || css.display === 'none' || css.visibility === 'hidden') return true;
      if (current === content) break;
    }
    return false;
  }
  function refresh() {
    if (!state) return;
    const { container, content, page, groups, route } = state;
    if (!sameRoute(parseRoute(window.location.pathname), route)) {
      groups.forEach(g => g.details.remove());
      page.remove();
      return;
    }
    // reader-script puts mode on .reader-content; v2 also sets the container.
    const modeRoot = ['mode-hebrew', 'mode-english', 'mode-both'].some(c => content.classList.contains(c)) ? content : container;
    const mode = modeRoot.classList.contains('mode-hebrew') ? 'he' :
      modeRoot.classList.contains('mode-english') ? 'en' :
      modeRoot.classList.contains('mode-both') ? 'both' : null;
    const mediaOff = [document.body, document.documentElement, container, content].some(el =>
      ['reader-hide-media', 'reader-teachings-only', 'reader-immersive', 'media-hidden'].some(c => el.classList.contains(c)));
    let pageVisible = false;
    for (const group of groups) {
      let destination = page;
      let fallback = false;
      if (group.segment !== null) {
        // Never use .reader-segment-pair order or aligned-N as a relation.
        const candidates = Array.from(content.querySelectorAll('.reader-segment-pair')).filter(el =>
          el.id === 'seg-' + group.segment && !el.closest('.reader-content-aligned'));
        if (candidates.length !== 1) {
          group.details.remove(); // Missing/ambiguous source owner: no UI.
          continue;
        }
        const original = candidates[0];
        fallback = hiddenSource(original, content);
        destination = fallback ? page : original;
      }
      if (group.details.parentElement !== destination) destination.append(group.details);
      setText(group.qualification, fallback ?
        'Original source paragraph ' + group.segment + '. No aligned-paragraph mapping is asserted; use the Reader source link.' : '');
      setHidden(group.qualification, !fallback);
      setText(group.summary, fallback ? 'YouTube · original source paragraph ' + group.segment : 'YouTube watch links');
      let visibleRows = 0;
      group.rows.forEach(({ row, language }) => {
        const visible = mode === 'both' || mode === language;
        setHidden(row, !visible);
        if (visible) visibleRows++;
      });
      const visible = !mediaOff && visibleRows > 0;
      setHidden(group.details, !visible);
      if (destination === page && visible) pageVisible = true;
    }
    setHidden(page, !pageVisible);
    if (!page.children.length) page.remove();
    else if (page.parentElement !== content.parentElement || page.nextSibling !== content) {
      content.parentElement.insertBefore(page, content);
    }
  }
  let scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(() => { scheduled = false; refresh(); });
  }
  async function init() {
    if (pending) return pending;
    const route = parseRoute(window.location.pathname);
    const container = document.querySelector('.reader-container');
    const content = container && container.querySelector('.reader-content');
    if (!route || !content) return;
    pending = (async () => {
      try {
        const response = await fetch('/reader/youtube-links.json?v=20261014-3');
        if (!response.ok) return;
        const manifest = await response.json();
        if (!manifest || manifest.version !== 1 || !Array.isArray(manifest.entries)) return;
        const seen = new Set();
        const bySegment = new Map();
        for (const entry of manifest.entries) {
          if (!validEntry(entry, route)) continue;
          const key = JSON.stringify([entry.segment, entry.language, entry.videoId]);
          if (seen.has(key)) continue;
          seen.add(key);
          if (!bySegment.has(entry.segment)) bySegment.set(entry.segment, []);
          bySegment.get(entry.segment).push(entry);
        }
        if (!bySegment.size || !sameRoute(parseRoute(window.location.pathname), route)) return;
        const page = node('section', 'reader-youtube-page');
        page.setAttribute('aria-label', 'Source-associated YouTube watch links');
        page.hidden = true;
        state = { route, container, content, page,
          groups: Array.from(bySegment, ([segment, entries]) => makeGroup(segment, entries)) };
        // Observe native mode, projection and media controls without changing them.
        const observer = new MutationObserver(schedule);
        observer.observe(container, { subtree: true, childList: true, attributes: true,
          attributeFilter: ['class', 'style', 'hidden', 'id'] });
        observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        window.addEventListener('pageshow', schedule);
        refresh();
      } catch (_) { /* Missing or malformed manifest fails closed. */ }
    })();
    return pending;
  }
  window.AjewReaderYouTubeLinks = Object.freeze({ init, refresh });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
