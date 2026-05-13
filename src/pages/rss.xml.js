import rss from '@astrojs/rss';

// Main content pages with curated metadata
const mainPages = [
  {
    title: "Breslov Torah Library - 226+ Sacred Texts Online",
    link: "/reader",
    description: "Access the complete Breslov Torah library with over 226 sacred Jewish texts including Likutay Moharan, Zohar, Talmud, Mishna, Rambam, and Tanach in Hebrew with English translations.",
    pubDate: new Date("2025-01-01"),
  },
  {
    title: "Daily Torah Study",
    link: "/daily-study",
    description: "Daily Breslov Torah study schedule with Likutay Moharan, Likutay Halachos, and more. Follow the daily learning cycle of Breslov Chassidus.",
    pubDate: new Date("2025-01-01"),
  },
  {
    title: "Torah Search - Search 25,000+ Pages of Sacred Texts",
    link: "/search-enhanced",
    description: "Full-text search across the complete Breslov Torah library. Search Likutay Moharan, Likutay Halachos, Zohar, Talmud, and more in Hebrew and English.",
    pubDate: new Date("2025-01-01"),
  },
  {
    title: "Torah Topics - Browse Teachings by Subject",
    link: "/topics",
    description: "Browse Breslov Torah teachings organized by topic. Find teachings on faith, prayer, joy, repentance, and hundreds of other subjects.",
    pubDate: new Date("2025-01-01"),
  },
  {
    title: "Weekly Parsha - Torah Portion Insights",
    link: "/parsha",
    description: "Weekly Torah portion insights and connections from Breslov teachings. Discover how Rabbi Nachman's wisdom illuminates each parsha.",
    pubDate: new Date("2025-01-01"),
  },
  {
    title: "Ask the Torah - AI-Powered Torah Guidance",
    link: "/ask",
    description: "Ask questions and receive Torah-based guidance drawing from the complete Breslov library. Powered by AI trained on authentic Breslov sources.",
    pubDate: new Date("2025-01-01"),
  },
  {
    title: "Healing Words - Torah for Emotional and Spiritual Healing",
    link: "/healing-words",
    description: "Find Torah teachings for healing and comfort. Curated selections from Rabbi Nachman's wisdom addressing emotional and spiritual challenges.",
    pubDate: new Date("2025-01-01"),
  },
  {
    title: "Torah GPS - Navigate Your Spiritual Journey",
    link: "/torah-gps",
    description: "Personalized Torah study navigation tool. Get guided paths through the Breslov Torah library based on your interests and study level.",
    pubDate: new Date("2025-01-01"),
  },
  {
    title: "Torah Lens - Deep Textual Analysis",
    link: "/torah-lens",
    description: "Explore the deeper layers of Torah texts with cross-references, commentaries, and analytical tools for in-depth Breslov study.",
    pubDate: new Date("2025-01-01"),
  },
  {
    title: "Chain of Light - The Breslov Lineage",
    link: "/chain-of-light",
    description: "Explore the chain of transmission from Rabbi Nachman of Breslov through his students. The unbroken lineage of Breslov Chassidus.",
    pubDate: new Date("2025-01-01"),
  },
  {
    title: "Torah Map - Visual Torah Exploration",
    link: "/torah-map",
    description: "Navigate the world of Torah visually. Explore connections between texts, topics, and teachings across the Breslov library.",
    pubDate: new Date("2025-01-01"),
  },
  {
    title: "Gematria Calculator",
    link: "/gematria",
    description: "Calculate the numerical value of Hebrew words and phrases. Explore Torah insights through gematria with the Breslov library.",
    pubDate: new Date("2025-01-01"),
  },
  {
    title: "Tzaddikim - Righteous Figures of Breslov",
    link: "/tzaddikim",
    description: "Learn about the great tzaddikim and righteous figures in the Breslov tradition, from Rabbi Nachman to his leading students.",
    pubDate: new Date("2025-01-01"),
  },
  {
    title: "Gallery - Breslov Art and Images",
    link: "/gallery",
    description: "Browse a curated collection of Breslov-related artwork, images, and visual content celebrating the beauty of Torah and Chassidus.",
    pubDate: new Date("2025-01-01"),
  },
  {
    title: "Torah Reference Guide",
    link: "/reference",
    description: "Quick reference guide for navigating Breslov Torah texts. Find book structures, chapter listings, and study aids.",
    pubDate: new Date("2025-01-01"),
  },
  {
    title: "About A Jew - The Breslov Torah Library",
    link: "/about",
    description: "Learn about ajew.org, the largest online Breslov Torah library with 226+ sacred texts and 25,000+ pages in Hebrew with English translations.",
    pubDate: new Date("2025-01-01"),
  },
  {
    title: "PDF Library - Download Breslov Texts",
    link: "/pdf-library",
    description: "Download PDF versions of Breslov Torah texts for offline study. Access Likutay Moharan, Likutay Halachos, and more.",
    pubDate: new Date("2025-01-01"),
  },
  {
    title: "Video Teachings",
    link: "/videos",
    description: "Watch video teachings and lectures on Breslov Torah topics. Visual learning resources for deepening your understanding.",
    pubDate: new Date("2025-01-01"),
  },
  {
    title: "Chok Breslov - Daily Learning Program",
    link: "/chok-breslov",
    description: "The Chok Breslov daily learning program. A structured daily study of the essential Breslov texts.",
    pubDate: new Date("2025-01-01"),
  },
  {
    title: "Pesach - Passover Teachings",
    link: "/pesach",
    description: "Breslov teachings and insights for Passover. Explore the deeper meanings of the Haggadah and the Exodus through Breslov wisdom.",
    pubDate: new Date("2025-01-01"),
  },
  {
    title: "Haggadah - Breslov Insights on the Haggadah",
    link: "/haggadah",
    description: "Discover Breslov teachings on the Passover Haggadah. Deep insights from Rabbi Nachman and Rabbi Nosson on the Seder night.",
    pubDate: new Date("2025-01-01"),
  },
];

