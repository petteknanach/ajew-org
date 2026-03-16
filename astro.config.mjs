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
        },
      },
      filter: (page) => {
        // Exclude admin and private pages
        return !page.includes('/admin/') && 
               !page.includes('/private/') &&
               !page.includes('/tmp/');
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
