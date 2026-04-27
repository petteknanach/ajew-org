#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'https://ajew.org';
const SITE_ROOT = path.join(__dirname, '..');
const PAGES_DIR = path.join(SITE_ROOT, 'src', 'pages');
const OUTPUT_FILE = path.join(SITE_ROOT, 'public', 'sitemap.xml');

// Priority mapping based on page type
const PRIORITY_MAP = {
  '/': 1.0,
  '/about': 0.8,
  '/books': 0.9,
  '/books/blossoms-of-the-spring': 0.85,
  '/books/blossoms-of-the-spring/letter': 0.8,
  '/books/read': 0.7,
};

// Change frequency mapping
const CHANGEFREQ_MAP = {
  '/': 'weekly',
  '/about': 'monthly',
  '/books': 'weekly',
  '/books/blossoms-of-the-spring': 'weekly',
  '/books/blossoms-of-the-spring/letter': 'monthly',
  '/books/read': 'monthly',
};

// Find all Astro pages
function findPages(dir, basePath = '') {
  const pages = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    const relativePath = path.join(basePath, item.name);

    if (item.isDirectory()) {
      // Skip directories starting with underscore
      if (!item.name.startsWith('_')) {
        pages.push(...findPages(fullPath, relativePath));
      }
    } else if (item.isFile()) {
      // Handle Astro files
      if (item.name.endsWith('.astro')) {
        let pagePath = relativePath.replace(/\.astro$/, '');
        
        // Handle index files
        if (item.name === 'index.astro') {
          pagePath = pagePath.replace(/index$/, '');
        }
        
        // Handle dynamic routes
        if (item.name.includes('[') && item.name.includes(']')) {
          // Skip dynamic routes for sitemap
          continue;
        }
        
        // Add leading slash
        if (!pagePath.startsWith('/')) {
          pagePath = '/' + pagePath;
        }
        
        pages.push(pagePath);
      }
    }
  }

  return pages;
}

// Generate sitemap XML
function generateSitemap(pages) {
  const today = new Date().toISOString().split('T')[0];
  
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n`;

  for (const page of pages) {
    // Determine priority and changefreq
    let priority = 0.5;
    let changefreq = 'monthly';
    
    // Check exact matches first
    if (PRIORITY_MAP[page] !== undefined) {
      priority = PRIORITY_MAP[page];
    } else {
      // Check pattern matches
      for (const [pattern, prio] of Object.entries(PRIORITY_MAP)) {
        if (page.startsWith(pattern)) {
          priority = prio;
          break;
        }
      }
    }
    
    // Check exact matches first for changefreq
    if (CHANGEFREQ_MAP[page] !== undefined) {
      changefreq = CHANGEFREQ_MAP[page];
    } else {
      // Check pattern matches
      for (const [pattern, freq] of Object.entries(CHANGEFREQ_MAP)) {
        if (page.startsWith(pattern)) {
          changefreq = freq;
          break;
        }
      }
    }
    
    const url = `${BASE_URL}${page}`;
    
    xml += `  <url>
    <loc>${url}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority.toFixed(1)}</priority>
  </url>\n`;
  }

  xml += '</urlset>';
  return xml;
}

// Main function
async function main() {
  try {
    console.log('Generating sitemap for ajew.org...');
    
    // Find all pages
    const pages = findPages(PAGES_DIR);
    
    // Add important static pages
    const staticPages = [
      '/',
      '/about',
      '/books',
      '/books/read',
      '/books/blossoms-of-the-spring',
    ];
    
    // Add book letter pages (1-282)
    for (let i = 1; i <= 282; i++) {
      const num = i.toString().padStart(3, '0');
      staticPages.push(`/books/blossoms-of-the-spring/letter${num}`);
    }
    
    // Combine and deduplicate
    const allPages = [...new Set([...pages, ...staticPages])].sort();
    
    console.log(`Found ${allPages.length} pages`);
    
    // Generate XML
    const sitemapXml = generateSitemap(allPages);
    
    // Write to file
    fs.writeFileSync(OUTPUT_FILE, sitemapXml);
    console.log(`Sitemap written to ${OUTPUT_FILE}`);
    
    // Also update robots.txt to point to the new sitemap
    const robotsPath = path.join(SITE_ROOT, 'public', 'robots.txt');
    let robotsContent = fs.readFileSync(robotsPath, 'utf8');
    
    // Update sitemap reference
    robotsContent = robotsContent.replace(
      /Sitemap:.*/g,
      `Sitemap: ${BASE_URL}/sitemap.xml`
    );
    
    fs.writeFileSync(robotsPath, robotsContent);
    console.log('Updated robots.txt');
    
  } catch (error) {
    console.error('Error generating sitemap:', error);
    process.exit(1);
  }
}

main();