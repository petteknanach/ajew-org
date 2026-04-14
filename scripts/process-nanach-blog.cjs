/**
 * Process scraped na-nach.blogspot.com posts into clean JSON for the blog archive.
 * Filters out posts with body < 50 chars, cleans whitespace, generates slugs.
 *
 * Usage: node scripts/process-nanach-blog.js
 */
const fs = require('fs');
const path = require('path');

const inputPath = 'C:/Users/Pettek/Downloads/naanaach-blogspot-posts.json';
const outputPath = path.resolve(__dirname, '../public/data/nanach-blog-posts.json');

const data = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));

const posts = data.posts
  .filter(p => p.body && p.body.trim().length >= 50)
  .map((p, i) => {
    const parsed = new Date(p.date);
    const iso = !isNaN(parsed.getTime()) ? parsed.toISOString().split('T')[0] : null;

    const body = p.body
      .trim()
      .replace(/\r\n/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    const slug = p.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 80);

    return {
      id: i + 1,
      title: p.title,
      date: iso || p.date,
      dateDisplay: p.date,
      slug: slug || 'post-' + (i + 1),
      url: p.url,
      body: body,
    };
  });

// Deduplicate slugs
const slugCount = {};
posts.forEach(p => {
  if (slugCount[p.slug]) {
    slugCount[p.slug]++;
    p.slug = p.slug + '-' + slugCount[p.slug];
  } else {
    slugCount[p.slug] = 1;
  }
});

const output = {
  source: 'na-nach.blogspot.com (nanach.net)',
  author: 'NaaNaach',
  totalPosts: posts.length,
  dateRange: data.dateRange,
  posts: posts,
};

fs.writeFileSync(outputPath, JSON.stringify(output));

const sizeMB = (fs.statSync(outputPath).size / 1024 / 1024).toFixed(2);
console.log(`Written ${posts.length} posts to ${outputPath} (${sizeMB} MB)`);
