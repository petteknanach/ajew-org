// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://ajew.org',
  output: 'static',
  adapter: vercel(),

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
        // Exclude admin, private, and utility pages
        return !page.includes('/admin/') &&
               !page.includes('/private/') &&
               !page.includes('/tmp/') &&
               !page.includes('/my-stats') &&
               !page.includes('/my-notes') &&
               !page.includes('/profile') &&
               !page.includes('/login');
      },
      serialize: (item) => {
        // Boost priority for key pages
        const highPriority = ['/', '/reader', '/search-enhanced', '/about', '/topics', '/ask', '/parsha', '/torah-map'];
        const medPriority = ['/reference', '/gematria', '/tzaddikim', '/gallery', '/videos', '/donate'];
        if (highPriority.some(p => item.url === p || item.url === p + '/')) {
          return { ...item, priority: 1.0, changefreq: 'daily' };
        }
        if (medPriority.some(p => item.url === p || item.url === p + '/')) {
          return { ...item, priority: 0.8 };
        }
        // Reader pages get higher priority
        if (item.url.includes('/reader/')) {
          return { ...item, priority: 0.6 };
        }
        return item;
      },
      entryLimit: 50000,
    })
  ],
  vite: {
    build: {
      cssMinify: 'esbuild', // Use esbuild for CSS minification
      rollupOptions: {
        output: {
          manualChunks: {
            // Split vendor code into separate chunks
            vendor: ['lunr', 'lunr-languages'],
            // You can add more chunks here for code splitting
          }
        }
      }
    },
    css: {
      // Enable CSS minification with esbuild
      minify: 'esbuild'
    }
  }
});
