// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://ajew.org',
  output: 'hybrid',
  adapter: vercel({
    // Hybrid mode: static by default, server when needed
    includeFiles: ['public/**/*'],
  }),

  integrations: [sitemap({
    changefreq: 'weekly',
    priority: 0.7,
    lastmod: new Date(),
    i18n: {
      defaultLocale: 'en',
      locales: {
        en: 'en-US',
      },
    },
    filter: (page) => {
      // Exclude admin and private pages
      return !page.includes('/admin/') && 
             !page.includes('/private/') &&
             !page.includes('/tmp/');
    },
    entryLimit: 50000,
  })],
  vite: {
    css: {
      minify: false
    }
  }
});
