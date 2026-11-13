import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://fromthecabinet.com',
  integrations: [mdx(), sitemap()],
  build: {
    format: 'directory',
  },
});
