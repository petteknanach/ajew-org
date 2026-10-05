#!/usr/bin/env python3
"""Regression: Letter 1 audio must not open the mixed-item video preview."""
from html.parser import HTMLParser
from pathlib import Path
import unittest

PAGE = Path(__file__).resolve().parents[1] / 'src/pages/reader/ebay-hanachal/[part]/[torah].astro'
AUDIO = ('https://archive.org/download/ebay-hanachal-letter-1/'
         'Blossoms%20of%20the%20Stream%20-%20Letter%201%20-%20Small_Wood_Kindles_a_Great_Fire.m4a')
VIDEO = ('https://archive.org/details/ebay-hanachal-letter-1/'
         'Blossoms%20of%20the%20Stream%20-%20Letter%201%20-%20The_Light_of_the_True_Tzadik.mp4')

class MediaParser(HTMLParser):
    def __init__(self, source):
        super().__init__()
        self.nodes = []
        self.stack = []
        self.feed(source)
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        self.nodes.append((tag, attrs, list(self.stack)))
        if tag not in {'br', 'meta', 'link', 'input', 'source', 'img', 'hr'}:
            self.stack.append((tag, attrs))
    def handle_endtag(self, tag):
        for i in range(len(self.stack) - 1, -1, -1):
            if self.stack[i][0] == tag:
                del self.stack[i:]
                return

class LetterOneMedia(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source = PAGE.read_text()
        start = cls.source.index('<!-- Letter 1 Media Resources -->')
        end = cls.source.index('<div class="reader-toolbar">', start)
        cls.block = cls.source[start:end]
        cls.nodes = MediaParser(cls.block).nodes
    def test_original_native_audio_is_rendered(self):
        audios = [a for t, a, _ in self.nodes if t == 'audio']
        self.assertEqual(len(audios), 1)
        self.assertEqual(audios[0].get('src'), AUDIO)
        self.assertEqual(audios[0].get('id'), 'letter1-original-audio')
        self.assertIn('controls', audios[0])
        self.assertEqual(audios[0].get('preload'), 'none')
        self.assertNotIn('autoplay', audios[0])
    def test_audio_is_not_inside_a_navigation_link(self):
        audio = [n for n in self.nodes if n[0] == 'audio']
        self.assertEqual(len(audio), 1)
        self.assertFalse(any(t == 'a' for t, _ in audio[0][2]))
    def test_direct_audio_link_bypasses_details_preview(self):
        links = [a for t, a, _ in self.nodes if t == 'a' and a.get('href', '').endswith('.m4a')]
        self.assertEqual(len(links), 1)
        self.assertEqual(links[0]['href'], AUDIO)
        self.assertEqual(links[0].get('rel'), 'noopener')
    def test_existing_video_is_preserved(self):
        links = [a for t, a, _ in self.nodes if t == 'a' and a.get('href', '').endswith('.mp4')]
        self.assertEqual(len(links), 1)
        self.assertEqual(links[0]['href'], VIDEO)
    def test_card_is_explicitly_audio_with_duration(self):
        cards = [(t, a) for t, a, _ in self.nodes if 'media-card' in a.get('class', '').split()]
        self.assertEqual(len(cards), 2)
        self.assertEqual(cards[1][0], 'div')
        self.assertIn('Audio (M4A) — 18:08', self.block)
    def test_only_first_letter_of_first_part_gets_resources(self):
        self.assertIn('partNum === 1 && torahNum === 1 && (', self.block)

if __name__ == '__main__':
    unittest.main()
