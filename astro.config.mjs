// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://ajew.org',
  output: 'static',

  vite: {
    plugins: [tailwindcss()],
  },

  integrations: [
    sitemap({
      changefreq: 'weekly',
      priority: 0.7,
      lastmod: new Date(),
      i18n: {
        defaultLocale: 'en',
        locales: {
          en: 'en-US',
          he: 'he-IL',
        },
      },
      filter: (page) => {
        return !page.includes('/admin/') &&
               !page.includes('/private/') &&
               !page.includes('/tmp/') &&
               !page.includes('/my-stats') &&
               !page.includes('/my-notes') &&
               !page.includes('/my-sefer') &&
               !page.includes('/profile') &&
               !page.includes('/login') &&
               !page.includes('/chat');
      },
      serialize: (item) => {
        const highPriority = ['/', '/reader', '/search-enhanced', '/about', '/topics', '/ask', '/parsha', '/daily-study'];
        const medHighPriority = ['/torah-gps', '/torah-lens', '/healing-words', '/chain-of-light', '/torah-map'];
        const medPriority = ['/reference', '/gematria', '/tzaddikim', '/gallery', '/donate', '/subscribe'];
        if (highPriority.some(p => item.url === p || item.url === p + '/')) {
          return { ...item, priority: 1.0, changefreq: 'daily' };
        }
        if (medHighPriority.some(p => item.url === p || item.url === p + '/')) {
          return { ...item, priority: 0.9, changefreq: 'weekly' };
        }
        if (medPriority.some(p => item.url === p || item.url === p + '/')) {
          return { ...item, priority: 0.8 };
        }
        if (item.url.includes('/reader/')) {
          return { ...item, priority: 0.6 };
        }
        if (item.url.includes('/parsha/')) {
          return { ...item, priority: 0.5 };
        }
        return item;
      },
      entryLimit: 50000,
    })
  ],
});
