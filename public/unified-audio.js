// Unified Audio Player — shared across all reader pages
(function() {
  const player = document.getElementById('audio-controls');
  if (!player) return;
  player.style.display = 'block';

  // ── Panel toggle ──
  let activePanel = null;
  window.toggleAudio = function(lang) {
    if (lang === 'he' && window.enStop) window.enStop();
    if (lang === 'he' && typeof window.openAjewAudioPlayer === 'function') {
      window.openAjewAudioPlayer();
      return;
    }
    const panel = document.getElementById('audio-panel-' + lang);
    const btn = document.getElementById('audio-btn-' + lang);
    if (activePanel === panel) {
      panel.style.display = 'none';
      btn.style.background = 'var(--reader-bg-secondary,#f8f5f0)';
      btn.style.color = '';
      activePanel = null;
      return;
    }
    if (activePanel) activePanel.style.display = 'none';
    document.querySelectorAll('#audio-controls button[id^=audio-btn-]').forEach(function(b) {
      b.style.background = 'var(--reader-bg-secondary,#f8f5f0)';
      b.style.color = '';
    });
    panel.style.display = 'block';
    btn.style.background = lang === 'en' ? '#1a3a1a' : 'var(--reader-bg,#faf6ee)';
    btn.style.color = lang === 'en' ? '#7fff7f' : 'var(--reader-text,#333)';
    activePanel = panel;
    // Stop other audio
    if (lang === 'en' && window.kolAudio) window.kolAudio.pause();
  };

  // ── Kol HaTzadik Hebrew ──
  var hePanel = document.getElementById('audio-panel-he');
  var heAudio = document.getElementById('kol-hatzadik-audio');
  var heNote = document.getElementById('kol-hatzadik-note');
  if (hePanel && heAudio) {
    heAudio.style.display = 'none';
    heNote.textContent = 'Use the complete Hebrew audio player at the bottom of the page.';
  }

  // ── English TTS ──
  var enPanel = document.getElementById('audio-panel-en');
  if (!enPanel) return;

  // This is device read-aloud, not a recorded English track. Keep it independent
  // of reader-script's private Listen functions and the legacy tts-fix shim.
  var synth = window.speechSynthesis;
  var supported = !!(synth && typeof synth.speak === 'function' &&
    typeof window.SpeechSynthesisUtterance === 'function');
  var state = 'idle', generation = 0, chunks = [], index = 0, current = null;
  var voiceKey = 'ryan', voice = null, waitTimer = null, startTimer = null;
  var languages = { ryan: 'en-GB', guy: 'en-US', connor: 'en-IE' };
  var play = document.getElementById('en-btn-play');
  var status = document.createElement('div');
  status.id = 'en-read-aloud-status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  status.style.cssText = 'color:#fff;font-size:0.85em;margin-top:8px;';
  enPanel.appendChild(status);
  var stop = document.createElement('button');
  stop.id = 'en-btn-stop'; stop.type = 'button'; stop.textContent = 'Stop';
  stop.style.cssText = 'margin-top:8px;padding:6px 16px;';
  enPanel.appendChild(stop);
  var heading = enPanel.querySelector('strong');
  if (heading) heading.textContent = 'English device read-aloud';

  function render(message) {
    if (play) {
      play.textContent = state === 'playing' ? 'Pause read-aloud' :
        state === 'paused' ? 'Resume read-aloud' :
        state === 'waiting' ? 'Cancel voice loading' : 'Play English read-aloud';
      play.setAttribute('aria-pressed', String(state === 'playing'));
    }
    stop.disabled = state === 'idle';
    var progress = document.getElementById('en-progress');
    if (progress) progress.style.display = state === 'playing' || state === 'paused' ? 'block' : 'none';
    var bar = document.getElementById('en-progress-bar');
    if (bar) bar.style.width = (chunks.length ? 100 * index / chunks.length : 0) + '%';
    if (message) status.textContent = message;
  }
  function clearTimers() {
    clearTimeout(waitTimer); clearTimeout(startTimer);
    waitTimer = startTimer = null;
  }
  window.enStop = function(message) {
    // Waiting and paused sessions own no native utterance. Never cancel Listen.
    var ownedSpeech = state === 'playing';
    generation++; clearTimers(); current = null; state = 'idle';
    if (supported && ownedSpeech) synth.cancel();
    render(typeof message === 'string' ? message : 'Read-aloud stopped.');
  };
  stop.addEventListener('click', function() { window.enStop(); });

  window.enGetTexts = function() {
    // Select complete English segment bodies, including non-paragraph markup,
    // independently of the Hebrew/English display mode. Never read source IDs.
    var segments = document.querySelectorAll('.reader-container .segment-en');
    var texts = [];
    for (var i = 0; i < segments.length; i++) {
      // The Reader ships original and aligned copies; read only its selected copy.
      var representation = segments[i].closest('.reader-content-original, .reader-content-aligned');
      if (representation && representation.style.display === 'none') continue;
      if (segments[i].classList.contains('empty-translation')) continue;
      var body = segments[i].cloneNode(true);
      body.querySelectorAll('.segment-number, button, script, style').forEach(function(n) { n.remove(); });
      body.querySelectorAll('p, div, li, br, h2, h3, h4, blockquote').forEach(function(n) {
        n.appendChild(document.createTextNode('\n'));
      });
      var text = body.textContent.trim();
      if (text && !/^Translation not yet available[.!]?$/i.test(text)) texts.push(text);
    }
    return texts;
  };
  window.enGetText = function() { return window.enGetTexts().join('\n\n'); };
  function chunkText(text) {
    var result = [];
    while (text.length > 180) {
      var cut = text.lastIndexOf(' ', 180);
      if (cut < 60) cut = 180;
      else cut++;
      // Do not split a UTF-16 surrogate pair.
      if (/[\uD800-\uDBFF]/.test(text.charAt(cut - 1))) cut--;
      result.push(text.slice(0, cut)); text = text.slice(cut);
    }
    if (text) result.push(text);
    return result;
  }
  function pickVoice() {
    var voices;
    try { voices = synth.getVoices(); } catch (_) { voices = []; }
    var english = voices.filter(function(v) { return /^en(?:[-_]|$)/i.test(v.lang); });
    voice = english.find(function(v) { return v.lang.toLowerCase() === languages[voiceKey].toLowerCase(); }) || english[0] || null;
    return { any: voices.length > 0, english: !!voice };
  }
  function fail(message) { window.enStop(message + ' Tap Play to retry.'); }
  function speakChunk(token) {
    if (token !== generation || state !== 'playing') return;
    if (index >= chunks.length) { window.enStop('English read-aloud finished.'); return; }
    var utterance = new window.SpeechSynthesisUtterance(chunks[index]);
    current = utterance; // Retain the utterance until its terminal callback.
    utterance.voice = voice; utterance.lang = voice.lang; utterance.rate = 0.9;
    var started = false;
    utterance.onstart = function() {
      if (token !== generation) return;
      started = true; clearTimeout(startTimer);
      render('Reading English with ' + voice.name + ' (' + voice.lang + ') on this device.');
    };
    utterance.onend = function() {
      if (token !== generation || current !== utterance || state !== 'playing') return;
      clearTimeout(startTimer); current = null; index++; render(); speakChunk(token);
    };
    utterance.onerror = function(event) {
      if (token !== generation || current !== utterance) return;
      var code = event.error || 'unknown';
      fail(code === 'not-allowed' ? 'Speech was blocked by your browser. Allow device speech and try again.' :
        'Device read-aloud could not play (' + code + '). Check your device voices and sound.');
    };
    // Catch engines which neither start nor report an error. No silent Stop state.
    startTimer = setTimeout(function() {
      if (!started && token === generation) fail('The device speech engine did not start.');
    }, 10000);
    try { synth.speak(utterance); }
    catch (_) { fail('Device read-aloud is unavailable in this browser.'); }
  }
  function begin() {
    // Cancel other speech and recorded audio before claiming the speech engine.
    document.querySelectorAll('audio').forEach(function(a) { a.pause(); });
    if (window.kolAudio) window.kolAudio.pause();
    synth.cancel(); generation++; state = 'playing';
    render('Starting English device read-aloud…'); speakChunk(generation);
  }
  window.enTogglePlay = function() {
    if (!supported) { render('Device read-aloud is not supported in this browser. Try a browser with English speech support. This is not a recorded English track.'); return; }
    if (state === 'waiting') { window.enStop(); return; }
    if (state === 'playing') {
      // Android resume is unreliable: cancel, then replay only the current short
      // chunk on Resume rather than resuming a stuck native utterance.
      generation++; clearTimers(); current = null; state = 'paused'; synth.cancel();
      render('Paused. Resume repeats the current short phrase.'); return;
    }
    var listen = document.getElementById('btn-listen');
    if (listen && listen.classList.contains('active')) {
      render('The Reader Listen control is already active. Stop it with Escape before starting English device read-aloud.');
      return;
    }
    if (state === 'paused') { begin(); return; }
    var text = window.enGetText();
    if (!text.trim()) { render('No English translation is available on this page for read-aloud.'); return; }
    chunks = chunkText(text); index = 0;
    var readiness = pickVoice();
    if (readiness.english) { begin(); return; }
    if (readiness.any) { render('No English voice is available on this device. Enable an English voice in device speech settings, then tap Play again.'); return; }
    state = 'waiting'; render('Loading device speech voices…');
    waitTimer = setTimeout(function() {
      if (state === 'waiting') window.enStop('No English speech voice became available. Check device speech settings, then tap Play to retry.');
    }, 5000);
  };
  window.enSetVoice = function(key) {
    if (!languages[key]) return;
    if (state !== 'idle') window.enStop('Voice changed. Tap Play to restart.');
    voiceKey = key;
    Object.keys(languages).forEach(function(k) {
      var button = document.getElementById('en-btn-' + k);
      if (button) {
        button.style.opacity = k === key ? '1' : '0.4';
        button.setAttribute('aria-pressed', String(k === key));
        button.setAttribute('aria-label', 'Prefer ' + languages[k] + ' device voice');
        button.title = 'Prefer ' + languages[k] + ' (uses another English voice if unavailable)';
      }
    });
    if (supported) pickVoice();
  };
  if (supported && synth.addEventListener) synth.addEventListener('voiceschanged', function() {
    // Do not change an active utterance's selected voice mid-session.
    if (state === 'playing' || state === 'paused') return;
    var readiness = pickVoice();
    if (state === 'waiting' && readiness.english) {
      clearTimers(); state = 'idle';
      render('English voice ready. Tap Play to start device read-aloud.');
    } else if (state === 'waiting' && readiness.any) {
      window.enStop('No English voice is available. Enable one in device speech settings and retry.');
    }
  });
  // Capture precedes the legacy Listen handler without changing its language UI.
  document.addEventListener('click', function(event) {
    if (event.target.closest && event.target.closest('#btn-listen') && state !== 'idle') window.enStop();
  }, true);
  // Reader's real l shortcut bypasses click capture. Match its input guards.
  document.addEventListener('keydown', function(event) {
    if (event.key !== 'l' || state !== 'playing') return;
    var target = event.target;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
    var prayer = /^\/reader\/likutay-tefilos\/[12]\/\d+\/?$/.test(window.location ? window.location.pathname : '') &&
      document.querySelectorAll('.reader-container[data-book="likutay-tefilos"]').length;
    if (prayer && (target.tagName === 'SELECT' || target.isContentEditable ||
      (target.closest && target.closest('[contenteditable]:not([contenteditable="false"])')) ||
      event.altKey || event.ctrlKey || event.metaKey)) return;
    window.enStop();
  }, true);
  document.addEventListener('play', function(event) {
    if (event.target.tagName === 'AUDIO' && state !== 'idle') window.enStop('Read-aloud stopped for recorded audio.');
  }, true);
  window.addEventListener('pagehide', function() { if (state !== 'idle') window.enStop(); });
  window.enSetVoice('ryan');
  render(supported ? 'Reads this page’s English using your device voice; not a recorded track.' :
    'Device read-aloud is not supported in this browser. This is not a recorded English track.');
})();
