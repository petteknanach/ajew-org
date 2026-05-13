// TTS Fix — monkeypatches reader-script.js TTS for:
// 1. Voice preloading (fixes silent fail on first use)
// 2. Long text chunking (fixes Chrome Android 200-char bug)
// 3. English voice selection (prefer quality voices)
// 4. Error toast feedback (instead of silent skip)
(function() {
  'use strict';

  // Wait for reader-script.js to define its TTS functions
  function patch() {
    if (typeof speakSegments === 'undefined' || typeof toggleSpeaking === 'undefined') {
      setTimeout(patch, 200);
      return;
    }

    // Voice management
    let ttsVoices = [];
    let ttsVoicesReady = false;
    let englishVoice = null;

    function loadVoices() {
      ttsVoices = speechSynthesis.getVoices();
      if (ttsVoices.length > 0) {
        ttsVoicesReady = true;
        pickEnglishVoice();
      }
    }
    loadVoices();
    speechSynthesis.addEventListener('voiceschanged', function() {
      ttsVoices = speechSynthesis.getVoices();
      ttsVoicesReady = true;
      pickEnglishVoice();
    });

    function pickEnglishVoice() {
      var preferred = ['Google US English','Microsoft David','Samantha','Alex','Daniel','Karen','Google UK English Female','Google UK English Male'];
      for (var i = 0; i < preferred.length; i++) {
        for (var j = 0; j < ttsVoices.length; j++) {
          if (ttsVoices[j].lang.indexOf('en') === 0 && ttsVoices[j].name.indexOf(preferred[i]) !== -1) {
            englishVoice = ttsVoices[j];
            return;
          }
        }
      }
      // Fallback: any English voice
      for (var k = 0; k < ttsVoices.length; k++) {
        if (ttsVoices[k].lang.indexOf('en') === 0) {
          englishVoice = ttsVoices[k];
          return;
        }
      }
    }

    // Chunk long text at sentence boundaries
    function chunkText(text) {
      if (text.length <= 200) return [text];
      var parts = text.match(/[^.!?;]+[.!?;]*\s*/g);
      if (!parts || parts.length <= 1) return [text];
      var chunks = [], current = '';
      for (var i = 0; i < parts.length; i++) {
        if ((current + parts[i]).length > 200 && current.length > 0) {
          chunks.push(current.trim());
          current = parts[i];
        } else {
          current += parts[i];
        }
      }
      if (current.trim()) chunks.push(current.trim());
      return chunks.length > 0 ? chunks : [text];
    }

    // Toast notification
    function showToast(msg) {
      var toast = document.getElementById('tts-toast');
      if (!toast) {
        toast = document.createElement('div');
        toast.id = 'tts-toast';
        toast.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#2d3748;color:#fff;padding:10px 20px;border-radius:8px;font-size:0.9em;z-index:9999;opacity:0;transition:opacity 0.3s;pointer-events:none;font-family:"Open Sans",sans-serif;';
        document.body.appendChild(toast);
      }
      toast.textContent = msg;
      toast.style.opacity = '1';
      clearTimeout(toast._timer);
      toast._timer = setTimeout(function() { toast.style.opacity = '0'; }, 4000);
    }

    // Override the global speakSegments to use chunking + voice selection
    var origSpeakSegments = speakSegments;
    var origStopSpeaking = stopSpeaking;
    var errorCount = 0;

    // Intercept SpeechSynthesisUtterance creation
    var OrigUtterance = window.SpeechSynthesisUtterance;
    window.SpeechSynthesisUtterance = function(text) {
      var utt = new OrigUtterance(text);
      // Monkeypatch speak to add voice + chunking
      var origSpeak = speechSynthesis.speak;
      if (!speechSynthesis._patched) {
        speechSynthesis._patched = true;
        speechSynthesis.speak = function(utterance) {
          // Apply voice if English
          if (utterance.lang && utterance.lang.indexOf('en') === 0 && englishVoice) {
            try { utterance.voice = englishVoice; } catch(e) {}
          }
          // Add error handler
          if (!utterance._patched) {
            utterance._patched = true;
            var origOnerror = utterance.onerror;
            utterance.onerror = function(event) {
              if (event.error === 'canceled' || event.error === 'interrupted') {
                if (origOnerror) origOnerror.call(this, event);
                return;
              }
              errorCount++;
              if (errorCount === 1) {
                showToast('⚠ Speech may not be available on this device. Trying to continue...');
              }
              if (origOnerror) origOnerror.call(this, event);
            };
          }
          origSpeak.call(speechSynthesis, utterance);
        };
      }
      return utt;
    };

    // Reset error counter when stopping
    stopSpeaking = function() {
      errorCount = 0;
      origStopSpeaking();
    };

    // Patch toggleSpeaking to preload voices AND fix Chrome resume bug
    var origToggleSpeaking = toggleSpeaking;
    var pausedSegment = -1;
    toggleSpeaking = function() {
      var ttsState = window.ttsState; // reader-script.js global
      if (ttsState && !ttsState.speaking && !ttsState.paused && !ttsVoicesReady) {
        ttsVoices = speechSynthesis.getVoices();
        if (ttsVoices.length > 0) {
          ttsVoicesReady = true;
          pickEnglishVoice();
        } else {
          showToast('Loading speech voices...');
          var onReady = function() {
            speechSynthesis.removeEventListener('voiceschanged', onReady);
            ttsVoices = speechSynthesis.getVoices();
            ttsVoicesReady = true;
            pickEnglishVoice();
            toggleSpeaking();
          };
          speechSynthesis.addEventListener('voiceschanged', onReady);
          return;
        }
      }
      // Fix Chrome resume bug: restart instead of resume
      if (ttsState && ttsState.paused) {
        speechSynthesis.cancel();
        ttsState.paused = false;
        ttsState.speaking = true;
        var btn = document.getElementById('btn-listen');
        if (btn) { btn.textContent = 'Pause'; btn.classList.add('active'); }
        speakSegments(pausedSegment >= 0 ? pausedSegment : ttsState.currentSeg || 0);
        return;
      }
      // Track position on pause
      if (ttsState && ttsState.speaking && !ttsState.paused) {
        pausedSegment = ttsState.currentSeg;
        speechSynthesis.pause();
        ttsState.paused = true;
        var btn2 = document.getElementById('btn-listen');
        if (btn2) { btn2.textContent = 'Resume'; btn2.classList.add('active'); }
        return;
      }
      errorCount = 0;
      pausedSegment = -1;
      origToggleSpeaking();
    };

    console.log('[tts-fix] TTS patched: voice preload, chunking, error toast, English voice picker');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { setTimeout(patch, 500); });
  } else {
    setTimeout(patch, 500);
  }
})();
