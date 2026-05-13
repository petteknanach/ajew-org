export const prerender = false;

/**
 * Torah Lens News API
 * Fetches RSS feeds from Jewish news sources, categorizes headlines
 * against the 30 Torah Lens event types by keyword matching.
 *
 * Returns max 8 categorized headlines.
 * Cached for 4 hours via Cache-Control headers + in-memory cache.
 */

import type { APIRoute } from 'astro';

interface Headline {
  title: string;
  link: string;
  source: string;
  date: string;
  eventType: string;
  eventLabel: string;
  eventIcon: string;
}

interface CacheEntry {
  data: { headlines: Headline[] };
  timestamp: number;
}

// In-memory cache (survives across warm invocations)
let cache: CacheEntry | null = null;
const CACHE_TTL = 4 * 60 * 60 * 1000; // 4 hours

// Keyword → event type mapping
const EVENT_MAP: { keywords: string[]; id: string; label: string; icon: string }[] = [
  { keywords: ['fire', 'burn', 'blaze', 'arson', 'wildfire', 'inferno', 'flame'], id: 'fire', label: 'Fire / Destruction', icon: '\u{1F525}' },
  { keywords: ['flood', 'flooding', 'rain', 'storm', 'hurricane', 'tornado', 'typhoon', 'cyclone', 'tsunami'], id: 'flood-storm', label: 'Flood / Storm', icon: '\u{1F30A}' },
  { keywords: ['war', 'military', 'attack', 'missile', 'rocket', 'idf', 'hamas', 'hezbollah', 'iran', 'army', 'troops', 'airstrike', 'combat', 'invasion', 'soldier'], id: 'war', label: 'War / Conflict', icon: '\u{2694}\u{FE0F}' },
  { keywords: ['earthquake', 'quake', 'tremor', 'seismic'], id: 'earthquake', label: 'Earthquake', icon: '\u{1F30D}' },
  { keywords: ['economy', 'inflation', 'market', 'stock', 'recession', 'budget', 'financial', 'gdp', 'unemployment', 'debt'], id: 'economic-crisis', label: 'Economic Crisis', icon: '\u{1F4C9}' },
  { keywords: ['virus', 'covid', 'disease', 'pandemic', 'outbreak', 'hospital', 'epidemic', 'infection', 'vaccine', 'health crisis'], id: 'disease', label: 'Disease / Pandemic', icon: '\u{1F637}' },
  { keywords: ['election', 'vote', 'coalition', 'knesset', 'parliament', 'president', 'prime minister', 'political', 'government', 'legislation'], id: 'political', label: 'Political Upheaval', icon: '\u{1F3DB}\u{FE0F}' },
  { keywords: ['terror', 'terrorist', 'stabbing', 'ramming', 'bombing', 'hostage'], id: 'terrorism', label: 'Terrorism', icon: '\u{1F6A8}' },
  { keywords: ['dead', 'dies', 'killed', 'murder', 'shooting', 'assassin', 'death of', 'passed away', 'funeral', 'mourning'], id: 'death-of-leader', label: 'Death of a Leader', icon: '\u{1F56F}\u{FE0F}' },
  { keywords: ['peace', 'treaty', 'agreement', 'normalization', 'ceasefire', 'accord', 'diplomacy', 'reconciliation'], id: 'peace', label: 'Peace / Treaty', icon: '\u{1F54A}\u{FE0F}' },
  { keywords: ['antisemit', 'hate crime', 'attack on jews', 'jewish community', 'synagogue attack', 'anti-jewish', 'hate incident'], id: 'antisemitism', label: 'Antisemitism', icon: '\u{1F6E1}\u{FE0F}' },
  { keywords: ['miracle', 'rescue', 'saved', 'survived', 'miraculous', 'incredible escape', 'against all odds'], id: 'miracle', label: 'Miracle / Rescue', icon: '\u{2728}' },
  { keywords: ['torah', 'yeshiva', 'rabbi', 'shul', 'synagogue', 'religious', 'spiritual', 'prayer', 'baal teshuva', 'kiruv'], id: 'religious-awakening', label: 'Religious Awakening', icon: '\u{1F4D6}' },
  { keywords: ['aliyah', 'immigration', 'refugee', 'immigrant', 'olim', 'nefesh b\'nefesh', 'making aliyah'], id: 'immigration', label: 'Immigration / Aliyah', icon: '\u{2708}\u{FE0F}' },
  { keywords: ['drought', 'water crisis', 'famine', 'crop failure', 'food shortage'], id: 'drought-famine', label: 'Drought / Famine', icon: '\u{1F3DC}\u{FE0F}' },
  { keywords: ['exile', 'expulsion', 'deportation', 'displacement', 'ban'], id: 'exile', label: 'Exile / Displacement', icon: '\u{1F6B6}' },
  { keywords: ['corruption', 'scandal', 'fraud', 'bribery', 'indictment', 'embezzle'], id: 'corruption', label: 'Corruption / Scandal', icon: '\u{1F3AD}' },
  { keywords: ['unity', 'together', 'solidarity', 'joined', 'united', 'achdus'], id: 'unity', label: 'Unity', icon: '\u{1F91D}' },
  { keywords: ['technology', 'ai ', 'artificial intelligence', 'cyber', 'robot', 'tech breakthrough'], id: 'technology', label: 'Technology', icon: '\u{1F4BB}' },
  { keywords: ['discovery', 'archaeological', 'ancient', 'artifact', 'excavation', 'found'], id: 'discovery', label: 'Discovery', icon: '\u{1F50D}' },
];

