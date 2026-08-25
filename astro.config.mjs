import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  output: 'static',
  integrations: [
    tailwind(),
    // The 404 page is noindex — keep it out of the sitemap too.
    sitemap({ filter: (page) => !page.endsWith('/404/') && !page.endsWith('/404') }),
  ],
  site: 'https://janethfernando.me',
});
