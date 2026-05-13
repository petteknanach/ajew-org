"""
inject_en_audio.py
Injects the English TTS audio player into all 23 English-book reader pages.
Run from the ajew-org folder:  python inject_en_audio.py
"""
import os, re

READER_DIR = os.path.join('src', 'pages', 'reader')

# 23 books with hasEnglish: true
ENGLISH_BOOKS = [
    'likutay-moharan', 'kitzur-likutay-moharan', 'sefer-hamidos',
    'sipurey-maasiyos', 'likutay-halachos', 'likutay-tefilos',
    'likutay-eitzos', 'sichos-haran', 'shivchay-haran', 'chayey-moharan',
    'alim-litrufa', 'yemei-hatlaos', 'chumash-lh', 'otzar-hayirah',
    'hashtatfchus-hanefesh', 'meshivas-nefesh', 'ebay-hanachal',
    'yisroel-saba', 'saba-tape-transcripts', 'sichos-chayay-saba',
    'praises-of-rabbi-nachman', 'fires-of-israel', 'aitzoas-yeshuroas',
]

# ── HTML to inject ────────────────────────────────────────────────────────────

def make_player(book_id: str) -> str:
    return f'''
      <!-- English TTS Audio Player -->
      <div id="en-tts-player"
           data-book="{book_id}"
           data-part={{partNum}}
           data-torah={{torahNum}}
           style="display:none; margin: 0 auto 12px auto; max-width: 700px;">
        <div style="background:#1a3a1a; border:1px solid #2d5a2d; border-radius:8px; padding:12px 16px;">
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
            <span style="font-size:1.1em;">&#x1F50A;</span>
            <strong style="color:#7fff7f; font-family:\'Open Sans\',sans-serif; font-size:0.9em;">English Audio</strong>
            <div style="margin-left:auto; display:flex; gap:4px;">
              <button id="en-btn-ryan"   onclick="enSetVoice(\'ryan\')"   style="background:#7fff7f20;border:2px solid #7fff7f;color:#fff;border-radius:6px;padding:2px 8px;cursor:pointer;font-size:0.9em;" title="British voice">&#x1F1EC;&#x1F1E7;</button>
              <button id="en-btn-guy"    onclick="enSetVoice(\'guy\')"    style="background:#7fff7f10;border:1px solid #7fff7f40;color:#fff;border-radius:6px;padding:2px 8px;cursor:pointer;font-size:0.9em;" title="American voice">&#x1F1FA;&#x1F1F8;</button>
              <button id="en-btn-connor" onclick="enSetVoice(\'connor\')" style="background:#7fff7f10;border:1px solid #7fff7f40;color:#fff;border-radius:6px;padding:2px 8px;cursor:pointer;font-size:0.9em;" title="Irish voice">&#x1F1EE;&#x1F1EA;</button>
            </div>
          </div>
          <audio id="en-tts-audio" controls preload="none"
                 style="width:100%; border-radius:4px; accent-color:#7fff7f;">
            Your browser does not support audio.
          </audio>
          <div id="en-tts-note"
               style="font-size:0.78em; color:#7fff7f80; margin-top:4px; font-family:\'Open Sans\',sans-serif;">
            Neural voice reading &middot; Na Nach Nachma Nachman Meuman
          </div>
        </div>
      </div>
      <script is:inline>
      (function() {{
        var player = document.getElementById('en-tts-player');
        if (!player) return;
        var torahN = parseInt(player.dataset.torah);
        if (isNaN(torahN)) return;   // intro/preface pages — no audio
        var bookId  = player.dataset.book;
        var partN   = parseInt(player.dataset.part) || 1;
        var IA_BASE = 'https://archive.org/download/nanach-english-tts';
        var currentVoice = localStorage.getItem('en_tts_voice') || 'ryan';

        function getUrl(voice) {{
          return IA_BASE + '/' + bookId + '/part-' + partN + '/' + torahN + '-' + voice + '.mp3';
        }}

        function updateButtons(active) {{
          ['ryan','guy','connor'].forEach(function(v) {{
            var btn = document.getElementById('en-btn-' + v);
            if (!btn) return;
            if (v === active) {{
              btn.style.border = '2px solid #7fff7f';
              btn.style.background = '#7fff7f20';
            }} else {{
              btn.style.border = '1px solid #7fff7f40';
              btn.style.background = '#7fff7f10';
            }}
          }});
        }}

        window.enSetVoice = function(voice) {{
          currentVoice = voice;
          localStorage.setItem('en_tts_voice', voice);
          var audio = document.getElementById('en-tts-audio');
          if (audio) {{
            audio.src = getUrl(voice);
            audio.load();
            audio.play().catch(function(){{}});
          }}
          updateButtons(voice);
        }};

        // Show the player
        player.style.display = 'block';

        // Set initial URL
        var audio = document.getElementById('en-tts-audio');
        if (audio) audio.src = getUrl(currentVoice);
        updateButtons(currentVoice);
      }})();
      </script>
'''

# ── Injection logic ───────────────────────────────────────────────────────────

def inject_player(content: str, book_id: str) -> str:
    """Return modified content with EN player inserted, or original if already present."""
    if 'en-tts-player' in content:
        return content  # already injected

    player_html = make_player(book_id)

    # Strategy 1: insert after the closing </div></div> of kol-hatzadik-player
    # Pattern: the outer </div> that closes the kol-hatzadik-player block
    kol_close = '      </div>\n      <script is:inline>'
    if kol_close in content:
        return content.replace(kol_close, '      </div>\n' + player_html + '\n      <script is:inline>', 1)

    # Strategy 2 (no kol-hatzadik-player): insert just before the reader-toolbar
    toolbar_marker = '      <div class="reader-toolbar">'
    if toolbar_marker in content:
        return content.replace(toolbar_marker, player_html + '\n' + toolbar_marker, 1)

    # Strategy 3: insert after breadcrumb section
    breadcrumb_end = '      </div>\n\n      <!-- '
    if breadcrumb_end in content:
        return content.replace(breadcrumb_end, '      </div>\n\n' + player_html + '\n      <!-- ', 1)

    print(f'  WARNING: could not find injection point in {book_id}')
    return content


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    updated = 0
    skipped = 0
    missing = 0

    for book_id in ENGLISH_BOOKS:
        astro_path = os.path.join(READER_DIR, book_id, '[part]', '[torah].astro')
        if not os.path.exists(astro_path):
            print(f'MISSING: {astro_path}')
            missing += 1
            continue

        with open(astro_path, 'r', encoding='utf-8') as f:
            original = f.read()

        modified = inject_player(original, book_id)

        if modified == original:
            if 'en-tts-player' in original:
                print(f'  already done: {book_id}')
            else:
                print(f'  NO INJECTION POINT: {book_id}')
            skipped += 1
        else:
            with open(astro_path, 'w', encoding='utf-8') as f:
                f.write(modified)
            print(f'  ✓ injected: {book_id}')
            updated += 1

    print(f'\nDone: {updated} updated, {skipped} skipped, {missing} missing')


if __name__ == '__main__':
    main()