function categorize(title: string, description: string): typeof EVENT_MAP[0] | null {
  const text = (title + ' ' + description).toLowerCase();

  let best: typeof EVENT_MAP[0] | null = null;
  let bestCount = 0;

  for (const entry of EVENT_MAP) {
    let count = 0;
    for (const kw of entry.keywords) {
      if (text.includes(kw)) count++;
    }
    if (count > bestCount) {
      bestCount = count;
      best = entry;
    }
  }

  return bestCount > 0 ? best : null;
}

interface RssItem {
  title: string;
  link: string;
  pubDate: string;
  description: string;
}

function parseRssItems(xml: string): RssItem[] {
  const items: RssItem[] = [];
  // Match each <item>...</item>
  const itemRegex = /<item\b[^>]*>([\s\S]*?)<\/item>/gi;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];

    const getTag = (tag: string): string => {
      // Handle CDATA: <tag><![CDATA[content]]></tag>
      const cdataRe = new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*<\\/${tag}>`, 'i');
      const cdataMatch = block.match(cdataRe);
      if (cdataMatch) return cdataMatch[1].trim();

      const simpleRe = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
      const simpleMatch = block.match(simpleRe);
      return simpleMatch ? simpleMatch[1].trim().replace(/<[^>]+>/g, '') : '';
    };

    const title = getTag('title');
    const link = getTag('link');
    const pubDate = getTag('pubDate');
    const description = getTag('description');

    if (title) {
      items.push({ title, link, pubDate, description });
    }
  }

  return items;
}

async function fetchFeed(url: string, sourceName: string): Promise<{ items: RssItem[]; source: string }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const resp = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'AjewOrg-TorahLens/1.0' },
    });
    clearTimeout(timeout);

    if (!resp.ok) return { items: [], source: sourceName };

    const xml = await resp.text();
    return { items: parseRssItems(xml), source: sourceName };
  } catch {
    return { items: [], source: sourceName };
  }
}

async function getHeadlines(): Promise<Headline[]> {
  const feeds = await Promise.all([
    fetchFeed('https://www.israelnationalnews.com/rss/news.xml', 'Israel National News'),
    fetchFeed('https://www.theyeshivaworld.com/feed', 'The Yeshiva World'),
  ]);

  const headlines: Headline[] = [];
  const seenTitles = new Set<string>();
  const seenEventTypes = new Set<string>();

  for (const feed of feeds) {
    for (const item of feed.items) {
      if (headlines.length >= 8) break;

      // Skip duplicates
      const titleKey = item.title.toLowerCase().substring(0, 40);
      if (seenTitles.has(titleKey)) continue;

      const match = categorize(item.title, item.description);
      if (!match) continue;

      // Prefer variety — max 2 headlines per event type
      const typeCount = [...headlines].filter(h => h.eventType === match.id).length;
      if (typeCount >= 2) continue;

      seenTitles.add(titleKey);

      // Parse date
      let dateStr = '';
      try {
        const d = new Date(item.pubDate);
        if (!isNaN(d.getTime())) {
          dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
      } catch { /* ignore */ }

      headlines.push({
        title: item.title,
        link: item.link,
        source: feed.source,
        date: dateStr,
        eventType: match.id,
        eventLabel: match.label,
        eventIcon: match.icon,
      });
    }
  }

  return headlines;
}

export const GET: APIRoute = async () => {
  // Check cache
  if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
    return new Response(JSON.stringify(cache.data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=14400, stale-while-revalidate=3600',
      },
    });
  }

  try {
    const headlines = await getHeadlines();
    const data = { headlines };

    // Update cache
    cache = { data, timestamp: Date.now() };

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=14400, stale-while-revalidate=3600',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ headlines: [], error: 'Failed to fetch news' }), {
      status: 200, // Return 200 with empty array so frontend degrades gracefully
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=300',
      },
    });
  }
};