// Key teaching categories with descriptions
const teachingPages = [
  { slug: "advice", title: "Likutay Aitzos - A Collection of Advice", description: "Practical guidance arranged alphabetically by topic from Rebbe Nachman's teachings." },
  { slug: "likutay-moharan-1", title: "Likutay Moharan - Torah 1", description: "The opening Torah of Likutay Moharan, Rabbi Nachman's primary collection of teachings." },
  { slug: "likutay-moharan-intro", title: "Likutay Moharan - Introduction", description: "Introduction to Likutay Moharan, the central work of Rabbi Nachman of Breslov." },
  { slug: "likutay-halachos", title: "Likutay Halachos Overview", description: "Rabbi Nosson's monumental work connecting Jewish law to Rabbi Nachman's deeper teachings." },
  { slug: "likutay-aitzos", title: "Likutay Aitzos - Collected Advice", description: "An alphabetical collection of practical advice from the teachings of Rabbi Nachman." },
  { slug: "hisbodidus-intro", title: "Hisbodidus - Introduction to Personal Prayer", description: "Introduction to the practice of hisbodidus, personal meditation and prayer as taught by Rabbi Nachman." },
  { slug: "hisbodidus-power", title: "The Power of Hisbodidus", description: "Exploring the transformative power of hisbodidus (personal prayer) in Breslov Chassidus." },
  { slug: "hisbodidus-vs-meditation", title: "Hisbodidus vs Meditation", description: "Understanding the differences between hisbodidus and other forms of meditation." },
  { slug: "hiskashrus", title: "Hiskashrus - Connection to the Tzaddik", description: "Teachings on the vital connection to the true Tzaddik in Breslov tradition." },
  { slug: "holy-yearning", title: "Holy Yearning", description: "Teachings on spiritual yearning and longing for closeness to God." },
  { slug: "life-of-rabbi-nachman", title: "Life of Rabbi Nachman", description: "The life story and biography of Rabbi Nachman of Breslov." },
  { slug: "fundamental-letter", title: "The Fundamental Letter", description: "Rabbi Nachman's fundamental letter on the foundations of faith and spiritual life." },
  { slug: "blossoms-of-the-stream", title: "Blossoms of the Stream", description: "Poetic and mystical teachings from the Breslov tradition." },
  { slug: "legendary-tales-foreword", title: "Legendary Tales - Foreword", description: "Introduction to Rabbi Nachman's legendary mystical tales and stories." },
  { slug: "discourses-after", title: "Discourses After Rabbi Nachman", description: "Teachings and discourses from after the time of Rabbi Nachman." },
];

export function GET(context) {
  const items = [
    ...mainPages.map((page) => ({
      title: page.title,
      link: page.link,
      description: page.description,
      pubDate: page.pubDate,
    })),
    ...teachingPages.map((page) => ({
      title: page.title,
      link: `/teachings/${page.slug}`,
      description: page.description,
      pubDate: new Date("2025-01-01"),
    })),
  ];

  return rss({
    title: "A Jew - The Largest Online Breslov Torah Library",
    description: "The largest online Breslov Torah library with 226+ sacred Jewish texts and 25,000+ pages. Likutay Moharan, Zohar, Talmud, Mishna, Rambam, Tanach in Hebrew with English translations.",
    site: context.site,
    items,
    customData: `<language>en-us</language>`,
  });
}
