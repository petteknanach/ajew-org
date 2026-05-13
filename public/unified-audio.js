// Unified Audio Player — shared across all reader pages
(function() {
  const player = document.getElementById('audio-controls');
  if (!player) return;
  player.style.display = 'block';

  // ── Panel toggle ──
  let activePanel = null;
  window.toggleAudio = function(lang) {
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
    if (lang === 'he' && window.speechSynthesis) { window.speechSynthesis.cancel(); }
  };

  // ── Kol HaTzadik Hebrew ──
  var hePanel = document.getElementById('audio-panel-he');
  var heAudio = document.getElementById('kol-hatzadik-audio');
  var heNote = document.getElementById('kol-hatzadik-note');
  if (hePanel && heAudio) {
    var bookEl = document.getElementById('en-tts-player');
    var book = bookEl ? bookEl.getAttribute('data-book') : 'likutay-moharan';
    var part = bookEl ? bookEl.getAttribute('data-part') : '1';
    var torah = bookEl ? bookEl.getAttribute('data-torah') : '1';
    var fileStr = String(torah).padStart(3, '0');
    var fileName = 'kol-hatzadik-' + book + '-' + part + '-' + fileStr + '.mp3';
    var heUrl = 'https://pub-81b61511a43c43218e37bc24c20a7a22.r2.dev/kol-hatzadik/' + fileName;
    fetch(heUrl, { method: 'HEAD' }).then(function(r) {
      if (r.ok) {
        heAudio.src = heUrl;
        heNote.textContent = 'Kol HaTzadik recording available';
        window.kolAudio = heAudio;
      } else {
        heNote.textContent = 'No recording for this teaching yet';
        heAudio.style.display = 'none';
      }
    }).catch(function() {
      heNote.textContent = 'Audio unavailable';
      heAudio.style.display = 'none';
    });
  }

  // ── English TTS ──
  var enPanel = document.getElementById('audio-panel-en');
  if (!enPanel) return;

  var enIsPlaying = false;
  var enCurrentVoice = 'ryan';
  var enVoices = { ryan: { lang: 'en-GB' }, guy: { lang: 'en-US' }, connor: { lang: 'en-IE' } };

  window.enGetText = function() {
    var segs = document.querySelectorAll('.segment-en p');
    var texts = [];
    for (var i = 0; i < segs.length; i++) {
      var t = segs[i].textContent;
      if (t && t !== 'Translation not yet available') texts.push(t);
    }
    return texts.join('. ');
  };

  window.enTogglePlay = function() {
    if (enIsPlaying) {
      window.speechSynthesis.cancel();
      enIsPlaying = false;
      var pb = document.getElementById('en-btn-play');
      if (pb) pb.textContent = '\u25B6 Play English';
      return;
    }
    var text = window.enGetText();
    if (!text) return;
    var utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = enVoices[enCurrentVoice].lang;
    utterance.rate = 0.9;
    enIsPlaying = true;
    var pb = document.getElementById('en-btn-play');
    if (pb) pb.textContent = '\u23F9 Stop';
    var pr = document.getElementById('en-progress');
    if (pr) pr.style.display = 'block';
    window.speechSynthesis.speak(utterance);
    utterance.onend = function() {
      enIsPlaying = false;
      var pb2 = document.getElementById('en-btn-play');
      if (pb2) pb2.textContent = '\u25B6 Play English';
      var pr2 = document.getElementById('en-progress');
      if (pr2) pr2.style.display = 'none';
    };
  };

  window.enSetVoice = function(voice) {
    enCurrentVoice = voice;
    ['ryan','guy','connor'].forEach(function(v) {
      var b = document.getElementById('en-btn-' + v);
      if (b) b.style.opacity = v === voice ? '1' : '0.4';
    });
  };
  window.enSetVoice('ryan');
})();
